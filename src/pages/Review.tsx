import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { ResultScreen } from '../components/ResultScreen'
import { learnedItems } from '../lib/curriculum'
import { questionForCard, type Question } from '../lib/questions'
import { isDue } from '../lib/srs'
import { useProgress } from '../store/progress'

const SESSION = 15

export function Review() {
  const reviewCard = useProgress(s => s.reviewCard)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [session, setSession] = useState(0)

  // Las preguntas se fijan al empezar la sesión para que no cambien al responder.
  const questions = useMemo(() => {
    const { srs, lessonsDone } = useProgress.getState()
    const known = learnedItems(lessonsDone)
    return Object.entries(srs)
      .filter(([, c]) => isDue(c))
      .sort(([, a], [, b]) => a.due - b.due)
      .slice(0, SESSION)
      .map(([k]) => questionForCard(k, known))
      .filter((q): q is Question => q !== null)
  }, [session])

  const nextDue = useProgress(s => Math.min(...Object.values(s.srs).map(c => c.due)))

  if (result)
    return (
      <div className="lesson">
        <ResultScreen result={result} title="Repaso hecho">
          <div className="row">
            <Link to="/" className="btn">Inicio</Link>
            <button className="btn primary" onClick={() => { setResult(null); setSession(session + 1) }}>
              Seguir repasando
            </button>
          </div>
        </ResultScreen>
      </div>
    )

  if (!questions.length)
    return (
      <div className="empty">
        <div className="result-emoji">✅</div>
        <h2>Nada pendiente</h2>
        <p className="muted">
          {Number.isFinite(nextDue)
            ? `El próximo repaso será ${new Date(nextDue).toLocaleString('es', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.`
            : 'Completa una lección y aquí aparecerán letras y palabras para repasar.'}
        </p>
        <Link to="/practicar" className="btn primary">Jugar mientras tanto</Link>
      </div>
    )

  return (
    <div className="lesson">
      <header className="lesson-head">
        <Link to="/" className="close" aria-label="Salir">✕</Link>
        <span>Repaso · {questions.length}</span>
      </header>
      <QuizRunner
        key={session}
        questions={questions}
        onAnswer={(q, ok) => q.srsKey && reviewCard(q.srsKey, ok)}
        onDone={setResult}
      />
    </div>
  )
}
