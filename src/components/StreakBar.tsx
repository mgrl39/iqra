import { currentStreak, todayXpOf, useProgress } from '../store/progress'

export function StreakBar() {
  const s = useProgress()
  const streak = currentStreak(s)
  const today = todayXpOf(s)
  const pct = Math.min(100, Math.round((100 * today) / s.dailyGoal))
  return (
    <div className="streak" title={`Hoy: ${today}/${s.dailyGoal} XP · Total: ${s.xp} XP`}>
      <span className={`flame${today >= s.dailyGoal ? ' lit' : ''}`}>🔥 {streak}</span>
      <span className="goal">
        <span className="goal-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="xp">{today}/{s.dailyGoal}</span>
    </div>
  )
}
