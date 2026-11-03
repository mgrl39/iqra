import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { itemInfo } from '../data/items'
import { EXAMS, examUnlocked } from '../lib/exams'
import { LESSONS } from '../lib/curriculum'
import { NODES, UNITS, currentNode, journeyStatus, nodeProgress, type JNode, type NodeStatus } from '../lib/journey'
import { TIERS } from '../lib/mastery'
import { useProgress } from '../store/progress'
import { milestonesAt, milestonesBetween, statsAt } from '../lib/abilities'

const STEP = 118 // separación vertical entre nodos (px)
const PAD = 70
const WAVE = [50, 72, 82, 72, 50, 28, 18, 28] // posición horizontal (%) en zigzag suave
const UNIT_HUES = ['#34d399', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#f87171']
const KIND_LABEL: Record<JNode['kind'], string> = { lesson: 'Lección', review: 'Repaso', rank: 'Rango', exam: 'Jefe', surah: 'Sura', vocab: 'Palabras', naked: 'Sin harakāt' }

/** El Camino: todas las unidades en un recorrido vertical. Toca un nodo para ver qué hay que hacer. */
export function LessonMap() {
  const s = useProgress()
  const status = useMemo(() => journeyStatus(s), [s])
  const current = currentNode(s, status)
  const [sel, setSel] = useState<JNode | null>(null)
  const done = NODES.filter(n => status.get(n.id) === 'done').length

  useEffect(() => {
    if (current) document.getElementById(`node-${current.id}`)?.scrollIntoView({ block: 'center' })
  }, [])

  let global = 0
  return (
    <div className="journey">
      <header className="journey-head">
        <div>
          <b>🗺️ El Camino</b>
          <small>{done}/{NODES.length} pasos</small>
        </div>
        <div className="bar thin"><span style={{ width: `${(100 * done) / NODES.length}%` }} /></div>
        {s.lessonsDone < LESSONS.length && (
          <Link to={`/salto/${LESSONS.length + 1}`} className="btn small-btn">⏩ Saltar</Link>
        )}
      </header>

      {UNITS.map((u, ui) => {
        const gates = u.nodes.filter(n => n.gate)
        const gatesDone = gates.filter(n => status.get(n.id) === 'done').length
        const height = PAD * 2 + (u.nodes.length - 1) * STEP
        const pts = u.nodes.map((n, k) => ({ n, x: WAVE[(global + k) % WAVE.length], y: PAD + k * STEP }))
        global += u.nodes.length
        const unitLocked = status.get(u.nodes[0].id) === 'locked'
        return (
          <section key={u.n} className={`unit${unitLocked ? ' locked' : ''}`} style={{ ['--u' as string]: UNIT_HUES[ui % UNIT_HUES.length] }}>
            <div className="unit-banner">
              <span className="unit-icon">{u.icon}</span>
              <div>
                <small>Unidad {u.n}</small>
                <b>{u.title}</b>
              </div>
              <span className="unit-count">{gatesDone === gates.length ? '✓' : `${gatesDone}/${gates.length}`}</span>
            </div>
            <UnitPromise nodes={u.nodes} />
            <div className="unit-path" style={{ height }}>
              <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
                {pts.slice(1).map((b, k) => {
                  const a = pts[k]
                  const my = (a.y + b.y) / 2
                  const on = status.get(a.n.id) === 'done' && status.get(b.n.id) !== 'locked'
                  return <path key={k} d={`M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`} className={on ? 'on' : ''} vectorEffect="non-scaling-stroke" />
                })}
              </svg>
              {pts.map(({ n, x, y }) => (
                <MapNode key={n.id} node={n} x={x} y={y} st={status.get(n.id)!} here={current?.id === n.id} frac={nodeProgress(n, s).frac} onTap={() => setSel(n)} />
              ))}
            </div>
          </section>
        )
      })}

      {sel && <NodeSheet node={sel} st={status.get(sel.id)!} onClose={() => setSel(null)} onGo={id => setSel(NODES.find(n => n.id === id) ?? null)} />}
    </div>
  )
}

/** Lo que de verdad podrás leer al terminar las lecciones de la unidad. */
function UnitPromise({ nodes }: { nodes: JNode[] }) {
  const lessons = nodes.filter(n => n.kind === 'lesson').map(n => n.lesson!)
  if (!lessons.length) return null
  const from = lessons[0]
  const to = lessons[lessons.length - 1] + 1
  const ms = milestonesBetween(from, to)
  return (
    <p className="unit-promise">
      Al acabarla: <b>{statsAt(to).pct}% del texto</b>
      {ms.length > 0 && <> · {ms.map(m => m.title).join(' · ')}</>}
    </p>
  )
}

function MapNode({ node, x, y, st, here, frac, onTap }: { node: JNode; x: number; y: number; st: NodeStatus; here: boolean; frac: number; onTap: () => void }) {
  return (
    <button
      id={`node-${node.id}`}
      className={`jnode k-${node.kind} ${st}${node.gate ? '' : ' optional'}${here ? ' here' : ''}`}
      style={{ left: `${x}%`, top: y, ['--p' as string]: `${Math.round(frac * 360)}deg` }}
      onClick={onTap}
    >
      {here && <span className="here-bubble">¡AQUÍ!</span>}
      <span className="jnode-face" lang={node.kind === 'lesson' || node.kind === 'surah' ? 'ar' : undefined}>{node.glyph}</span>
      {st === 'done' && <span className="jbadge">✓</span>}
      {st === 'locked' && node.gate && <span className="jbadge lock">🔒</span>}
      <span className="jnode-label">{node.kind === 'lesson' ? node.lesson! + 1 : node.title}</span>
    </button>
  )
}

function NodeSheet({ node, st, onClose, onGo }: { node: JNode; st: NodeStatus; onClose: () => void; onGo: (id: string) => void }) {
  const s = useProgress()
  const navigate = useNavigate()
  const prog = nodeProgress(node, s)
  const status = journeyStatus(s)
  const blocker = NODES.slice(0, NODES.indexOf(node)).find(n => n.gate && status.get(n.id) !== 'done')
  const go = (to: string) => navigate(to)

  let action: { label: string; to: string } | null = null
  if (st !== 'locked')
    switch (node.kind) {
      case 'lesson': action = { label: st === 'done' ? 'Repetir lección' : 'Empezar lección', to: `/leccion/${node.lesson! + 1}` }; break
      case 'review': action = { label: st === 'done' ? 'Repasar otra vez' : 'Hacer el repaso', to: `/entrenar/${node.id}` }; break
      case 'rank': action = { label: st === 'done' ? 'Seguir entrenando' : 'Entrenar', to: `/entrenar/${node.id}` }; break
      case 'surah': action = { label: 'Abrir la sura', to: `/leer/${node.surahId}` }; break
      case 'vocab': action = { label: 'Jugar Lectura rápida', to: '/practicar/lectura-rapida' }; break
      case 'naked': action = { label: 'Jugar Sin harakāt', to: '/practicar/sin-harakat' }; break
      case 'exam': {
        const e = EXAMS.find(x => x.id === node.examId)!
        if (examUnlocked(e, s.lessonsDone, s.exams)) action = { label: st === 'done' ? 'Repetir examen' : 'Enfrentarte al jefe', to: `/examen/${e.id}` }
        break
      }
    }
  const canSkip = node.kind === 'lesson' && st === 'locked' && node.lesson! > s.lessonsDone

  return (
    <Modal onClose={onClose}>
      <div className="sheet">
        <div className={`sheet-icon k-${node.kind}`} lang={node.kind === 'lesson' || node.kind === 'surah' ? 'ar' : undefined}>{node.glyph}</div>
        <small className="sheet-kind">{KIND_LABEL[node.kind]}{node.gate ? '' : ' · opcional'}</small>
        <h2>{node.title}</h2>
        <p className="muted">{node.sub}</p>
        {node.kind === 'lesson' && (() => {
          const l = node.lesson! + 1
          const ms = milestonesAt(l)
          return (
            <div className="sheet-unlocks">
              <p>Al completarla: <b>{statsAt(l).pct}% del texto</b> (+{statsAt(l).words - statsAt(l - 1).words} palabras)</p>
              {ms.map(m => <p key={m.id} className="rung-item"><strong>🔓 {m.title}</strong><span>{m.why}</span></p>)}
            </div>
          )
        })()}
        {node.kind === 'rank' && (
          <div className="rank-items" lang="ar">
            {node.items!.map(it => (
              <span key={it} className={`rank-item${(s.points[it] ?? 0) >= TIERS[node.tier!].min ? ' ok' : ''}`}>{itemInfo(it).chip}</span>
            ))}
          </div>
        )}
        {node.kind !== 'lesson' && (
          <>
            <div className="bar"><span style={{ width: `${Math.round(prog.frac * 100)}%` }} /></div>
            {prog.label && <small className="muted">{prog.label}</small>}
          </>
        )}
        {st === 'done' && <p className="sheet-done">✓ Completado</p>}
        {action && <button className="btn primary wide" onClick={() => go(action.to)}>{action.label}</button>}
        {st === 'locked' && blocker && !canSkip && (
          <button className="btn wide" onClick={() => onGo(blocker.id)}>🔒 Antes: {blocker.title}</button>
        )}
        {st === 'locked' && !blocker && <p className="muted small">Se abre al avanzar en las lecciones.</p>}
        {canSkip && (
          <>
            <button className="btn primary wide" onClick={() => go(`/salto/${node.lesson! + 1}`)}>⏩ Saltar hasta aquí · examen al 95%</button>
            {blocker && <button className="btn wide" onClick={() => onGo(blocker.id)}>O paso a paso: {blocker.title}</button>}
          </>
        )}
      </div>
    </Modal>
  )
}
