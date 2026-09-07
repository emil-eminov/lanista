import type { Statuses } from './types'

export type IntentKind = 'attack' | 'block' | 'buff' | 'debuff'

export interface Intent {
  readonly kind: IntentKind
  /** Shown to the player before they act. Telegraphing is what makes this a puzzle. */
  readonly label: string
  readonly damage?: number
  readonly hits?: number
  readonly block?: number
  readonly edge?: number
  readonly bleed?: number
}

export interface EnemyDef {
  readonly id: string
  readonly name: string
  readonly hp: number
  /** Reputation and coin awarded for the win. */
  readonly purse: number
  /** Chosen by turn number, so an opponent has a readable rhythm. */
  readonly pattern: readonly Intent[]
}

export const ENEMIES: readonly EnemyDef[] = [
  {
    id: 'tiro',
    name: 'Tiro',
    hp: 32,
    purse: 18,
    pattern: [
      { kind: 'attack', label: 'Swing', damage: 7 },
      { kind: 'attack', label: 'Swing', damage: 7 },
      { kind: 'block', label: 'Cover', block: 6 },
    ],
  },
  {
    id: 'thraex',
    name: 'Thraex',
    hp: 46,
    purse: 26,
    pattern: [
      { kind: 'attack', label: 'Curved cut', damage: 10 },
      { kind: 'attack', label: 'Two cuts', damage: 5, hits: 2 },
      { kind: 'block', label: 'Small shield', block: 8 },
      { kind: 'attack', label: 'Curved cut', damage: 10 },
    ],
  },
  {
    id: 'retiarius',
    name: 'Retiarius',
    hp: 40,
    purse: 30,
    pattern: [
      { kind: 'debuff', label: 'Cast net', bleed: 4 },
      { kind: 'attack', label: 'Trident jab', damage: 9 },
      { kind: 'attack', label: 'Trident jab', damage: 9 },
      { kind: 'block', label: 'Back away', block: 5 },
    ],
  },
  {
    id: 'murmillo',
    name: 'Murmillo',
    hp: 62,
    purse: 38,
    pattern: [
      { kind: 'block', label: 'Raise scutum', block: 12 },
      { kind: 'attack', label: 'Heavy chop', damage: 14 },
      { kind: 'attack', label: 'Heavy chop', damage: 14 },
      { kind: 'buff', label: 'Sharpen', edge: 3 },
    ],
  },
  {
    id: 'secutor',
    name: 'Secutor',
    hp: 74,
    purse: 46,
    pattern: [
      { kind: 'attack', label: 'Relentless', damage: 6, hits: 3 },
      { kind: 'buff', label: 'Press in', edge: 4 },
      { kind: 'attack', label: 'Relentless', damage: 8, hits: 3 },
      { kind: 'block', label: 'Helm down', block: 10 },
    ],
  },
  {
    id: 'champion',
    name: 'Champion of the Ludus Magnus',
    // Tuned down from 110 health and a 26 damage finisher, at which point no
    // bot finished a season in forty attempts: that is a wall, not a boss.
    hp: 92,
    purse: 90,
    pattern: [
      { kind: 'attack', label: 'Opening', damage: 12 },
      { kind: 'buff', label: 'Salute', edge: 5 },
      { kind: 'attack', label: 'Combination', damage: 9, hits: 3 },
      { kind: 'block', label: 'Recover', block: 16 },
      { kind: 'attack', label: 'Killing blow', damage: 20 },
    ],
  },
]

export function enemyById(id: string): EnemyDef {
  const found = ENEMIES.find((e) => e.id === id)
  if (!found) throw new Error(`Unknown enemy "${id}"`)
  return found
}

/**
 * Opponents for a season, in order. Difficulty rises, and the last fight is the
 * champion, so a run has a shape rather than just getting numerically harder.
 */
export const SEASON: readonly string[] = [
  'tiro',
  'thraex',
  'retiarius',
  'thraex',
  'murmillo',
  'retiarius',
  'secutor',
  'champion',
]

/**
 * Scales an opponent up for later appearances in a season.
 *
 * Kept small on purpose. The season already escalates by fielding tougher
 * opponents, and stacking a steep multiplier on top of that double-dips: at
 * 12% per fight the champion arrived with 202 health and no bot ever finished
 * a season in forty attempts.
 */
export function scaleEnemy(def: EnemyDef, fightIndex: number): EnemyDef {
  const factor = 1 + fightIndex * 0.05
  return { ...def, hp: Math.round(def.hp * factor), purse: Math.round(def.purse * factor) }
}

export function statusesFor(): Statuses {
  return { bleed: 0, edge: 0, stagger: 0 }
}
