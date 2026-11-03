import { useEffect, useRef, type ReactNode } from 'react'
import { confetti, sfx } from '../lib/fx'
import type { QuizResult } from './QuizRunner'
import { useToasts } from '../store/toasts'

export function ResultScreen({ result, title, children }: { result: QuizResult; title?: string; children?: ReactNode }) {
  const pct = result.total ? Math.round((100 * result.correct) / result.total) : 0
  // Lo que se ganó durante el ejercicio se enseña aquí, tranquilamente, en vez de interrumpir.
  const held = useToasts(s => s.held)
  const shownAt = useRef(Date.now())
  useEffect(() => () => {
    // (el doble montaje de StrictMode no cuenta como salir)
    if (Date.now() - shownAt.current > 300) useToasts.getState().clearHeld()
  }, [])
  useEffect(() => {
    if (result.record) {
      sfx('levelup')
      confetti()
    }
  }, [result.record])
  return (
    <div className="result">
      <div className="result-emoji">{result.record ? '🏆' : pct === 100 ? '🌟' : pct >= 70 ? '🎉' : '💪'}</div>
      <h2>{title ?? (result.record ? '¡Nuevo récord!' : pct >= 70 ? '¡Muy bien!' : '¡Sigue así!')}</h2>
      {result.score !== undefined && <div className="big-score">{result.score}</div>}
      <p className="result-stats">
        {result.correct}/{result.total} aciertos · <b>+{result.xp} XP</b>
      </p>
      {held.length > 0 && (
        <ul className="news">
          {held.slice(0, 6).map(t => (
            <li key={t.id}><span>{t.icon}</span><b>{t.title}</b>{t.text && <small>{t.text}</small>}</li>
          ))}
          {held.length > 6 && <li className="muted">…y {held.length - 6} más</li>}
        </ul>
      )}
      {children}
    </div>
  )
}
