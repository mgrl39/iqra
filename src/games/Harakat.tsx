// Juegos para el objetivo final: leer sin harakāt (sin los signos de encima y debajo).
import { useMemo, useRef, useState } from 'react'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { cleanText } from '../lib/arabic'
import { missingMarkQuestion, nakedCandidates, nakedTrQuestion, pick, shuffle, vocalizeQuestion, type Question } from '../lib/questions'
import { wordByKey, type CorpusWord } from '../lib/unlock'
import { useProgress } from '../store/progress'
import { ayahsFor, pickWeakWords, useKnown } from './common'
import { OrderWords, type OrderWord } from './OrderWords'

interface GameProps {
  onDone: (r: QuizResult) => void
}

/**
 * Palabras para leer sin signos: primero las de tu colección que aún no lees a pelo,
 * luego el resto de lo que ya sabes leer con signos.
 */
export function nakedPool(pool: CorpusWord[]) {
  const ws = useProgress.getState().wordStats
  const cands = nakedCandidates(pool)
  // a medias (ya acertadas sin signos) → de tu colección → el resto → ya dominadas
  const rank = (w: CorpusWord) => (ws[w.key]?.nm ? 3 : ws[w.key]?.ns ? 0 : ws[w.key]?.m ? 1 : 2)
  return cands.slice(0, 400).sort((a, b) => rank(a) - rank(b)).slice(0, 80)
}

/** Sin harakāt: lee la palabra desnuda y elige su lectura (o elige sus vocales al oírla). */
export function NakedRead({ onDone }: GameProps) {
  const { pool } = useKnown()
  const qs = useMemo(() => {
    // 8 palabras; las 4 primeras vuelven al final (repetición espaciada dentro de la partida)
    const np = nakedPool(pool)
    const words = [...np.slice(0, 3), ...pickWeakWords(np.slice(3), 5)]
    const first = words.map((w, i) => (i % 3 === 2 ? vocalizeQuestion(w) : null) ?? nakedTrQuestion(w, pool))
    return [...first, ...words.slice(0, 4).map(w => nakedTrQuestion(w, pool))]
  }, [pool])
  return <QuizRunner questions={qs} onDone={onDone} />
}

/** Signo perdido: falta una haraka; escucha y elige cuál. */
export function MissingMark({ onDone }: GameProps) {
  const { pool } = useKnown()
  const qs = useMemo(
    () => pickWeakWords(pool.filter(w => w.audio).slice(0, 300), 24).map(missingMarkQuestion).filter(Boolean).slice(0, 12) as Question[],
    [pool],
  )
  return <QuizRunner questions={qs} onDone={onDone} timed={14} />
}

/** Sin red: palabras sin signos contrarreloj hasta fallar 3. */
export function NakedSurvival({ onDone }: GameProps) {
  const { pool } = useKnown()
  const qs = useMemo(() => {
    const base = nakedCandidates(pool)
    return Array.from({ length: 120 }, (_, i) => nakedTrQuestion(pick(base.slice(0, 40 + i * 6)), pool))
  }, [pool])
  return (
    <QuizRunner
      questions={qs}
      lives={3}
      timed={10}
      onDone={r => onDone({ ...r, record: useProgress.getState().setHighScore('sin-red', r.score ?? r.correct) })}
    />
  )
}

const ROUNDS = 4

/** Aleya desnuda: escucha y ordena las palabras escritas sin harakāt. */
export function NakedAyah({ onDone }: GameProps) {
  const { known } = useKnown()
  const rounds = useMemo(
    () =>
      shuffle(ayahsFor(known)).slice(0, ROUNDS).map(a => {
        const words: OrderWord[] = a.verse.words.map(w => ({ entry: wordByKey(cleanText(w.text))!, audio: w.audio }))
        const start = Math.floor(Math.random() * Math.max(1, words.length - 6))
        return { ref: `${a.surah.nameSimple} ${a.verse.number}`, words: words.slice(start, start + 6) }
      }),
    [known],
  )
  const [r, setR] = useState(0)
  const total = useRef({ correct: 0, total: 0, xp: 0 })
  if (!rounds.length) return <p className="center muted">No hay aleyas disponibles.</p>
  const done = (mistakes: number) => {
    const t = total.current
    t.correct += mistakes === 0 ? 1 : 0
    t.total += 1
    t.xp += 3 * rounds[r].words.length
    if (r + 1 >= rounds.length) onDone({ ...t })
    else setR(r + 1)
  }
  return (
    <>
      <div className="quiz-progress"><span style={{ width: `${(100 * r) / rounds.length}%` }} /></div>
      <OrderWords key={r} words={rounds[r].words} onDone={done} naked label={`Sin harakāt · escucha y ordena · ${rounds[r].ref}`} />
    </>
  )
}
