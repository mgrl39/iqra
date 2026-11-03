import { useMemo } from 'react'
import { LETTERS } from '../data/letters'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { audioWordQuestion, formQuestion, itemQuestion, pick, shuffle, wordTrQuestion, type Question } from '../lib/questions'
import { useProgress } from '../store/progress'
import { pickWeakWords, useKnown } from './common'

interface GameProps {
  onDone: (r: QuizResult) => void
}

const ROUNDS = 10

export function SpeedRead({ onDone }: GameProps) {
  const { pool } = useKnown()
  const qs = useMemo(() => pickWeakWords(pool, ROUNDS).map(w => wordTrQuestion(w, pool)), [pool])
  return <QuizRunner questions={qs} onDone={onDone} timed={8} />
}

export function SoundMatch({ onDone }: GameProps) {
  const { pool } = useKnown()
  const qs = useMemo(() => pickWeakWords(pool.filter(w => w.audio), ROUNDS).map(w => audioWordQuestion(w, pool)), [pool])
  return <QuizRunner questions={qs} onDone={onDone} />
}

export function FormMatch({ onDone }: GameProps) {
  const { known } = useKnown()
  const qs = useMemo(() => {
    const letters = LETTERS.map(l => l.id).filter(l => known.has(l) && !['ء', 'ة', 'ى'].includes(l))
    return Array.from({ length: ROUNDS }, () => formQuestion(pick(letters), known))
  }, [known])
  return <QuizRunner questions={qs} onDone={onDone} timed={10} />
}

/** Entrena lo que peor llevas: items con menos dominio y letras que confundes. */
export function WeakSpots({ onDone }: GameProps) {
  const { known, pool } = useKnown()
  const qs = useMemo(() => {
    const { mastery, confusions } = useProgress.getState()
    const confused = Object.entries(confusions)
      .sort((a, b) => b[1] - a[1])
      .flatMap(([k]) => k.split('|'))
      .filter(it => known.has(it))
    const weakest = [...known].sort((a, b) => (mastery[a] ?? 0) - (mastery[b] ?? 0))
    const targets = [...new Set([...confused.slice(0, 4), ...weakest])].slice(0, 6)
    const out: Question[] = []
    for (const it of targets) {
      out.push(itemQuestion(it, known))
      const w = pool.filter(x => x.items.includes(it))
      if (w.length) out.push(wordTrQuestion(pick(w.slice(0, 20)), pool))
    }
    return shuffle(out).slice(0, 12)
  }, [known, pool])
  return <QuizRunner questions={qs} onDone={onDone} />
}
