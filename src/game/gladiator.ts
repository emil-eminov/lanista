import { STARTER_DECK } from './cards'
import type { FighterClass } from '../render/portrait'

/**
 * A fighter in your ludus.
 *
 * Condition is the heart of the management layer: a gladiator who is exhausted
 * or hungry cannot train and fights badly, so the calendar between fights is a
 * real resource rather than a menu you click through.
 */
export interface Gladiator {
  readonly id: string
  readonly name: string
  /** Drives the portrait, so the same man always has the same face. */
  readonly seed: number
  readonly kind: FighterClass
  /** Raises damage. */
  might: number
  /** Raises maximum health. */
  vigour: number
  /** Raises starting crowd favour and the odds of a good draw. */
  cunning: number
  hp: number
  /** 0 fresh, 100 wrecked. Training and work add it, rest removes it. */
  fatigue: number
  /** 100 well fed, 0 starving. Everything drains it; food restores it. */
  fed: number
  fights: number
  wins: number
  deck: string[]
  /** Set once they are dead, so the roster can show a grave. */
  dead?: boolean
}

export const MAX_STAT = 20

/** Below this, a gladiator is too tired to train. */
export const TRAIN_FATIGUE_LIMIT = 70

/** Below this, a gladiator is too hungry to train. */
export const TRAIN_FED_MINIMUM = 40

const FIRST_NAMES = [
  'Verus', 'Priscus', 'Spiculus', 'Flamma', 'Crixus', 'Tetraites', 'Hermes',
  'Carpophorus', 'Rutuba', 'Triumphus', 'Aeternus', 'Bato', 'Columbus', 'Danaos',
  'Felix', 'Glaucus', 'Marcus', 'Narcissus', 'Optatus', 'Pugnax',
]

const EPITHETS = ['the Gaul', 'of Capua', 'the Thracian', 'One-Eye', 'the Younger', 'of Ostia', 'the Bull', 'the Quiet']

const KINDS: readonly FighterClass[] = ['murmillo', 'thraex', 'retiarius', 'secutor']

/** Maximum health derived from vigour, so buying a tough fighter means something. */
export function maxHpOf(gladiator: Pick<Gladiator, 'vigour'>): number {
  return 46 + gladiator.vigour * 3
}

/**
 * How much condition drags on performance.
 *
 * Fatigue is the sharper penalty because it is the one the player controls day
 * to day; hunger is a slower failure of management.
 */
export function conditionMultiplier(gladiator: Pick<Gladiator, 'fatigue' | 'fed'>): number {
  const tired = 1 - (gladiator.fatigue / 100) * 0.35
  const hungry = gladiator.fed >= 50 ? 1 : 1 - ((50 - gladiator.fed) / 50) * 0.25
  return Math.max(0.4, tired * hungry)
}

/** Damage bonus taken into the arena. */
export function damageBonus(gladiator: Gladiator): number {
  return Math.round(gladiator.might * 0.6 * conditionMultiplier(gladiator))
}

/**
 * Crowd favour a fighter walks in with.
 *
 * A base plus a cunning bonus, not cunning alone: derived purely from the stat,
 * a low-cunning fighter started near zero and could never reach the mercy line,
 * which quietly turned every loss into a death for half the roster.
 */
export function startingFavor(gladiator: Gladiator): number {
  return Math.round(16 + gladiator.cunning * 1.3)
}

export function canTrain(gladiator: Gladiator): { ok: boolean; reason?: string } {
  if (gladiator.dead) return { ok: false, reason: 'dead' }
  if (gladiator.fed < TRAIN_FED_MINIMUM) return { ok: false, reason: 'too hungry to train' }
  if (gladiator.fatigue > TRAIN_FATIGUE_LIMIT) return { ok: false, reason: 'too tired to train' }
  return { ok: true }
}

/**
 * What a fighter is worth.
 *
 * Used both for what the market charges and for what it pays, with a margin
 * applied on the way in. Buying cheap, training, and selling on is the actual
 * business of a lanista, so the two prices have to come from the same formula.
 */
export function valueOf(gladiator: Gladiator): number {
  const stats = gladiator.might * 9 + gladiator.vigour * 8 + gladiator.cunning * 7
  const record = gladiator.wins * 14
  const condition = 0.75 + conditionMultiplier(gladiator) * 0.25
  return Math.max(20, Math.round((60 + stats + record) * condition))
}

export function createGladiator(rng: () => number, tier: number): Gladiator {
  const roll = (): number => 3 + Math.floor(rng() * 5) + Math.floor(tier * 2.2)
  const name = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)] ?? 'Verus'
  const epithet = rng() > 0.5 ? ` ${EPITHETS[Math.floor(rng() * EPITHETS.length)]}` : ''
  const gladiator: Gladiator = {
    id: `g${Math.floor(rng() * 1e9)}`,
    name: `${name}${epithet}`,
    seed: Math.floor(rng() * 1e9),
    kind: KINDS[Math.floor(rng() * KINDS.length)] ?? 'murmillo',
    might: Math.min(MAX_STAT, roll()),
    vigour: Math.min(MAX_STAT, roll()),
    cunning: Math.min(MAX_STAT, roll()),
    hp: 0,
    fatigue: Math.floor(rng() * 20),
    fed: 70 + Math.floor(rng() * 25),
    fights: 0,
    wins: 0,
    deck: [...STARTER_DECK],
  }
  gladiator.hp = maxHpOf(gladiator)
  return gladiator
}
