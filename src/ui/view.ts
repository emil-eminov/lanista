import { card } from '../game/cards'
import { Combat, ENERGY_PER_TURN, MERCY_THRESHOLD } from '../game/combat'
import type { BoutOutcome } from '../game/bout'
import {
  askingPrice,
  sellPrice,
  UPKEEP_PER_HEAD,
  type Contract,
  type DayAction,
  type LudusState,
} from '../game/ludus'
import {
  canTrain,
  conditionMultiplier,
  maxHpOf,
  valueOf,
  type Gladiator,
} from '../game/gladiator'
import { CLASS_NAMES, portraitSvg } from '../render/portrait'
import type { Statuses } from '../game/types'

export const escape = (value: string): string =>
  value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)

function statusChips(statuses: Statuses, block: number): string {
  const chips: string[] = []
  if (block > 0) chips.push(`<span class="chip block">${block} block</span>`)
  if (statuses.bleed > 0) chips.push(`<span class="chip bleed">${statuses.bleed} bleed</span>`)
  if (statuses.edge > 0) chips.push(`<span class="chip edge">${statuses.edge} edge</span>`)
  if (statuses.stagger > 0) chips.push(`<span class="chip stagger">${statuses.stagger} stagger</span>`)
  return chips.length > 0 ? `<div class="statuses">${chips.join('')}</div>` : ''
}

function meter(value: number, max: number, className: string): string {
  const pct = Math.max(0, Math.min(1, value / max)) * 100
  return `<div class="meter ${className}"><i style="width:${pct}%"></i></div>`
}

/** A small labelled bar, used for fatigue and hunger on the roster. */
function gauge(label: string, value: number, tone: string): string {
  return `<div class="gauge"><span>${label}</span><div class="meter ${tone}"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div></div>`
}

export function topBar(state: LudusState): string {
  const living = state.roster.filter((g) => !g.dead).length
  return `
    <header class="top">
      <div><span class="eyebrow">Day</span><b>${state.day}</b></div>
      <div><span class="eyebrow">Coin</span><b>${state.coin}</b></div>
      <div><span class="eyebrow">Fame</span><b>${state.fame}</b></div>
      <div><span class="eyebrow">Upkeep</span><b>${living * UPKEEP_PER_HEAD}</b></div>
    </header>`
}

export function nav(active: string): string {
  const tabs: [string, string][] = [
    ['ludus', 'Ludus'],
    ['market', 'Market'],
    ['arena', 'Arena'],
  ]
  return `<nav class="nav">${tabs
    .map(([id, label]) => `<button data-tab="${id}" class="${active === id ? 'on' : ''}">${label}</button>`)
    .join('')}</nav>`
}

function statRow(gladiator: Gladiator): string {
  return `<div class="stats">
    <span title="Damage">MIG ${gladiator.might}</span>
    <span title="Health">VIG ${gladiator.vigour}</span>
    <span title="Crowd">CUN ${gladiator.cunning}</span>
  </div>`
}

function fighterCard(gladiator: Gladiator, action: DayAction | undefined, selectable: boolean): string {
  const trainable = canTrain(gladiator)
  const condition = Math.round(conditionMultiplier(gladiator) * 100)
  const options: [DayAction, string, boolean][] = [
    ['might', 'Train might', trainable.ok],
    ['vigour', 'Train vigour', trainable.ok],
    ['cunning', 'Train cunning', trainable.ok],
    ['rest', 'Rest', true],
    ['feast', 'Feast (12)', true],
    ['work', 'Hire out', true],
  ]
  return `
    <article class="fighter ${gladiator.dead ? 'dead' : ''}">
      <div class="face">${portraitSvg(gladiator.seed, gladiator.kind, gladiator.hp < maxHpOf(gladiator) * 0.4)}</div>
      <div class="who">
        <div class="row">
          <b>${escape(gladiator.name)}</b>
          <span class="eyebrow">${CLASS_NAMES[gladiator.kind]}</span>
        </div>
        ${statRow(gladiator)}
        ${meter(gladiator.hp, maxHpOf(gladiator), 'mine')}
        <div class="gauges">
          ${gauge('Tired', gladiator.fatigue, 'tired')}
          ${gauge('Fed', gladiator.fed, 'fed')}
        </div>
        <div class="tiny">${gladiator.wins}W of ${gladiator.fights} &middot; condition ${condition}% &middot; worth ${valueOf(gladiator)}</div>
        ${
          trainable.ok
            ? ''
            : `<div class="warn">${escape(trainable.reason ?? '')}</div>`
        }
        ${
          selectable
            ? `<div class="chips">${options
                .map(
                  ([id, label, enabled]) =>
                    `<button class="tag ${action === id ? 'on' : ''}" data-assign="${gladiator.id}:${id}" ${enabled ? '' : 'disabled'}>${label}</button>`,
                )
                .join('')}</div>`
            : ''
        }
      </div>
    </article>`
}

export function renderLudus(state: LudusState, actions: Record<string, DayAction>, notes: string[]): string {
  const living = state.roster.filter((g) => !g.dead)
  return `
    ${topBar(state)}
    ${nav('ludus')}
    <div class="scroll">
      ${living.map((g) => fighterCard(g, actions[g.id], true)).join('')}
      ${
        notes.length > 0
          ? `<div class="notes">${notes.map((n) => `<div>${escape(n)}</div>`).join('')}</div>`
          : ''
      }
      ${
        state.graves.length > 0
          ? `<div class="notes graves"><span class="eyebrow">Buried</span>${state.graves
              .slice(0, 5)
              .map((g) => `<div>${escape(g.name)}, ${g.wins} wins. ${escape(g.epitaph)}</div>`)
              .join('')}</div>`
          : ''
      }
    </div>
    <div class="actions"><button class="btn" data-nextday>End the day</button></div>`
}

export function renderMarket(state: LudusState): string {
  const living = state.roster.filter((g) => !g.dead)
  return `
    ${topBar(state)}
    ${nav('market')}
    <div class="scroll">
      <div class="eyebrow section">For sale</div>
      ${
        state.market.length === 0
          ? '<p class="empty">The block is empty. Traders come every third day.</p>'
          : state.market
              .map(
                (g) => `
        <div class="offer">
          ${fighterCard(g, undefined, false)}
          <button class="btn ${state.coin < askingPrice(g) ? 'ghost' : ''}" data-buy="${g.id}" ${state.coin < askingPrice(g) ? 'disabled' : ''}>
            Buy for ${askingPrice(g)}
          </button>
        </div>`,
              )
              .join('')
      }
      <div class="eyebrow section">Sell</div>
      ${living
        .map(
          (g) => `
        <div class="sellrow">
          <span>${escape(g.name)}</span>
          <button class="btn ghost" data-sell="${g.id}" ${living.length <= 1 ? 'disabled' : ''}>Sell for ${sellPrice(g)}</button>
        </div>`,
        )
        .join('')}
    </div>`
}

export function renderArena(state: LudusState, chosen: string | undefined): string {
  const living = state.roster.filter((g) => !g.dead)
  return `
    ${topBar(state)}
    ${nav('arena')}
    <div class="scroll">
      <div class="eyebrow section">Send whom</div>
      <div class="picker">
        ${living
          .map(
            (g) => `<button class="pickface ${chosen === g.id ? 'on' : ''}" data-choose="${g.id}">
              ${portraitSvg(g.seed, g.kind, false)}
              <span>${escape(g.name.split(' ')[0] ?? g.name)}</span>
            </button>`,
          )
          .join('')}
      </div>
      <div class="eyebrow section">Bouts posted</div>
      ${state.contracts
        .map((contract: Contract) => {
          const locked = state.fame < contract.fameRequired
          return `
          <button class="pick" data-fight="${contract.id}" ${locked || !chosen ? 'disabled' : ''}>
            <b>${escape(contract.name)}</b>
            <span>${contract.purse} coin${locked ? ` &middot; needs ${contract.fameRequired} fame` : ''}${!chosen ? ' &middot; choose a fighter' : ''}</span>
          </button>`
        })
        .join('')}
    </div>`
}

function intentText(combat: Combat): string {
  const intent = combat.intent
  const hits = intent.hits && intent.hits > 1 ? ` x${intent.hits}` : ''
  const damage = intent.damage ? ` ${intent.damage + combat.enemy.statuses.edge}${hits}` : ''
  const block = intent.block ? ` ${intent.block}` : ''
  return `${escape(intent.label)}${damage}${block}`
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

export function renderFight(gladiator: Gladiator, combat: Combat): string {
  const hand = combat.hand
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

    <div class="arena-floor" data-arena>
      ${combat.log
        .slice(-4)
        .map((entry) => `<div class="line ${entry.side}">${escape(entry.text)}</div>`)
        .join('')}
    </div>

    <div class="me">
      <div class="row">
        <span class="mini">${portraitSvg(gladiator.seed, gladiator.kind, false)}</span>
        <span class="name" style="font-family:var(--display);flex:1">${escape(gladiator.name)}</span>
        <span class="numbers">${Math.max(0, combat.player.hp)} / ${combat.player.maxHp}</span>
      </div>
      ${meter(combat.player.hp, combat.player.maxHp, 'mine')}
      <div class="row">
        ${statusChips(combat.player.statuses, combat.player.block) || '<span></span>'}
        <span class="energy">${combat.energy} / ${ENERGY_PER_TURN}</span>
      </div>
    </div>

    <div class="hand">${hand}</div>
    <div class="actions">
      <button class="btn ghost" data-sound>Sound</button>
      <button class="btn" data-endturn>End turn</button>
    </div>`
}

export function renderAftermath(gladiator: Gladiator, outcome: BoutOutcome): string {
  return `
    <div class="screen">
      <span class="eyebrow">${outcome.won ? 'Victory' : outcome.survived ? 'Missio' : 'Died in the sand'}</span>
      <div class="bigface">${portraitSvg(gladiator.seed, gladiator.kind, !outcome.won)}</div>
      <h1>${escape(gladiator.name)}</h1>
      <p>${escape(outcome.epitaph)}</p>
      <div class="ledger">
        <span>${outcome.purse} coin</span>
        <span>${outcome.fame} fame</span>
        <span>${Math.round(outcome.favor)} favour</span>
      </div>
      <div class="picks"><button class="pick" data-back><b>Back to the ludus</b><span>The school endures</span></button></div>
    </div>`
}
