export type Target = 'enemy' | 'self'

/** Statuses are deliberately few. Every one has to be readable on a phone. */
export interface Statuses {
  /** Damage dealt at the start of the owner's turn, then decays by one. */
  bleed: number
  /** Added to the damage of every attack the owner plays this fight. */
  edge: number
  /** Halves outgoing damage while it lasts, then decays by one. */
  stagger: number
}

export function noStatuses(): Statuses {
  return { bleed: 0, edge: 0, stagger: 0 }
}

export interface Combatant {
  name: string
  hp: number
  maxHp: number
  block: number
  statuses: Statuses
}

export type CardKind = 'attack' | 'guard' | 'flourish' | 'skill'

export interface CardDef {
  readonly id: string
  readonly name: string
  readonly kind: CardKind
  readonly cost: number
  /** One line, shown on the card. Written for a player reading in one second. */
  readonly text: string
  readonly damage?: number
  readonly hits?: number
  readonly block?: number
  readonly bleed?: number
  readonly edge?: number
  readonly stagger?: number
  readonly draw?: number
  readonly energy?: number
  /**
   * Crowd favour this card earns when played. Showy cards pay, turtling does
   * not, and a couple of cards deliberately cost favour for raw efficiency.
   */
  readonly favor: number
  /** Removed from the deck for the rest of the fight once played. */
  readonly exhaust?: boolean
}
