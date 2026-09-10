import { createRng } from './rng'
import {
  canTrain,
  conditionMultiplier,
  createGladiator,
  maxHpOf,
  MAX_STAT,
  valueOf,
  type Gladiator,
} from './gladiator'
import { ENEMIES } from './enemies'

/**
 * The school. Everything here outlives any individual gladiator.
 *
 * The day is the resource. Every gladiator does exactly one thing per day, and
 * training is gated behind being rested and fed, so feeding and resting are not
 * chores bolted on beside training: they are what buys it.
 */

export type DayAction = 'might' | 'vigour' | 'cunning' | 'rest' | 'feast' | 'work' | 'idle'

export interface Fallen {
  readonly name: string
  readonly wins: number
  readonly epitaph: string
  readonly day: number
}

export interface Contract {
  readonly id: string
  readonly enemyId: string
  readonly name: string
  readonly purse: number
  readonly tier: number
  /** Fame required before the editor will offer this bout. */
  readonly fameRequired: number
}

export interface LudusState {
  coin: number
  fame: number
  day: number
  roster: Gladiator[]
  graves: Fallen[]
  market: Gladiator[]
  contracts: Contract[]
  /** Days until the patron pays again. Zero means no patron yet. */
  patronCountdown: number
  seed: number
  best: number
  fightsWon: number
}

/** Daily food bill per gladiator. Unpaid, they go hungry. */
export const UPKEEP_PER_HEAD = 4

/** Fame at which a patron takes an interest and starts paying a retainer. */
export const PATRON_FAME = 25
export const PATRON_INTERVAL = 7

const KEY = 'lanista.ludus.v2'
const MARKET_SIZE = 3
const CONTRACT_SIZE = 3

export function newLudus(seed = Date.now() >>> 0): LudusState {
  const rng = createRng(seed)
  const state: LudusState = {
    coin: 220,
    fame: 0,
    day: 1,
    roster: [createGladiator(rng, 0)],
    graves: [],
    market: [],
    contracts: [],
    patronCountdown: 0,
    seed,
    best: 0,
    fightsWon: 0,
  }
  refreshMarket(state)
  refreshContracts(state)
  return state
}

function rngFor(state: LudusState, salt: number): () => number {
  return createRng(state.seed + state.day * 7919 + salt)
}

export function refreshMarket(state: LudusState): void {
  const rng = rngFor(state, 11)
  const tier = Math.min(3, Math.floor(state.fame / 20))
  state.market = Array.from({ length: MARKET_SIZE }, () => createGladiator(rng, tier * (0.4 + rng() * 0.9)))
}

export function refreshContracts(state: LudusState): void {
  const rng = rngFor(state, 23)
  const pool = ENEMIES.filter((e) => e.id !== 'champion')
  state.contracts = Array.from({ length: CONTRACT_SIZE }, (_, index) => {
    const enemy = pool[Math.floor(rng() * pool.length)]!
    const tier = index
    const purse = Math.round(enemy.purse * (1 + tier * 0.55) * (0.9 + rng() * 0.35))
    return {
      id: `c${state.day}-${index}`,
      enemyId: enemy.id,
      name: enemy.name,
      purse,
      tier,
      fameRequired: tier * 12,
    }
  })
}

/** Price the market asks. A margin over what it would pay you. */
export function askingPrice(gladiator: Gladiator): number {
  return Math.round(valueOf(gladiator) * 1.35)
}

/** What the market pays for one of yours. */
export function sellPrice(gladiator: Gladiator): number {
  return Math.round(valueOf(gladiator) * 0.8)
}

export function buy(state: LudusState, id: string): { ok: boolean; reason?: string } {
  const offer = state.market.find((g) => g.id === id)
  if (!offer) return { ok: false, reason: 'no longer for sale' }
  const price = askingPrice(offer)
  if (state.coin < price) return { ok: false, reason: 'not enough coin' }
  if (state.roster.filter((g) => !g.dead).length >= 6) return { ok: false, reason: 'your ludus is full' }
  state.coin -= price
  state.market = state.market.filter((g) => g.id !== id)
  state.roster.push(offer)
  return { ok: true }
}

export function sell(state: LudusState, id: string): { ok: boolean; reason?: string } {
  const gladiator = state.roster.find((g) => g.id === id && !g.dead)
  if (!gladiator) return { ok: false, reason: 'not in your ludus' }
  if (state.roster.filter((g) => !g.dead).length <= 1) return { ok: false, reason: 'you would have nobody left' }
  state.coin += sellPrice(gladiator)
  state.roster = state.roster.filter((g) => g.id !== id)
  return { ok: true }
}

const WORK_PAY = 26

/**
 * Applies one day's assignments and moves the calendar on.
 *
 * Actions are validated here rather than at the point of clicking, so the
 * rules live in one place and the tests can drive whole weeks without a UI.
 */
export function advanceDay(state: LudusState, actions: Readonly<Record<string, DayAction>>): string[] {
  const notes: string[] = []
  const living = state.roster.filter((g) => !g.dead)

  for (const gladiator of living) {
    const action = actions[gladiator.id] ?? 'idle'
    switch (action) {
      case 'might':
      case 'vigour':
      case 'cunning': {
        const check = canTrain(gladiator)
        if (!check.ok) {
          notes.push(`${gladiator.name} is ${check.reason}.`)
          gladiator.fatigue = Math.max(0, gladiator.fatigue - 10)
          break
        }
        if (gladiator[action] >= MAX_STAT) {
          notes.push(`${gladiator.name} cannot improve that further.`)
          break
        }
        gladiator[action] += 1
        gladiator.fatigue = Math.min(100, gladiator.fatigue + 26)
        gladiator.fed = Math.max(0, gladiator.fed - 18)
        if (action === 'vigour') gladiator.hp = Math.min(maxHpOf(gladiator), gladiator.hp + 3)
        notes.push(`${gladiator.name} trains. ${action} is now ${gladiator[action]}.`)
        break
      }
      case 'rest':
        gladiator.fatigue = Math.max(0, gladiator.fatigue - 34)
        gladiator.fed = Math.max(0, gladiator.fed - 8)
        gladiator.hp = Math.min(maxHpOf(gladiator), gladiator.hp + 7)
        break
      case 'feast':
        if (state.coin < 12) {
          notes.push(`No coin for ${gladiator.name}'s table.`)
          break
        }
        state.coin -= 12
        gladiator.fed = Math.min(100, gladiator.fed + 46)
        gladiator.fatigue = Math.max(0, gladiator.fatigue - 6)
        break
      case 'work': {
        const earned = Math.round(WORK_PAY * conditionMultiplier(gladiator))
        state.coin += earned
        gladiator.fatigue = Math.min(100, gladiator.fatigue + 21)
        gladiator.fed = Math.max(0, gladiator.fed - 14)
        notes.push(`${gladiator.name} hires out for ${earned} coin.`)
        break
      }
      case 'idle':
        gladiator.fatigue = Math.max(0, gladiator.fatigue - 12)
        gladiator.fed = Math.max(0, gladiator.fed - 10)
        break
    }
  }

  // The food bill falls due whether or not you can pay it.
  const bill = living.length * UPKEEP_PER_HEAD
  if (state.coin >= bill) {
    state.coin -= bill
  } else {
    state.coin = 0
    for (const gladiator of living) gladiator.fed = Math.max(0, gladiator.fed - 14)
    notes.push('You cannot cover the food bill. They go hungry.')
  }

  // Starvation is slow but real, so ignoring the kitchen eventually kills.
  for (const gladiator of living) {
    if (gladiator.fed <= 0) {
      gladiator.hp -= 6
      if (gladiator.hp <= 0) {
        gladiator.hp = 0
        gladiator.dead = true
        state.graves.unshift({ name: gladiator.name, wins: gladiator.wins, epitaph: 'Starved in your care.', day: state.day })
        notes.push(`${gladiator.name} has starved.`)
      }
    }
  }

  state.day += 1

  if (state.fame >= PATRON_FAME) {
    if (state.patronCountdown <= 0) state.patronCountdown = PATRON_INTERVAL
    state.patronCountdown -= 1
    if (state.patronCountdown <= 0) {
      const retainer = 30 + Math.round(state.fame * 1.6)
      state.coin += retainer
      state.patronCountdown = PATRON_INTERVAL
      notes.push(`Your patron sends ${retainer} coin.`)
    }
  }

  if (state.day % 3 === 0) {
    refreshMarket(state)
    refreshContracts(state)
    notes.push('New faces at the market, new bouts posted.')
  }

  return notes
}

export function loadLudus(): LudusState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return newLudus()
    const parsed = JSON.parse(raw) as LudusState
    // A save from an older build is not worth crashing over.
    if (!Array.isArray(parsed.roster) || parsed.roster.length === 0) return newLudus()
    return parsed
  } catch {
    return newLudus()
  }
}

export function saveLudus(state: LudusState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private windows and blocked storage */
  }
}
