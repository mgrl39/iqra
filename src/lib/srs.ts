// Repaso espaciado: SM-2 simplificado con dos notas (fallo / acierto).

export interface SrsCard {
  due: number // timestamp ms
  interval: number // días
  ease: number
  reps: number
}

const DAY = 86_400_000

export function schedule(card: SrsCard | undefined, correct: boolean, now = Date.now()): SrsCard {
  const c = card ?? { due: now, interval: 0, ease: 2.5, reps: 0 }
  if (!correct) {
    // Vuelve en 10 minutos y baja la facilidad.
    return { due: now + 10 * 60_000, interval: 0, ease: Math.max(1.3, c.ease - 0.2), reps: 0 }
  }
  const reps = c.reps + 1
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(c.interval * c.ease)
  return { due: now + interval * DAY, interval, ease: Math.min(3, c.ease + 0.05), reps }
}

export const newCard = (now = Date.now()): SrsCard => ({ due: now, interval: 0, ease: 2.5, reps: 0 })

export const isDue = (card: SrsCard, now = Date.now()) => card.due <= now
