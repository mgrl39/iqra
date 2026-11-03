import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArabicWord } from '../components/ArabicWord'
import { Modal } from '../components/Modal'
import { Quests } from '../components/Quests'
import { NextAbility } from '../components/NextAbility'
import { itemInfo } from '../data/items'
import { fatihaReadable, levelOf } from '../lib/achievements'
import { CURRICULUM, LESSONS, learnedItems } from '../lib/curriculum'
import { readableCount } from '../lib/unlock'
import { useProgress } from '../store/progress'
import { nakedCount, nakedPct } from '../lib/naked'
import { currentNode, nodeRoute } from '../lib/journey'

export function Home() {
  const s = useProgress()
  const known = useMemo(() => learnedItems(s.lessonsDone), [s.lessonsDone])
  const readable = useMemo(() => readableCount(known), [known])
  const fatiha = useMemo(() => fatihaReadable(known), [known])
  const pct = Math.round((100 * readable) / CURRICULUM.totalWords)
  const naked = nakedCount(s.wordStats)
  const nPct = nakedPct(s.wordStats)
  const next = LESSONS[s.lessonsDone]
  const step = currentNode(s)
  const lv = levelOf(s.xp)

  return (
    <div className="home">
      {!s.seenIntro && s.lessonsDone === 0 && <Intro onClose={s.setSeenIntro} />}

      <section className="hero">
        <div className="hero-top">
          <Link to="/progreso" className="hero-level" title="Ver progreso">
            <span className="lvl">{lv.level}</span> {lv.title}
          </Link>
          <div className="fatiha" title="Aleyas de Al-Fātiḥa que ya puedes leer enteras">
            {fatiha.map((ok, i) => (
              <span key={i} className={`dot${ok ? ' on' : ''}`}>{i + 1}</span>
            ))}
          </div>
        </div>
        <div className="hero-metrics">
          <Link to="/vocabulario" className="metric">
            <small>Con harakāt</small>
            <b>{readable.toLocaleString('es')}</b>
            <span>palabras · {pct}%</span>
            <div className="bar thin"><span style={{ width: `${pct}%` }} /></div>
          </Link>
          <Link to="/capacidades" className="metric naked">
            <small>Sin harakāt</small>
            <b>{naked.toLocaleString('es')}</b>
            <span>palabras · {nPct}%</span>
            <div className="bar thin"><span style={{ width: `${Math.min(100, nPct)}%` }} /></div>
          </Link>
        </div>
      </section>

      <Link to="/flujo" className="flow-cta">
        <span className="flow-cta-icon">∞</span>
        <div>
          <b>Flujo</b>
          <small>Aprende sin parar · se adapta a ti</small>
        </div>
        <i>▶</i>
      </Link>

      {step && step.kind === 'lesson' && next ? (
        <Link to={nodeRoute(step)} className="next-lesson">
          <div>
            <small>Lección {s.lessonsDone + 1} de {LESSONS.length}</small>
            <Chips items={next.items} className="nl-glyphs" />
          </div>
          <span className="btn primary">{s.lessonsDone ? 'Seguir' : 'Empezar'}</span>
        </Link>
      ) : step ? (
        <Link to="/mapa" className="next-lesson step-card">
          <span className="step-glyph" lang={step.kind === 'surah' ? 'ar' : undefined}>{step.glyph}</span>
          <div>
            <small>Siguiente paso del Camino</small>
            <b>{step.title}</b>
          </div>
          <span className="btn primary">Ir</span>
        </Link>
      ) : null}

      <NextAbility />
      <Quests />

    </div>
  )
}

/** Glifos de los items de una lección, separados para que no se unan entre sí. */
function Chips({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <span className={`chips ${className}`} lang="ar" dir="rtl">
      {items.map(it => (
        <span key={it}>{itemInfo(it).chip}</span>
      ))}
    </span>
  )
}

const SLIDES = [
  { icon: '🔓', title: 'Cada letra desbloquea palabras del Corán', text: 'Desde la primera lección ya lees una.' },
  { icon: '👻', title: 'La pista desaparece sola', text: 'Cuando dominas una letra, su pista se vuelve ·', demo: true },
  { icon: '👁️', title: 'La meta: leer sin harakāt', text: 'Al final, los signos de encima y debajo también se van.' },
  { icon: '∞', title: 'Todos los juegos, desde ya', text: 'Se adaptan a lo que dominas. Pulsa Flujo y a aprender.' },
]

function Intro({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const navigate = useNavigate()
  const slide = SLIDES[i]
  return (
    <Modal onClose={onClose}>
      <div className="intro">
        <div className="intro-icon">{slide.icon}</div>
        <h2>{slide.title}</h2>
        <p>{slide.text}</p>
        {slide.demo && <ArabicWord text="ٱلْحَمْدُ" audio="wbw/001_002_001.mp3" size="xl" mode="always" />}
        <div className="intro-dots">
          {SLIDES.map((_, k) => (
            <span key={k} className={k === i ? 'on' : ''} />
          ))}
        </div>
        <button className="btn primary wide" onClick={() => (i + 1 < SLIDES.length ? setI(i + 1) : onClose())}>
          {i + 1 < SLIDES.length ? 'Siguiente' : '¡Empezar de cero!'}
        </button>
        {i + 1 === SLIDES.length && (
          <button className="btn wide" onClick={() => { onClose(); navigate('/prueba') }}>
            ⏩ Ya sé algo: prueba de nivel
          </button>
        )}
      </div>
    </Modal>
  )
}
