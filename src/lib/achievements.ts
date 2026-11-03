// Niveles por XP y logros.
import { cleanText } from './arabic'
import { learnedItems, LESSONS } from './curriculum'
import { QURAN, isReadable, readableCount, wordByKey } from './unlock'
import { LETTERS } from '../data/letters'
import { AYAH_PASS, surahStars, tierIndex } from './mastery'

// ------------------------------------------------------------ niveles

const TITLES = [
  'Principiante',
  'Aprendiz de letras',
  'Cazador de letras',
  'Lector de sílabas',
  'Lector de palabras',
  'Coleccionista',
  'Lector de frases',
  'Lector de aleyas',
  'Explorador del muṣḥaf',
  'Lector de suras',
  'Oído fino',
  'Qāriʾ en formación',
  'Qāriʾ',
  'Guardián de la Fátiha',
  'Maestro del Juz\' Amma',
  'Lector del Kursī',
  'Corazón de Yā-Sīn',
  'Voz de Ar-Raḥmān',
  'Guardián del Mulk',
  'Recitador constante',
  'Maestro de las letras',
  'Maestro del tajwīd',
  'Sabio del muṣḥaf',
  'Luz de Iqra',
  'Qāriʾ de élite',
  'Gran Qāriʾ',
  'Maestro de maestros',
  'Leyenda de Iqra',
  'Leyenda eterna',
  'Iqra ∞',
]

/** XP necesaria para alcanzar el nivel n (n ≥ 1): cada nivel cuesta bastante más que el anterior. */
export const xpForLevel = (n: number) => 25 * (n - 1) * n + 5 * (n - 1) ** 3

export function levelOf(xp: number) {
  let n = 1
  while (xp >= xpForLevel(n + 1)) n++
  const from = xpForLevel(n)
  const to = xpForLevel(n + 1)
  return {
    level: n,
    title: TITLES[Math.min(n - 1, TITLES.length - 1)] + (n > TITLES.length ? ` ${n - TITLES.length + 1}` : ''),
    progress: (xp - from) / (to - from),
    toNext: to - xp,
  }
}

// ------------------------------------------------------------ logros

export interface AchievementState {
  lessonsDone: number
  xp: number
  streak: number
  bestCombo: number
  reviewsDone: number
  perfectQuizzes: number
  ayahScores: Record<string, number>
  points: Record<string, number>
  wordStats: Record<string, { s: number; m?: number; c?: number }>
  exams: Record<string, { passed?: number }>
  highScores: Record<string, number>
  questsClaimed: number
  placementDone: boolean
  gamesPlayed: number
}

interface Ctx extends AchievementState {
  readable: number
  fatihaAyahs: number
  wordsMastered: number
  wordsGold: number // palabras con 25+ aciertos
  tierCount: (t: number) => number // letras con rango ≥ t
  ayahsPassed: number
  stars2: number
  stars3: number
  examsPassed: number
}

export interface Achievement {
  id: string
  icon: string
  name: string
  desc: string
  test: (c: Ctx) => boolean
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-lesson', icon: '🌱', name: 'Primer paso', desc: 'Completa tu primera lección.', test: c => c.lessonsDone >= 1 },
  { id: 'lessons-5', icon: '📚', name: 'Constancia', desc: 'Completa 5 lecciones.', test: c => c.lessonsDone >= 5 },
  { id: 'lessons-half', icon: '⛰️', name: 'Media montaña', desc: 'Llega a la mitad del temario.', test: c => c.lessonsDone >= Math.ceil(LESSONS.length / 2) },
  { id: 'all-letters', icon: '🏆', name: 'Alfabeto completo', desc: 'Aprende todas las letras y signos.', test: c => c.lessonsDone >= LESSONS.length },
  { id: 'words-100', icon: '💯', name: '100 palabras', desc: 'Puedes leer 100 palabras del texto.', test: c => c.readable >= 100 },
  { id: 'words-1000', icon: '📜', name: '1.000 palabras', desc: 'Puedes leer 1.000 palabras del texto.', test: c => c.readable >= 1000 },
  { id: 'words-half', icon: '🌗', name: 'La mitad', desc: 'Puedes leer la mitad del texto.', test: c => c.readable >= totalWords() / 2 },
  { id: 'fatiha-1', icon: '✨', name: 'Primera aleya', desc: 'Puedes leer entera una aleya de Al-Fátiha.', test: c => c.fatihaAyahs >= 1 },
  { id: 'fatiha-all', icon: '🕌', name: 'Al-Fátiha', desc: 'Puedes leer Al-Fátiha entera, sin ayuda.', test: c => c.fatihaAyahs >= 7 },
  { id: 'streak-3', icon: '🔥', name: 'Tres días', desc: 'Racha de 3 días.', test: c => c.streak >= 3 },
  { id: 'streak-7', icon: '🗓️', name: 'Una semana', desc: 'Racha de 7 días.', test: c => c.streak >= 7 },
  { id: 'streak-30', icon: '🌙', name: 'Un mes', desc: 'Racha de 30 días.', test: c => c.streak >= 30 },
  { id: 'combo-10', icon: '⚡', name: 'Imparable', desc: '10 aciertos seguidos.', test: c => c.bestCombo >= 10 },
  { id: 'perfect', icon: '🎯', name: 'Perfecto', desc: 'Una ronda sin ningún fallo.', test: c => c.perfectQuizzes >= 1 },
  { id: 'ayah-1', icon: '🧩', name: 'Primer reto', desc: 'Supera el reto de una aleya.', test: c => c.ayahsPassed >= 1 },
  { id: 'ayah-20', icon: '📖', name: 'Lector', desc: 'Supera 20 retos de aleya.', test: c => c.ayahsPassed >= 20 },
  { id: 'ayah-100', icon: '📚', name: 'Cien aleyas', desc: 'Supera 100 retos de aleya.', test: c => c.ayahsPassed >= 100 },
  { id: 'reviews-50', icon: '🔁', name: 'Memoria de hierro', desc: 'Haz 50 repasos.', test: c => c.reviewsDone >= 50 },
  { id: 'xp-1000', icon: '💎', name: '1.000 XP', desc: 'Consigue 1.000 XP.', test: c => c.xp >= 1000 },
  { id: 'xp-5000', icon: '👑', name: '5.000 XP', desc: 'Consigue 5.000 XP.', test: c => c.xp >= 5000 },
  { id: 'xp-25000', icon: '🏯', name: '25.000 XP', desc: 'Consigue 25.000 XP.', test: c => c.xp >= 25000 },
  { id: 'level-10', icon: '🎖️', name: 'Nivel 10', desc: 'Llega al nivel 10.', test: c => levelOf(c.xp).level >= 10 },
  { id: 'level-20', icon: '🏵️', name: 'Nivel 20', desc: 'Llega al nivel 20.', test: c => levelOf(c.xp).level >= 20 },
  { id: 'vocab-25', icon: '📕', name: 'Coleccionista', desc: 'Domina 25 palabras.', test: c => c.wordsMastered >= 25 },
  { id: 'vocab-100', icon: '📗', name: 'Vocabulario', desc: 'Domina 100 palabras.', test: c => c.wordsMastered >= 100 },
  { id: 'vocab-250', icon: '📘', name: 'Biblioteca', desc: 'Domina 250 palabras.', test: c => c.wordsMastered >= 250 },
  { id: 'vocab-grabada', icon: '🧠', name: 'Memoria de elefante', desc: '50 palabras con 25 aciertos.', test: c => c.wordsGold >= 50 },
  { id: 'bronze-5', icon: '🥉', name: 'Cinco de bronce', desc: '5 letras en Bronce.', test: c => c.tierCount(2) >= 5 },
  { id: 'gold-5', icon: '🥇', name: 'Cinco de oro', desc: '5 letras en Oro.', test: c => c.tierCount(4) >= 5 },
  { id: 'gold-all', icon: '🏅', name: 'Todo oro', desc: 'Todas las letras en Oro.', test: c => c.tierCount(4) >= LETTERS.length },
  { id: 'emerald-1', icon: '💚', name: 'Esmeralda', desc: 'Una letra en Esmeralda.', test: c => c.tierCount(6) >= 1 },
  { id: 'diamond-1', icon: '💠', name: 'Primer diamante', desc: 'Una letra en Diamante.', test: c => c.tierCount(8) >= 1 },
  { id: 'diamond-10', icon: '🔷', name: 'Joyero', desc: '10 letras en Diamante.', test: c => c.tierCount(8) >= 10 },
  { id: 'master-1', icon: '🎓', name: 'Maestro', desc: 'Una letra en Maestro.', test: c => c.tierCount(9) >= 1 },
  { id: 'legend-1', icon: '🌟', name: 'Leyenda', desc: 'Una letra en Leyenda.', test: c => c.tierCount(11) >= 1 },
  { id: 'stars-2', icon: '✨', name: 'Dos estrellas', desc: 'Una sura con ★★.', test: c => c.stars2 >= 1 },
  { id: 'stars-3', icon: '⭐', name: 'Tres estrellas', desc: 'Una sura con ★★★.', test: c => c.stars3 >= 1 },
  { id: 'stars-3x5', icon: '🌌', name: 'Constelación', desc: '5 suras con ★★★.', test: c => c.stars3 >= 5 },
  { id: 'quests-1', icon: '📜', name: 'Primera misión', desc: 'Completa una misión diaria.', test: c => c.questsClaimed >= 1 },
  { id: 'quests-20', icon: '🗺️', name: 'Aventurero', desc: 'Completa 20 misiones.', test: c => c.questsClaimed >= 20 },
  { id: 'games-25', icon: '🕹️', name: 'Jugón', desc: 'Termina 25 juegos.', test: c => c.gamesPlayed >= 25 },
  { id: 'rain-30', icon: '🌧️', name: 'Bajo la lluvia', desc: '30 puntos en Lluvia de letras.', test: c => (c.highScores.lluvia ?? 0) >= 30 },
  { id: 'flash-25', icon: '⚡', name: 'Relámpago', desc: '25 puntos en Relámpago.', test: c => (c.highScores.relampago ?? 0) >= 25 },
  { id: 'placement', icon: '⏩', name: 'Atajo', desc: 'Haz la prueba de nivel.', test: c => c.placementDone },
  { id: 'exam-1', icon: '📝', name: 'Certificado: Letras', desc: 'Aprueba el examen de nivel 1.', test: c => c.examsPassed >= 1 },
  { id: 'exam-3', icon: '🎗️', name: 'Certificado: Frases', desc: 'Aprueba el examen de nivel 3.', test: c => c.examsPassed >= 3 },
  { id: 'exam-5', icon: '🏆', name: 'Certificado: Qāriʾ', desc: 'Aprueba el examen final.', test: c => c.examsPassed >= 5 },
  { id: 'marathon-50', icon: '🏃', name: 'Maratoniano', desc: '50 aciertos en Maratón.', test: c => (c.highScores.maraton ?? 0) >= 50 },
  { id: 'minimal-20', icon: '👂', name: 'Oído fino', desc: '20 seguidos en Pares mínimos.', test: c => (c.highScores['pares-minimos'] ?? 0) >= 20 },
]

const totalWords = () => QURAN.surahs.reduce((n, s) => n + s.verses.reduce((m, v) => m + v.words.length, 0), 0)

/** Aleyas de Al-Fátiha que se pueden leer enteras con lo aprendido. */
export function fatihaReadable(known: Set<string>) {
  return QURAN.surahs[0].verses.map(v => v.words.every(w => isReadable(wordByKey(cleanText(w.text))!.items, known)))
}

const cache = new Map<number, { readable: number; fatihaAyahs: number }>()
function lessonStats(lessonsDone: number) {
  let hit = cache.get(lessonsDone)
  if (!hit) {
    const known = learnedItems(lessonsDone)
    hit = { readable: readableCount(known), fatihaAyahs: fatihaReadable(known).filter(Boolean).length }
    cache.set(lessonsDone, hit)
  }
  return hit
}

/** Logros que se cumplen ahora mismo. */
export function earnedAchievements(s: AchievementState): string[] {
  const tiers = LETTERS.map(l => tierIndex(s.points[l.id] ?? 0))
  const known = learnedItems(s.lessonsDone)
  const anyAyah = Object.keys(s.ayahScores).length > 0
  const stars = anyAyah ? QURAN.surahs.map(x => surahStars(x, known, s.ayahScores)) : []
  const ctx: Ctx = {
    ...s,
    ...lessonStats(s.lessonsDone),
    wordsMastered: Object.values(s.wordStats).filter(w => w.m).length,
    wordsGold: Object.values(s.wordStats).filter(w => (w.c ?? 0) >= 25).length,
    tierCount: t => tiers.filter(x => x >= t).length,
    ayahsPassed: Object.values(s.ayahScores).filter(x => x >= AYAH_PASS).length,
    stars2: stars.filter(x => x >= 2).length,
    stars3: stars.filter(x => x === 3).length,
    examsPassed: Object.values(s.exams).filter(e => e.passed).length,
  }
  return ACHIEVEMENTS.filter(a => a.test(ctx)).map(a => a.id)
}
