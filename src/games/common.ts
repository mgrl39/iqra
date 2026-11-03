import { useMemo } from 'react'
import { LESSONS, learnedItems } from '../lib/curriculum'
import { TIERS } from '../lib/mastery'
import { readableAyahs, type AyahRef } from '../lib/daily'
import { readableWords } from '../lib/unlock'
import { MASTERED, useProgress } from '../store/progress'
import { shuffle } from '../lib/questions'

/** Palabras mínimas para que todos los juegos tengan con qué jugar. */
const MIN_WORDS = 40
const wordsAt = LESSONS.map((_, l) => readableWords(learnedItems(l)).length).concat(readableWords(learnedItems(LESSONS.length)).length)

/**
 * Frente de juego (en lecciones): lo que usan los juegos. No depende solo de las lecciones:
 * - nunca es menor que lo necesario para tener ~40 palabras (los juegos funcionan desde el minuto 1;
 *   las letras aún no vistas llevan su pista debajo, así que se aprenden jugando);
 * - avanza una lección cada vez que todo lo del frente llega a Hierro (se gana por maestría).
 */
export function gameLevel(lessonsDone: number, points: Record<string, number>) {
  let l = Math.max(lessonsDone, 0)
  while (l < LESSONS.length) {
    if (wordsAt[l] < MIN_WORDS) { l++; continue }
    const items = learnedItems(l)
    if ([...items].every(it => (points[it] ?? 0) >= TIERS[1].min)) { l++; continue }
    break
  }
  return l
}

/** Primera lección con la que se cumple `test` (para juegos que necesitan algo concreto). */
export function firstLevel(test: (known: Set<string>) => boolean) {
  for (let l = 0; l <= LESSONS.length; l++) if (test(learnedItems(l))) return l
  return LESSONS.length
}

/**
 * Lo que entra en los juegos ahora mismo y las palabras con que se juega.
 * `floor`: algunos juegos necesitan un mínimo (p. ej. letras de sonido parecido); se adelantan
 * hasta ahí y lo nuevo aparece con su pista.
 */
export function useKnown(floor = 0) {
  const level = useProgress(s => Math.max(floor, gameLevel(s.lessonsDone, s.points)))
  return useMemo(() => {
    const known = learnedItems(level)
    return { known, pool: readableWords(known), level }
  }, [level])
}

/**
 * Aleyas para los juegos de aleya: las que ya se leen enteras; si aún no hay bastantes,
 * las más legibles (lo que falta se aprende escuchando).
 */
export function ayahsFor(known: Set<string>, min = 3): AyahRef[] {
  const full = readableAyahs(known).filter(a => a.verse.words.length >= 3)
  if (full.length >= min) return full
  return readableAyahs(known, 0).filter(a => a.verse.words.length >= 3 && a.verse.words.length <= 8).slice(0, 30)
}

/** Elige n palabras dando más peso a las que contienen items menos dominados. */
export function pickWeakWords<T extends { items: string[] }>(pool: T[], n: number): T[] {
  const mastery = useProgress.getState().mastery
  const weight = (w: T) => 1 + w.items.filter(it => (mastery[it] ?? 0) < MASTERED).length
  const scored = pool.map(w => ({ w, r: Math.random() * weight(w) }))
  return shuffle(scored.sort((a, b) => b.r - a.r).slice(0, n).map(x => x.w))
}
