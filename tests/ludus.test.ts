import { describe, expect, it } from 'vitest'
import {
  advanceDay,
  askingPrice,
  buy,
  newLudus,
  sell,
  sellPrice,
  UPKEEP_PER_HEAD,
  type DayAction,
  type LudusState,
} from '../src/game/ludus'
import {
  canTrain,
  conditionMultiplier,
  maxHpOf,
  startingFavor,
  valueOf,
  TRAIN_FATIGUE_LIMIT,
} from '../src/game/gladiator'
import { MERCY_THRESHOLD } from '../src/game/combat'

function ludus(): LudusState {
  return newLudus(1234)
}

function assignAll(state: LudusState, action: DayAction): Record<string, DayAction> {
  return Object.fromEntries(state.roster.filter((g) => !g.dead).map((g) => [g.id, action]))
}

describe('the school', () => {
  it('opens with one fighter, some coin and a market', () => {
    const state = ludus()
    expect(state.roster).toHaveLength(1)
    expect(state.coin).toBeGreaterThan(0)
    expect(state.market.length).toBeGreaterThan(0)
    expect(state.contracts.length).toBeGreaterThan(0)
  })

  it('charges the food bill every day, per head', () => {
    const state = ludus()
    const before = state.coin
    advanceDay(state, assignAll(state, 'idle'))
    expect(state.coin).toBe(before - UPKEEP_PER_HEAD)
  })

  it('starves them when the coin runs out rather than going into debt', () => {
    const state = ludus()
    state.coin = 0
    const fed = state.roster[0]!.fed
    const notes = advanceDay(state, assignAll(state, 'idle'))
    expect(state.coin).toBe(0)
    expect(state.roster[0]!.fed).toBeLessThan(fed)
    expect(notes.join(' ')).toMatch(/hungry/i)
  })
})

describe('training, rest and food', () => {
  it('raises a stat and costs condition', () => {
    const state = ludus()
    const fighter = state.roster[0]!
    fighter.fatigue = 0
    fighter.fed = 100
    const might = fighter.might
    advanceDay(state, { [fighter.id]: 'might' })
    expect(fighter.might).toBe(might + 1)
    expect(fighter.fatigue).toBeGreaterThan(0)
    expect(fighter.fed).toBeLessThan(100)
  })

  it('refuses to train a gladiator who is too tired', () => {
    const state = ludus()
    const fighter = state.roster[0]!
    fighter.fatigue = TRAIN_FATIGUE_LIMIT + 5
    fighter.fed = 100
    expect(canTrain(fighter).ok).toBe(false)
    const might = fighter.might
    const notes = advanceDay(state, { [fighter.id]: 'might' })
    expect(fighter.might).toBe(might)
    expect(notes.join(' ')).toMatch(/too tired/i)
  })

  it('refuses to train a gladiator who is too hungry', () => {
    const state = ludus()
    const fighter = state.roster[0]!
    fighter.fatigue = 0
    fighter.fed = 10
    const might = fighter.might
    const notes = advanceDay(state, { [fighter.id]: 'might' })
    expect(fighter.might).toBe(might)
    expect(notes.join(' ')).toMatch(/too hungry/i)
  })

  it('lets rest and food buy back the right to train, which is the loop', () => {
    const state = ludus()
    state.coin = 500
    const fighter = state.roster[0]!
    fighter.fatigue = 90
    fighter.fed = 20
    expect(canTrain(fighter).ok).toBe(false)
    advanceDay(state, { [fighter.id]: 'feast' })
    advanceDay(state, { [fighter.id]: 'rest' })
    advanceDay(state, { [fighter.id]: 'rest' })
    expect(canTrain(fighter).ok).toBe(true)
  })

  it('makes condition matter in the arena, not just on the roster', () => {
    const fresh = conditionMultiplier({ fatigue: 0, fed: 100 })
    const wrecked = conditionMultiplier({ fatigue: 95, fed: 10 })
    expect(wrecked).toBeLessThan(fresh)
    expect(wrecked).toBeGreaterThan(0.3)
  })
})

describe('making money', () => {
  it('pays for hiring a gladiator out, scaled by their condition', () => {
    const state = ludus()
    state.coin = 100
    const fighter = state.roster[0]!
    fighter.fatigue = 0
    fighter.fed = 100
    advanceDay(state, { [fighter.id]: 'work' })
    expect(state.coin).toBeGreaterThan(100 - UPKEEP_PER_HEAD)
    expect(fighter.fatigue).toBeGreaterThan(0)
  })

  it('pays a patron retainer once you are famous enough', () => {
    const state = ludus()
    state.fame = 60
    state.coin = 100
    let paid = false
    for (let day = 0; day < 20 && !paid; day++) {
      const notes = advanceDay(state, assignAll(state, 'idle'))
      if (notes.join(' ').match(/patron/i)) paid = true
    }
    expect(paid, 'a famous ludus attracted no patron in twenty days').toBe(true)
  })

  it('never pays a patron to an unknown school', () => {
    const state = ludus()
    state.fame = 0
    const notes: string[] = []
    for (let day = 0; day < 20; day++) notes.push(...advanceDay(state, assignAll(state, 'idle')))
    expect(notes.join(' ')).not.toMatch(/patron/i)
  })
})

describe('the market', () => {
  it('asks more than it pays, so trading is a skill rather than free money', () => {
    const state = ludus()
    const offer = state.market[0]!
    expect(askingPrice(offer)).toBeGreaterThan(sellPrice(offer))
  })

  it('prices a stronger gladiator higher', () => {
    const state = ludus()
    const weak = { ...state.roster[0]!, might: 3, vigour: 3, cunning: 3, wins: 0 }
    const strong = { ...state.roster[0]!, might: 16, vigour: 15, cunning: 14, wins: 6 }
    expect(valueOf(strong)).toBeGreaterThan(valueOf(weak) * 1.5)
  })

  it('buys a fighter when the coin is there and refuses when it is not', () => {
    const state = ludus()
    const offer = state.market[0]!
    state.coin = askingPrice(offer) - 1
    expect(buy(state, offer.id)).toEqual({ ok: false, reason: 'not enough coin' })
    state.coin = askingPrice(offer)
    expect(buy(state, offer.id).ok).toBe(true)
    expect(state.roster.some((g) => g.id === offer.id)).toBe(true)
    expect(state.coin).toBe(0)
  })

  it('will not let you sell your last fighter', () => {
    const state = ludus()
    expect(sell(state, state.roster[0]!.id)).toEqual({ ok: false, reason: 'you would have nobody left' })
  })

  it('lets you sell a spare, and pays for it', () => {
    const state = ludus()
    const offer = state.market[0]!
    state.coin = askingPrice(offer)
    buy(state, offer.id)
    const coin = state.coin
    const spare = state.roster[1]!
    expect(sell(state, spare.id).ok).toBe(true)
    expect(state.coin).toBe(coin + sellPrice(spare))
  })

  it('refreshes the block every third day', () => {
    const state = ludus()
    const before = state.market.map((g) => g.id).join()
    for (let i = 0; i < 3; i++) advanceDay(state, assignAll(state, 'idle'))
    expect(state.market.map((g) => g.id).join()).not.toBe(before)
  })
})

describe('a week of management', () => {
  it('leaves a well-run school better off and a neglected one worse', () => {
    const good = ludus()
    good.coin = 400
    for (let day = 0; day < 8; day++) {
      const fighter = good.roster[0]!
      const action: DayAction = fighter.fed < 55 ? 'feast' : fighter.fatigue > 55 ? 'rest' : 'might'
      advanceDay(good, { [fighter.id]: action })
    }

    const bad = ludus()
    bad.coin = 400
    for (let day = 0; day < 8; day++) advanceDay(bad, { [bad.roster[0]!.id]: 'might' })

    expect(good.roster[0]!.might).toBeGreaterThan(0)
    expect(good.roster[0]!.fed).toBeGreaterThan(bad.roster[0]!.fed)
    // The neglected one hits the wall: training refuses once he is wrecked.
    expect(bad.roster[0]!.might).toBeLessThanOrEqual(good.roster[0]!.might + 1)
  })

  it('keeps health within its bounds however the week goes', () => {
    const state = ludus()
    for (let day = 0; day < 30; day++) advanceDay(state, assignAll(state, day % 3 === 0 ? 'work' : 'rest'))
    for (const fighter of state.roster) {
      expect(fighter.hp).toBeGreaterThanOrEqual(0)
      expect(fighter.hp).toBeLessThanOrEqual(maxHpOf(fighter))
      expect(fighter.fed).toBeGreaterThanOrEqual(0)
      expect(fighter.fatigue).toBeLessThanOrEqual(100)
    }
  })
})

describe('walking into the arena', () => {
  it('gives even a dull fighter a chance at the crowd', () => {
    const state = ludus()
    const dull = { ...state.roster[0]!, cunning: 1 }
    // Derived from cunning alone, this was near zero, and a fighter who cannot
    // reach the mercy line turns every loss into a death.
    expect(startingFavor(dull)).toBeGreaterThan(10)
    expect(startingFavor(dull)).toBeLessThan(MERCY_THRESHOLD)
  })

  it('rewards cunning without handing over the crowd for free', () => {
    const state = ludus()
    const showman = { ...state.roster[0]!, cunning: 20 }
    const plain = { ...state.roster[0]!, cunning: 4 }
    expect(startingFavor(showman)).toBeGreaterThan(startingFavor(plain))
    expect(startingFavor(showman)).toBeLessThan(MERCY_THRESHOLD)
  })
})
