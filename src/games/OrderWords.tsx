import { useEffect, useMemo, useState } from 'react'
import { ArabicWord } from '../components/ArabicWord'
import { playWords, stop } from '../lib/audio'
import { sfx } from '../lib/fx'
import { shuffle } from '../lib/questions'
import { stripMarks } from '../lib/arabic'
import { useKeys } from '../lib/useKeys'
import type { CorpusWord } from '../lib/unlock'
import { useProgress } from '../store/progress'

export interface OrderWord {
  entry: CorpusWord
  audio: string
}

/**
 * Escucha un tramo de aleya y toca sus palabras en orden. Cada toque se comprueba
 * al momento: un error cuenta como fallo y la palabra no se coloca.
 */
export function OrderWords({ words, onDone, label = 'Escucha y ordena ←', naked }: { words: OrderWord[]; onDone: (mistakes: number) => void; label?: string; naked?: boolean }) {
  const s = useProgress()
  const pool = useMemo(() => shuffle(words.map((w, i) => ({ ...w, id: i }))), [words])
  const [placed, setPlaced] = useState<number[]>([])
  const [mistakes, setMistakes] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const done = placed.length === words.length

  const listen = () => void playWords(words.map(w => w.audio))
  useEffect(() => {
    listen()
    return () => stop()
  }, [words])

  const tap = (id: number) => {
    if (done || placed.includes(id)) return
    const expected = words[placed.length]
    const got = pool.find(p => p.id === id)!
    if (got.entry.key === expected.entry.key) {
      // Dos palabras iguales son intercambiables: se coloca la que toca.
      const p = [...placed, id]
      setPlaced(p)
      s.answer(expected.entry.items, true)
      s.gainXp(2)
      sfx('tap')
      if (p.length === words.length) {
        sfx('right')
        setTimeout(() => onDone(mistakes), 700)
      }
    } else {
      setMistakes(m => m + 1)
      s.answer(expected.entry.items, false)
      sfx('wrong')
      setWrong(id)
      setTimeout(() => setWrong(null), 350)
    }
  }

  useKeys({
    ...Object.fromEntries(pool.slice(0, 9).map((p, i) => [String(i + 1), () => tap(p.id)])),
    ' ': listen,
  })

  return (
    <div className="quiz order">
      <p className="quiz-label">{label}</p>
      <button className="big-play small" onClick={listen} aria-label="Escuchar">🔊</button>
      <div className="order-answer" dir="rtl">
        {placed.map((id, k) => {
          const w = pool.find(p => p.id === id)!
          return <ArabicWord key={k} text={w.entry.key} size="lg" mode="never" connected={k > 0} />
        })}
        {!done && <span className="order-slot">؟</span>}
      </div>
      <div className="tiles-row" dir="rtl">
        {pool.map((p, i) => (
          <button
            key={p.id}
            className={`tile-btn word${placed.includes(p.id) ? ' used' : ''}${wrong === p.id ? ' wrong' : ''}`}
            onClick={() => tap(p.id)}
            disabled={placed.includes(p.id)}
            lang="ar"
          >
            {i < 9 && <kbd>{i + 1}</kbd>}
            {naked ? stripMarks(p.entry.key) : p.entry.key}
          </button>
        ))}
      </div>
      <p className="center muted small">Fallos: {mistakes}</p>
    </div>
  )
}
