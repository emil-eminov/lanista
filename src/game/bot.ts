import { CARDS_BY_ID } from './cards'
import { Combat, MERCY_THRESHOLD } from './combat'

/**
 * A scripted player, good enough to be a fair test subject.
 *
 * Balance in a deckbuilder cannot be judged from the card text. The bot plays
 * whole seasons so CI can answer questions that matter: can a run be won at
 * all, does it end too early, and does the crowd mechanic actually bite, or can
 * a competent player simply ignore it and block their way through.
 */

/** How much damage the enemy is about to do, so the bot knows when to guard. */
export function incomingDamage(combat: Combat): number {
  const intent = combat.intent
  if (!intent.damage) return 0
  const withEdge = intent.damage + combat.enemy.statuses.edge
  const perHit = combat.enemy.statuses.stagger > 0 ? Math.ceil(withEdge / 2) : withEdge
  return perHit * (intent.hits ?? 1)
}

function score(combat: Combat, id: string): number {
  const def = CARDS_BY_ID[id]
  if (!def) return -Infinity
  const incoming = incomingDamage(combat)
  const exposed = Math.max(0, incoming - combat.player.block)
  const lethal = combat.player.hp <= exposed

  let value = 0

  // Damage is worth more when it can finish the fight outright.
  const damage = (def.damage ?? 0) * (def.hits ?? 1)
  const canKill = damage >= combat.enemy.hp + combat.enemy.block
  value += damage * (canKill ? 6 : 1)
  if (def.id === 'shieldbash') value += combat.player.block

  // Guard hard only when the next blow would actually land, and harder still
  // when it would be fatal.
  if (def.block) value += Math.min(def.block, exposed) * (lethal ? 8 : 1.6)

  // Chase the crowd when losing would otherwise be fatal, since favour is the
  // difference between a dead gladiator and a wounded one.
  const favorUrgency = combat.favor < MERCY_THRESHOLD ? (lethal ? 4 : 1.2) : 0.4
  value += def.favor * favorUrgency

  value += (def.draw ?? 0) * 3 + (def.energy ?? 0) * 4
  value += (def.edge ?? 0) * 2 + (def.bleed ?? 0) * 1.5 + (def.stagger ?? 0) * 2

  // Self-harm is only worth it while healthy.
  if (def.id === 'salute' || def.id === 'showboat') {
    if (combat.player.hp < 15) value -= 40
  }

  return value - def.cost * 2
}

/** Plays one full player turn, then ends it. */
export function botTakeTurn(combat: Combat): void {
  let guard = 0
  while (combat.outcome === 'fighting' && guard++ < 40) {
    const options = combat.hand.filter((id) => combat.playable(id).ok)
    if (options.length === 0) break
    let best = options[0]!
    let bestScore = score(combat, best)
    for (const id of options.slice(1)) {
      const value = score(combat, id)
      if (value > bestScore) {
        best = id
        bestScore = value
      }
    }
    if (bestScore <= 0 && combat.player.block >= incomingDamage(combat)) break
    combat.play(best)
  }
  combat.endTurn()
}

export function botFight(combat: Combat, maxTurns = 60): Combat {
  let turns = 0
  while (combat.outcome === 'fighting' && turns++ < maxTurns) botTakeTurn(combat)
  return combat
}

/**
 * Which reward a competent player would take.
 *
 * The first version of this always took the first option, which meant it never
 * rested once in forty seasons and then reported the game as unwinnable. A bad
 * test subject produces confident, wrong balance data.
 */
export function botChooseReward(
  rewards: readonly { kind: string; amount?: number }[],
  hp: number,
  maxHp: number,
): number {
  if (hp < maxHp * 0.55) {
    const heal = rewards.findIndex((r) => r.kind === 'heal')
    if (heal >= 0) return heal
  }
  const card = rewards.findIndex((r) => r.kind === 'card')
  return card >= 0 ? card : 0
}
