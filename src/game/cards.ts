import type { CardDef } from './types'

/**
 * The card pool.
 *
 * Favour is the design lever that makes this a gladiator game rather than a
 * generic deckbuilder: plain attacks pay a little, defensive cards pay nothing,
 * and the flourishes that pay well are the ones that leave you exposed.
 */
export const CARDS: readonly CardDef[] = [
  // Starter deck
  { id: 'jab', name: 'Jab', kind: 'attack', cost: 1, text: 'Deal 6.', damage: 6, favor: 1 },
  { id: 'guard', name: 'Guard', kind: 'guard', cost: 1, text: 'Gain 6 block.', block: 6, favor: 0 },
  {
    id: 'sidestep',
    name: 'Sidestep',
    kind: 'guard',
    cost: 1,
    text: 'Gain 4 block. Draw 1.',
    block: 4,
    draw: 1,
    favor: 0,
  },

  // Attacks
  { id: 'gladius', name: 'Gladius', kind: 'attack', cost: 2, text: 'Deal 13.', damage: 13, favor: 2 },
  {
    id: 'flurry',
    name: 'Flurry',
    kind: 'attack',
    cost: 2,
    text: 'Deal 4 three times.',
    damage: 4,
    hits: 3,
    favor: 4,
  },
  {
    id: 'gut',
    name: 'Gut Him',
    kind: 'attack',
    cost: 1,
    text: 'Deal 4. Apply 4 bleed.',
    damage: 4,
    bleed: 4,
    favor: 3,
  },
  {
    id: 'shieldbash',
    name: 'Shield Bash',
    kind: 'attack',
    cost: 1,
    text: 'Deal damage equal to your block.',
    damage: 0,
    favor: 1,
  },
  {
    id: 'trident',
    name: 'Trident',
    kind: 'attack',
    cost: 2,
    text: 'Deal 9. Apply 2 stagger.',
    damage: 9,
    stagger: 2,
    favor: 3,
  },

  // Flourishes: expensive, showy, and the main source of favour
  {
    id: 'salute',
    name: 'Salute the Crowd',
    kind: 'flourish',
    cost: 0,
    text: 'Gain 12 favour. Lose 3 hp.',
    favor: 12,
    exhaust: true,
  },
  {
    id: 'showboat',
    name: 'Showboat',
    kind: 'flourish',
    cost: 1,
    text: 'Deal 7. Gain 8 favour. You take 3.',
    damage: 7,
    favor: 8,
  },
  {
    id: 'execution',
    name: 'Execution',
    kind: 'flourish',
    cost: 3,
    text: 'Deal 22. Gain 10 favour.',
    damage: 22,
    favor: 10,
    exhaust: true,
  },
  {
    id: 'riposte',
    name: 'Riposte',
    kind: 'flourish',
    cost: 1,
    text: 'Deal 9. Gain 5 favour. Needs block.',
    damage: 9,
    favor: 5,
  },

  // Skills
  { id: 'whetstone', name: 'Whetstone', kind: 'skill', cost: 1, text: 'Gain 3 edge.', edge: 3, favor: 0 },
  {
    id: 'secondwind',
    name: 'Second Wind',
    kind: 'skill',
    cost: 1,
    text: 'Draw 2. Gain 1 energy.',
    draw: 2,
    energy: 1,
    favor: 0,
  },
  {
    id: 'dirtytrick',
    name: 'Sand In The Eyes',
    kind: 'skill',
    cost: 0,
    text: 'Apply 3 stagger. Lose 6 favour.',
    stagger: 3,
    favor: -6,
  },
  {
    id: 'brace',
    name: 'Brace',
    kind: 'guard',
    cost: 2,
    text: 'Gain 14 block.',
    block: 14,
    favor: 0,
  },
]

export const CARDS_BY_ID: Readonly<Record<string, CardDef>> = Object.fromEntries(
  CARDS.map((card) => [card.id, card]),
)

export function card(id: string): CardDef {
  const found = CARDS_BY_ID[id]
  if (!found) throw new Error(`Unknown card "${id}"`)
  return found
}

/** What every new gladiator starts with. Deliberately dull, so upgrades feel earned. */
export const STARTER_DECK: readonly string[] = [
  'jab',
  'jab',
  'jab',
  'jab',
  'guard',
  'guard',
  'guard',
  'sidestep',
  'gladius',
  'gut',
]

/** Cards that can be offered as a reward. The starter filler is excluded. */
export const REWARD_POOL: readonly string[] = CARDS.filter(
  (c) => !['jab', 'guard', 'sidestep'].includes(c.id),
).map((c) => c.id)
