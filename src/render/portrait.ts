/**
 * Gladiator portraits, drawn as SVG from a seed.
 *
 * There is no artist on this project, so every fighter's face has to be
 * generated. Each gladiator carries a seed, and the same seed always produces
 * the same man: helmet, plume, skin, scars and weapon are all derived from it.
 * That makes a fighter recognisable across the roster, the market and the
 * arena, which is what makes losing one feel like losing someone.
 */

export type FighterClass = 'murmillo' | 'thraex' | 'retiarius' | 'secutor'

export const CLASS_NAMES: Readonly<Record<FighterClass, string>> = {
  murmillo: 'Murmillo',
  thraex: 'Thraex',
  retiarius: 'Retiarius',
  secutor: 'Secutor',
}

const SKIN = ['#c99566', '#a9744a', '#8a5a38', '#e0b183', '#6f462b', '#b3835a']
const PLUME = ['#b8332a', '#c9922c', '#4c6d8c', '#5f7f52', '#7a4a86', '#c4bcae']
const METAL = ['#b9a06a', '#9aa3a8', '#c08a3e', '#8f8577']

function rng(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4294967296
  }
}

function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)]!
}

/**
 * Helmets are the silhouette, and the silhouette is how a class is recognised
 * at thumbnail size. Each one is a different outline rather than a recolour.
 */
function helmet(kind: FighterClass, metal: string, plume: string, random: () => number): string {
  const crest =
    kind === 'retiarius'
      ? ''
      : `<path d="M32 6 C 40 8, 44 16, 43 24 L 38 22 C 39 15, 36 11, 32 10 Z" fill="${plume}"/>`

  switch (kind) {
    case 'murmillo':
      // Broad brim, full face, tall crest: the heavy.
      return `${crest}
        <path d="M16 26 C 16 14, 48 14, 48 26 L 48 40 C 48 50, 40 56, 32 56 C 24 56, 16 50, 16 40 Z" fill="${metal}"/>
        <path d="M12 26 C 12 22, 52 22, 52 26 L 52 30 L 12 30 Z" fill="${metal}" opacity="0.85"/>
        <rect x="28" y="32" width="8" height="16" rx="4" fill="#1a140f" opacity="0.75"/>`
    case 'thraex':
      // Griffin crest, angular cheeks.
      return `${crest}
        <path d="M32 8 L 46 16 L 46 40 C 46 50, 40 56, 32 56 C 24 56, 18 50, 18 40 L 18 16 Z" fill="${metal}"/>
        <circle cx="26" cy="34" r="3.4" fill="#1a140f" opacity="0.8"/>
        <circle cx="38" cy="34" r="3.4" fill="#1a140f" opacity="0.8"/>`
    case 'retiarius': {
      // Bare head, shoulder guard only: the net fighter wears almost nothing.
      // Because there is no helmet to give him a silhouette, he needs an actual
      // face, or he reads as a featureless blob at roster size.
      const flesh = pick(random, SKIN)
      return `<path d="M22 30 C 22 19, 42 19, 42 30 L 42 40 C 42 50, 37 56, 32 56 C 27 56, 22 50, 22 40 Z" fill="${flesh}"/>
        <path d="M21 28 C 24 20, 40 20, 43 28 C 40 25, 24 25, 21 28 Z" fill="#241811" opacity="0.85"/>
        <path d="M20 30 C 24 27, 40 27, 44 30 L 44 33 L 20 33 Z" fill="${plume}" opacity="0.9"/>
        <circle cx="27" cy="38" r="2.1" fill="#1a120c"/>
        <circle cx="37" cy="38" r="2.1" fill="#1a120c"/>
        <path d="M31 40 L 31 45 L 34 45" stroke="#1a120c" stroke-width="1.2" fill="none" opacity="0.6"/>
        <path d="M27 50 C 30 52, 34 52, 37 50" stroke="#1a120c" stroke-width="1.4" fill="none" opacity="0.7"/>
        <path d="M12 46 C 12 37, 24 34, 27 41 L 24 54 L 12 54 Z" fill="${metal}"/>
        <path d="M14 44 L 25 42" stroke="#00000055" stroke-width="1.4"/>`
    }
    case 'secutor':
      // Smooth egg helm with two small eyeholes: built to survive a net.
      return `<path d="M32 12 C 46 12, 48 26, 48 38 C 48 50, 40 56, 32 56 C 24 56, 16 50, 16 38 C 16 26, 18 12, 32 12 Z" fill="${metal}"/>
        <circle cx="27" cy="34" r="2.6" fill="#120e0a"/>
        <circle cx="37" cy="34" r="2.6" fill="#120e0a"/>
        <path d="M32 42 L 34 50 L 30 50 Z" fill="#120e0a" opacity="0.6"/>`
  }
}

function weapon(kind: FighterClass, metal: string): string {
  switch (kind) {
    case 'retiarius':
      return `<path d="M56 18 L 56 62" stroke="${metal}" stroke-width="3"/>
        <path d="M52 18 L 60 18 M 52 18 L 52 12 M 56 18 L 56 11 M 60 18 L 60 12" stroke="${metal}" stroke-width="2.2" fill="none"/>`
    case 'murmillo':
      return `<rect x="52" y="30" width="12" height="30" rx="3" fill="${metal}" opacity="0.9"/>
        <path d="M8 34 L 12 30 L 12 58 L 8 54 Z" fill="${metal}"/>`
    default:
      return `<path d="M56 26 L 56 54" stroke="${metal}" stroke-width="3.4"/>
        <path d="M50 30 L 62 30" stroke="${metal}" stroke-width="3"/>`
  }
}

/** A portrait as an inline SVG string, sized to fill its container. */
export function portraitSvg(seed: number, kind: FighterClass, wounded = false): string {
  const random = rng(seed)
  const skin = pick(random, SKIN)
  const metal = pick(random, METAL)
  const plume = pick(random, PLUME)
  const scar = random() > 0.55
  const beard = random() > 0.6

  return `<svg viewBox="0 0 72 72" role="img" aria-hidden="true" class="portrait-svg">
    <defs>
      <radialGradient id="g${seed}" cx="50%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#4a3a26"/>
        <stop offset="100%" stop-color="#221a12"/>
      </radialGradient>
    </defs>
    <rect width="72" height="72" rx="10" fill="url(#g${seed})"/>
    <path d="M20 72 C 20 58, 44 58, 44 72 Z" fill="${skin}" opacity="0.9"/>
    <path d="M14 72 C 14 60, 26 54, 32 54 C 38 54, 50 60, 50 72 Z" fill="#6b573a"/>
    ${weapon(kind, metal)}
    ${helmet(kind, metal, plume, random)}
    ${beard && kind === 'retiarius' ? `<path d="M26 44 C 28 52, 36 52, 38 44 L 38 48 C 36 54, 28 54, 26 48 Z" fill="#2b1d12" opacity="0.8"/>` : ''}
    ${scar ? `<path d="M40 26 L 44 40" stroke="#7c2b22" stroke-width="1.6" opacity="0.85"/>` : ''}
    ${wounded ? `<path d="M18 50 L 30 62 M 46 46 L 36 60" stroke="#a8322a" stroke-width="2.4" opacity="0.75"/>` : ''}
  </svg>`
}
