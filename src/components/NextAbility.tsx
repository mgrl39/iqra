import { Link } from 'react-router-dom'
import { nextMilestone, statsAt } from '../lib/abilities'
import { useProgress } from '../store/progress'
import { NAKED_LADDER } from '../lib/naked'

/** "Si llegas a la lección N, podrás…": el próximo hito real, calculado del texto. */
export function NextAbility() {
  const done = useProgress(s => s.lessonsDone)
  const ws = useProgress(s => s.wordStats)
  const m = nextMilestone(done)
  if (!m) {
    const step = NAKED_LADDER.find(r => !r.test(ws))
    return (
      <Link to="/capacidades" className="ability">
        <span className="ab-icon">👁️</span>
        <div className="ab-body">
          <small>Siguiente meta sin harakāt</small>
          <b>{step?.title ?? 'Lector sin signos'}</b>
          <span>{step?.why ?? 'Has llegado a la meta.'}</span>
        </div>
        {step && <span className="ab-pct">{Math.floor(Math.min(1, step.progress(ws)) * 100)}%</span>}
      </Link>
    )
  }
  const left = m.lesson - done
  return (
    <Link to="/capacidades" className="ability">
      <span className="ab-icon">🎯</span>
      <div className="ab-body">
        <small>{left === 1 ? 'En la próxima lección' : `En ${left} lecciones`} podrás leer</small>
        <b>{m.title}</b>
        <span>{m.why}</span>
      </div>
      <span className="ab-pct">{statsAt(m.lesson).pct}%</span>
    </Link>
  )
}
