// Efectos de "sensación": sonidos sintetizados con WebAudio (sin archivos),
// vibración en móvil y confeti. Todo respeta el ajuste de sonido.
import { useProgress } from '../store/progress'

let ctx: AudioContext | null = null
const audio = () => (ctx ??= new AudioContext())

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const ac = audio()
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.value = freq
  const t = ac.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(ac.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

const enabled = () => useProgress.getState().sound

export function sfx(kind: 'right' | 'wrong' | 'combo' | 'complete' | 'levelup' | 'tap') {
  if (!enabled()) return
  try {
    switch (kind) {
      case 'right':
        tone(660, 0, 0.12, 'triangle')
        tone(990, 0.08, 0.18, 'triangle')
        break
      case 'combo':
        tone(660, 0, 0.1, 'triangle')
        tone(880, 0.07, 0.1, 'triangle')
        tone(1320, 0.14, 0.22, 'triangle')
        break
      case 'wrong':
        tone(220, 0, 0.22, 'sawtooth', 0.05)
        tone(180, 0.1, 0.25, 'sawtooth', 0.05)
        break
      case 'complete':
        ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle'))
        break
      case 'levelup':
        ;[392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.35, 'triangle', 0.1))
        break
      case 'tap':
        tone(880, 0, 0.05, 'sine', 0.05)
        break
    }
  } catch {
    /* sin WebAudio */
  }
  if (kind === 'wrong') navigator.vibrate?.(120)
  else if (kind === 'complete' || kind === 'levelup') navigator.vibrate?.([30, 40, 30])
}

/** Confeti ligero en un canvas temporal. */
export function confetti(pieces = 120) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const c = document.createElement('canvas')
  c.className = 'confetti'
  c.width = innerWidth * devicePixelRatio
  c.height = innerHeight * devicePixelRatio
  document.body.appendChild(c)
  const g = c.getContext('2d')!
  g.scale(devicePixelRatio, devicePixelRatio)
  const colors = ['#1f6f5c', '#c8962e', '#4fb495', '#e0b45a', '#c0453a', '#5b7fd1']
  const ps = Array.from({ length: pieces }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 12 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    s: 5 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
  }))
  const start = performance.now()
  const frame = (t: number) => {
    g.clearRect(0, 0, innerWidth, innerHeight)
    for (const p of ps) {
      p.vy += 0.35
      p.vx *= 0.99
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      g.save()
      g.translate(p.x, p.y)
      g.rotate(p.r)
      g.fillStyle = p.c
      g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
      g.restore()
    }
    if (t - start < 2600) requestAnimationFrame(frame)
    else c.remove()
  }
  requestAnimationFrame(frame)
}
