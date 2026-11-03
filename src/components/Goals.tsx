import { Link } from 'react-router-dom'
import { goalReward, nextGoal } from '../lib/goals'
import { currentStreak, useProgress } from '../store/progress'

/** Siguiente hito de progreso: una barra con lo que falta y el XP que da. */
export function Goals() {
  const s = useProgress()
  const n = nextGoal({ ...s, streak: currentStreak(s) })
  if (!n) return null
  return (
    <Link to="/progreso" className="milestone">
      <span className="ms-icon">{n.g.icon}</span>
      <div className="ms-body">
        <b>{n.next.toLocaleString('es')} {n.g.label}</b>
        <div className="bar thin"><span style={{ width: `${Math.round(n.frac * 100)}%` }} /></div>
        <small>{n.value.toLocaleString('es')}/{n.next.toLocaleString('es')} · +{goalReward(n.reached)} XP</small>
      </div>
    </Link>
  )
}
