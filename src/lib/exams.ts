// Exámenes de certificación: largos, cronometrados, sin segunda oportunidad.
import { LETTERS } from '../data/letters'
import { LESSONS } from './curriculum'
import {
  audioPhraseQuestion, audioWordQuestion, clozeQuestion, formQuestion, itemQuestion, longWords,
  minimalPairCandidates, minimalPairQuestion, phraseTrQuestion, pick, shuffle, trWordQuestion, wordTrQuestion,
  type Question,
} from './questions'
import { readablePhrases, readableWords } from './unlock'

export interface Exam {
  id: string
  level: number
  name: string
  icon: string
  desc: string
  minLessons: number
  count: number
  timed: number // segundos por pregunta
  pass: number // % para aprobar
  xp: number
  build: (known: Set<string>) => Question[]
}

type Gen = () => Question | null

/** Rellena `n` preguntas tirando de generadores al azar (los que fallan se ignoran). */
function fill(n: number, gens: Gen[]): Question[] {
  const out: Question[] = []
  const seen = new Set<string>()
  for (let tries = 0; out.length < n && tries < n * 20; tries++) {
    const q = pick(gens)()
    if (!q) continue
    const k = q.kind + q.prompt
    if (seen.has(k) && tries < n * 10) continue // evita repetidas mientras se pueda
    seen.add(k)
    out.push(q)
  }
  return shuffle(out)
}

function generators(known: Set<string>) {
  const words = readableWords(known)
  const long = longWords(words)
  const phrases = readablePhrases(known)
  const mp = minimalPairCandidates(words, known)
  const items = [...known]
  const formLetters = LETTERS.map(l => l.id).filter(l => known.has(l) && !['ء', 'ة', 'ى'].includes(l))
  const has = <T,>(xs: T[], min = 4) => xs.length >= min
  return {
    item: () => itemQuestion(pick(items), known),
    form: () => (formLetters.length ? formQuestion(pick(formLetters), known) : null),
    word: () => (has(words) ? pick([wordTrQuestion, audioWordQuestion, trWordQuestion])(pick(words.slice(0, 300)), words) : null),
    rareWord: () => (has(words, 40) ? wordTrQuestion(pick(words.slice(150)), words) : null),
    long: () => (has(long) ? pick([wordTrQuestion, trWordQuestion])(pick(long), words) : null),
    phrase: () => (has(phrases) ? pick([phraseTrQuestion, audioPhraseQuestion])(pick(phrases.slice(0, 400)), phrases) : null),
    minimal: () => (mp.length ? minimalPairQuestion(pick(mp), known) : null),
    cloze: () => (has(words, 20) ? clozeQuestion(known, words) : null),
  }
}

const ALL = LESSONS.length

export const EXAMS: Exam[] = [
  {
    id: 'letras', level: 1, name: 'Letras', icon: '🔤', desc: 'Letras, signos y formas',
    minLessons: 4, count: 20, timed: 8, pass: 80, xp: 150,
    build: k => { const g = generators(k); return fill(20, [g.item, g.item, g.form]) },
  },
  {
    id: 'palabras', level: 2, name: 'Palabras', icon: '📖', desc: 'Leer y reconocer al oído',
    minLessons: 8, count: 25, timed: 8, pass: 80, xp: 250,
    build: k => { const g = generators(k); return fill(25, [g.word, g.word, g.word, g.item, g.minimal]) },
  },
  {
    id: 'frases', level: 3, name: 'Frases', icon: '🔗', desc: 'Dos palabras enlazadas y oído fino',
    minLessons: 12, count: 30, timed: 9, pass: 80, xp: 400,
    build: k => { const g = generators(k); return fill(30, [g.phrase, g.phrase, g.word, g.minimal, g.long]) },
  },
  {
    id: 'aleyas', level: 4, name: 'Aleyas', icon: '📜', desc: 'Completa aleyas y palabras largas',
    minLessons: 16, count: 35, timed: 8, pass: 85, xp: 600,
    build: k => { const g = generators(k); return fill(35, [g.cloze, g.cloze, g.long, g.phrase, g.rareWord, g.minimal]) },
  },
  {
    id: 'qari', level: 5, name: 'Qāriʾ', icon: '🏆', desc: 'El examen final: de todo, rápido',
    minLessons: ALL, count: 50, timed: 6, pass: 90, xp: 1000,
    build: k => { const g = generators(k); return fill(50, [g.item, g.word, g.rareWord, g.long, g.phrase, g.phrase, g.minimal, g.cloze, g.cloze]) },
  },
]

/** ¿Se puede presentar? Requiere lecciones y haber aprobado el anterior. */
export function examUnlocked(e: Exam, lessonsDone: number, exams: Record<string, { passed?: number }>) {
  const prev = EXAMS[e.level - 2]
  return lessonsDone >= e.minLessons && (!prev || !!exams[prev.id]?.passed)
}
