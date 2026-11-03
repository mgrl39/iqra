import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { LESSONS, learnedItems } from '../lib/curriculum'
import { confetti, sfx } from '../lib/fx'
import { itemQuestion, shuffle, wordTrQuestion, type Question } from '../lib/questions'
import { CORPUS_BY_KEY, readableWords } from '../lib/unlock'
import { useProgress } from '../store/progress'
import { gatesBefore } from '../lib/journey'

const PASS = 95 // % global para saltar todo
const LESSON_PASS = 0.8 // fracción de aciertos para dar una lección por buena
const MAX_QUESTIONS = 64

/** Examen de salto: todo lo que te saltas hasta la lección `target` (1-based, no incluida). */
export function SkipExam() {
  const target = Number(useParams().n)
  // El punto de partida se fija al entrar: al saltar, lessonsDone cambia y no debe redirigir.
  const [start] = useState(() => useProgress.getState().lessonsDone)
  if (!Number.isInteger(target) || target <= start + 1 || target > LESSONS.length + 1) return <Navigate to="/mapa" replace />
  return <Flow key={target} target={target} start={start} />
}

function Flow({ target, start }: { target: number; start: number }) {
  const s = useProgress()
  const navigate = useNavigate()
  const lessons = useMemo(() => LESSONS.slice(start, target - 1), [start, target]) // las que te saltas
  const known = useMemo(() => learnedItems(target - 1), [target])

  // Una pregunta por letra/signo (las de lecciones recientes cuentan doble) + palabras de esas lecciones.
  const { questions, itemIndex } = useMemo(() => {
    const items = lessons.flatMap((l, li) => l.items.map(it => ({ it, li })))
    const qs: Question[] = []
    const idx: number[] = [] // lección (relativa) de cada pregunta; -1 si es de palabra
    // Dos preguntas por letra (un despiste no te cuesta la lección); una si el examen sería interminable.
    const per = items.length * 2 + 6 <= MAX_QUESTIONS ? 2 : 1
    for (const { it, li } of items)
      for (let r = 0; r < per; r++) {
        qs.push(itemQuestion(it, known))
        idx.push(li)
      }
    const pool = readableWords(known)
    const words = shuffle(lessons.flatMap(l => l.newWords.slice(0, 3))).slice(0, Math.max(4, Math.floor(items.length / 2)))
    for (const k of words) {
      const w = CORPUS_BY_KEY.get(k)
      if (w) {
        qs.push(wordTrQuestion(w, pool))
        idx.push(-1)
      }
    }
    // Se limita el total conservando el orden de lecciones para el salto parcial.
    const order = shuffle(qs.map((q, i) => ({ q, l: idx[i] }))).slice(0, MAX_QUESTIONS)
    return { questions: order.map(o => o.q), itemIndex: order.map(o => o.l) }
  }, [lessons, known])

  const [phase, setPhase] = useState<'intro' | 'run' | 'end'>('intro')
  const [stats] = useState(() => lessons.map(() => ({ ok: 0, n: 0 }))) // aciertos por lección
  const [out, setOut] = useState<{ pct: number; reached: number; r: QuizResult } | null>(null)
  const asked = useMemo(() => new Map(questions.map((q, i) => [q, itemIndex[i]])), [questions, itemIndex])

  const finish = (r: QuizResult) => {
    const pct = Math.round((100 * r.correct) / Math.max(1, r.total))
    // Salto completo si se aprueba. Si no, se avanza mientras no fallen DOS lecciones seguidas:
    // un tropiezo suelto se perdona, pero no se salta más allá de la última lección superada.
    const passed = stats.map(x => x.n === 0 || x.ok / x.n >= LESSON_PASS)
    let reached = lessons.length
    if (pct < PASS) {
      reached = 0
      for (let k = 0, miss = 0; k < passed.length; k++) {
        miss = passed[k] ? 0 : miss + 1
        if (miss >= 2) break
        if (passed[k]) reached = k + 1
      }
    }
    for (let k = 0; k < reached; k++) {
      s.completeLesson(start + k)
      s.boostItems(lessons[k].items, 0.5)
    }
    // El examen demuestra lo saltado: sus repasos y rangos de unidad quedan superados.
    s.setJourney(gatesBefore(start + reached), 100)
    if (reached) {
      s.gainXp(10 * reached)
      sfx('levelup')
      confetti(reached === lessons.length ? 140 : 60)
    } else sfx('wrong')
    s.setPlacementDone()
    setOut({ pct, reached, r })
    setPhase('end')
  }

  const onAnswer = (q: Question, ok: boolean) => {
    const li = asked.get(q) ?? -1
    if (li < 0) return
    stats[li].n++
    if (ok) stats[li].ok++
  }

  return (
    <div className="lesson">
      <header className="lesson-head">
        <Link to="/mapa" className="close" aria-label="Salir">✕</Link>
        <span>⏩ Salto a la lección {target}</span>
      </header>
      {phase === 'intro' && (
        <div className="result">
          <div className="result-emoji">⏩</div>
          <h2>Examen de {lessons.length} {lessons.length === 1 ? 'lección' : 'lecciones'}</h2>
          <ul className="exam-rules">
            <li>📋 {questions.length} preguntas</li>
            <li>🎯 {PASS}% para saltar todo</li>
            <li>🧭 Se perdonan algunos fallos: saltas hasta donde lo dominas</li>
          </ul>
          <button className="btn primary wide" onClick={() => setPhase('run')}>Empezar</button>
        </div>
      )}
      {phase === 'run' && <QuizRunner questions={questions} retryWrong={false} timed={10} onAnswer={onAnswer} onDone={finish} />}
      {phase === 'end' && out && (
        <div className="result">
          <div className={`big-score ${out.reached === lessons.length ? 'pass' : out.reached ? '' : 'fail'}`}>{out.pct}%</div>
          <h2>
            {out.reached === lessons.length
              ? `🚀 +${out.reached} lecciones`
              : out.reached
                ? `Saltas ${out.reached} ${out.reached === 1 ? 'lección' : 'lecciones'}`
                : 'Aún no: empieza desde aquí'}
          </h2>
          <p className="muted">
            {out.reached ? (start + out.reached < LESSONS.length ? `Ahora estás en la lección ${start + out.reached + 1}` : '¡Lo sabes todo!') : 'Repasa con las lecciones y vuelve a intentarlo'}
          </p>
          <div className="row">
            <Link to="/mapa" className="btn">Mapa</Link>
            {start + out.reached < LESSONS.length ? (
              <button className="btn primary" onClick={() => navigate(`/leccion/${start + out.reached + 1}`)}>
                Lección {start + out.reached + 1}
              </button>
            ) : (
              <Link to="/leer" className="btn primary">Leer el Corán</Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
