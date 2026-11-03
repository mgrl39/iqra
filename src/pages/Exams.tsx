import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { learnedItems } from '../lib/curriculum'
import { EXAMS, examUnlocked, type Exam } from '../lib/exams'
import { confetti, sfx } from '../lib/fx'
import { useProgress } from '../store/progress'

export function ExamList() {
  const lessonsDone = useProgress(s => s.lessonsDone)
  const exams = useProgress(s => s.exams)
  return (
    <div>
      <header className="reader-head">
        <Link to="/practicar" className="back">←</Link>
        <h2>📝 Exámenes</h2>
      </header>
      <p className="muted small">Cronometrados, sin repetir fallos. Apruébalos en orden para certificar tu nivel.</p>
      <div className="exam-list">
        {EXAMS.map(e => {
          const rec = exams[e.id]
          const open = examUnlocked(e, lessonsDone, exams)
          const body = (
            <>
              <span className="exam-level">{rec?.passed ? '✅' : open ? e.icon : '🔒'}</span>
              <div>
                <b>Nivel {e.level} · {e.name}</b>
                <small>{e.desc}</small>
                <small className="muted">
                  {open
                    ? `${e.count} preguntas · ${e.timed} s · aprobar ${e.pass}%`
                    : lessonsDone < e.minLessons
                      ? `Lección ${e.minLessons}`
                      : `Aprueba el nivel ${e.level - 1}`}
                </small>
              </div>
              {rec && <span className="record">{rec.best}%</span>}
            </>
          )
          return open ? (
            <Link key={e.id} to={`/examen/${e.id}`} className={`exam-card${rec?.passed ? ' passed' : ''}`}>{body}</Link>
          ) : (
            <div key={e.id} className="exam-card locked">{body}</div>
          )
        })}
      </div>
    </div>
  )
}

export function TakeExam() {
  const exam = EXAMS.find(e => e.id === useParams().id)
  const lessonsDone = useProgress(s => s.lessonsDone)
  const exams = useProgress(s => s.exams)
  const [round, setRound] = useState(0)
  if (!exam || !examUnlocked(exam, lessonsDone, exams)) return <Navigate to="/examen" replace />
  return <ExamFlow key={`${exam.id}:${round}`} exam={exam} onRetry={() => setRound(round + 1)} />
}

function ExamFlow({ exam, onRetry }: { exam: Exam; onRetry: () => void }) {
  const s = useProgress()
  const known = useMemo(() => learnedItems(s.lessonsDone), [s.lessonsDone])
  const questions = useMemo(() => exam.build(known), [exam, known])
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro')
  const [result, setResult] = useState<{ pct: number; passed: boolean; first: boolean; r: QuizResult } | null>(null)
  const rec = s.exams[exam.id]

  const finish = (r: QuizResult) => {
    const pct = Math.round((100 * r.correct) / Math.max(1, r.total))
    const passed = pct >= exam.pass
    const first = s.recordExam(exam.id, pct, passed)
    if (first) {
      s.gainXp(exam.xp)
      confetti(120)
    }
    sfx(passed ? 'levelup' : 'wrong')
    setResult({ pct, passed, first, r })
    setPhase('done')
  }

  return (
    <div className="lesson">
      <header className="lesson-head">
        <Link to="/examen" className="close" aria-label="Salir">✕</Link>
        <span>📝 Nivel {exam.level} · {exam.name}</span>
      </header>
      {phase === 'intro' && (
        <div className="result exam-intro">
          <div className="intro-icon">{exam.icon}</div>
          <h2>Examen: {exam.name}</h2>
          <ul className="exam-rules">
            <li>📋 {questions.length} preguntas</li>
            <li>⏱ {exam.timed} s por pregunta</li>
            <li>🚫 Sin repetir fallos</li>
            <li>🎯 Apruebas con {exam.pass}%</li>
            <li>💎 +{exam.xp} XP la primera vez</li>
          </ul>
          {rec && <p className="muted">Mejor nota: {rec.best}% · {rec.attempts} {rec.attempts === 1 ? 'intento' : 'intentos'}</p>}
          <button className="btn primary wide" onClick={() => setPhase('run')}>Empezar</button>
        </div>
      )}
      {phase === 'run' && <QuizRunner questions={questions} timed={exam.timed} retryWrong={false} onDone={finish} />}
      {phase === 'done' && result && (
        <div className="result">
          <div className={`big-score ${result.passed ? 'pass' : 'fail'}`}>{result.pct}%</div>
          <h2>{result.passed ? (result.first ? `🎉 ¡Certificado nivel ${exam.level}!` : 'Aprobado') : `Suspenso · necesitas ${exam.pass}%`}</h2>
          <p className="muted">
            {result.r.correct}/{result.r.total} correctas · +{result.r.xp + (result.first ? exam.xp : 0)} XP
          </p>
          <div className="row">
            <Link to="/examen" className="btn">Exámenes</Link>
            <button className="btn primary" onClick={onRetry}>Otra vez</button>
          </div>
        </div>
      )}
    </div>
  )
}
