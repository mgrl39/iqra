import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArabicWord } from '../components/ArabicWord'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { OrderWords, type OrderWord } from '../games/OrderWords'
import { cleanText } from '../lib/arabic'
import { learnedItems } from '../lib/curriculum'
import { readableFraction, surahById } from '../lib/daily'
import { confetti, sfx } from '../lib/fx'
import { AYAH_PASS } from '../lib/mastery'
import { phraseTrQuestion, shuffle, wordTrQuestion } from '../lib/questions'
import { PHRASES, readableWords, wordByKey } from '../lib/unlock'
import { useProgress } from '../store/progress'

const MAX_ORDER = 8

/** Reto de una aleya: leer sus palabras (opción múltiple) y ordenarla al oído. Nota verificable. */
export function AyahChallenge() {
  const { id, v } = useParams()
  const surah = surahById(id ?? '')
  const verse = surah?.verses.find(x => x.number === Number(v))
  const lessonsDone = useProgress(s => s.lessonsDone)
  const [round, setRound] = useState(0)
  if (!surah || !verse) return <Navigate to="/leer" replace />
  if (readableFraction(verse, learnedItems(lessonsDone)) < 1) return <Navigate to={`/leer/${surah.id}`} replace />
  return <ChallengeFlow key={`${id}:${v}:${round}`} surahId={surah.id} verseNumber={verse.number} onRestart={() => setRound(round + 1)} />
}

const PHRASE_BY_KEY = new Map(PHRASES.map(p => [p.key, p]))

function ChallengeFlow({ surahId, verseNumber, onRestart }: { surahId: string; verseNumber: number; onRestart: () => void }) {
  const surah = surahById(surahId)!
  const verse = surah.verses.find(x => x.number === verseNumber)!
  const key = `${surah.id}:${verse.number}`
  const navigate = useNavigate()
  const s = useProgress()
  const known = useMemo(() => learnedItems(s.lessonsDone), [s.lessonsDone])
  const words: OrderWord[] = useMemo(() => verse.words.map(w => ({ entry: wordByKey(cleanText(w.text))!, audio: w.audio })), [verse])

  const questions = useMemo(() => {
    const pool = readableWords(known)
    const unique = [...new Map(words.map(w => [w.entry.key, w.entry])).values()]
    const qs = shuffle(unique).slice(0, 8).map(w => wordTrQuestion(w, pool))
    // Una pareja de palabras de esta aleya, leída enlazada.
    if (words.length >= 2) {
      const i = Math.floor(Math.random() * (words.length - 1))
      const pair = PHRASE_BY_KEY.get(`${words[i].entry.key} ${words[i + 1].entry.key}`)
      if (pair) qs.push(phraseTrQuestion(pair, PHRASES.slice(0, 80)))
    }
    return shuffle(qs)
  }, [known, words])

  // Tramo para ordenar: la aleya entera si es corta; si no, un trozo seguido.
  const chunk = useMemo(() => {
    if (words.length <= MAX_ORDER) return words
    const start = Math.floor(Math.random() * (words.length - MAX_ORDER + 1))
    return words.slice(start, start + MAX_ORDER)
  }, [words])

  const [phase, setPhase] = useState<'read' | 'order' | 'done'>('read')
  const [read, setRead] = useState<QuizResult>({ correct: 0, total: 0, xp: 0 })
  const [score, setScore] = useState(0)
  const [xp, setXp] = useState(0)
  const before = s.ayahScores[key] ?? 0
  const next = surah.verses.find(x => x.number === verseNumber + 1)

  const finish = (mistakes: number) => {
    const orderPts = Math.max(0, chunk.length - mistakes)
    const pct = Math.round((100 * (read.correct + orderPts)) / (read.total + chunk.length))
    const gained = (pct >= AYAH_PASS ? 15 : 5) + (pct === 100 ? 10 : 0) + (pct >= AYAH_PASS && before < AYAH_PASS ? 10 : 0)
    s.recordAyah(key, pct)
    s.gainXp(gained)
    setScore(pct)
    setXp(read.xp + gained)
    setPhase('done')
    sfx(pct >= AYAH_PASS ? 'complete' : 'wrong')
    if (pct === 100) confetti()
  }

  return (
    <div className="lesson">
      <header className="lesson-head">
        <Link to={`/leer/${surah.id}`} className="close" aria-label="Salir">✕</Link>
        <span>🧩 {surah.nameSimple} · {verse.number}</span>
      </header>

      {phase === 'read' && (
        <>
          <p className="step-label">1/2 · Lee cada palabra</p>
          <QuizRunner questions={questions} retryWrong={false} onDone={r => { setRead(r); setPhase('order') }} />
        </>
      )}
      {phase === 'order' && (
        <>
          <p className="step-label">2/2 · {chunk.length < words.length ? 'Un tramo de la aleya' : 'La aleya entera'}</p>
          <OrderWords words={chunk} onDone={finish} />
        </>
      )}
      {phase === 'done' && (
        <div className="result">
          <div className={`big-score${score >= AYAH_PASS ? ' pass' : ' fail'}`}>{score}%</div>
          <h2>{score === 100 ? '¡Perfecta!' : score >= AYAH_PASS ? 'Superada' : `Necesitas ${AYAH_PASS}%`}</h2>
          <p className="muted">+{xp} XP{before ? ` · mejor nota ${Math.max(before, score)}%` : ''}</p>
          <div className="new-ayah-words" dir="rtl">
            {words.map((w, i) => (
              <ArabicWord key={i} text={w.entry.key} audio={w.audio} size="lg" connected={i > 0} />
            ))}
          </div>
          <p className="ayah-es">{verse.es}</p>
          <div className="row">
            <button className="btn" onClick={onRestart}>Repetir</button>
            {next && readableFraction(next, known) === 1 ? (
              <button className="btn primary" onClick={() => navigate(`/reto/${surah.id}/${next.number}`)}>Siguiente aleya →</button>
            ) : (
              <button className="btn primary" onClick={() => navigate(`/leer/${surah.id}`)}>Volver a la sura</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
