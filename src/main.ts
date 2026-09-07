import { STYLES } from './ui/styles'
import { renderBriefing, renderFight, renderOver, renderReward } from './ui/view'
import { Run } from './game/run'
import { card } from './game/cards'
import { enemyById, scaleEnemy } from './game/enemies'
import { loadLudus, recordRun, type LudusState } from './game/ludus'
import { initAudio, isMuted, sfx, toggleMuted } from './audio/sfx'

declare global {
  interface Window {
    __lanista?: {
      phase(): string
      state(): { hp: number; favor: number; enemyHp: number; hand: string[]; fightIndex: number; played: number }
      play(index: number): void
      endTurn(): void
      /** Plays the whole run with the scripted gladiator. Used by the tests. */
      auto(maxFights?: number): void
    }
  }
}

const style = document.createElement('style')
style.textContent = STYLES
document.head.append(style)

const app = document.createElement('div')
app.id = 'app'
document.body.append(app)

let ludus: LudusState = loadLudus()
let run = new Run()
let recorded = false

const wake = (): void => initAudio()
document.addEventListener('pointerdown', wake, { once: true })

/** Floating damage numbers, appended outside the rendered markup so a redraw does not kill them. */
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
  // Reading offsetWidth forces a reflow, without which re-adding the class in
  // the same frame does not restart the animation.
  void app.offsetWidth
  app.classList.add('shake')
}

function render(): void {
  if (run.phase === 'BRIEFING') {
    const def = scaleEnemy(enemyById(run.opponentId), run.fightIndex)
    app.innerHTML = renderBriefing(run, ludus, def.name, def.hp)
  } else if (run.phase === 'FIGHT' && run.combat) {
    app.innerHTML = renderFight(run, run.combat)
  } else if (run.phase === 'REWARD') {
    app.innerHTML = renderReward(run)
  } else if (run.phase === 'OVER') {
    if (!recorded) {
      ludus = recordRun(ludus, { name: run.name, result: run.result! })
      recorded = true
      if (run.result!.fightsWon >= 8) sfx.win()
      else if (run.result!.survived) sfx.mercy()
      else sfx.death()
    }
    app.innerHTML = renderOver(run, ludus)
  }
}

function playCard(index: number): void {
  const combat = run.combat
  if (!combat) return
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
  } else if (def.block) {
    sfx.guard()
  } else {
    sfx.skill()
  }
  if (taken > 0) pop(`-${taken}`, true)
  const gained = combat.favor - favorBefore
  if (gained > 0) sfx.roar(Math.min(1, gained / 10))

  afterCombatChange()
}

function endTurn(): void {
  const combat = run.combat
  if (!combat) return
  const before = combat.player.hp
  const favorBefore = combat.favor
  combat.endTurn()
  const taken = before - combat.player.hp
  if (taken > 0) {
    pop(`-${taken}`, true)
    sfx.hit()
    shake()
  } else if (combat.outcome === 'fighting') {
    sfx.blocked()
  }
  if (combat.favor < favorBefore) sfx.restless()
  afterCombatChange()
}

function afterCombatChange(): void {
  const combat = run.combat
  if (combat && combat.outcome !== 'fighting') run.settle()
  render()
}

app.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest('[data-card],[data-endturn],[data-begin],[data-reward],[data-newrun],[data-sound]')
  if (!(target instanceof HTMLElement)) return
  initAudio()

  if (target.dataset['card'] !== undefined) return playCard(Number(target.dataset['card']))
  if (target.dataset['endturn'] !== undefined) return endTurn()
  if (target.dataset['begin'] !== undefined) {
    run.beginFight()
    return render()
  }
  if (target.dataset['reward'] !== undefined) {
    run.takeReward(Number(target.dataset['reward']))
    return render()
  }
  if (target.dataset['newrun'] !== undefined) {
    run = new Run()
    recorded = false
    return render()
  }
  if (target.dataset['sound'] !== undefined) {
    toggleMuted()
    target.style.opacity = isMuted() ? '0.4' : '1'
  }
})

render()

window.__lanista = {
  phase: () => run.phase,
  state: () => ({
    hp: run.combat?.player.hp ?? run.hp,
    favor: run.combat?.favor ?? 0,
    enemyHp: run.combat?.enemy.hp ?? 0,
    hand: run.combat?.hand ?? [],
    fightIndex: run.fightIndex,
    // Cards that have left the hand this fight. Hand size is not a reliable
    // signal that a card was played: several cards draw a replacement.
    played: (run.combat?.discard.length ?? 0) + (run.combat?.exhausted.length ?? 0),
  }),
  play: (index: number) => playCard(index),
  endTurn: () => endTurn(),
  auto: async (maxFights = 12) => {
    const { botTakeTurn, botChooseReward } = await import('./game/bot')
    let guard = 0
    while (run.phase !== 'OVER' && guard++ < maxFights * 40) {
      if (run.phase === 'BRIEFING') run.beginFight()
      else if (run.phase === 'FIGHT' && run.combat) {
        botTakeTurn(run.combat)
        if (run.combat.outcome !== 'fighting') run.settle()
      } else if (run.phase === 'REWARD') {
        run.takeReward(botChooseReward(run.rewards, run.hp, run.maxHp))
      }
    }
    render()
  },
}
