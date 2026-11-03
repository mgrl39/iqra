// Flujo: sesión de aprendizaje sin fin. Bloques cortos de ejercicios distintos que se
// adaptan a lo que sabes; presenta letras nuevas cuando toca y sube la intensidad poco a poco.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LetterCard } from '../components/LetterCard'
import { QuizRunner, type QuizResult } from '../components/QuizRunner'
import { ResultScreen } from '../components/ResultScreen'
import { LETTERS } from '../data/letters'
import { itemInfo, isMark } from '../data/items'
import { readablePhrases } from '../lib/unlock'
import { isDue } from '../lib/srs'
import {
  audioPhraseQuestion, audioWordQuestion, clozeQuestion, formQuestion, itemQuestion, minimalPairCandidates, minimalPairQuestion,
  missingMarkQuestion, nakedTrQuestion, phraseTrQuestion, pick, questionForCard, shuffle, trWordQuestion, vocalizeQuestion,
  wordTrQuestion, type Question,
} from '../lib/questions'
import { useKeys } from '../lib/useKeys'
import { useProgress } from '../store/progress'
import { nakedPool } from '../games/Harakat'
import { pickWeakWords, useKnown } from '../games/common'
import type { CorpusWord } from '../lib/unlock'

const BLOCK = 8

interface Ctx {
  known: Set<string>
  pool: CorpusWord[]
  depth: number // hasta dónde de la lista de frecuencia se elige
}

interface Theme {
  id: string
  name: string
  icon: string
  weight: number
  make: (c: Ctx) => Question[]
}

const words = (c: Ctx) => c.pool.slice(0, c.depth)
const fill = (n: number, f: () => Question | null | false) => {
  const out: Question[] = []
  for (let t = 0; out.length < n && t < n * 4; t++) {
    const q = f()
    if (q) out.push(q)
  }
  return out
}

const THEMES: Theme[] = [
  {
    id: 'letras', name: 'Letras y signos', icon: '🔤', weight: 1,
    make: c => {
      const pts = useProgress.getState().points
      const weak = [...c.known].sort((a, b) => (pts[a] ?? 0) - (pts[b] ?? 0)).slice(0, 5)
      const letters = weak.filter(it => !isMark(it) && !['ء', 'ة', 'ى'].includes(it))
      return fill(BLOCK, () => (letters.length && Math.random() < 0.25 ? formQuestion(pick(letters), c.known) : itemQuestion(pick(weak), c.known)))
    },
  },
  {
    id: 'palabras', name: 'Lectura', icon: '📖', weight: 2,
    make: c => pickWeakWords(words(c), BLOCK).map(w => pick([wordTrQuestion, wordTrQuestion, trWordQuestion])(w, c.pool)),
  },
  {
    id: 'oido', name: 'Oído', icon: '🎧', weight: 1,
    make: c => {
      const mp = minimalPairCandidates(words(c), c.known)
      return fill(BLOCK, () => (mp.length && Math.random() < 0.35 ? minimalPairQuestion(pick(mp), c.known) : audioWordQuestion(pick(words(c)), c.pool)))
    },
  },
  {
    id: 'harakat', name: 'Sin harakāt', icon: '👁️', weight: 2,
    make: c => {
      const np = nakedPool(c.pool)
      return shuffle([...np.slice(0, 3), ...pickWeakWords(np.slice(3), BLOCK - 3)]).map((w, i) => (i % 3 === 2 ? vocalizeQuestion(w) : null) ?? nakedTrQuestion(w, c.pool))
    },
  },
  {
    id: 'signos', name: 'Signo perdido', icon: '✏️', weight: 1,
    make: c => fill(BLOCK, () => missingMarkQuestion(pick(words(c)))),
  },
  {
    id: 'frases', name: 'Frases', icon: '🔗', weight: 1,
    make: c => {
      const ph = readablePhrases(c.known)
      if (ph.length < 6) return []
      return fill(BLOCK, () => pick([phraseTrQuestion, audioPhraseQuestion])(pick(ph.slice(0, c.depth)), ph))
    },
  },
  {
    id: 'aleya', name: 'Aleyas', icon: '🕌', weight: 1,
    make: c => fill(6, () => clozeQuestion(c.known, c.pool)),
  },
]

const REVIEW: Theme = {
  id: 'repaso', name: 'Repaso', icon: '🔁', weight: 0,
  make: c => {
    const { srs } = useProgress.getState()
    return Object.entries(srs).filter(([, x]) => isDue(x)).sort(([, a], [, b]) => a.due - b.due).slice(0, BLOCK)
      .map(([k]) => questionForCard(k, c.known)).filter((q): q is Question => !!q)
  },
}

/** Items del frente de juego que aún no has visto nunca (se presentan antes de preguntarlos). */
const unseen = (known: Set<string>) => {
  const { points, mastery } = useProgress.getState()
  const order = [...LETTERS.map(l => l.id)]
  return [...known].filter(it => !(points[it] ?? 0) && !(mastery[it] ?? 0)).sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

interface Plan {
  theme: Theme
  questions: Question[]
  intro: string[]
}

function planBlock(block: number, history: string[], c: Ctx): Plan {
  const fresh = unseen(c.known).slice(0, 2)
  if (fresh.length && (block === 0 || block % 3 === 0)) {
    const qs = fresh.flatMap(it => [itemQuestion(it, c.known), itemQuestion(it, c.known)])
    const wq = c.pool.filter(w => fresh.some(it => w.items.includes(it))).slice(0, 4).map(w => wordTrQuestion(w, c.pool))
    return { theme: { id: 'nuevo', name: 'Nuevo', icon: '✨', weight: 0, make: () => [] }, questions: shuffle([...qs, ...wq]), intro: fresh }
  }
  const due = Object.values(useProgress.getState().srs).filter(x => isDue(x)).length
  if (due >= 6 && !history.slice(-4).includes('repaso')) {
    const qs = REVIEW.make(c)
    if (qs.length >= 4) return { theme: REVIEW, questions: qs, intro: [] }
  }
  const cands = THEMES.filter(t => !history.slice(-2).includes(t.id))
  for (let tries = 0; tries < 10; tries++) {
    const total = cands.reduce((n, t) => n + t.weight, 0)
    let r = Math.random() * total
    const theme = cands.find(t => (r -= t.weight) < 0) ?? cands[0]
    const qs = theme.make(c)
    if (qs.length >= 4) return { theme, questions: qs, intro: [] }
  }
  return { theme: THEMES[1], questions: THEMES[1].make(c), intro: [] }
}

const intensity = (block: number) => (block < 3 ? 0 : block < 6 ? 1 : 2)
const TIMER = [undefined, 12, 8]

export function Flow() {
  const { known, pool } = useKnown()
  const gameFinished = useProgress(s => s.gameFinished)
  const start = useMemo(() => {
    const ws = useProgress.getState().wordStats
    return { words: Object.values(ws).filter(w => w.m).length, naked: Object.values(ws).filter(w => w.nm).length }
  }, [])
  const wordsNow = useProgress(s => Object.values(s.wordStats).filter(w => w.m).length)
  const nakedNow = useProgress(s => Object.values(s.wordStats).filter(w => w.nm).length)
  const history = useRef<string[]>([])
  const [block, setBlock] = useState(0)
  const ctx = (b: number): Ctx => ({ known, pool, depth: Math.min(pool.length, 60 + b * 50) })
  const [plan, setPlan] = useState<Plan>(() => planBlock(0, [], ctx(0)))
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'break' | 'end'>(plan.intro.length ? 'intro' : 'quiz')
  const [introAt, setIntroAt] = useState(0)
  const [total, setTotal] = useState<QuizResult>({ correct: 0, total: 0, xp: 0 })
  const [last, setLast] = useState<QuizResult | null>(null)

  const blockDone = (r: QuizResult) => {
    history.current.push(plan.theme.id)
    setTotal(t => ({ correct: t.correct + r.correct, total: t.total + r.total, xp: t.xp + r.xp }))
    setLast(r)
    const b = block + 1
    setBlock(b)
    setPlan(planBlock(b, history.current, ctx(b)))
    setPhase('break')
    if (b % 3 === 0) gameFinished()
  }
  const go = () => setPhase(plan.intro.length ? 'intro' : 'quiz')
  const finish = () => setPhase('end')

  useKeys(phase === 'break' ? { Enter: go, ' ': go, Escape: finish } : {})
  useEffect(() => {
    if (phase === 'intro') setIntroAt(0)
  }, [phase])

  if (phase === 'end' || (phase === 'break' && !plan.questions.length))
    return (
      <div className="lesson">
        <ResultScreen result={total} title={`Flujo · ${block} ${block === 1 ? 'bloque' : 'bloques'}`}>
          <SessionGains words={wordsNow - start.words} naked={nakedNow - start.naked} />
          <div className="row">
            <Link to="/" className="btn">Inicio</Link>
            <Link to="/practicar" className="btn primary">Juegos</Link>
          </div>
        </ResultScreen>
      </div>
    )

  return (
    <div className="lesson flow">
      <header className="lesson-head">
        {block ? (
          <button className="close" onClick={finish} aria-label="Terminar">✕</button>
        ) : (
          <Link to="/" className="close" aria-label="Salir">✕</Link>
        )}
        <span className="flow-head">
          <b>{plan.theme.icon} {plan.theme.name}</b>
          <small>Bloque {block + 1}{intensity(block) ? ` · ${'🔥'.repeat(intensity(block))}` : ''}</small>
        </span>
      </header>

      {phase === 'intro' && (
        <>
          <p className="step-label">✨ Nuevo · {introAt + 1}/{plan.intro.length}</p>
          <LetterCard item={plan.intro[introAt]} known={known} />
          <button className="btn primary wide" onClick={() => (introAt + 1 < plan.intro.length ? setIntroAt(introAt + 1) : setPhase('quiz'))}>
            Entendido
          </button>
        </>
      )}

      {phase === 'quiz' && <QuizRunner key={block} questions={plan.questions} onDone={blockDone} timed={TIMER[intensity(block)]} />}

      {phase === 'break' && last && (
        <div className="flow-break">
          <div className="flow-score">
            <b>{last.correct}/{last.total}</b>
            <small>bloque {block}</small>
          </div>
          <SessionGains words={wordsNow - start.words} naked={nakedNow - start.naked} xp={total.xp} />
          <div className="flow-next">
            <small>Ahora</small>
            <b>{plan.theme.icon} {plan.theme.name}</b>
            {plan.intro.length > 0 && <span lang="ar" className="flow-new">{plan.intro.map(it => itemInfo(it).chip).join('  ')}</span>}
            {intensity(block) > intensity(block - 1) && <span className="flow-up">🔥 Sube la intensidad: ahora con tiempo</span>}
          </div>
          <button className="btn primary wide" onClick={go} autoFocus>Seguir ▶</button>
          <button className="btn wide ghost" onClick={finish}>Terminar</button>
        </div>
      )}
    </div>
  )
}

function SessionGains({ words, naked, xp }: { words: number; naked: number; xp?: number }) {
  return (
    <div className="gains">
      {xp !== undefined && <span><b>{xp}</b><small>XP</small></span>}
      <span><b>+{words}</b><small>palabras</small></span>
      <span className="g-naked"><b>+{naked}</b><small>sin harakāt</small></span>
    </div>
  )
}
