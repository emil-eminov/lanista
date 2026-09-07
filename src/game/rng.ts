/** Seeded random so a run can be replayed exactly, which the tests depend on. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
}

export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function sample<T>(rng: () => number, items: readonly T[], count: number): T[] {
  return shuffle(rng, items).slice(0, count)
}
