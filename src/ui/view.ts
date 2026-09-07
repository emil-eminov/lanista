import { card } from '../game/cards'
import { Combat, ENERGY_PER_TURN, MERCY_THRESHOLD } from '../game/combat'
import type { Run } from '../game/run'
import type { LudusState } from '../game/ludus'
import type { Statuses } from '../game/types'

/**
 * Renders the whole game by replacing the contents of one element.
 *
 * Deliberately not a virtual DOM: the screens are few and the state changes in
 * discrete beats (a card is played, a turn ends), so a redraw per beat is both
 * simpler and fast enough. Animations that must survive a redraw are appended
 * separately rather than being part of the rendered markup.
 */

export interface Handlers {
  playCard(id: string): void
  endTurn(): void
  beginFight(): void
  takeReward(index: number): void
  newRun(): void
  toggleSound(): void
}

const escape = (value: string): string =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

function statusChips(statuses: Statuses, block: number): string {
  const chips: string[] = []
  if (block > 0) chips.push(`<span class="chip block">${block} block</span>`)
  if (statuses.bleed > 0) chips.push(`<span class="chip bleed">${statuses.bleed} bleed</span>`)
  if (statuses.edge > 0) chips.push(`<span class="chip edge">${statuses.edge} edge</span>`)
  if (statuses.stagger > 0) chips.push(`<span class="chip stagger">${statuses.stagger} stagger</span>`)
  return chips.length > 0 ? `<div class="statuses">${chips.join('')}</div>` : ''
}

function intentText(combat: Combat): string {
  const intent = combat.intent
  const hits = intent.hits && intent.hits > 1 ? ` x${intent.hits}` : ''
  const damage = intent.damage ? ` ${intent.damage + combat.enemy.statuses.edge}${hits}` : ''
  const block = intent.block ? ` ${intent.block}` : ''
  return `${escape(intent.label)}${damage}${block}`
}

function meter(value: number, max: number, className: string): string {
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  return `<div class="meter ${className}"><i style="width:${pct}%"></i></div>`
}

function crowdPanel(combat: Combat): string {
  const loved = combat.favor >= MERCY_THRESHOLD
  return `
    <div class="crowd ${loved ? 'loved' : ''}">
      <div class="bar">
        <i style="width:${combat.favor}%"></i>
        <span class="mark" style="left:${MERCY_THRESHOLD}%"></span>
      </div>
      <div class="caption">
        <span class="eyebrow">The crowd</span>
        <span>${loved ? 'They would spare you' : 'They want blood'}</span>
      </div>
    </div>`
}

function handMarkup(combat: Combat): string {
  return combat.hand
    .map((id, index) => {
      const def = card(id)
      const playable = combat.playable(id).ok
      const favor =
        def.favor === 0
          ? ''
          : `<span class="fav ${def.favor < 0 ? 'neg' : ''}">${def.favor > 0 ? '+' : ''}${def.favor}</span>`
      return `
        <button class="card ${def.kind}" data-card="${index}" ${playable ? '' : 'disabled'}>
          <div class="top"><span class="cost">${def.cost}</span>${favor}</div>
          <div class="title">${escape(def.name)}</div>
          <div class="text">${escape(def.text)}</div>
        </button>`
    })
    .join('')
}

export function renderFight(run: Run, combat: Combat): string {
  return `
    <div class="foe">
      <div class="row">
        <span class="name">${escape(combat.enemy.name)}</span>
        <span class="numbers">${Math.max(0, combat.enemy.hp)} / ${combat.enemy.maxHp}</span>
      </div>
      ${meter(combat.enemy.hp, combat.enemy.maxHp, 'hp')}
      <div class="row">
        <span class="intent ${combat.intent.kind}">${intentText(combat)}</span>
        <span class="eyebrow">Turn ${combat.turn}</span>
      </div>
      ${statusChips(combat.enemy.statuses, combat.enemy.block)}
    </div>

    ${crowdPanel(combat)}

    <div class="arena" data-arena>
      ${combat.log
        .slice(-4)
        .map((entry) => `<div class="line ${entry.side}">${escape(entry.text)}</div>`)
        .join('')}
    </div>

    <div class="me">
      <div class="row">
        <span class="name" style="font-family:var(--display)">${escape(run.name)}</span>
        <span class="numbers">${Math.max(0, combat.player.hp)} / ${combat.player.maxHp}</span>
      </div>
      ${meter(combat.player.hp, combat.player.maxHp, 'mine')}
      <div class="row">
        ${statusChips(combat.player.statuses, combat.player.block) || '<span></span>'}
        <span class="energy">${combat.energy} / ${ENERGY_PER_TURN}</span>
      </div>
    </div>

    <div class="hand">${handMarkup(combat)}</div>
    <div class="actions">
      <button class="btn ghost" data-sound>Sound</button>
      <button class="btn" data-endturn>End turn</button>
    </div>`
}

export function renderBriefing(run: Run, ludus: LudusState, opponent: string, opponentHp: number): string {
  return `
    <div class="screen">
      <span class="eyebrow">Fight ${run.fightIndex + 1} of 8</span>
      <h1>${escape(opponent)}</h1>
      <p>${opponentHp} health. Win and the purse grows with the crowd. Lose and they decide whether ${escape(run.name)} walks out.</p>
      <div class="ledger">
        <span>${run.hp} / ${run.maxHp} hp</span>
        <span>${run.deck.length} cards</span>
        <span>${run.coin} coin</span>
      </div>
      <div class="picks"><button class="pick" data-begin><b>Enter the arena</b><span>${escape(run.name)} of your ludus, ${ludus.seasons} seasons run</span></button></div>
    </div>`
}

export function renderReward(run: Run): string {
  const picks = run.rewards
    .map((reward, index) => {
      const detail = reward.kind === 'card' && reward.id ? card(reward.id) : undefined
      const title = detail ? detail.name : reward.label
      const text = detail ? detail.text : reward.detail
      return `<button class="pick" data-reward="${index}"><b>${escape(title)}</b><span>${escape(text)}</span></button>`
    })
    .join('')
  return `
    <div class="screen">
      <span class="eyebrow">The crowd is satisfied</span>
      <h1>${escape(run.name)} lives</h1>
      <p>Take one into the next fight.</p>
      <div class="picks">${picks}</div>
      <div class="ledger"><span>${run.hp} / ${run.maxHp} hp</span><span>${run.coin} coin</span></div>
    </div>`
}

export function renderOver(run: Run, ludus: LudusState): string {
  const result = run.result!
  const won = result.fightsWon >= 8
  return `
    <div class="screen">
      <span class="eyebrow">${won ? 'Champion' : result.survived ? 'Missio' : 'Died in the sand'}</span>
      <h1>${escape(run.name)}</h1>
      <p>${escape(result.epitaph)}</p>
      <div class="ledger">
        <span>${result.fightsWon} won</span>
        <span>${result.coin} coin</span>
        <span>${result.reputation} fame</span>
      </div>
      <div class="tomb">
        <span class="eyebrow">Your ludus</span>
        <span>${ludus.seasons} seasons, ${ludus.survivors} walked out, ${ludus.fallen.length} buried</span>
        <span>Best run: ${ludus.best} fights</span>
      </div>
      <div class="picks"><button class="pick" data-newrun><b>Buy another hopeful</b><span>The school endures</span></button></div>
    </div>`
}
