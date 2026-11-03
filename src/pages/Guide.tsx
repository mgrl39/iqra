import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArabicWord } from '../components/ArabicWord'
import { LetterCard } from '../components/LetterCard'
import { Modal } from '../components/Modal'
import { GUIDE, type Block } from '../data/guide'
import { FAMILIES, LETTER_BY_ID } from '../data/letters'
import { learnedItems } from '../lib/curriculum'
import { CORPUS, wordByKey } from '../lib/unlock'
import { useProgress } from '../store/progress'
import { TIERS, tierIndex, tierProgress } from '../lib/mastery'

export function Guide() {
  const { hash } = useLocation()
  const lessonsDone = useProgress(s => s.lessonsDone)
  const known = useMemo(() => learnedItems(lessonsDone), [lessonsDone])
  const [letter, setLetter] = useState<string | null>(null)

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div className="guide">
      <h2>Guía</h2>
      <p className="muted small">Toca cualquier palabra para oírla.</p>
      <nav className="toc">
        {GUIDE.map(s => (
          <Link key={s.id} to={{ hash: s.id }} className="chip">
            {s.icon} {s.title}
          </Link>
        ))}
      </nav>

      {GUIDE.map(s => (
        <section key={s.id} id={s.id} className="card guide-section">
          <h3>
            <span className="g-icon">{s.icon}</span> {s.title}
          </h3>
          {s.blocks.map((b, i) => (
            <GuideBlock key={i} block={b} known={known} onLetter={setLetter} />
          ))}
        </section>
      ))}

      {letter && (
        <Modal onClose={() => setLetter(null)}>
          <LetterCard item={letter} known={known} />
        </Modal>
      )}
    </div>
  )
}

function GuideBlock({ block, known, onLetter }: { block: Block; known: Set<string>; onLetter: (l: string) => void }) {
  if ('p' in block) return <p>{block.p}</p>
  if ('words' in block || 'find' in block) {
    const words = 'words' in block ? block.words.map(w => wordByKey(w)!).filter(Boolean) : CORPUS.filter(block.find).slice(0, block.n)
    return (
      <div className="g-words" dir="rtl">
        {words.map(w => (
          <ArabicWord key={w.key} text={w.key} audio={w.audio} mode="always" meaning={w.meaning} />
        ))}
      </div>
    )
  }
  if ('table' in block)
    return (
      <div className="g-table">
        {block.table.map(([g, name, desc]) => (
          <div key={name} className="g-row">
            <span className="g-glyph" lang="ar">{g}</span>
            <span>
              <b>{name}</b> <span className="muted">— {desc}</span>
            </span>
          </div>
        ))}
      </div>
    )
  if ('letters' in block)
    return (
      <div className="g-letters">
        <small>{block.caption}</small>
        <div dir="rtl">
          {block.letters.map(l => (
            <button key={l} lang="ar" onClick={() => onLetter(l)}>{l}</button>
          ))}
        </div>
      </div>
    )
  return <AlphabetChart known={known} onLetter={onLetter} />
}

function AlphabetChart({ known, onLetter }: { known: Set<string>; onLetter: (l: string) => void }) {
  const points = useProgress(s => s.points)
  return (
    <div className="alphabet">
      {FAMILIES.map((f, i) => (
        <div key={i} className="family" dir="rtl">
          {f.map(l => {
            const p = points[l] ?? 0
            const t = tierIndex(p)
            return (
              <button key={l} className={`abc ${TIERS[t].cls}${known.has(l) ? ' known' : ''}`} onClick={() => onLetter(l)}>
                {t > 0 && <span className="abc-medal">{TIERS[t].icon}</span>}
                <span className="abc-glyph" lang="ar">{l}</span>
                <span className="abc-name">{LETTER_BY_ID[l].name}</span>
                <span className="abc-bar"><span style={{ width: `${Math.round(tierProgress(p) * 100)}%` }} /></span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
