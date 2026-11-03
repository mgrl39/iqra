import { confetti, sfx } from '../lib/fx'
import { LESSONS } from '../lib/curriculum'
import { questsFor } from '../lib/quests'
import { dayKey, questClaimed, questCount, useProgress } from '../store/progress'

/** Misiones del día con su progreso y botón de recompensa. */
export function Quests() {
  const s = useProgress()
  const quests = questsFor(dayKey(), s.lessonsDone >= LESSONS.length)
  const allDone = quests.every(q => questClaimed(s, q.id))
  return (
    <section className={`card quests${allDone ? ' all-done' : ''}`}>
      <div className="quest-row">
      {quests.map(q => {
        const n = Math.min(questCount(s, q.kind), q.target)
        const claimed = questClaimed(s, q.id)
        const ready = n >= q.target && !claimed
        return (
          <div key={q.id} className={`quest${claimed ? ' claimed' : ''}`}>
            <span className="quest-icon">{q.icon}</span>
            <div className="quest-body">
              <span>{q.text}</span>
              <div className="bar thin"><span style={{ width: `${(100 * n) / q.target}%` }} /></div>
            </div>
            {claimed ? (
              <span className="quest-done">✓</span>
            ) : ready ? (
              <button
                className="btn primary quest-claim"
                onClick={() => {
                  s.claimQuest(q)
                  sfx('complete')
                  confetti(60)
                }}
              >
                +{q.reward}
              </button>
            ) : (
              <span className="quest-n">{n}/{q.target}</span>
            )}
          </div>
        )
      })}
      </div>
    </section>
  )
}
