import { useState, type ComponentType } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { QuizResult } from '../components/QuizRunner'
import { ResultScreen } from '../components/ResultScreen'
import { BuildWord, Dictation } from '../games/BuildWord'
import { LetterHunt } from '../games/LetterHunt'
import { FormMatch, SoundMatch, SpeedRead, WeakSpots } from '../games/QuizGames'
import { FlashTrueFalse, LetterRain, Pairs } from '../games/Arcade'
import { Cloze, Marathon, MinimalPairs, OrderAyah, Phrases } from '../games/MoreGames'
import { MissingMark, NakedAyah, NakedRead, NakedSurvival } from '../games/Harakat'
import { nakedCount } from '../lib/naked'
import { learnedItems } from '../lib/curriculum'
import { ayahOfTheDay } from '../lib/daily'
import { EXAMS, examUnlocked } from '../lib/exams'
import { useProgress } from '../store/progress'

interface Game {
  id: string
  name: string
  icon: string
  desc: string
  group: Group
  arcade?: boolean
  Component: ComponentType<{ onDone: (r: QuizResult) => void }>
}

type Group = 'harakat' | 'leer' | 'oido' | 'arcade'
const GROUPS: Array<[Group, string, string]> = [
  ['harakat', 'Sin harakāt', 'El objetivo: leer sin los signos'],
  ['leer', 'Lectura', 'Letras, palabras y frases'],
  ['oido', 'Oído', 'Escucha y reconoce'],
  ['arcade', 'Récords', 'Hasta fallar'],
]

/** Todos abiertos desde el principio: el contenido se adapta a lo que dominas. */
export const GAMES: Game[] = [
  { id: 'sin-harakat', name: 'Sin harakāt', icon: '👁️', desc: 'Lee la palabra desnuda', group: 'harakat', Component: NakedRead },
  { id: 'signo', name: 'Signo perdido', icon: '✏️', desc: 'Oye y pon la vocal', group: 'harakat', Component: MissingMark },
  { id: 'aleya-desnuda', name: 'Aleya desnuda', icon: '📜', desc: 'Ordena sin signos', group: 'harakat', Component: NakedAyah },
  { id: 'sin-red', name: 'Sin red', icon: '🎯', desc: 'Sin signos, hasta fallar 3', group: 'harakat', arcade: true, Component: NakedSurvival },
  { id: 'lectura-rapida', name: 'Lectura rápida', icon: '⏱️', desc: 'Lee contrarreloj', group: 'leer', Component: SpeedRead },
  { id: 'construir', name: 'Construye', icon: '🧱', desc: 'Monta la palabra', group: 'leer', Component: BuildWord },
  { id: 'frases', name: 'Frases', icon: '🔗', desc: 'Dos palabras enlazadas', group: 'leer', Component: Phrases },
  { id: 'formas', name: 'Formas', icon: '🧩', desc: 'Inicio, medio o final', group: 'leer', Component: FormMatch },
  { id: 'caza', name: 'Caza de letras', icon: '🔎', desc: 'Encuéntrala en una aleya', group: 'leer', Component: LetterHunt },
  { id: 'debiles', name: 'Puntos débiles', icon: '🩹', desc: 'Lo que más fallas', group: 'leer', Component: WeakSpots },
  { id: 'oido', name: 'Buen oído', icon: '🎧', desc: 'Oye y elige', group: 'oido', Component: SoundMatch },
  { id: 'dictado', name: 'Dictado', icon: '✍️', desc: 'Solo audio: escríbela', group: 'oido', Component: Dictation },
  { id: 'ordena', name: 'Ordena la aleya', icon: '🔀', desc: 'Escucha y ordena', group: 'oido', Component: OrderAyah },
  { id: 'completa', name: 'Completa', icon: '🕳️', desc: 'La palabra que falta', group: 'oido', Component: Cloze },
  { id: 'pares-minimos', name: 'Oído fino', icon: '👂', desc: 'Sonidos parecidos', group: 'oido', arcade: true, Component: MinimalPairs },
  { id: 'maraton', name: 'Maratón', icon: '🏃', desc: 'De todo, hasta fallar 3', group: 'arcade', arcade: true, Component: Marathon },
  { id: 'lluvia', name: 'Lluvia', icon: '🌧️', desc: 'Antes de que caigan', group: 'arcade', arcade: true, Component: LetterRain },
  { id: 'relampago', name: 'Relámpago', icon: '⚡', desc: '60 s · ¿sí o no?', group: 'arcade', arcade: true, Component: FlashTrueFalse },
  { id: 'parejas', name: 'Parejas', icon: '🃏', desc: 'Une árabe y sonido', group: 'arcade', arcade: true, Component: Pairs },
]

export function Practice() {
  const lessonsDone = useProgress(s => s.lessonsDone)
  const ayahScores = useProgress(s => s.ayahScores)
  const highScores = useProgress(s => s.highScores)
  const exams = useProgress(s => s.exams)
  const naked = useProgress(s => nakedCount(s.wordStats))
  const daily = ayahOfTheDay(learnedItems(lessonsDone), ayahScores)
  const nextExam = EXAMS.find(e => !exams[e.id]?.passed)
  const [tab, setTab] = useState<Group>('harakat')
  return (
    <div className="games-page">
      <Link to="/flujo" className="flow-cta">
        <span className="flow-cta-icon">∞</span>
        <div>
          <b>Flujo</b>
          <small>Sesión sin fin · cambia de ejercicio cada 8 preguntas</small>
        </div>
        <i>▶</i>
      </Link>
      <div className="feature-row">
        {daily && (
          <Link to={`/reto/${daily.surah.id}/${daily.verse.number}`} className="feature">
            <span>🧩</span>
            <b>Reto de aleya</b>
            <small>{daily.surah.nameSimple} {daily.verse.number}</small>
          </Link>
        )}
        <Link to="/examen" className="feature">
          <span>📝</span>
          <b>Exámenes</b>
          <small>
            {nextExam ? (examUnlocked(nextExam, lessonsDone, exams) ? `Nivel ${nextExam.level} listo` : `Nivel ${nextExam.level} · lección ${nextExam.minLessons}`) : 'Todos aprobados'}
          </small>
        </Link>
        <Link to="/repaso" className="feature">
          <span>🔁</span>
          <b>Repaso</b>
          <small>Lo que toca hoy</small>
        </Link>
      </div>
      <div className="seg game-tabs" role="tablist">
        {GROUPS.map(([g, title]) => (
          <button key={g} role="tab" className={tab === g ? 'on' : ''} onClick={() => setTab(g)}>
            {title}
          </button>
        ))}
      </div>
      <p className="group-sub">
        {GROUPS.find(g => g[0] === tab)![2]}
        {tab === 'harakat' && <> · ya lees <b>{naked}</b> sin signos</>}
      </p>
      <div className="game-list">
        {GAMES.filter(g => g.group === tab).map(g => (
          <Link key={g.id} to={`/practicar/${g.id}`} className="game-card">
            <span className="game-icon">{g.icon}</span>
            <div>
              <b>{g.name}</b>
              <small>{g.desc}</small>
            </div>
            {g.arcade && <span className="record">🏆 {highScores[g.id] ?? 0}</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}

export function PlayGame() {
  const { game } = useParams()
  // key: al cambiar de juego se reinicia todo el estado (resultado, ronda…)
  return <GameScreen key={game} game={game} />
}

function GameScreen({ game }: { game?: string }) {
  const [result, setResult] = useState<QuizResult | null>(null)
  const [round, setRound] = useState(0)
  const gameFinished = useProgress(s => s.gameFinished)
  const g = GAMES.find(x => x.id === game)
  const done = (r: QuizResult) => {
    gameFinished()
    setResult(r)
  }
  if (!g) return <Navigate to="/practicar" replace />

  return (
    <div className="lesson">
      <header className="lesson-head">
        <Link to="/practicar" className="close" aria-label="Salir">✕</Link>
        <span>{g.icon} {g.name}</span>
      </header>
      {result ? (
        <ResultScreen result={result}>
          <div className="row">
            <Link to="/practicar" className="btn">Otros juegos</Link>
            <button className="btn primary" onClick={() => { setResult(null); setRound(round + 1) }}>
              Otra vez
            </button>
          </div>
        </ResultScreen>
      ) : (
        <g.Component key={round} onDone={done} />
      )}
    </div>
  )
}
