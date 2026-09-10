import { card, CARDS_BY_ID } from './cards'
import { createRng, shuffle } from './rng'
import { scaleEnemy, type EnemyDef, type Intent } from './enemies'
import { noStatuses, type CardDef, type Combatant } from './types'

/** Energy per turn. The tightest number in the game: every card is priced against it. */
export const ENERGY_PER_TURN = 3
export const HAND_SIZE = 5

export const FAVOR_MAX = 100
export const FAVOR_START = 30

/**
 * Favour lost at the end of a turn in which the player earned none.
 *
 * This is what stops the game collapsing into block-forever, which is the
 * degenerate strategy in most deckbuilders. A turtle does not merely fail to
 * gain favour, they actively lose the crowd.
 */
export const BOREDOM = 5

/** At or above this when you lose, the crowd calls for mercy and you live. */
export const MERCY_THRESHOLD = 50

export type Side = 'player' | 'enemy'
export type Outcome = 'fighting' | 'won' | 'lost'

export interface LogEntry {
  readonly text: string
  readonly side: Side
}

export class Combat {
  readonly player: Combatant
  readonly enemy: Combatant
  readonly log: LogEntry[] = []
  draw: string[] = []
  hand: string[] = []
  discard: string[] = []
  exhausted: string[] = []
  energy = ENERGY_PER_TURN
  favor = FAVOR_START
  turn = 1
  outcome: Outcome = 'fighting'
  private intentIndex = 0
  private favorThisTurn = 0
  private readonly rng: () => number

  constructor(
    playerName: string,
    playerHp: number,
    playerMaxHp: number,
    deck: readonly string[],
    readonly enemyDef: EnemyDef,
    fightIndex = 0,
    seed = 1,
    /** Added to every attack, from the fighter's might and condition. */
    private readonly bonusDamage = 0,
    /** Favour a well-known showman starts with, from cunning. */
    startingFavor = FAVOR_START,
  ) {
    this.rng = createRng(seed)
    this.favor = Math.max(0, Math.min(FAVOR_MAX, startingFavor))
    const scaled = scaleEnemy(enemyDef, fightIndex)
    this.enemyDef = scaled
    this.player = { name: playerName, hp: playerHp, maxHp: playerMaxHp, block: 0, statuses: noStatuses() }
    this.enemy = { name: scaled.name, hp: scaled.hp, maxHp: scaled.hp, block: 0, statuses: noStatuses() }
    this.draw = shuffle(this.rng, deck)
    this.startPlayerTurn(true)
  }

  /** What the opponent will do next. Shown before the player acts. */
  get intent(): Intent {
    return this.enemyDef.pattern[this.intentIndex % this.enemyDef.pattern.length]!
  }

  private note(text: string, side: Side): void {
    this.log.push({ text, side })
    if (this.log.length > 40) this.log.shift()
  }

  private drawCards(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.draw.length === 0) {
        if (this.discard.length === 0) return
        this.draw = shuffle(this.rng, this.discard)
        this.discard = []
      }
      const next = this.draw.pop()
      if (next) this.hand.push(next)
    }
  }

  private startPlayerTurn(first = false): void {
    if (!first) this.turn += 1
    this.energy = ENERGY_PER_TURN
    this.player.block = 0
    this.favorThisTurn = 0
    this.tickBleed(this.player, 'player')
    if (this.outcome !== 'fighting') return
    this.drawCards(HAND_SIZE)
  }

  private tickBleed(who: Combatant, side: Side): void {
    if (who.statuses.bleed <= 0) return
    who.hp -= who.statuses.bleed
    this.note(`${who.name} bleeds for ${who.statuses.bleed}.`, side)
    who.statuses.bleed -= 1
    this.checkDeaths()
  }

  /** Outgoing damage after edge and stagger. */
  private outgoing(attacker: Combatant, base: number): number {
    const bonus = attacker === this.player ? this.bonusDamage : 0
    const withEdge = base + attacker.statuses.edge + bonus
    return attacker.statuses.stagger > 0 ? Math.ceil(withEdge / 2) : withEdge
  }

  private applyDamage(target: Combatant, amount: number, side: Side): number {
    const absorbed = Math.min(target.block, amount)
    target.block -= absorbed
    const through = amount - absorbed
    target.hp -= through
    this.note(`${target.name} takes ${through}${absorbed > 0 ? ` (${absorbed} blocked)` : ''}.`, side)
    this.checkDeaths()
    return through
  }

  private checkDeaths(): void {
    if (this.outcome !== 'fighting') return
    if (this.enemy.hp <= 0) {
      this.enemy.hp = 0
      this.outcome = 'won'
      this.note(`${this.enemy.name} falls.`, 'enemy')
    } else if (this.player.hp <= 0) {
      this.player.hp = 0
      this.outcome = 'lost'
      this.note(`${this.player.name} goes down.`, 'player')
    }
  }

  /** Whether a card can be played right now, and why not if it cannot. */
  playable(id: string): { ok: boolean; reason?: string } {
    const def = CARDS_BY_ID[id]
    if (!def) return { ok: false, reason: 'unknown card' }
    if (this.outcome !== 'fighting') return { ok: false, reason: 'the fight is over' }
    if (!this.hand.includes(id)) return { ok: false, reason: 'not in hand' }
    if (def.cost > this.energy) return { ok: false, reason: 'not enough energy' }
    // Riposte is a counter: it only exists if you are behind a guard.
    if (def.id === 'riposte' && this.player.block <= 0) return { ok: false, reason: 'needs block' }
    return { ok: true }
  }

  play(id: string): boolean {
    if (!this.playable(id).ok) return false
    const def = card(id)
    this.energy -= def.cost
    this.hand.splice(this.hand.indexOf(id), 1)
    this.resolve(def)
    if (def.exhaust) this.exhausted.push(id)
    else this.discard.push(id)
    this.gainFavor(def.favor)
    return true
  }

  private resolve(def: CardDef): void {
    if (def.block) {
      this.player.block += def.block
      this.note(`${this.player.name} guards for ${def.block}.`, 'player')
    }
    if (def.edge) this.player.statuses.edge += def.edge
    if (def.draw) this.drawCards(def.draw)
    if (def.energy) this.energy += def.energy

    // The few cards whose behaviour is not expressible as plain numbers.
    if (def.id === 'shieldbash') {
      const amount = this.outgoing(this.player, this.player.block)
      if (amount > 0) this.applyDamage(this.enemy, amount, 'enemy')
      return
    }
    if (def.id === 'salute') {
      this.player.hp -= 3
      this.note('The crowd roars.', 'player')
      this.checkDeaths()
      return
    }
    if (def.id === 'showboat') {
      this.applyDamage(this.enemy, this.outgoing(this.player, def.damage ?? 0), 'enemy')
      this.player.hp -= 3
      this.note('Showing off leaves you open.', 'player')
      this.checkDeaths()
      return
    }

    if (def.damage) {
      for (let i = 0; i < (def.hits ?? 1); i++) {
        if (this.outcome !== 'fighting') break
        this.applyDamage(this.enemy, this.outgoing(this.player, def.damage), 'enemy')
      }
    }
    if (def.bleed) this.enemy.statuses.bleed += def.bleed
    if (def.stagger) this.enemy.statuses.stagger += def.stagger
  }

  private gainFavor(amount: number): void {
    if (amount === 0) return
    this.favor = Math.max(0, Math.min(FAVOR_MAX, this.favor + amount))
    if (amount > 0) this.favorThisTurn += amount
  }

  endTurn(): void {
    if (this.outcome !== 'fighting') return
    // The crowd came to see a fight, not a siege.
    if (this.favorThisTurn === 0) {
      this.favor = Math.max(0, this.favor - BOREDOM)
      this.note('The crowd grows restless.', 'enemy')
    }
    this.discard.push(...this.hand)
    this.hand = []
    this.enemyTurn()
    if (this.outcome === 'fighting') this.startPlayerTurn()
  }

  private enemyTurn(): void {
    this.enemy.block = 0
    this.tickBleed(this.enemy, 'enemy')
    if (this.outcome !== 'fighting') return

    const intent = this.intent
    this.note(`${this.enemy.name}: ${intent.label}.`, 'enemy')
    if (intent.block) this.enemy.block += intent.block
    if (intent.edge) this.enemy.statuses.edge += intent.edge
    if (intent.bleed) this.player.statuses.bleed += intent.bleed
    if (intent.damage) {
      for (let i = 0; i < (intent.hits ?? 1); i++) {
        if (this.outcome !== 'fighting') break
        this.applyDamage(this.player, this.outgoing(this.enemy, intent.damage), 'player')
      }
    }
    if (this.enemy.statuses.stagger > 0) this.enemy.statuses.stagger -= 1
    this.intentIndex += 1
  }

  /** True when losing this fight still leaves the gladiator alive. */
  get mercy(): boolean {
    return this.favor >= MERCY_THRESHOLD
  }

  /** Purse multiplier from crowd favour. A dull win pays badly. */
  get payoutMultiplier(): number {
    return 0.5 + (this.favor / FAVOR_MAX) * 1.5
  }
}
