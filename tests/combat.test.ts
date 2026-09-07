import { describe, expect, it } from 'vitest'
import { Combat, BOREDOM, FAVOR_START, MERCY_THRESHOLD } from '../src/game/combat'
import { enemyById } from '../src/game/enemies'
import { botFight } from '../src/game/bot'

function combat(deck: string[], enemy = 'tiro', hp = 60): Combat {
  return new Combat('Verus', hp, 60, deck, enemyById(enemy), 0, 42)
}

describe('cards', () => {
  it('spends energy and moves the card to the discard pile', () => {
    const fight = combat(['jab', 'jab', 'jab', 'guard', 'guard'])
    const energy = fight.energy
    expect(fight.play('jab')).toBe(true)
    expect(fight.energy).toBe(energy - 1)
    expect(fight.discard).toContain('jab')
  })

  it('refuses a card that costs more energy than is left', () => {
    const fight = combat(['execution', 'execution', 'execution', 'execution', 'execution'])
    fight.play('execution')
    expect(fight.playable('execution').reason).toBe('not enough energy')
    expect(fight.play('execution')).toBe(false)
  })

  it('refuses a riposte with no guard up, because it is a counter', () => {
    const fight = combat(['riposte', 'guard', 'jab', 'jab', 'jab'])
    expect(fight.playable('riposte')).toEqual({ ok: false, reason: 'needs block' })
    fight.play('guard')
    expect(fight.playable('riposte').ok).toBe(true)
  })

  it('spends block before health', () => {
    const fight = combat(['brace', 'jab', 'jab', 'jab', 'jab'])
    fight.play('brace')
    const hp = fight.player.hp
    fight.endTurn()
    expect(fight.player.hp).toBe(hp)
  })

  it('turns block into damage with Shield Bash', () => {
    const fight = combat(['brace', 'shieldbash', 'jab', 'jab', 'jab'])
    fight.play('brace')
    const enemyHp = fight.enemy.hp
    fight.play('shieldbash')
    expect(fight.enemy.hp).toBe(enemyHp - 14)
  })

  it('exhausts a card instead of discarding it', () => {
    const fight = combat(['salute', 'jab', 'jab', 'jab', 'jab'])
    fight.play('salute')
    expect(fight.exhausted).toContain('salute')
    expect(fight.discard).not.toContain('salute')
  })

  it('halves damage while staggered', () => {
    const plain = combat(['gladius', 'jab', 'jab', 'jab', 'jab'])
    plain.play('gladius')
    const full = plain.enemyDef.hp - plain.enemy.hp

    const staggered = combat(['gladius', 'jab', 'jab', 'jab', 'jab'])
    staggered.player.statuses.stagger = 2
    staggered.play('gladius')
    const halved = staggered.enemyDef.hp - staggered.enemy.hp
    expect(halved).toBeLessThan(full)
  })
})

describe('the crowd', () => {
  it('pays for showy cards and nothing for guarding', () => {
    const showy = combat(['showboat', 'jab', 'jab', 'jab', 'jab'])
    showy.play('showboat')
    expect(showy.favor).toBeGreaterThan(FAVOR_START)

    const dull = combat(['guard', 'jab', 'jab', 'jab', 'jab'])
    dull.play('guard')
    expect(dull.favor).toBe(FAVOR_START)
  })

  it('actively drains on a turn spent turtling, which is the whole point', () => {
    const fight = combat(['guard', 'brace', 'jab', 'jab', 'jab'])
    fight.play('guard')
    fight.endTurn()
    expect(fight.favor).toBe(FAVOR_START - BOREDOM)
  })

  it('lets a dirty trick buy power with the crowd', () => {
    const fight = combat(['dirtytrick', 'jab', 'jab', 'jab', 'jab'])
    fight.play('dirtytrick')
    expect(fight.favor).toBeLessThan(FAVOR_START)
    expect(fight.enemy.statuses.stagger).toBe(3)
  })

  it('never leaves favour outside its bounds', () => {
    const fight = combat(['salute', 'salute', 'salute', 'salute', 'salute'])
    for (let i = 0; i < 5; i++) fight.play('salute')
    expect(fight.favor).toBeLessThanOrEqual(100)
    expect(fight.favor).toBeGreaterThanOrEqual(0)
  })

  it('decides mercy, which is the only thing standing between a loss and a death', () => {
    const fight = combat(['jab', 'jab', 'jab', 'jab', 'jab'])
    fight.favor = MERCY_THRESHOLD
    expect(fight.mercy).toBe(true)
    fight.favor = MERCY_THRESHOLD - 1
    expect(fight.mercy).toBe(false)
  })

  it('pays a bigger purse for a crowd-pleasing win', () => {
    const dull = combat(['jab', 'jab', 'jab', 'jab', 'jab'])
    dull.favor = 0
    const loud = combat(['jab', 'jab', 'jab', 'jab', 'jab'])
    loud.favor = 100
    expect(loud.payoutMultiplier).toBeGreaterThan(dull.payoutMultiplier)
  })
})

describe('a fight always ends', () => {
  it('resolves rather than looping forever', () => {
    const fight = combat(['jab', 'jab', 'jab', 'guard', 'guard', 'gladius', 'gut', 'sidestep'])
    botFight(fight)
    expect(fight.outcome).not.toBe('fighting')
  })

  it('never leaves a combatant on negative health', () => {
    const fight = combat(['jab', 'jab', 'jab', 'guard', 'guard'], 'champion', 12)
    botFight(fight)
    expect(fight.player.hp).toBeGreaterThanOrEqual(0)
    expect(fight.enemy.hp).toBeGreaterThanOrEqual(0)
  })
})
