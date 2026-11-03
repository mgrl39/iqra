// Rangos de maestría: letras y signos (puntos por acierto), palabras (aciertos totales)
// y suras (estrellas según los retos de aleya superados).
import type { Surah } from '../data/types'
import { cleanText } from './arabic'
import { isReadable, wordByKey } from './unlock'

/**
 * Cada acierto da +1 punto a cada letra/signo de la pregunta; un fallo quita 3
 * (sin bajar de rango). Los umbrales crecen rápido: Maestro exige miles de aciertos.
 */
export const TIERS = [
  { min: 0, name: 'Novato', icon: '·', cls: 't0' },
  { min: 10, name: 'Hierro', icon: '⚙️', cls: 't1' },
  { min: 30, name: 'Bronce', icon: '🥉', cls: 't2' },
  { min: 75, name: 'Plata', icon: '🥈', cls: 't3' },
  { min: 150, name: 'Oro', icon: '🥇', cls: 't4' },
  { min: 300, name: 'Platino', icon: '💿', cls: 't5' },
  { min: 500, name: 'Esmeralda', icon: '💚', cls: 't6' },
  { min: 800, name: 'Rubí', icon: '❤️‍🔥', cls: 't7' },
  { min: 1200, name: 'Diamante', icon: '💎', cls: 't8' },
  { min: 2000, name: 'Maestro', icon: '🎓', cls: 't9' },
  { min: 3000, name: 'Gran Maestro', icon: '👑', cls: 't10' },
  { min: 5000, name: 'Leyenda', icon: '🌟', cls: 't11' },
] as const

export const WRONG_PENALTY = 3

export const tierIndex = (points: number) => {
  let t = 0
  TIERS.forEach((x, i) => points >= x.min && (t = i))
  return t
}
export const tierOf = (points: number) => TIERS[tierIndex(points)]

/** Aciertos que faltan para el siguiente rango (null si ya es Leyenda). */
export function hitsToNextTier(points: number): number | null {
  const t = tierIndex(points)
  return t >= TIERS.length - 1 ? null : TIERS[t + 1].min - points
}

/** Progreso (0..1) dentro del rango actual. */
export function tierProgress(points: number) {
  const t = tierIndex(points)
  if (t >= TIERS.length - 1) return 1
  return (points - TIERS[t].min) / (TIERS[t + 1].min - TIERS[t].min)
}

/** Puntos tras responder: un fallo nunca te baja de rango. */
export function nextPoints(points: number, correct: boolean) {
  if (correct) return points + 1
  return Math.max(TIERS[tierIndex(points)].min, points - WRONG_PENALTY)
}

/** Una palabra entra en tu colección tras acertarla 3 veces seguidas. */
export const WORD_MASTERED = 3
/** Aciertos seguidos leyendo una palabra sin harakāt para darla por leída "a pelo". */
export const NAKED_MASTERED = 3

/** Rangos de palabra según aciertos totales (a partir de la colección). */
export const WORD_TIERS = [
  { min: 0, name: 'En colección', icon: '📖' },
  { min: 10, name: 'Conocida', icon: '⭐' },
  { min: 25, name: 'Dominada', icon: '🌟' },
  { min: 60, name: 'Grabada', icon: '💫' },
] as const

export const wordTier = (correct: number) => {
  let t = 0
  WORD_TIERS.forEach((x, i) => correct >= x.min && (t = i))
  return t
}

/** Nota mínima (%) de un reto de aleya para darlo por superado. */
export const AYAH_PASS = 80

/** Estrellas de una sura: ★ legible entera · ★★ todos sus retos superados · ★★★ todos al 100 %. */
export function surahStars(s: Surah, known: Set<string>, scores: Record<string, number>) {
  const readable = s.verses.every(v => v.words.every(w => isReadable(wordByKey(cleanText(w.text))!.items, known)))
  if (!readable) return 0
  const best = s.verses.map(v => scores[`${s.id}:${v.number}`] ?? 0)
  if (best.every(g => g >= 100)) return 3
  if (best.every(g => g >= AYAH_PASS)) return 2
  return 1
}
