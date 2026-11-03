import { useEffect, useMemo, useState } from 'react'
import type { QuizResult } from '../components/QuizRunner'
import { graphemes, translitString } from '../lib/arabic'
import { playWord } from '../lib/audio'
import { shuffle } from '../lib/questions'
import { useProgress } from '../store/progress'
import { useKeys } from '../lib/useKeys'
import { pickWeakWords, useKnown } from './common'

const ROUNDS = 6

/** Dictado: lo mismo, pero solo con el audio (sin pista escrita). */
export const Dictation = ({ onDone }: { onDone: (r: QuizResult) => void }) => <BuildWord onDone={onDone} dictation />

/** Escucha la palabra y monta sus letras en orden (de derecha a izquierda). */
export function BuildWord({ onDone, dictation = false }: { onDone: (r: QuizResult) => void; dictation?: boolean }) {
  const { pool } = useKnown()
  const answer = useProgress(s => s.answer)
  const gainXp = useProgress(s => s.gainXp)

  const rounds = useMemo(() => {
    const ok = pool.filter(w => {
      const n = graphemes(w.key).length
      return n >= 2 && n <= 7
    })
    return pickWeakWords(ok.length >= ROUNDS ? ok : pool, ROUNDS).map(w => {
      const tiles = graphemes(w.key).map((c, i) => ({ id: i, text: c.text }))
      return { word: w, tiles, shuffled: shuffle(tiles) }
    })
  }, [pool])

  const [r, setR] = useState(0)
  const [built, setBuilt] = useState<number[]>([])
  const [result, setResult] = useState<boolean | null>(null)
  const [total, setTotal] = useState<QuizResult>({ correct: 0, total: 0, xp: 0 })
  const round = rounds[r]
  const tileText = (id: number) => round.tiles[id].text

  // En el dictado la palabra suena sola al empezar cada ronda.
  useEffect(() => {
    if (dictation) void playWord(round.word.audio)
  }, [r])

  const add = (id: number) => {
    if (result !== null || built.includes(id)) return
    const b = [...built, id]
    setBuilt(b)
    if (b.length === round.tiles.length) {
      // Se compara el texto: dos fichas iguales son intercambiables.
      const ok = b.map(tileText).join('') === round.word.key
      answer(round.word.items, ok)
      const xp = dictation ? 12 : 8
      if (ok) gainXp(xp)
      setTotal(t => ({ correct: t.correct + (ok ? 1 : 0), total: t.total + 1, xp: t.xp + (ok ? xp : 0) }))
      setResult(ok)
      void playWord(round.word.audio)
    }
  }

  const next = () => {
    if (r + 1 >= rounds.length) onDone(total)
    else {
      setR(r + 1)
      setBuilt([])
      setResult(null)
    }
  }

  // Teclado: 1-9 = ficha n (empezando por la derecha), Retroceso = borrar, Enter = seguir
  useKeys({
    ...Object.fromEntries(round.shuffled.slice(0, 9).map((t, i) => [String(i + 1), () => add(t.id)])),
    Backspace: () => result === null && setBuilt(built.slice(0, -1)),
    Enter: () => result !== null && next(),
    ' ': () => void playWord(round.word.audio),
  })

  return (
    <div className="quiz">
      <div className="quiz-progress">
        <span style={{ width: `${(100 * (r + (result !== null ? 1 : 0))) / rounds.length}%` }} />
      </div>
      <p className="quiz-label">{dictation ? 'Dictado: escribe lo que oyes ←' : 'Monta la palabra ←'}</p>
      <div className="build-prompt">
        <button className="big-play small" onClick={() => playWord(round.word.audio)} aria-label="Escuchar">🔊</button>
        {(!dictation || result !== null) && <span className="tr-prompt">{translitString(round.word.key)}</span>}
      </div>
      <div className={`build-answer${result === true ? ' right' : result === false ? ' wrong' : ''}`} dir="rtl" lang="ar">
        {built.map(tileText).join('') || ' '}
      </div>
      {result === false && (
        <p className="center">
          Era: <span lang="ar" className="inline-glyph">{round.word.key}</span>
        </p>
      )}
      <div className="tiles-row" dir="rtl" lang="ar">
        {round.shuffled.map((t, i) => (
          <button key={t.id} className={`tile-btn${built.includes(t.id) ? ' used' : ''}`} onClick={() => add(t.id)} disabled={built.includes(t.id)}>
            {i < 9 && <kbd>{i + 1}</kbd>}
            {t.text}
          </button>
        ))}
      </div>
      {result === null ? (
        <button className="btn wide" onClick={() => setBuilt(built.slice(0, -1))} disabled={!built.length}>
          ⌫ Borrar
        </button>
      ) : (
        <button className="btn primary wide" onClick={next} autoFocus>Continuar</button>
      )}
    </div>
  )
}
