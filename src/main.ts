import { STYLES } from './ui/styles'
import { renderAftermath, renderArena, renderFight, renderLudus, renderMarket } from './ui/view'
import { advanceDay, buy, loadLudus, saveLudus, sell, type DayAction, type LudusState } from './game/ludus'
import { settleBout, startBout, type BoutOutcome } from './game/bout'
import { card } from './game/cards'
import type { Combat } from './game/combat'
import type { Gladiator } from './game/gladiator'
import { initAudio, isMuted, sfx, toggleMuted } from './audio/sfx'

type Screen = 'ludus' | 'market' | 'arena' | 'fight' | 'aftermath'

declare global {
  interface Window {
    __lanista?: {
      screen(): Screen
      state(): {
        day: number
        coin: number
        fame: number
        roster: number
        favor: number
        played: number
        hand: string[]
      }
      go(screen: Screen): void
      assign(id: string, action: DayAction): void
      nextDay(): void
      play(index: number): void
      endTurn(): void
      autoFight(): void
    }
  }
}

const style = document.createElement('style')
style.textContent = STYLES
document.head.append(style)

const app = document.createElement('div')
app.id = 'app'
document.body.append(app)

const ludus: LudusState = loadLudus()
let screen: Screen = 'ludus'
let assignments: Record<string, DayAction> = {}
let notes: string[] = []
/** Which fighters have their training options open. Not an assignment. */
const expanded = new Set<string>()
let chosenFighter: string | undefined
let fighting: { gladiator: Gladiator; contractId: string; combat: Combat } | undefined
let outcome: { gladiator: Gladiator; result: BoutOutcome } | undefined

document.addEventListener('pointerdown', () => initAudio(), { once: true })

function pop(text: string, mine: boolean): void {
  const arena = app.querySelector('[data-arena]')
  if (!arena) return
  const node = document.createElement('div')
  node.className = `pop ${mine ? 'mine' : ''}`
  node.textContent = text
  arena.append(node)
  setTimeout(() => node.remove(), 700)
}

function shake(): void {
  app.classList.remove('shake')
  void app.offsetWidth
  app.classList.add('shake')
}

function render(): void {
  if (screen === 'fight' && fighting) {
    app.innerHTML = renderFight(fighting.gladiator, fighting.combat)
  } else if (screen === 'aftermath' && outcome) {
    app.innerHTML = renderAftermath(outcome.gladiator, outcome.result)
  } else if (screen === 'market') {
    app.innerHTML = renderMarket(ludus)
  } else if (screen === 'arena') {
    app.innerHTML = renderArena(ludus, chosenFighter)
  } else {
    app.innerHTML = renderLudus(ludus, assignments, notes, expanded)
  }
  saveLudus(ludus)
}

function playCard(index: number): void {
  if (!fighting) return
  const { combat } = fighting
  const id = combat.hand[index]
  if (!id) return
  const def = card(id)
  const enemyBefore = combat.enemy.hp
  const meBefore = combat.player.hp
  const favorBefore = combat.favor
  if (!combat.play(id)) return

  const dealt = enemyBefore - combat.enemy.hp
  const taken = meBefore - combat.player.hp
  if (dealt > 0) {
    pop(`-${dealt}`, false)
    sfx.hit()
    shake()
  } else if (def.block) sfx.guard()
  else sfx.skill()
  if (taken > 0) pop(`-${taken}`, true)
  if (combat.favor > favorBefore) sfx.roar(Math.min(1, (combat.favor - favorBefore) / 10))

  finishIfOver()
}

function endTurn(): void {
  if (!fighting) return
  const { combat } = fighting
  const before = combat.player.hp
  const favorBefore = combat.favor
  combat.endTurn()
  const taken = before - combat.player.hp
  if (taken > 0) {
    pop(`-${taken}`, true)
    sfx.hit()
    shake()
  } else if (combat.outcome === 'fighting') sfx.blocked()
  if (combat.favor < favorBefore) sfx.restless()
  finishIfOver()
}

function finishIfOver(): void {
  if (!fighting) return render()
  const { combat, gladiator, contractId } = fighting
  if (combat.outcome === 'fighting') return render()

  const contract = ludus.contracts.find((c) => c.id === contractId)
  if (!contract) return render()
  const result = settleBout(ludus, gladiator, contract, combat)
  // A bout costs a day like anything else, so the arena competes with training.
  notes = advanceDay(ludus, {})
  ludus.contracts = ludus.contracts.filter((c) => c.id !== contractId)
  outcome = { gladiator, result }
  fighting = undefined
  screen = 'aftermath'
  if (result.won) sfx.win()
  else if (result.survived) sfx.mercy()
  else sfx.death()
  render()
}

app.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest(
    '[data-tab],[data-assign],[data-nextday],[data-buy],[data-sell],[data-choose],[data-fight],[data-card],[data-endturn],[data-sound],[data-back]',
  )
  if (!(target instanceof HTMLElement)) return
  initAudio()
  const data = target.dataset

  if (data['tab']) {
    screen = data['tab'] as Screen
    return render()
  }
  if (data['assign']) {
    const [id, action] = data['assign'].split(':')
    if (id && action) {
      if (action === 'train') {
        // Train only opens and closes the stat choices. It assigns nothing, so
        // tapping a stat is always a selection rather than a toggle-off.
        const current = assignments[id]
        const wasTraining = current === 'might' || current === 'vigour' || current === 'cunning'
        if (expanded.has(id) || wasTraining) {
          expanded.delete(id)
          if (wasTraining) delete assignments[id]
        } else {
          expanded.add(id)
        }
      } else if (assignments[id] === action) {
        delete assignments[id]
      } else {
        assignments[id] = action as DayAction
        // Choosing anything other than a stat closes the training options.
        if (action !== 'might' && action !== 'vigour' && action !== 'cunning') expanded.delete(id)
      }
    }
    return render()
  }
  if (data['nextday'] !== undefined) {
    notes = advanceDay(ludus, assignments)
    assignments = {}
    expanded.clear()
    return render()
  }
  if (data['buy']) {
    const result = buy(ludus, data['buy'])
    if (!result.ok) notes = [result.reason ?? 'no']
    return render()
  }
  if (data['sell']) {
    sell(ludus, data['sell'])
    return render()
  }
  if (data['choose']) {
    chosenFighter = chosenFighter === data['choose'] ? undefined : data['choose']
    return render()
  }
  if (data['fight']) {
    const contract = ludus.contracts.find((c) => c.id === data['fight'])
    const gladiator = ludus.roster.find((g) => g.id === chosenFighter && !g.dead)
    if (!contract || !gladiator) return
    fighting = {
      gladiator,
      contractId: contract.id,
      combat: startBout(gladiator, contract, ludus.day * 31 + contract.tier),
    }
    screen = 'fight'
    return render()
  }
  if (data['card'] !== undefined) return playCard(Number(data['card']))
  if (data['endturn'] !== undefined) return endTurn()
  if (data['back'] !== undefined) {
    outcome = undefined
    chosenFighter = undefined
    screen = 'ludus'
    return render()
  }
  if (data['sound'] !== undefined) {
    toggleMuted()
    target.style.opacity = isMuted() ? '0.4' : '1'
  }
})

render()

window.__lanista = {
  screen: () => screen,
  state: () => ({
    day: ludus.day,
    coin: ludus.coin,
    fame: ludus.fame,
    roster: ludus.roster.filter((g) => !g.dead).length,
    favor: fighting?.combat.favor ?? 0,
    played: (fighting?.combat.discard.length ?? 0) + (fighting?.combat.exhausted.length ?? 0),
    hand: fighting?.combat.hand ?? [],
  }),
  go: (next: Screen) => {
    screen = next
    render()
  },
  assign: (id: string, action: DayAction) => {
    assignments[id] = action
    render()
  },
  nextDay: () => {
    notes = advanceDay(ludus, assignments)
    assignments = {}
    expanded.clear()
    render()
  },
  play: (index: number) => playCard(index),
  endTurn: () => endTurn(),
  autoFight: () => {
    let guard = 0
    while (fighting && fighting.combat.outcome === 'fighting' && guard++ < 200) endTurn()
  },
}
