/**
 * The part that survives every gladiator.
 *
 * Stored locally. It exists so a death is a setback rather than an erasure:
 * the school keeps the coin, the reputation and the names of the dead.
 */

const KEY = 'lanista.ludus'

export interface Fallen {
  readonly name: string
  readonly fightsWon: number
  readonly epitaph: string
}

export interface LudusState {
  coin: number
  reputation: number
  seasons: number
  survivors: number
  fallen: Fallen[]
  best: number
}

function empty(): LudusState {
  return { coin: 0, reputation: 0, seasons: 0, survivors: 0, fallen: [], best: 0 }
}

export function loadLudus(): LudusState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as Partial<LudusState>
    return { ...empty(), ...parsed, fallen: parsed.fallen ?? [] }
  } catch {
    // Private windows, blocked site data, or a corrupted entry from an older
    // build. A missing school is not worth refusing to start over.
    return empty()
  }
}

export function saveLudus(state: LudusState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

export function recordRun(
  state: LudusState,
  run: { name: string; result: { survived: boolean; fightsWon: number; coin: number; reputation: number; epitaph: string } },
): LudusState {
  const next: LudusState = {
    ...state,
    coin: state.coin + run.result.coin,
    reputation: state.reputation + run.result.reputation,
    seasons: state.seasons + 1,
    survivors: state.survivors + (run.result.survived ? 1 : 0),
    best: Math.max(state.best, run.result.fightsWon),
    fallen: run.result.survived
      ? state.fallen
      : [{ name: run.name, fightsWon: run.result.fightsWon, epitaph: run.result.epitaph }, ...state.fallen].slice(0, 12),
  }
  saveLudus(next)
  return next
}
