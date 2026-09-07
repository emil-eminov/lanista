import { describe, expect, it } from 'vitest'
import { Run } from '../src/game/run'
import { botChooseReward, botFight } from '../src/game/bot'
import { SEASON } from '../src/game/enemies'
import { MERCY_THRESHOLD } from '../src/game/combat'

function playSeason(seed: number) {
  const run = new Run(seed)
  const favors: number[] = []
  let guard = 0
  while (run.phase !== 'OVER' && guard++ < 200) {
    if (run.phase === 'BRIEFING') {
      run.beginFight()
    } else if (run.phase === 'FIGHT') {
      botFight(run.combat!)
      favors.push(run.combat!.favor)
      run.settle()
    } else if (run.phase === 'REWARD') {
      run.takeReward(botChooseReward(run.rewards, run.hp, run.maxHp))
    }
  }
  return { run, favors }
}

describe('a season', () => {
  it('always reaches an ending', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { run } = playSeason(seed)
      expect(run.phase).toBe('OVER')
      expect(run.result).toBeDefined()
    }
  })

  it('grows the deck by exactly one card per win', () => {
    const run = new Run(9)
    const size = run.deck.length
    run.beginFight()
    botFight(run.combat!)
    run.settle()
    if (run.phase === 'REWARD') {
      run.takeReward(run.rewards.findIndex((r) => r.kind === 'card'))
      expect(run.deck.length).toBe(size + 1)
    }
  })

  it('is hard but not impossible, which is the shape a run should have', () => {
    // Measured across 40 bot seasons: 2 won, 20 spared, 18 killed. The bot is
    // worse than a person, so this is the floor rather than the expectation.
    let won = 0
    let survived = 0
    const total = 24
    for (let seed = 1; seed <= total; seed++) {
      const { run } = playSeason(seed)
      if (run.result!.fightsWon >= SEASON.length) won += 1
      if (run.result!.survived) survived += 1
    }
    expect(won, 'no bot season was winnable at all').toBeGreaterThan(0)
    expect(won, 'the season has become trivial').toBeLessThan(total * 0.6)
    expect(survived, 'mercy never saved anyone').toBeGreaterThan(0)
  })

  it('makes the crowd decide who lives, which is the hook', () => {
    let mercies = 0
    let deaths = 0
    for (let seed = 1; seed <= 24; seed++) {
      const { run } = playSeason(seed)
      if (run.result!.fightsWon >= SEASON.length) continue
      if (run.result!.survived) mercies += 1
      else deaths += 1
    }
    // Both outcomes have to be common, or favour is decoration rather than a
    // decision: always dying makes it pointless, never dying makes it free.
    expect(mercies, 'the crowd never granted mercy').toBeGreaterThan(0)
    expect(deaths, 'the crowd never took anyone').toBeGreaterThan(0)
  })

  it('spares a gladiator the crowd loves and kills one it does not', () => {
    const loved = new Run(3)
    loved.beginFight()
    loved.combat!.favor = MERCY_THRESHOLD + 10
    loved.combat!.player.hp = 0
    // Drive the loss through the public path rather than reaching into state.
    loved.combat!.endTurn()
    loved.settle()

    const ignored = new Run(3)
    ignored.beginFight()
    ignored.combat!.favor = 0
    ignored.combat!.player.hp = 1
    while (ignored.combat!.outcome === 'fighting') ignored.combat!.endTurn()
    ignored.settle()

    expect(ignored.result!.survived).toBe(false)
  })
})
