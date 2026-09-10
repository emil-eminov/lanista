import { Combat } from './combat'
import { enemyById } from './enemies'
import { damageBonus, maxHpOf, startingFavor, type Gladiator } from './gladiator'
import type { Contract, LudusState } from './ludus'

/**
 * One bout: a gladiator of yours against a posted contract.
 *
 * This replaces the old fixed season. The lanista now chooses who fights and
 * what they fight, and the calendar pays for it either way.
 */
export interface BoutOutcome {
  readonly won: boolean
  readonly survived: boolean
  readonly purse: number
  readonly fame: number
  readonly favor: number
  readonly epitaph: string
}

export function startBout(gladiator: Gladiator, contract: Contract, seed: number): Combat {
  return new Combat(
    gladiator.name,
    gladiator.hp,
    maxHpOf(gladiator),
    gladiator.deck,
    enemyById(contract.enemyId),
    contract.tier,
    seed,
    damageBonus(gladiator),
    startingFavor(gladiator),
  )
}

/**
 * Applies a finished bout to the school.
 *
 * A fight costs a day and leaves the fighter tired and hungry whatever the
 * result, which is what connects the arena to the calendar.
 */
export function settleBout(
  state: LudusState,
  gladiator: Gladiator,
  contract: Contract,
  combat: Combat,
): BoutOutcome {
  gladiator.hp = Math.max(0, combat.player.hp)
  gladiator.fights += 1
  gladiator.fatigue = Math.min(100, gladiator.fatigue + 30)
  gladiator.fed = Math.max(0, gladiator.fed - 20)

  if (combat.outcome === 'won') {
    const purse = Math.round(contract.purse * combat.payoutMultiplier)
    const fame = Math.round(combat.favor / 8) + contract.tier * 2
    state.coin += purse
    state.fame += fame
    state.fightsWon += 1
    state.best = Math.max(state.best, gladiator.wins + 1)
    gladiator.wins += 1
    if (gladiator.hp <= 0) gladiator.hp = 1
    return {
      won: true,
      survived: true,
      purse,
      fame,
      favor: combat.favor,
      epitaph: `${gladiator.name} takes the purse.`,
    }
  }

  // Lost. The crowd decides whether that costs a season or a life.
  if (combat.mercy) {
    gladiator.hp = Math.max(1, Math.round(maxHpOf(gladiator) * 0.25))
    const fame = Math.round(combat.favor / 14)
    state.fame += fame
    return {
      won: false,
      survived: true,
      purse: 0,
      fame,
      favor: combat.favor,
      epitaph: 'Missio. The crowd turned their thumbs and he walks out.',
    }
  }

  gladiator.dead = true
  gladiator.hp = 0
  state.graves.unshift({
    name: gladiator.name,
    wins: gladiator.wins,
    epitaph: 'The crowd wanted blood. They got it.',
    day: state.day,
  })
  return {
    won: false,
    survived: false,
    purse: 0,
    fame: 0,
    favor: combat.favor,
    epitaph: 'The crowd wanted blood. They got it.',
  }
}
