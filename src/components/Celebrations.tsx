import { useEffect } from 'react'
import { ACHIEVEMENTS, earnedAchievements, levelOf } from '../lib/achievements'
import { confetti, sfx } from '../lib/fx'
import { itemInfo } from '../data/items'
import { TIERS, tierIndex } from '../lib/mastery'
import { currentStreak, useProgress } from '../store/progress'
import { useToasts } from '../store/toasts'
import { useFloats } from '../store/floats'
import { GOALS, goalProgress, goalReward } from '../lib/goals'
import { gatesBefore } from '../lib/journey'

/**
 * Subidas de rango: durante un ejercicio, solo una etiqueta flotante que no tapa nada;
 * el aviso de verdad queda guardado únicamente desde Oro.
 */
function tierUps(now: Record<string, number>, before: Record<string, number>) {
  for (const it of Object.keys(now)) {
    const t = tierIndex(now[it])
    if (t >= 2 && t > tierIndex(before[it] ?? 0)) {
      const tier = TIERS[t]
      useFloats.getState().push(`${itemInfo(it).chip} ${tier.icon}`, 'bonus')
      if (t >= 4) useToasts.getState().push({ icon: tier.icon, title: `${itemInfo(it).chip} → ${tier.name}`, text: itemInfo(it).name })
    }
  }
}

const quiet = () => useToasts.getState().quiet

/** Vigila el progreso: desbloquea logros, celebra subidas de nivel y pinta los avisos. */
export function Celebrations() {
  const toast = useToasts(s => s.current)
  const dismiss = useToasts(s => s.dismiss)
  const floats = useFloats(s => s.floats)

  useEffect(() => {
    const check = (s = useProgress.getState(), prev?: ReturnType<typeof useProgress.getState>) => {
      const earned = earnedAchievements({ ...s, streak: currentStreak(s) })
      const fresh = earned.filter(id => !s.achievements[id])
      // Primera carga: se registran en silencio los que ya se cumplían.
      fresh.forEach(id => {
        s.unlock(id)
        const a = ACHIEVEMENTS.find(x => x.id === id)!
        if (prev) useToasts.getState().push({ icon: a.icon, title: `Logro: ${a.name}`, text: a.desc })
      })
      if (prev && fresh.length && !quiet()) sfx('levelup')
      if (prev) {
        const before = levelOf(prev.xp).level
        const after = levelOf(s.xp)
        if (after.level > before) {
          useToasts.getState().push({ icon: '⭐', title: `¡Nivel ${after.level}!`, text: after.title })
          if (!quiet()) {
            sfx('levelup')
            confetti(60)
          }
        }
      }
    }
    /** Cobra los hitos de progreso recién alcanzados (XP fijo, nada de azar). */
    const claimGoals = (announce: boolean) => {
      const s = useProgress.getState()
      const gs = { ...s, streak: currentStreak(s) }
      for (const g of GOALS) {
        const { reached } = goalProgress(g, gs)
        const claimed = s.goalsClaimed[g.id] ?? 0
        if (reached <= claimed) continue
        let xp = 0
        for (let k = claimed; k < reached; k++) xp += goalReward(k)
        s.claimGoal(g.id, reached, xp)
        if (announce) {
          useToasts.getState().push({ icon: g.icon, title: `Hito: ${g.targets[reached - 1].toLocaleString('es')} ${g.label}`, text: `+${xp} XP` })
        }
      }
    }
    // Quien ya iba avanzado antes del Camino no tiene que repetir repasos de lo ya superado.
    const s0 = useProgress.getState()
    if (!s0.journeyInit) {
      s0.setJourney(gatesBefore(s0.lessonsDone), 100)
      s0.setJourneyInit()
    }
    check()
    claimGoals(false)
    const WATCH = ['xp', 'lessonsDone', 'reviewsDone', 'ayahScores', 'exams', 'bestCombo', 'perfectQuizzes', 'points', 'wordStats', 'highScores', 'questsClaimed', 'placementDone', 'gamesPlayed', 'journey'] as const
    return useProgress.subscribe((s, prev) => {
      if (s.points !== prev.points) tierUps(s.points, prev.points)
      if (WATCH.some(k => s[k] !== prev[k])) {
        check(s, prev)
        claimGoals(true)
      }
    })
  }, [])

  return (
    <>
      {floats.map(f => (
        <span key={f.id} className={`float ${f.tone}`} style={{ left: f.x, top: f.y }}>{f.text}</span>
      ))}
      <div className="toasts" aria-live="polite">
        {toast && (
          <button key={toast.id} className="toast" onClick={dismiss}>
            <span className="toast-icon">{toast.icon}</span>
            <span>
              <b>{toast.title}</b>
              {toast.text && <small>{toast.text}</small>}
            </span>
          </button>
        )}
      </div>
    </>
  )
}
