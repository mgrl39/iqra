import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArabicWord } from '../components/ArabicWord'
import { learnedItems } from '../lib/curriculum'
import { WORD_MASTERED, WORD_TIERS, wordTier } from '../lib/mastery'
import { CORPUS, isReadable } from '../lib/unlock'
import { useProgress } from '../store/progress'

/** Colección de palabras (3 aciertos seguidos) con rangos por aciertos totales. */
export function Vocabulary() {
  const stats = useProgress(s => s.wordStats)
  const lessonsDone = useProgress(s => s.lessonsDone)
  const [tab, setTab] = useState<'done' | 'doing'>('done')
  const known = useMemo(() => learnedItems(lessonsDone), [lessonsDone])
  const readable = useMemo(() => CORPUS.filter(w => isReadable(w.items, known)), [known])
  const done = CORPUS.filter(w => stats[w.key]?.m).sort((a, b) => stats[b.key].m! - stats[a.key].m!)
  const doing = CORPUS.filter(w => !stats[w.key]?.m && (stats[w.key]?.s ?? 0) > 0)
  const list = tab === 'done' ? done : doing

  return (
    <div>
      <header className="reader-head">
        <Link to="/progreso" className="back">←</Link>
        <h2>📖 Tu colección</h2>
      </header>
      <div className="vocab-head">
        <b>{done.length}</b>
        <span className="muted">/ {readable.length} palabras legibles</span>
      </div>
      <div className="bar"><span style={{ width: `${(100 * done.length) / Math.max(1, readable.length)}%` }} /></div>
      <p className="tier-legend">
        {WORD_TIERS.map((t, i) => (
          <span key={t.name}>{t.icon} {t.name} · {done.filter(w => wordTier(stats[w.key].c ?? WORD_MASTERED) === i).length}</span>
        ))}
      </p>
      <div className="seg vocab-tabs">
        <button className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>Dominadas · {done.length}</button>
        <button className={tab === 'doing' ? 'on' : ''} onClick={() => setTab('doing')}>En camino · {doing.length}</button>
      </div>
      {list.length ? (
        <div className="word-grid">
          {list.map(w => (
            <div key={w.key} className="word-tile">
              <ArabicWord text={w.key} audio={w.audio} mode="always" meaning={w.meaning} />
              {tab === 'doing' ? (
                <small className="ref">{'●'.repeat(Math.min(WORD_MASTERED, stats[w.key].s))}{'○'.repeat(Math.max(0, WORD_MASTERED - stats[w.key].s))}</small>
              ) : (
                <WordRank c={stats[w.key].c ?? WORD_MASTERED} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="center muted">Acierta una palabra {WORD_MASTERED} veces seguidas para coleccionarla.</p>
      )}
    </div>
  )
}

/** Rango de una palabra y aciertos hasta el siguiente. */
function WordRank({ c }: { c: number }) {
  const t = wordTier(c)
  const next = WORD_TIERS[t + 1]
  return (
    <small className="ref" title={`${c} aciertos`}>
      {WORD_TIERS[t].icon} {c}{next ? `/${next.min}` : ''}
    </small>
  )
}
