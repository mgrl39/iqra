import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ALL_ITEMS, itemInfo } from '../data/items'
import { LETTERS } from '../data/letters'
import { ACHIEVEMENTS, levelOf } from '../lib/achievements'
import { AYAH_PASS, TIERS, tierIndex } from '../lib/mastery'
import { EXAMS } from '../lib/exams'
import { GOALS, goalProgress, goalReward } from '../lib/goals'
import { CURRICULUM, learnedItems } from '../lib/curriculum'
import { readableCount } from '../lib/unlock'
import { MASTERED, currentStreak, dayKey, useProgress } from '../store/progress'

export function Progress() {
  const s = useProgress()
  const [tab, setTab] = useState<'resumen' | 'rangos' | 'logros'>('resumen')
  const known = useMemo(() => learnedItems(s.lessonsDone), [s.lessonsDone])
  const readable = useMemo(() => readableCount(known), [known])
  const lv = levelOf(s.xp)
  const lettersMastered = LETTERS.filter(l => (s.mastery[l.id] ?? 0) >= MASTERED).length

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000)
    return { key: dayKey(d), label: d.toLocaleDateString('es', { weekday: 'narrow' }), xp: s.history[dayKey(d)] ?? 0 }
  })
  const maxXp = Math.max(s.dailyGoal, ...days.map(d => d.xp))

  const weak = [...known].filter(it => (s.mastery[it] ?? 0) < MASTERED).sort((a, b) => (s.mastery[a] ?? 0) - (s.mastery[b] ?? 0)).slice(0, 6)
  const confusions = Object.entries(s.confusions).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <div className="progress-page">
      <section className="card level-card">
        <div className="level-badge">{lv.level}</div>
        <div className="level-info">
          <small>Nivel {lv.level}</small>
          <b>{lv.title}</b>
          <div className="bar"><span style={{ width: `${Math.round(lv.progress * 100)}%` }} /></div>
          <small className="muted">{s.xp.toLocaleString('es')} XP · faltan {lv.toNext} para el nivel {lv.level + 1}</small>
        </div>
      </section>

      <div className="seg tabs">
        {([['resumen', '📊 Resumen'], ['rangos', '🏅 Rangos'], ['logros', '🏆 Logros']] as const).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'resumen' && (
        <>
      <section className="card goals-list">
        <h3>🎯 Hitos</h3>
        {GOALS.map(g => {
          const p = goalProgress(g, { ...s, streak: currentStreak(s) })
          return (
            <div key={g.id} className="goal-row">
              <span>{g.icon}</span>
              <div>
                <b>{p.next ? `${p.value.toLocaleString('es')} / ${p.next.toLocaleString('es')}` : '✓'} {g.label}</b>
                <div className="bar thin"><span style={{ width: `${Math.round(p.frac * 100)}%` }} /></div>
              </div>
              <small>{p.next ? `+${goalReward(p.reached)} XP` : 'Completa'}</small>
            </div>
          )
        })}
      </section>
      <section className="stats">
        <Stat n={readable.toLocaleString('es')} label={`palabras legibles (${Math.round((100 * readable) / CURRICULUM.totalWords)}%)`} />
        <Stat n={`${lettersMastered}/${LETTERS.length}`} label="letras sin pista" />
        <Stat n={`🧩 ${Object.values(s.ayahScores).filter(x => x >= AYAH_PASS).length}`} label="retos de aleya superados" />
        <Link to="/examen" className="stat link">
          <b>📝 {EXAMS.filter(e => s.exams[e.id]?.passed).length}/{EXAMS.length}</b>
          <small>exámenes aprobados →</small>
        </Link>
        <Stat n={`🔥 ${currentStreak(s)}`} label="días de racha" />
        <Stat n={`⚡ ${s.bestCombo}`} label="mejor combo" />
        <Stat n={s.reviewsDone} label="repasos hechos" />
        <Link to="/vocabulario" className="stat link">
          <b>📖 {Object.values(s.wordStats).filter(w => w.m).length}</b>
          <small>palabras en tu colección →</small>
        </Link>
        <Stat n={`🥇 ${LETTERS.filter(l => tierIndex(s.points[l.id] ?? 0) >= 4).length}`} label="letras en oro o más" />
        <Stat n={`📜 ${s.questsClaimed}`} label="misiones hechas" />
      </section>

      <section className="card">
        <h3>Últimos 14 días</h3>
        <div className="chart">
          {days.map(d => (
            <div key={d.key} className="chart-col" title={`${d.key}: ${d.xp} XP`}>
              <span className={`chart-bar${d.xp >= s.dailyGoal ? ' goal' : ''}`} style={{ height: `${(100 * d.xp) / maxXp}%` }} />
              <small>{d.label}</small>
            </div>
          ))}
          <span className="chart-goal" style={{ bottom: `calc(${(100 * s.dailyGoal) / maxXp}% * 0.82 + 18px)` }} />
        </div>
      </section>

      {(weak.length > 0 || confusions.length > 0) && (
        <section className="card">
          <h3>Tus puntos débiles</h3>
          {weak.length > 0 && (
            <div className="weak">
              {weak.map(it => (
                <span key={it} className="weak-item">
                  <span lang="ar">{itemInfo(it).chip}</span>
                  <small>{Math.round((s.mastery[it] ?? 0) * 100)}%</small>
                </span>
              ))}
            </div>
          )}
          {confusions.map(([k, n]) => {
            const [a, b] = k.split('|')
            return (
              <p key={k} className="confusion">
                Confundes <span lang="ar" className="inline-glyph">{a}</span> con <span lang="ar" className="inline-glyph">{b}</span>{' '}
                <span className="muted">({n} {n === 1 ? 'vez' : 'veces'})</span>
              </p>
            )
          })}
          <Link to="/practicar/debiles" className="btn primary wide">Entrenar puntos débiles</Link>
        </section>
      )}

        </>
      )}

      {tab === 'rangos' && (
        <>
      <section className="card">
        <h3>Rangos</h3>
        <p className="tier-legend">
          {TIERS.slice(1).map(t => (
            <span key={t.name} className={t.cls}>{t.icon} {t.name} <small>{t.min}</small></span>
          ))}
        </p>
        <p className="muted small">+1 punto por acierto en cada letra o signo · −3 por fallo (nunca bajas de rango)</p>
        <div className="mastery-grid">
          {ALL_ITEMS.map(it => {
            const p = s.points[it] ?? 0
            const t = TIERS[tierIndex(p)]
            return (
              <span key={it} className={`mg ${t.cls}${known.has(it) ? '' : ' locked'}`} title={`${itemInfo(it).name}: ${t.name} (${p} pts)`}>
                <span lang="ar">{itemInfo(it).chip}</span>
                {tierIndex(p) > 0 && <small className="mg-medal">{t.icon}</small>}
              </span>
            )
          })}
        </div>
      </section>

        </>
      )}

      {tab === 'logros' && (
      <section className="card">
        <h3>Logros · {Object.keys(s.achievements).length}/{ACHIEVEMENTS.length}</h3>
        <div className="achievements">
          {ACHIEVEMENTS.map(a => (
            <div key={a.id} className={`ach${s.achievements[a.id] ? ' on' : ''}`} title={a.desc}>
              <span className="ach-icon">{a.icon}</span>
              <b>{a.name}</b>
              <small>{a.desc}</small>
            </div>
          ))}
        </div>
      </section>
      )}
    </div>
  )
}

const Stat = ({ n, label }: { n: string | number; label: string }) => (
  <div className="stat">
    <b>{n}</b>
    <small>{label}</small>
  </div>
)
