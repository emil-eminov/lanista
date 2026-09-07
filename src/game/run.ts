import { Combat } from './combat'
import { REWARD_POOL, STARTER_DECK } from './cards'
import { enemyById, SEASON } from './enemies'
import { createRng, sample } from './rng'

/**
 * A run is one gladiator's career through a season.
 *
 * The gladiator is mortal; the ludus is not. Losing with the crowd behind you
 * costs the season. Losing without them costs the fighter.
 */

export type RunPhase = 'BRIEFING' | 'FIGHT' | 'REWARD' | 'OVER'

export interface RunResult {
  readonly survived: boolean
  readonly fightsWon: number
  readonly coin: number
  readonly reputation: number
  readonly epitaph: string
}

const NAMES = [
  'Verus',
  'Priscus',
  'Spiculus',
  'Flamma',
  'Crixus',
  'Tetraites',
  'Hermes',
  'Carpophorus',
  'Rutuba',
  'Triumphus',
]

export interface Reward {
  readonly kind: 'card' | 'heal' | 'coin'
  readonly id?: string
  readonly amount?: number
  readonly label: string
  readonly detail: string
}

export class Run {
  readonly name: string
  deck: string[] = [...STARTER_DECK]
  hp = 70
  maxHp = 70
  fightIndex = 0
  coin = 0
  reputation = 0
  phase: RunPhase = 'BRIEFING'
  combat: Combat | undefined
  rewards: Reward[] = []
  result: RunResult | undefined
  private readonly rng: () => number

  constructor(seed = Date.now() >>> 0) {
    this.rng = createRng(seed)
    this.name = NAMES[Math.floor(this.rng() * NAMES.length)] ?? 'Verus'
  }

  get opponentId(): string {
    return SEASON[Math.min(this.fightIndex, SEASON.length - 1)]!
  }

  get fightsRemaining(): number {
    return SEASON.length - this.fightIndex
  }

  beginFight(): void {
    if (this.phase !== 'BRIEFING') return
    this.combat = new Combat(
      this.name,
      this.hp,
      this.maxHp,
      this.deck,
      enemyById(this.opponentId),
      this.fightIndex,
      Math.floor(this.rng() * 2 ** 30),
    )
    this.phase = 'FIGHT'
  }

  /** Called once the current combat has resolved. */
  settle(): void {
    const combat = this.combat
    if (!combat || this.phase !== 'FIGHT' || combat.outcome === 'fighting') return
    this.hp = combat.player.hp

    if (combat.outcome === 'won') {
      const purse = Math.round(combat.enemyDef.purse * combat.payoutMultiplier)
      this.coin += purse
      this.reputation += Math.round(combat.favor / 10)
      this.fightIndex += 1
      if (this.fightIndex >= SEASON.length) {
        this.finish(true, 'Freed by the editor. The wooden sword is his.')
      } else {
        this.rewards = this.rollRewards()
        this.phase = 'REWARD'
      }
      return
    }

    // Lost. Whether that is the end of a season or the end of a life is the
    // crowd's decision, and the crowd has been watching how you fight.
    if (combat.mercy) {
      this.hp = Math.max(1, Math.round(this.maxHp * 0.3))
      this.finish(true, 'Missio. The crowd turned their thumbs and he walks out.')
    } else {
      this.finish(false, 'The crowd wanted blood. They got it.')
    }
  }

  private finish(survived: boolean, epitaph: string): void {
    this.result = {
      survived,
      fightsWon: this.fightIndex,
      coin: this.coin,
      reputation: this.reputation,
      epitaph,
    }
    this.phase = 'OVER'
  }

  private rollRewards(): Reward[] {
    const cards = sample(this.rng, REWARD_POOL, 2)
    const rewards: Reward[] = cards.map((id) => ({
      kind: 'card' as const,
      id,
      label: 'Train',
      detail: id,
    }))
    const heal = Math.round(this.maxHp * 0.35)
    rewards.push({ kind: 'heal', amount: heal, label: 'Rest', detail: `Recover ${heal} hp` })
    return rewards
  }

  takeReward(index: number): void {
    if (this.phase !== 'REWARD') return
    const reward = this.rewards[index]
    if (!reward) return
    if (reward.kind === 'card' && reward.id) this.deck.push(reward.id)
    if (reward.kind === 'heal') this.hp = Math.min(this.maxHp, this.hp + (reward.amount ?? 0))
    if (reward.kind === 'coin') this.coin += reward.amount ?? 0
    this.rewards = []
    this.phase = 'BRIEFING'
  }
}
