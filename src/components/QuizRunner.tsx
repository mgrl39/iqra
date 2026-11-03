import { useCallback, useEffect, useRef, useState } from 'react'
import { playWord, playWords } from '../lib/audio'
import { sfx } from '../lib/fx'
import type { Question } from '../lib/questions'
import { useProgress } from '../store/progress'
import { comboMultiplier, setHeat, useFloats } from '../store/floats'
import { NAKED_MASTERED, WORD_MASTERED } from '../lib/mastery'
import { graphemes } from '../lib/arabic'
import { ArabicWord } from './ArabicWord'

export interface QuizResult {
  correct: number
  total: number
  xp: number
  score?: number // juegos arcade
  record?: boolean
}

interface Props {
  questions: Question[]
  onDone: (r: QuizResult) => void
  onAnswer?: (q: Question, correct: boolean) => void
  /** Segundos por pregunta; responder en la primera mitad da XP extra. */
  timed?: number
  /** Repetir al final las preguntas falladas (por defecto, sí). */
  retryWrong?: boolean
  /** Modo supervivencia: la partida acaba al perder todas las vidas. */
  lives?: number
}

/** Audio de la pregunta: frase entera o palabra. */
const playQ = (q: Question) => (q.phrase ? playWords(q.phrase.audios) : q.word ? playWord(q.word.audio) : Promise.resolve())
const AUTO_AUDIO = new Set(['audioWord', 'audioPhrase', 'cloze', 'vocalize', 'mark'])

const XP = 5
const RETRY_XP = 2
const SPEED_BONUS = 3
const TIMEOUT = '\u0000'

export function QuizRunner({ questions, onDone, onAnswer, timed, retryWrong = true, lives }: Props) {
  const s = useProgress()
  const [queue, setQueue] = useState<Question[]>(questions)
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, xp: 0 })
  const [combo, setCombo] = useState(0)
  const best = useRef(0)
  const [timeLeft, setTimeLeft] = useState(timed ?? 0)
  const [collected, setCollected] = useState(false)
  const [freed, setFreed] = useState(false)
  const [livesLeft, setLivesLeft] = useState(lives ?? 0)
  const answeredCount = useRef(0)
  const q = queue[i]
  useEffect(() => () => setHeat(0), [])
  const answered = chosen !== null

  const choose = useCallback(
    (opt: string) => {
      if (chosen !== null) return
      const ok = opt === q.answer
      setChosen(opt)
      answeredCount.current++
      s.answer(q.items, ok)
      if (q.word) {
        const prev = s.wordStats[q.word.key]
        setCollected(ok && !prev?.m && (prev?.s ?? 0) + 1 >= WORD_MASTERED)
        s.wordHit(q.word.key, ok)
        if (q.naked) {
          const ws = s.wordStats[q.word.key]
          setFreed(ok && !ws?.nm && (ws?.ns ?? 0) + 1 >= NAKED_MASTERED)
          s.nakedHit(q.word.key, ok)
        }
      }
      onAnswer?.(q, ok)
      if (ok) {
        const c = combo + 1
        const mult = comboMultiplier(c)
        const xp = Math.round(((q.retry ? RETRY_XP : XP) + (timed && timeLeft > timed / 2 ? SPEED_BONUS : 0)) * mult)
        s.gainXp(xp)
        useFloats.getState().push(`+${xp}${mult > 1 ? ` ×${mult}` : ''}`, mult > 1 ? 'bonus' : 'xp')
        setCombo(c)
        setHeat(c)
        best.current = Math.max(best.current, c)
        sfx(c >= 3 && c % 5 === 0 ? 'combo' : 'right')
        if (!q.retry) setStats(st => ({ correct: st.correct + 1, xp: st.xp + xp }))
        else setStats(st => ({ ...st, xp: st.xp + xp }))
      } else {
        setCombo(0)
        setHeat(0)
        useFloats.getState().push('✗', 'bad')
        sfx('wrong')
        if (lives) setLivesLeft(l => l - 1)
        if (q.optionItems && opt !== TIMEOUT && q.optionItems[opt]) s.recordConfusion(q.items[0], q.optionItems[opt])
        // La pregunta fallada vuelve al final (una sola vez), con las opciones en otro orden.
        if (retryWrong && !lives && !q.retry) setQueue(qs => [...qs, { ...q, retry: true, options: [...q.options].sort(() => Math.random() - 0.5) }])
      }
      void playQ(q)
    },
    [chosen, q, s, onAnswer, timed, timeLeft, combo, retryWrong, lives],
  )

  const next = useCallback(() => {
    const dead = lives !== undefined && livesLeft <= 0
    if (i + 1 >= queue.length || dead) {
      const total = lives ? answeredCount.current : questions.length
      s.recordQuiz(stats.correct, total, best.current)
      onDone({ ...stats, total, ...(lives ? { score: stats.correct } : {}) })
    } else {
      setI(i + 1)
      setChosen(null)
      setFreed(false)
      setCollected(false)
      setTimeLeft(timed ?? 0)
    }
  }, [i, queue.length, onDone, stats, timed, questions.length, s, lives, livesLeft])

  // Audio automático en las preguntas de escuchar.
  useEffect(() => {
    if (q && AUTO_AUDIO.has(q.kind)) void playQ(q)
  }, [q])

  // Temporizador
  useEffect(() => {
    if (!timed || answered) return
    if (timeLeft <= 0) {
      choose(TIMEOUT)
      return
    }
    const t = setTimeout(() => setTimeLeft(t => +(t - 0.1).toFixed(1)), 100)
    return () => clearTimeout(t)
  }, [timed, timeLeft, answered, choose])

  // Teclado: 1-4 para elegir, Enter para continuar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (answered && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        next()
      } else if (!answered && /^[1-4]$/.test(e.key) && +e.key <= q.options.length) choose(q.options[+e.key - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, next, choose, q])

  if (!q) return null
  const ok = chosen === q.answer

  return (
    <div className="quiz">
      <div className="quiz-top">
        <div className="quiz-progress">
          <span style={{ width: `${(100 * (i + (answered ? 1 : 0))) / queue.length}%` }} />
        </div>
        {combo >= 3 && <span key={combo} className="combo">🔥 {combo}{comboMultiplier(combo) > 1 ? ` · ×${comboMultiplier(combo)} XP` : ''}</span>}
        {lives ? <span className="lives">{'❤️'.repeat(Math.max(0, livesLeft))}{'🤍'.repeat(lives - Math.max(0, livesLeft))}</span> : null}
      </div>
      {timed ? (
        <div className="timer">
          <span style={{ width: `${(100 * timeLeft) / timed}%` }} />
        </div>
      ) : null}

      <p className="quiz-label">
        {q.retry && <span className="retry-tag">Otra vez</span>}
        {q.label}
      </p>
      <div className="quiz-prompt" key={i}>
        {q.kind === 'glyph' || q.kind === 'form' ? (
          <div className="glyph" lang="ar">{q.prompt}</div>
        ) : q.kind === 'wordTr' ? (
          <ArabicWord text={q.prompt} size="xl" mode={answered ? 'always' : 'never'} audio={answered ? q.word?.audio : undefined} />
        ) : q.kind === 'phraseTr' && q.phrase ? (
          <div className="phrase-prompt" dir="rtl">
            {q.phrase.words.map((w, k) => (
              <ArabicWord key={k} text={w.key} size="xl" mode={answered ? 'always' : 'never'} connected={k > 0} />
            ))}
          </div>
        ) : q.kind === 'cloze' && q.context ? (
          <div className="cloze">
            <div className="cloze-words" dir="rtl" lang="ar">
              {q.context.words.map((w, k) =>
                k === q.context!.blank ? (
                  <span key={k} className={`cloze-blank${answered ? (ok ? ' right' : ' wrong') : ''}`}>{answered ? q.answer : '؟'}</span>
                ) : (
                  <span key={k}>{w}</span>
                ),
              )}
            </div>
            <button className="big-play small" onClick={() => playQ(q)} aria-label="Escuchar otra vez">🔊</button>
            <small className="muted">{q.context.ref}</small>
          </div>
        ) : q.kind === 'naked' ? (
          <div className="naked-prompt">
            <span className="naked-word" lang="ar" dir="rtl">{q.prompt}</span>
            {answered && q.word && <span className="naked-reveal" lang="ar" dir="rtl">{q.word.key}</span>}
          </div>
        ) : q.kind === 'vocalize' ? (
          <div className="naked-prompt">
            <button className="big-play" onClick={() => playQ(q)} aria-label="Escuchar otra vez">🔊</button>
            <span className="naked-word small" lang="ar" dir="rtl">{q.prompt}</span>
          </div>
        ) : q.kind === 'mark' ? (
          <div className="naked-prompt">
            <span className="naked-word" lang="ar" dir="rtl">
              {graphemes(answered && q.word ? q.word.key : q.prompt).map((c, k) => (
                <span key={k} className={k === q.markAt ? 'mark-target' : undefined}>{c.text}</span>
              ))}
            </span>
            <button className="big-play small" onClick={() => playQ(q)} aria-label="Escuchar otra vez">🔊</button>
          </div>
        ) : q.kind === 'audioWord' || q.kind === 'audioPhrase' ? (
          <button className="big-play" onClick={() => playQ(q)} aria-label="Escuchar otra vez">
            🔊
          </button>
        ) : (
          <div className="tr-prompt">{q.prompt}</div>
        )}
      </div>

      <div className="options">
        {q.options.map((opt, k) => {
          const state = !answered ? '' : opt === q.answer ? ' right' : opt === chosen ? ' wrong' : ' faded'
          return (
            <button key={opt} className={`option${q.optionsAr ? ' ar-opt' : ''}${state}`} onClick={() => choose(opt)} disabled={answered}>
              <kbd>{k + 1}</kbd>
              <span lang={q.optionsAr ? 'ar' : undefined} dir={q.optionsAr ? 'rtl' : undefined}>
                {opt}
              </span>
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={`feedback ${ok ? 'ok' : 'ko'}`}>
          <strong>
            {ok ? pickPraise(combo) : chosen === TIMEOUT ? '¡Se acabó el tiempo!' : lives ? (livesLeft > 0 ? `Fallo · quedan ${livesLeft} ❤️` : 'Sin vidas') : retryWrong && !q.retry ? 'Casi… la repetimos al final' : 'Fallo'}
          </strong>
          {collected && <span className="collected">📖 Nueva en tu colección</span>}
          {freed && <span className="collected freed">👁️ ¡Ya la lees sin harakāt!</span>}
          {q.phrase ? (
            <div className="fb-word" dir="rtl">
              {q.phrase.words.map((w, k) => (
                <ArabicWord key={k} text={w.key} mode="always" meaning={w.meaning} connected={k > 0} />
              ))}
            </div>
          ) : q.word ? (
            <div className="fb-word">
              <ArabicWord text={q.word.key} audio={q.word.audio} mode="always" meaning={q.word.meaning} />
            </div>
          ) : (
            !ok && (
              <span>
                Era: <b>{q.answer}</b>
                {q.kind === 'glyph' && q.optionItems && chosen && q.optionItems[chosen] && (
                  <span className="muted"> · elegiste la de <span lang="ar" className="inline-glyph">{q.optionItems[chosen]}</span></span>
                )}
              </span>
            )
          )}
          <button className="btn primary" onClick={next} autoFocus>
            Continuar
          </button>
        </div>
      )}
    </div>
  )
}

const PRAISE = ['¡Bien!', '¡Correcto!', '¡Eso es!', '¡Muy bien!', '¡Genial!', 'ما شاء الله']
const pickPraise = (combo: number) => (combo >= 5 ? `¡${combo} seguidas!` : PRAISE[Math.floor(Math.random() * PRAISE.length)])
