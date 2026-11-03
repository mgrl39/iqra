import { useEffect, useMemo, useRef, useState } from 'react'
import type { QuizResult } from '../components/QuizRunner'
import { sfx } from '../lib/fx'
import { shuffle } from '../lib/questions'
import { useKeys } from '../lib/useKeys'
import { comboMultiplier, setHeat, useFloats } from '../store/floats'
import { useProgress } from '../store/progress'
import { drawCard, makePool, playCard, trOptions, type Card } from './arcadePool'
import { useKnown } from './common'

interface GameProps {
  onDone: (r: QuizResult) => void
}

function useArcadePool() {
  const { known, pool } = useKnown()
  return useMemo(() => makePool(known, pool), [known, pool])
}

/** Puntuación final + récord; cuenta como partida para misiones y logros. */
function finishArcade(game: string, score: number, correct: number, total: number, xp: number, combo: number, onDone: GameProps['onDone']) {
  const s = useProgress.getState()
  const record = s.setHighScore(game, score)
  s.recordQuiz(correct, Math.max(total, 1), combo)
  onDone({ correct, total, xp, score, record })
}

// ------------------------------------------------------------ Lluvia de letras

const LIVES = 3

export function LetterRain({ onDone }: GameProps) {
  const pool = useArcadePool()
  const s = useProgress()
  const [card, setCard] = useState<Card>(() => drawCard(pool, 0))
  const [opts, setOpts] = useState(() => trOptions(card, pool))
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [progress, setProgress] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'ko' | null>(null)
  const stats = useRef({ total: 0, combo: 0, best: 0, xp: 0 })
  const start = useRef(performance.now())
  const fallMs = Math.max(1700, 6500 * 0.94 ** score)
  const over = lives <= 0
  useEffect(() => () => setHeat(0), [])

  const nextCard = (sc: number) => {
    const c = drawCard(pool, sc)
    setCard(c)
    setOpts(trOptions(c, pool))
    setProgress(0)
    start.current = performance.now()
  }

  const miss = () => {
    stats.current.combo = 0
    setHeat(0)
    sfx('wrong')
    setFlash('ko')
    s.answer(card.items, false)
    setLives(l => l - 1)
    nextCard(score)
  }

  const choose = (tr: string) => {
    if (over) return
    stats.current.total++
    if (tr === card.tr) {
      const st = stats.current
      st.combo++
      st.best = Math.max(st.best, st.combo)
      const gain = Math.round(2 * comboMultiplier(st.combo))
      st.xp += gain
      useFloats.getState().push(`+${gain}`, gain > 2 ? 'bonus' : 'xp')
      setHeat(st.combo)
      sfx(st.combo % 5 === 0 ? 'combo' : 'right')
      setFlash('ok')
      s.answer(card.items, true)
      s.gainXp(Math.round(2 * comboMultiplier(st.combo)))
      void playCard(card)
      setScore(score + 1)
      nextCard(score + 1)
    } else miss()
  }

  // Caída
  useEffect(() => {
    if (over) return
    let raf = 0
    const tick = () => {
      const p = (performance.now() - start.current) / fallMs
      if (p >= 1) miss()
      else {
        setProgress(p)
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }) // sin dependencias a propósito: siempre usa la carta y la velocidad actuales

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 250)
    return () => clearTimeout(t)
  }, [flash])

  useEffect(() => {
    if (over) finishArcade('lluvia', score, score, stats.current.total, stats.current.xp, stats.current.best, onDone)
  }, [over])

  useKeys(Object.fromEntries(opts.map((o, i) => [String(i + 1), () => choose(o)])))

  return (
    <div className={`arcade rain${flash ? ` flash-${flash}` : ''}`}>
      <div className="arcade-hud">
        <span className="lives">{'❤️'.repeat(Math.max(0, lives))}{'🤍'.repeat(LIVES - Math.max(0, lives))}</span>
        <span className="arcade-score">{score}</span>
        <span className="muted small">récord {s.highScores.lluvia ?? 0}</span>
      </div>
      <div className="rain-field">
        <div className="rain-drop" lang="ar" style={{ top: `${progress * 82}%` }}>
          {card.ar}
        </div>
        <div className="rain-ground" />
      </div>
      <div className="options">
        {opts.map((o, i) => (
          <button key={o + i} className="option" onClick={() => choose(o)}>
            <kbd>{i + 1}</kbd>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------ Relámpago

const FLASH_SECONDS = 60

export function FlashTrueFalse({ onDone }: GameProps) {
  const pool = useArcadePool()
  const s = useProgress()
  const make = (sc: number) => {
    const card = drawCard(pool, sc)
    const truth = Math.random() < 0.5
    const claim = truth ? card.tr : trOptions(card, pool).find(t => t !== card.tr) ?? card.tr
    return { card, claim, truth: claim === card.tr }
  }
  const [round, setRound] = useState(() => make(0))
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [time, setTime] = useState(FLASH_SECONDS)
  const [flash, setFlash] = useState<'ok' | 'ko' | null>(null)
  const stats = useRef({ total: 0, correct: 0, best: 0 })
  const over = time <= 0

  useEffect(() => {
    if (over) {
      finishArcade('relampago', score, stats.current.correct, stats.current.total, score, stats.current.best, onDone)
      return
    }
    const t = setTimeout(() => setTime(x => +(x - 0.1).toFixed(1)), 100)
    return () => clearTimeout(t)
  }, [time])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 200)
    return () => clearTimeout(t)
  }, [flash])

  const answer = (yes: boolean) => {
    if (over) return
    const ok = yes === round.truth
    stats.current.total++
    s.answer(round.card.items, ok)
    if (ok) {
      const c = combo + 1
      const pts = c >= 10 ? 3 : c >= 5 ? 2 : 1
      stats.current.correct++
      stats.current.best = Math.max(stats.current.best, c)
      setCombo(c)
      setScore(score + pts)
      s.gainXp(pts)
      sfx(c % 5 === 0 ? 'combo' : 'tap')
      setFlash('ok')
    } else {
      setCombo(0)
      setTime(t => Math.max(0, t - 3))
      sfx('wrong')
      setFlash('ko')
    }
    setRound(make(score + 1))
  }

  useKeys({ ArrowLeft: () => answer(false), ArrowRight: () => answer(true), '1': () => answer(false), '2': () => answer(true) })

  return (
    <div className={`arcade${flash ? ` flash-${flash}` : ''}`}>
      <div className="arcade-hud">
        <span className="arcade-time">⏱ {Math.ceil(time)}</span>
        <span className="arcade-score">{score}</span>
        <span className="muted small">{combo >= 5 ? `×${combo >= 10 ? 3 : 2} 🔥` : `récord ${s.highScores.relampago ?? 0}`}</span>
      </div>
      <div className="timer"><span style={{ width: `${(100 * time) / FLASH_SECONDS}%` }} /></div>
      <p className="quiz-label">¿Se lee así?</p>
      <div className="flash-card" key={stats.current.total}>
        <span className="flash-ar" lang="ar">{round.card.ar}</span>
        <span className="flash-tr">{round.claim}</span>
      </div>
      <div className="tf">
        <button className="tf-btn no" onClick={() => answer(false)}><kbd>←</kbd> ✗ No</button>
        <button className="tf-btn yes" onClick={() => answer(true)}>✓ Sí <kbd>→</kbd></button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ Parejas

const PAIRS = 5
const PAIR_ROUNDS = 3

export function Pairs({ onDone }: GameProps) {
  const pool = useArcadePool()
  const s = useProgress()
  const makeRound = (r: number): Card[] => {
    const src = r === 0 || pool.words.length < PAIRS ? [...pool.letters, ...pool.syllables] : r === 1 ? [...pool.syllables, ...pool.words] : pool.words
    const seen = new Set<string>()
    return shuffle(src.length >= PAIRS ? src : [...pool.letters, ...pool.syllables]).filter(c => !seen.has(c.tr) && seen.add(c.tr)).slice(0, PAIRS)
  }
  const [r, setR] = useState(0)
  const [cards, setCards] = useState(() => makeRound(0))
  const [right, setRight] = useState(() => shuffle(cards.map(c => c.tr)))
  const [selA, setSelA] = useState<number | null>(null)
  const [selB, setSelB] = useState<number | null>(null)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<[number, number] | null>(null)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(0)
  const stats = useRef({ misses: 0, combo: 0, best: 0, total: 0 })

  useEffect(() => {
    const t = setInterval(() => setTime(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const tryPair = (a: number | null, b: number | null) => {
    setSelA(a)
    setSelB(b)
    if (a === null || b === null) return
    const card = cards[a]
    const ok = card.tr === right[b]
    stats.current.total++
    s.answer(card.items, ok)
    if (ok) {
      stats.current.combo++
      stats.current.best = Math.max(stats.current.best, stats.current.combo)
      sfx('right')
      s.gainXp(2)
      setScore(x => x + 10)
      void playCard(card)
      const d = new Set(done).add(a)
      setDone(d)
      if (d.size === cards.length) {
        if (r + 1 >= PAIR_ROUNDS) {
          const final = Math.max(0, score + 10 + Math.max(0, 90 - time))
          setTimeout(() => finishArcade('parejas', final, PAIRS * PAIR_ROUNDS - stats.current.misses, stats.current.total, final >> 2, stats.current.best, onDone), 400)
        } else
          setTimeout(() => {
            const next = makeRound(r + 1)
            setR(r + 1)
            setCards(next)
            setRight(shuffle(next.map(c => c.tr)))
            setDone(new Set())
          }, 400)
      }
    } else {
      stats.current.misses++
      stats.current.combo = 0
      sfx('wrong')
      setScore(x => Math.max(0, x - 3))
      setWrong([a, b])
      setTimeout(() => setWrong(null), 400)
    }
    setSelA(null)
    setSelB(null)
  }

  const rightDone = (b: number) => cards.some((c, i) => done.has(i) && c.tr === right[b])

  // Teclas: 1-5 columna árabe, 6-0 columna de pronunciación
  useKeys({
    ...Object.fromEntries(cards.map((_, i) => [String(i + 1), () => !done.has(i) && tryPair(i, selB)])),
    ...Object.fromEntries(right.map((_, i) => [String((i + 6) % 10), () => !rightDone(i) && tryPair(selA, i)])),
  })

  return (
    <div className="arcade">
      <div className="arcade-hud">
        <span className="arcade-time">⏱ {time}s</span>
        <span className="arcade-score">{score}</span>
        <span className="muted small">ronda {r + 1}/{PAIR_ROUNDS} · récord {s.highScores.parejas ?? 0}</span>
      </div>
      <p className="quiz-label">Une cada pareja</p>
      <div className="pairs">
        <div className="pair-col">
          {cards.map((c, i) => (
            <button
              key={i}
              className={`pair ar-pair${selA === i ? ' sel' : ''}${done.has(i) ? ' done' : ''}${wrong?.[0] === i ? ' wrong' : ''}`}
              onClick={() => tryPair(i, selB)}
              disabled={done.has(i)}
              lang="ar"
            >
              <kbd>{i + 1}</kbd>
              {c.ar}
            </button>
          ))}
        </div>
        <div className="pair-col">
          {right.map((t, i) => (
            <button
              key={i}
              className={`pair${selB === i ? ' sel' : ''}${rightDone(i) ? ' done' : ''}${wrong?.[1] === i ? ' wrong' : ''}`}
              onClick={() => tryPair(selA, i)}
              disabled={rightDone(i)}
            >
              <kbd>{(i + 6) % 10}</kbd>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
