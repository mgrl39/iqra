import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { LetterCard } from '../components/LetterCard'
import { ArabicWord } from '../components/ArabicWord'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { ResultScreen } from '../components/ResultScreen'
import { CURRICULUM, LESSONS, learnedItems } from '../lib/curriculum'
import { prefetch } from '../lib/audio'
import { lessonQuestions } from '../lib/questions'
import { readableAyahs } from '../lib/daily'
import { confetti, sfx } from '../lib/fx'
import { cleanText } from '../lib/arabic'
import { playAyah } from '../lib/audio'
import { CORPUS_BY_KEY, readableCount } from '../lib/unlock'
import { useProgress } from '../store/progress'
import { lessonOpen } from '../lib/journey'
import { milestonesAt } from '../lib/abilities'

type Step = { kind: 'intro'; index: number } | { kind: 'quiz1' } | { kind: 'words' } | { kind: 'quiz2' } | { kind: 'done' }

export function Lesson() {
  const n = Number(useParams().n)
  const s = useProgress()
  const lesson = LESSONS[n - 1]
  if (!lesson || n > s.lessonsDone + 1 || !lessonOpen(n - 1, s)) return <Navigate to="/mapa" replace />
  return <LessonFlow key={n} n={n} />
}

function LessonFlow({ n }: { n: number }) {
  const lesson = LESSONS[n - 1]
  const navigate = useNavigate()
  const completeLesson = useProgress(s => s.completeLesson)
  const gainXp = useProgress(s => s.gainXp)
  const before = useMemo(() => learnedItems(n - 1), [n])
  const known = useMemo(() => learnedItems(n), [n])
  const questions = useMemo(() => lessonQuestions(lesson, known), [lesson, known])
  const words = lesson.newWords.slice(0, 8).map(k => CORPUS_BY_KEY.get(k)!)
  const [step, setStep] = useState<Step>({ kind: 'intro', index: 0 })
  const [total, setTotal] = useState<QuizResult>({ correct: 0, total: 0, xp: 0 })

  useEffect(() => prefetch(words.map(w => w.audio)), [n])

  const addResult = (r: QuizResult) =>
    setTotal(t => ({ correct: t.correct + r.correct, total: t.total + r.total, xp: t.xp + r.xp }))

  // Una aleya que se puede leer entera gracias a esta lección (si la hay).
  const newAyah = useMemo(() => {
    const before = new Set(readableAyahs(learnedItems(n - 1)).map(a => a.key))
    const fresh = readableAyahs(known).filter(a => !before.has(a.key))
    return fresh.find(a => a.surah.number === 1) ?? fresh[0] ?? null
  }, [n, known])

  const finish = (r: QuizResult) => {
    addResult(r)
    completeLesson(n - 1)
    gainXp(20)
    setTotal(t => ({ ...t, xp: t.xp + 20 }))
    setStep({ kind: 'done' })
    sfx('complete')
    confetti()
  }

  return (
    <div className="lesson">
      <header className="lesson-head">
        <Link to="/" className="close" aria-label="Salir">✕</Link>
        <span>Lección {n}</span>
      </header>

      {step.kind === 'intro' && (
        <>
          <p className="step-label">
            Nuevo · {step.index + 1}/{lesson.items.length}
          </p>
          <LetterCard item={lesson.items[step.index]} known={known} />
          <button
            className="btn primary wide"
            onClick={() =>
              setStep(step.index + 1 < lesson.items.length ? { kind: 'intro', index: step.index + 1 } : { kind: 'quiz1' })
            }
          >
            Entendido
          </button>
        </>
      )}

      {step.kind === 'quiz1' && (
        <QuizRunner
          questions={questions.first}
          onDone={r => {
            addResult(r)
            setStep(words.length ? { kind: 'words' } : { kind: 'quiz2' })
          }}
        />
      )}

      {step.kind === 'words' && (
        <>
          <h2 className="center">🔓 Palabras nuevas</h2>
          <div className="word-grid">
            {words.map(w => (
              <div key={w.key} className="word-tile">
                <ArabicWord text={w.key} audio={w.audio} size="lg" meaning={w.meaning} />
                <small className="ref">{w.count > 1 ? `×${w.count} · ` : ''}{w.ref}</small>
              </div>
            ))}
          </div>
          {lesson.newWords.length > words.length && (
            <p className="center muted">…y {lesson.newWords.length - words.length} más.</p>
          )}
          <button className="btn primary wide" onClick={() => setStep({ kind: 'quiz2' })}>
            A practicar
          </button>
        </>
      )}

      {step.kind === 'quiz2' && <QuizRunner questions={questions.second} onDone={finish} />}

      {step.kind === 'done' && (
        <ResultScreen result={total} title={`¡Lección ${n} completada!`}>
          <p className="unlock-msg">
            <b>+{(readableCount(known) - readableCount(before)).toLocaleString('es')}</b> palabras del texto desbloqueadas
            <br />
            <span className="muted">
              Ya puedes leer {readableCount(known).toLocaleString('es')} de {CURRICULUM.totalWords.toLocaleString('es')}
            </span>
          </p>
          {milestonesAt(n).map(m => (
            <div key={m.id} className="unlocked-ability">
              <small>🔓 Ahora puedes leer</small>
              <b>{m.title}</b>
              <span>{m.why}</span>
            </div>
          ))}
          {newAyah && (
            <div className="new-ayah">
              <small>✨ ¡Ya puedes leer esta aleya entera! ({newAyah.surah.nameSimple} {newAyah.verse.number})</small>
              <div className="new-ayah-words" dir="rtl">
                {newAyah.verse.words.map((w, i) => (
                  <ArabicWord key={i} text={cleanText(w.text)} audio={w.audio} size="lg" connected={i > 0} />
                ))}
              </div>
              <div className="row">
                <button className="btn" onClick={() => playAyah(newAyah.surah.number, newAyah.verse.number)}>🔊 Escuchar</button>
                <button className="btn" onClick={() => navigate(`/reto/${newAyah.surah.id}/${newAyah.verse.number}`)}>🧩 Reto</button>
              </div>
            </div>
          )}
          <div className="row">
            <button className="btn" onClick={() => navigate('/')}>Inicio</button>
            <button className="btn primary" onClick={() => navigate(LESSONS[n] && lessonOpen(n, useProgress.getState()) ? `/leccion/${n + 1}` : '/mapa')}>
              {LESSONS[n] && lessonOpen(n, useProgress.getState()) ? 'Siguiente lección' : '🗺️ Siguiente paso'}
            </button>
          </div>
        </ResultScreen>
      )}
    </div>
  )
}
