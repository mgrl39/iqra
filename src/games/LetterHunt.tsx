import { useMemo, useState } from 'react'
import { LETTERS } from '../data/letters'
import type { QuizResult } from '../components/QuizRunner'
import { cleanText } from '../lib/arabic'
import { pick, shuffle } from '../lib/questions'
import { QURAN, wordByKey } from '../lib/unlock'
import { useProgress } from '../store/progress'
import { useKnown } from './common'
import { useKeys } from '../lib/useKeys'

const ROUNDS = 4

interface Round {
  letter: string
  ref: string
  words: { text: string; has: boolean }[]
}

/** Busca en una aleya real todas las palabras que contienen la letra. */
export function LetterHunt({ onDone }: { onDone: (r: QuizResult) => void }) {
  const { known } = useKnown()
  const answer = useProgress(s => s.answer)
  const gainXp = useProgress(s => s.gainXp)

  const rounds = useMemo<Round[]>(() => {
    const letters = LETTERS.map(l => l.id).filter(l => known.has(l))
    const verses = QURAN.surahs.flatMap(s => s.verses.map(v => ({ s, v }))).filter(({ v }) => v.words.length >= 4 && v.words.length <= 12)
    return Array.from({ length: ROUNDS }, () => {
      const letter = pick(letters)
      const candidates = shuffle(verses).find(({ v }) => {
        const n = v.words.filter(w => wordByKey(w.text)?.items.includes(letter)).length
        return n >= 1 && n < v.words.length
      }) ?? verses[0]
      return {
        letter,
        ref: `${candidates.s.nameSimple} ${candidates.v.number}`,
        words: candidates.v.words.map(w => ({ text: cleanText(w.text), has: !!wordByKey(w.text)?.items.includes(letter) })),
      }
    })
  }, [known])

  const [r, setR] = useState(0)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [checked, setChecked] = useState(false)
  const [total, setTotal] = useState<QuizResult>({ correct: 0, total: 0, xp: 0 })
  const round = rounds[r]

  const toggle = (i: number) => {
    if (checked) return
    const s = new Set(picked)
    if (s.has(i)) s.delete(i)
    else s.add(i)
    setPicked(s)
  }

  const check = () => {
    const hits = round.words.filter((w, i) => w.has && picked.has(i)).length
    const misses = round.words.filter((w, i) => !w.has && picked.has(i)).length
    const targets = round.words.filter(w => w.has).length
    const perfect = hits === targets && misses === 0
    const xp = Math.max(0, hits * 3 - misses * 2) + (perfect ? 5 : 0)
    answer([round.letter], perfect)
    if (xp) gainXp(xp)
    setTotal(t => ({ correct: t.correct + (perfect ? 1 : 0), total: t.total + 1, xp: t.xp + xp }))
    setChecked(true)
  }

  const next = () => {
    if (r + 1 >= rounds.length) onDone(total)
    else {
      setR(r + 1)
      setPicked(new Set())
      setChecked(false)
    }
  }

  useKeys({
    ...Object.fromEntries(round.words.slice(0, 9).map((_, i) => [String(i + 1), () => toggle(i)])),
    Enter: () => (checked ? next() : check()),
  })

  return (
    <div className="quiz">
      <div className="quiz-progress">
        <span style={{ width: `${(100 * (r + (checked ? 1 : 0))) / rounds.length}%` }} />
      </div>
      <p className="quiz-label">
        Toca las que tengan <span className="inline-glyph" lang="ar">{round.letter}</span>
      </p>
      <p className="center muted small">{round.ref}</p>
      <div className="hunt" dir="rtl" lang="ar">
        {round.words.map((w, i) => {
          const state = checked ? (w.has && picked.has(i) ? ' right' : w.has ? ' missed' : picked.has(i) ? ' wrong' : '') : picked.has(i) ? ' picked' : ''
          return (
            <button key={i} className={`hunt-word${state}`} onClick={() => toggle(i)}>
              {i < 9 && <kbd>{i + 1}</kbd>}
              {w.text}
            </button>
          )
        })}
      </div>
      {!checked ? (
        <button className="btn primary wide" onClick={check}>Comprobar</button>
      ) : (
        <button className="btn primary wide" onClick={next} autoFocus>Continuar</button>
      )}
    </div>
  )
}
