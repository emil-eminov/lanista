/**
 * Inline SVG glyphs, hand-drawn as paths.
 *
 * The design guidance is explicit that icons should be SVG rather than emoji.
 * An icon set cannot be fetched at runtime (the game ships as one offline
 * file), so these are drawn here. They are decorative: every one sits beside a
 * text label, so they carry aria-hidden and never stand alone.
 */
const wrap = (body: string): string =>
  `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`

export const ICONS = {
  train: wrap('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
  rest: wrap('<path d="M3 18v-6a2 2 0 0 1 2-2h12a4 4 0 0 1 4 4v4M3 14h18M7 10V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3"/>'),
  feast: wrap('<path d="M4 4v7a3 3 0 0 0 3 3v6M7 4v6M17 4c-1.5 2-2 4-2 6h4c0-2-.5-4-2-6ZM17 10v10"/>'),
  work: wrap('<path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8ZM9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'),
  might: wrap('<path d="M14 4l6 6-9 9H5v-6l9-9ZM12 6l6 6"/>'),
  vigour: wrap('<path d="M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9Z"/>'),
  cunning: wrap('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="2.5"/>'),
  coin: wrap('<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>'),
  ludus: wrap('<path d="M3 21V9l9-6 9 6v12M9 21v-6h6v6"/>'),
  market: wrap('<path d="M3 7h18l-1.5 12a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1L3 7ZM8 7V5a4 4 0 0 1 8 0v2"/>'),
  arena: wrap('<path d="M14 4l6 6-9 9H5v-6l9-9ZM4 20h16"/>'),
} as const

export type IconName = keyof typeof ICONS
