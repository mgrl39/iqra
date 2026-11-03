// Hitos de progreso: series de metas crecientes. El XP se cobra solo al alcanzarlas (nada aleatorio).
import { LETTERS } from '../data/letters'
import { AYAH_PASS, tierIndex } from './mastery'
import { LESSONS, learnedItems } from './curriculum'
import { readableCount } from './unlock'
import { UNITS, unitsDone, type JState } from './journey'

export interface GoalState extends JState {
  lessonsDone: number
  points: Record<string, number>
  wordStats: Record<string, { m?: number }>
  ayahScores: Record<string, number>
  exams: Record<string, { passed?: number }>
  streak: number
  gamesPlayed: number
}

export interface Goal {
  id: string
  icon: string
  label: string // "palabras legibles"
  targets: number[]
  value: (s: GoalState) => number
}

const readableCache = new Map<number, number>()
const readableOf = (lessons: number) => {
  let v = readableCache.get(lessons)
  if (v === undefined) readableCache.set(lessons, (v = readableCount(learnedItems(lessons))))
  return v
}

export const GOALS: Goal[] = [
  { id: 'units', icon: '🗺️', label: 'unidades del Camino', targets: UNITS.map((_, i) => i + 1), value: s => unitsDone(s) },
  { id: 'lessons', icon: '📚', label: 'lecciones', targets: [1, 3, 7, 10, 14, 18, LESSONS.length], value: s => s.lessonsDone },
  { id: 'readable', icon: '🔓', label: 'palabras legibles', targets: [50, 250, 750, 1500, 2500, 3500], value: s => readableOf(s.lessonsDone) },
  { id: 'vocab', icon: '📖', label: 'palabras dominadas', targets: [10, 25, 50, 100, 250, 500, 1000], value: s => Object.values(s.wordStats).filter(w => w.m).length },
  { id: 'points', icon: '🎯', label: 'aciertos en letras', targets: [100, 500, 1500, 4000, 10000, 25000, 60000], value: s => Object.values(s.points).reduce((a, b) => a + b, 0) },
  { id: 'gold', icon: '🥇', label: 'letras en Oro o más', targets: [1, 5, 10, 20, LETTERS.length], value: s => LETTERS.filter(l => tierIndex(s.points[l.id] ?? 0) >= 4).length },
  { id: 'ayahs', icon: '🧩', label: 'retos de aleya', targets: [1, 5, 15, 40, 100], value: s => Object.values(s.ayahScores).filter(x => x >= AYAH_PASS).length },
  { id: 'exams', icon: '📝', label: 'exámenes aprobados', targets: [1, 2, 3, 4, 5], value: s => Object.values(s.exams).filter(e => e.passed).length },
  { id: 'streak', icon: '🔥', label: 'días de racha', targets: [3, 7, 14, 30, 60, 100], value: s => s.streak },
  { id: 'games', icon: '🎮', label: 'juegos terminados', targets: [5, 25, 75, 200, 500], value: s => s.gamesPlayed },
]

/** XP del hito número k (0-based) de una serie: crece con la dificultad. */
export const goalReward = (k: number) => 30 + 25 * k

/** Hitos cumplidos y siguiente meta de una serie. */
export function goalProgress(g: Goal, s: GoalState) {
  const value = g.value(s)
  const reached = g.targets.filter(t => value >= t).length
  const next = g.targets[reached]
  const prev = reached ? g.targets[reached - 1] : 0
  return { value, reached, next, prev, frac: next ? (value - prev) / (next - prev) : 1 }
}

/** La meta más cercana de completarse (para mostrar en Inicio). */
export function nextGoal(s: GoalState) {
  const open = GOALS.map(g => ({ g, ...goalProgress(g, s) })).filter(x => x.next !== undefined)
  return open.sort((a, b) => b.frac - a.frac)[0] ?? null
}
