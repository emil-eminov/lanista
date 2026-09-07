/**
 * Synthesised, so there is nothing to license and nothing to download. In a
 * card game the sound carries most of the impact: the same card played silently
 * reads as a spreadsheet edit.
 */
let context: AudioContext | undefined
let master: GainNode | undefined
let muted = false

export function initAudio(): void {
  if (context) {
    void context.resume()
    return
  }
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return
  context = new Ctor()
  master = context.createGain()
  master.gain.value = 0.3
  master.connect(context.destination)
}

export function toggleMuted(): boolean {
  muted = !muted
  if (master) master.gain.value = muted ? 0 : 0.3
  return muted
}

export function isMuted(): boolean {
  return muted
}

function tone(type: OscillatorType, from: number, to: number, duration: number, volume: number, delay = 0): void {
  if (!context || !master || muted) return
  const start = context.currentTime + delay
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(master)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

let noiseBuffer: AudioBuffer | undefined

function noise(duration: number, volume: number, from: number, to: number, delay = 0): void {
  if (!context || !master || muted) return
  if (!noiseBuffer) {
    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const start = context.currentTime + delay
  const source = context.createBufferSource()
  source.buffer = noiseBuffer
  source.loop = true
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), start + duration)
  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + duration * 0.15)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(master)
  source.start(start)
  source.stop(start + duration + 0.05)
}

export const sfx = {
  /** Metal on flesh. */
  hit: (): void => {
    noise(0.11, 0.3, 2400, 380)
    tone('square', 340, 120, 0.07, 0.1)
  },
  /** Metal on shield. */
  blocked: (): void => {
    noise(0.14, 0.22, 1500, 900)
    tone('triangle', 900, 620, 0.1, 0.08)
  },
  guard: (): void => tone('triangle', 320, 420, 0.13, 0.1),
  skill: (): void => tone('sine', 520, 780, 0.12, 0.09),
  /** The crowd. Rises with how much they liked it. */
  roar: (strength: number): void => {
    noise(0.5 + strength * 0.5, 0.1 + strength * 0.22, 500, 1400)
  },
  restless: (): void => noise(0.5, 0.09, 260, 150),
  win: (): void => {
    tone('triangle', 523, 523, 0.14, 0.14)
    tone('triangle', 784, 784, 0.2, 0.15, 0.12)
    noise(1.1, 0.24, 600, 1500, 0.1)
  },
  death: (): void => {
    tone('sawtooth', 220, 40, 1.2, 0.3)
    noise(0.9, 0.2, 800, 120)
  },
  mercy: (): void => {
    tone('sine', 392, 523, 0.5, 0.16)
    noise(1.2, 0.18, 700, 1600)
  },
}
