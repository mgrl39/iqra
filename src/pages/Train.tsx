import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { itemInfo } from '../data/items'
import { learnedItems } from '../lib/curriculum'
import { confetti, sfx } from '../lib/fx'
import { NODE_BY_ID, REVIEW_PASS, journeyStatus, type JNode } from '../lib/journey'
import { TIERS } from '../lib/mastery'
import { audioWordQuestion, itemQuestion, pick, shuffle, wordTrQuestion, type Question } from '../lib/questions'
import { readableWords } from '../lib/unlock'
import { useProgress } from '../store/progress'

const REVIEW_COUNT = 20
const RANK_COUNT = 15

/** Entrenamiento de un nodo del Camino: repaso de unidad (examen corto) o farmeo de rango. */
export function Train() {
  const node = NODE_BY_ID.get(useParams().id ?? '')
  const s = useProgress()
  const [round, setRound] = useState(0)
  if (!node || (node.kind !== 'review' && node.kind !== 'rank') || journeyStatus(s).get(node.id) === 'locked') return <Navigate to="/mapa" replace />
  return <Session key={`${node.id}:${round}`} node={node} onAgain={() => setRound(round + 1)} />
}

function buildQuestions(node: JNode, known: Set<string>, points: Record<string, number>): Question[] {
  const pool = readableWords(known)
  const items = node.items!.filter(it => known.has(it))
  if (node.kind === 'review') {
    // Todo lo de la unidad: letras/signos y palabras que usan esas letras.
    const qs: Question[] = items.map(it => itemQuestion(it, known))
    const words = pool.filter(w => w.items.some(it => items.includes(it)))
    while (qs.length < REVIEW_COUNT && words.length) qs.push(pick([wordTrQuestion, audioWordQuestion])(pick(words.slice(0, 200)), pool))
    return shuffle(qs).slice(0, REVIEW_COUNT)
  }
  // Rango: lo que aún no llega al mínimo, con palabras que lo contengan (cada palabra suma a varias letras).
  const min = TIERS[node.tier!].min
  const weak = items.filter(it => (points[it] ?? 0) < min)
  const targets = (weak.length ? weak : items).sort((a, b) => (points[a] ?? 0) - (points[b] ?? 0)).slice(0, 6)
  const qs: Question[] = []
  for (let i = 0; i < RANK_COUNT; i++) {
    const it = targets[i % targets.length]
    const words = pool.filter(w => w.items.includes(it))
    qs.push(words.length && i % 3 ? wordTrQuestion(pick(words.slice(0, 60)), pool) : itemQuestion(it, known))
  }
  return shuffle(qs)
}

function Session({ node, onAgain }: { node: JNode; onAgain: () => void }) {
  const s = useProgress()
  const known = useMemo(() => learnedItems(Math.max(s.lessonsDone, node.after)), [s.lessonsDone, node.after])
  const questions = useMemo(() => buildQuestions(node, known, useProgress.getState().points), [node, known])
  const [result, setResult] = useState<{ r: QuizResult; pct: number } | null>(null)
  const review = node.kind === 'review'
  const min = node.tier !== undefined ? TIERS[node.tier].min : 0
  const items = node.items!.filter(it => known.has(it))
  const reached = items.filter(it => (s.points[it] ?? 0) >= min).length

  const finish = (r: QuizResult) => {
    const pct = Math.round((100 * r.correct) / Math.max(1, r.total))
    if (review) {
      const first = pct >= REVIEW_PASS && (s.journey[node.id] ?? 0) < REVIEW_PASS
      s.setJourney([node.id], pct)
      if (first) {
        s.gainXp(50)
        confetti(100)
      }
      sfx(pct >= REVIEW_PASS ? 'levelup' : 'wrong')
    } else sfx('complete')
    setResult({ r, pct })
  }

  return (
    <div className="lesson">
      <header className="lesson-head">
        <Link to="/mapa" className="close" aria-label="Salir">✕</Link>
        <span>{node.glyph} {node.title}</span>
      </header>
      {!review && (
        <div className="rank-items" lang="ar">
          {items.map(it => {
            const p = s.points[it] ?? 0
            return (
              <span key={it} className={`rank-item${p >= min ? ' ok' : ''}`} title={`${p}/${min}`}>
                {itemInfo(it).chip}
                <i style={{ width: `${Math.min(100, (100 * p) / min)}%` }} />
              </span>
            )
          })}
        </div>
      )}
      {!result ? (
        <QuizRunner questions={questions} retryWrong={!review} onDone={finish} />
      ) : (
        <div className="result">
          {review ? (
            <>
              <div className={`big-score ${result.pct >= REVIEW_PASS ? 'pass' : 'fail'}`}>{result.pct}%</div>
              <h2>{result.pct >= REVIEW_PASS ? '¡Unidad repasada!' : `Necesitas ${REVIEW_PASS}%`}</h2>
            </>
          ) : (
            <>
              <div className="big-score">{reached}/{items.length}</div>
              <h2>{reached === items.length ? `¡Todo en ${TIERS[node.tier!].name}!` : `en ${TIERS[node.tier!].icon} ${TIERS[node.tier!].name}`}</h2>
            </>
          )}
          <p className="muted">{result.r.correct}/{result.r.total} aciertos · +{result.r.xp} XP</p>
          <div className="row">
            <Link to="/mapa" className="btn">🗺️ Camino</Link>
            {(!review || result.pct < REVIEW_PASS) && <button className="btn primary" onClick={onAgain}>Otra ronda</button>}
          </div>
        </div>
      )}
    </div>
  )
}

