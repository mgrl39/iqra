import { useEffect } from 'react'
import { useProgress } from './store/progress'
import { LESSONS } from './lib/curriculum'
import { HashRouter, Navigate, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Celebrations } from './components/Celebrations'
import { StreakBar } from './components/StreakBar'
import { Guide } from './pages/Guide'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { PlayGame, Practice } from './pages/Practice'
import { Progress } from './pages/Progress'
import { AyahChallenge } from './pages/AyahChallenge'
import { ExamList, TakeExam } from './pages/Exams'
import { SurahList, SurahView } from './pages/Reader'
import { Review } from './pages/Review'
import { Settings } from './pages/Settings'
import { LessonMap } from './pages/LessonMap'
import { SkipExam } from './pages/SkipExam'
import { Train } from './pages/Train'
import { Abilities } from './pages/Abilities'
import { Vocabulary } from './pages/Vocabulary'
import { Flow } from './pages/Flow'
import { useToasts } from './store/toasts'
import { isDue } from './lib/srs'

/** Sección de la ruta: define el color de acento de toda la pantalla. */
const sectionOf = (p: string) =>
  /^\/(mapa|salto|entrenar)/.test(p) ? 'mapa'
  : /^\/(practicar|examen|reto|repaso|flujo)/.test(p) ? 'juegos'
  : p.startsWith('/leer') ? 'leer'
  : p.startsWith('/guia') ? 'guia'
  : /^\/(progreso|ajustes|vocabulario)/.test(p) ? 'progreso'
  : p.startsWith('/leccion') ? 'leccion'
  : 'home'

function Shell() {
  const { pathname } = useLocation()
  const theme = useProgress(s => s.theme)
  useEffect(() => {
    document.documentElement.dataset.section = sectionOf(pathname)
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'black'
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'light' ? '#f5f3ee' : '#06070b')
  }, [theme, pathname])
  // Modo concentración: sin navegación durante lecciones, juegos, repaso, retos y exámenes.
  const focus = /^\/(leccion|practicar\/|repaso|reto|examen\/|prueba|salto|entrenar|flujo)/.test(pathname)
  // Durante un ejercicio no se interrumpe: los avisos se guardan y salen juntos al acabar.
  useEffect(() => useToasts.getState().setQuiet(focus), [focus])
  return (
    <div className={`app${focus ? ' focus' : ''}`}>
      {!focus && (
        <header className="topbar">
          <NavLink to="/" className="brand">
            <span lang="ar">اقرأ</span> Iqra
          </NavLink>
          <div className="topbar-right">
            <StreakBar />
            <ReviewLink />
            <Link to="/guia" className="gear" aria-label="Guía">🧭</Link>
            <Link to="/ajustes" className="gear" aria-label="Ajustes">⚙️</Link>
          </div>
        </header>
      )}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leccion/:n" element={<Lesson />} />
          <Route path="/practicar" element={<Practice />} />
          <Route path="/practicar/:game" element={<PlayGame />} />
          <Route path="/repaso" element={<Review />} />
          <Route path="/leer" element={<SurahList />} />
          <Route path="/leer/:id" element={<SurahView />} />
          <Route path="/reto/:id/:v" element={<AyahChallenge />} />
          <Route path="/examen" element={<ExamList />} />
          <Route path="/examen/:id" element={<TakeExam />} />
          <Route path="/guia" element={<Guide />} />
          <Route path="/progreso" element={<Progress />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="/prueba" element={<Navigate to={`/salto/${LESSONS.length + 1}`} replace />} />
          <Route path="/mapa" element={<LessonMap />} />
          <Route path="/salto/:n" element={<SkipExam />} />
          <Route path="/entrenar/:id" element={<Train />} />
          <Route path="/capacidades" element={<Abilities />} />
          <Route path="/vocabulario" element={<Vocabulary />} />
          <Route path="/flujo" element={<Flow />} />
        </Routes>
      </main>
      {!focus && (
        <nav className="bottomnav">
          <NavLink to="/" end><span>🏠</span>Inicio</NavLink>
          <NavLink to="/mapa"><span>🗺️</span>Mapa</NavLink>
          <NavLink to="/practicar"><span>🎮</span>Juegos</NavLink>
          <NavLink to="/leer"><span>📖</span>Leer</NavLink>
          <NavLink to="/progreso"><span>📊</span>Progreso</NavLink>
        </nav>
      )}
      <Celebrations />
    </div>
  )
}

/** Repaso espaciado siempre a mano, con lo que toca hoy. */
function ReviewLink() {
  const due = useProgress(s => Object.values(s.srs).filter(c => isDue(c)).length)
  return (
    <Link to="/repaso" className="gear" aria-label="Repaso">
      🔁{due > 0 && <span className="badge">{due > 99 ? '99+' : due}</span>}
    </Link>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
