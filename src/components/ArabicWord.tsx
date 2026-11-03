import { useEffect, useMemo, useRef, useState } from 'react'
import { stripMarks, transliterate } from '../lib/arabic'
import { playWord } from '../lib/audio'
import { MASTERED, useProgress, type TranslitMode } from '../store/progress'

interface Props {
  text: string
  audio?: string
  size?: 'md' | 'lg' | 'xl'
  mode?: TranslitMode
  dim?: boolean
  active?: boolean
  meaning?: string
  /** Va en mitad de una aleya: la waṣla inicial no suena. */
  connected?: boolean
  /** Se muestra sin harakāt; al tocarla aparecen un momento los signos y la pista. */
  naked?: boolean
  onClick?: () => void
}

/**
 * Palabra árabe con su transliteración debajo. En modo "auto", cada trozo de la
 * pista se oculta (·) cuando ya dominas la letra o marca correspondiente.
 * Al tocarla suena y la pista completa aparece un momento.
 */
export function ArabicWord({ text, audio, size = 'md', mode, dim, active, meaning, connected, naked, onClick }: Props) {
  const storeMode = useProgress(s => s.translit)
  const mastery = useProgress(s => s.mastery)
  const [peek, setPeek] = useState(false)
  const timer = useRef<number>(undefined)
  const parts = useMemo(() => transliterate(text, connected).flat(), [text, connected])
  const m = mode ?? storeMode

  useEffect(() => () => clearTimeout(timer.current), [])

  const hidden = (items: string[]) =>
    !peek && (naked || m === 'never' || (m === 'auto' && items.every(it => (mastery[it] ?? 0) >= MASTERED)))

  const click = () => {
    if (audio) void playWord(audio)
    setPeek(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPeek(false), 2500)
    onClick?.()
  }

  return (
    <button type="button" className={`aw aw-${size}${dim ? ' dim' : ''}${active ? ' active' : ''}${naked ? ' naked' : ''}`} onClick={click}>
      <span className="ar" lang="ar" dir="rtl">
        {naked && !peek ? stripMarks(text) : text}
      </span>
      {((m !== 'never' && !naked) || peek) && (
        <span className="tr" dir="ltr">
          {parts.map((p, i) => (hidden(p.items) ? <span key={i} className="tr-h">·</span> : <span key={i}>{p.text}</span>))}
        </span>
      )}
      {meaning && <span className="meaning">{meaning}</span>}
    </button>
  )
}
