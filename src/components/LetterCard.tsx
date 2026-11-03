import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { itemInfo } from '../data/items'
import { LETTER_TIPS, MUQATTAAT, familyOf } from '../data/letters'
import { ALIF_WASLA, graphemes, letterForms } from '../lib/arabic'
import { playWord } from '../lib/audio'
import { guideFor } from '../data/guide'
import { CORPUS, isReadable } from '../lib/unlock'
import { TIERS, hitsToNextTier, tierIndex, tierProgress } from '../lib/mastery'
import { useProgress } from '../store/progress'
import { ArabicWord } from './ArabicWord'

const NO_FORMS = new Set(['ء', 'ة', 'ى'])

/** Mejor ejemplo: legible, corto, frecuente y, si es letra, que empiece por ella. */
function pickExamples(item: string, known: Set<string>, n: number) {
  const scored = CORPUS.filter(w => w.items.includes(item)).map(w => {
    const cs = graphemes(w.key).filter(c => c.base !== ALIF_WASLA && c.base !== 'ل')
    const starts = cs[0]?.base === item ? 3 : 0
    const readable = isReadable(w.items, known) ? 20 : 0
    const short = Math.max(0, 4 - Math.abs(cs.length - 3))
    return { w, readable: readable > 0, score: readable + starts + short + Math.log2(w.count + 1) }
  })
  scored.sort((a, b) => b.score - a.score)
  // Solo palabras que ya se pueden leer; si aún no hay ninguna, el mejor ejemplo.
  const ok = scored.filter(x => x.readable)
  return (ok.length ? ok : scored.slice(0, 1)).slice(0, n).map(x => x.w)
}

/** Presentación de una letra o marca nueva, con ejemplos reales del Corán. */
export function LetterCard({ item, known }: { item: string; known: Set<string> }) {
  const info = itemInfo(item)
  const examples = useMemo(() => pickExamples(item, known, 3), [item, known])
  const forms = info.isLetter && !NO_FORMS.has(item) ? letterForms(item) : null
  const family = info.isLetter ? familyOf(item).filter(l => l !== item) : []
  const muq = MUQATTAAT[item]
  const guide = guideFor(item)
  const pts = useProgress(s => s.points[item] ?? 0)
  const tier = tierIndex(pts)
  const toNext = hitsToNextTier(pts)

  return (
    <div className="letter-card">
      <div className="glyph" lang="ar">{info.chip}</div>
      <div className="lc-name">
        {info.name} <span className="lc-tr">{info.tr}</span>
      </div>
      <div className={`lc-tier ${TIERS[tier].cls}`}>
        <span>{TIERS[tier].icon} {TIERS[tier].name} <small>· {pts} pts</small></span>
        {toNext !== null && (
          <>
            <span className="tier-bar"><span style={{ width: `${Math.round(tierProgress(pts) * 100)}%` }} /></span>
            <small>{toNext} aciertos → {TIERS[tier + 1].icon} {TIERS[tier + 1].name}</small>
          </>
        )}
      </div>
      <p className="lc-sound">{info.sound}</p>
      {LETTER_TIPS[item] && <p className="lc-tip">💡 {LETTER_TIPS[item]}</p>}

      {forms && (
        <div className="forms" lang="ar">
          {(['final', 'medial', 'initial', 'isolated'] as const).map(k => (
            <div key={k} className="form">
              <span className="ar">{forms[k]}</span>
              <small>{{ isolated: 'sola', initial: 'inicio', medial: 'medio', final: 'final' }[k]}</small>
            </div>
          ))}
        </div>
      )}

      {family.length > 0 && family.length < 6 && (
        <p className="lc-family">
          Misma forma, distintos puntos:{' '}
          {family.map(l => (
            <span key={l} lang="ar" className="fam">{l}</span>
          ))}
        </p>
      )}

      {muq && (
        <button className="muq" onClick={() => playWord(muq.audio)}>
          <span lang="ar">{muq.text}</span>
          <span>
            🔊 Su nombre recitado en el Corán
            <small>{muq.tr} · {muq.ref}</small>
          </span>
        </button>
      )}

      {examples.length > 0 && (
        <div className="example">
          <small>Toca para escuchar ejemplos del Corán:</small>
          <div className="example-row" dir="rtl">
            {examples.map(w => (
              <ArabicWord key={w.key} text={w.key} audio={w.audio} size="lg" mode="always" meaning={w.meaning} />
            ))}
          </div>
        </div>
      )}
      {guide && (
        <Link to={`/guia#${guide.id}`} className="lc-more">
          Saber más: {guide.title} →
        </Link>
      )}
    </div>
  )
}
