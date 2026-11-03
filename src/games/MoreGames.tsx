import { useMemo, useRef, useState } from 'react'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { cleanText } from '../lib/arabic'
import {
  audioPhraseQuestion, audioWordQuestion, clozeQuestion, itemQuestion, longWords, minimalPairCandidates,
  minimalPairQuestion, phraseTrQuestion, pick, shuffle, trWordQuestion, wordTrQuestion, type Question,
} from '../lib/questions'
import { readablePhrases, readableWords, wordByKey } from '../lib/unlock'
import { useProgress } from '../store/progress'
import { ayahsFor, firstLevel, pickWeakWords, useKnown } from './common'
import { OrderWords, type OrderWord } from './OrderWords'

interface GameProps {
  onDone: (r: QuizResult) => void
}

const ROUNDS = 10

/** Partida con vidas: el resultado cuenta como récord. */
function SurvivalQuiz({ game, questions, onDone, timed }: { game: string; questions: Question[]; onDone: GameProps['onDone']; timed?: number }) {
  return (
    <QuizRunner
      questions={questions}
      lives={3}
      timed={timed}
      onDone={r => onDone({ ...r, record: useProgress.getState().setHighScore(game, r.score ?? r.correct) })}
    />
  )
}

/** Oído fino: palabra real contra la misma con una letra de sonido parecido. Hasta fallar 3. */
let pairsFloor = -1
let phrasesFloor = -1

export function MinimalPairs({ onDone }: GameProps) {
  if (pairsFloor < 0) pairsFloor = firstLevel(k => minimalPairCandidates(readableWords(k), k).length >= 15)
  const { known, pool } = useKnown(pairsFloor)
  const qs = useMemo(() => {
    const cands = minimalPairCandidates(pool, known)
    return Array.from({ length: 80 }, () => minimalPairQuestion(pick(cands), known)).filter(Boolean) as Question[]
  }, [known, pool])
  if (!qs.length) return <p className="center muted">No hay palabras disponibles.</p>
  return <SurvivalQuiz game="pares-minimos" questions={qs} onDone={onDone} />
}

/** Maratón: preguntas cada vez más difíciles hasta perder las 3 vidas. */
export function Marathon({ onDone }: GameProps) {
  const { known, pool } = useKnown()
  const qs = useMemo(() => {
    const items = [...known]
    const phrases = readablePhrases(known)
    const long = longWords(pool)
    const mp = minimalPairCandidates(pool, known)
    const word = (top: number) => pool.length >= 4 && pick([wordTrQuestion, audioWordQuestion, trWordQuestion])(pick(pool.slice(0, top)), pool)
    const stage = (i: number): Array<() => Question | null | false> => {
      if (i < 8) return [() => itemQuestion(pick(items), known), () => word(60)]
      if (i < 25) return [() => word(200), () => word(200), () => itemQuestion(pick(items), known)]
      if (i < 50) return [() => word(600), () => phrases.length >= 4 && phraseTrQuestion(pick(phrases.slice(0, 300)), phrases), () => mp.length > 0 && minimalPairQuestion(pick(mp), known)]
      return [
        () => word(pool.length),
        () => long.length >= 4 && wordTrQuestion(pick(long), pool),
        () => phrases.length >= 4 && pick([phraseTrQuestion, audioPhraseQuestion])(pick(phrases), phrases),
        () => clozeQuestion(known, pool),
      ]
    }
    const out: Question[] = []
    for (let i = 0, tries = 0; out.length < 150 && tries < 1000; tries++) {
      const q = pick(stage(i))()
      if (q) out.push(q), i++
    }
    return out
  }, [known, pool])
  return <SurvivalQuiz game="maraton" questions={qs} onDone={onDone} timed={12} />
}

/** Frases de dos palabras: leerlas enlazadas y reconocerlas al oído. */
export function Phrases({ onDone }: GameProps) {
  if (phrasesFloor < 0) phrasesFloor = firstLevel(k => readablePhrases(k).length >= 20)
  const { known } = useKnown(phrasesFloor)
  const qs = useMemo(() => {
    const phrases = readablePhrases(known)
    return pickWeakWords(phrases.slice(0, 400), ROUNDS).map(p => pick([phraseTrQuestion, phraseTrQuestion, audioPhraseQuestion])(p, phrases))
  }, [known])
  if (qs.length < 3) return <p className="center muted">No hay frases disponibles.</p>
  return <QuizRunner questions={qs} onDone={onDone} timed={12} />
}

/** Completa la aleya: escucha la palabra que falta y elígela. */
export function Cloze({ onDone }: GameProps) {
  const { known, pool } = useKnown()
  const qs = useMemo(() => Array.from({ length: ROUNDS }, () => clozeQuestion(known, pool)).filter(Boolean) as Question[], [known, pool])
  if (qs.length < 3) return <p className="center muted">Aún no hay aleyas con suficientes palabras legibles.</p>
  return <QuizRunner questions={qs} onDone={onDone} />
}

// ------------------------------------------------------------ Ordena la aleya

const ORDER_ROUNDS = 5

export function OrderAyah({ onDone }: GameProps) {
  const { known } = useKnown()
  const rounds = useMemo(() => {
    return shuffle(ayahsFor(known)).slice(0, ORDER_ROUNDS).map(a => {
      const words: OrderWord[] = a.verse.words.map(w => ({ entry: wordByKey(cleanText(w.text))!, audio: w.audio }))
      const start = Math.floor(Math.random() * Math.max(1, words.length - 7))
      return { ref: `${a.surah.nameSimple} ${a.verse.number}`, words: words.slice(start, start + 7) }
    })
  }, [known])
  const [r, setR] = useState(0)
  const total = useRef({ correct: 0, total: 0, xp: 0 })
  if (!rounds.length) return <p className="center muted">No hay aleyas disponibles.</p>

  const done = (mistakes: number) => {
    const t = total.current
    const n = rounds[r].words.length
    t.correct += mistakes === 0 ? 1 : 0
    t.total += 1
    t.xp += 2 * n
    if (r + 1 >= rounds.length) onDone({ ...t })
    else setR(r + 1)
  }
  return (
    <>
      <div className="quiz-progress"><span style={{ width: `${(100 * r) / rounds.length}%` }} /></div>
      <OrderWords key={r} words={rounds[r].words} onDone={done} label={`Escucha y ordena · ${rounds[r].ref}`} />
    </>
  )
}
