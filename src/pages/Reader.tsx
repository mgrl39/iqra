import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArabicWord } from '../components/ArabicWord'
import { cleanText } from '../lib/arabic'
import { playWord, stop } from '../lib/audio'
import { playVerseKaraoke } from '../lib/karaoke'
import { AYAH_PASS, surahStars } from '../lib/mastery'
import { learnedItems } from '../lib/curriculum'
import { readableFraction, surahById } from '../lib/daily'
import { QURAN, isReadable, wordByKey } from '../lib/unlock'
import type { Surah } from '../data/types'
import { useProgress, type MarksMode, type TranslitMode } from '../store/progress'

const GROUPS: Array<{ title: string; filter: (s: Surah) => boolean; sort?: (a: Surah, b: Surah) => number }> = [
  { title: 'Al-Fátiha', filter: s => s.number === 1 },
  { title: 'Juz\' Amma', filter: s => s.number >= 78, sort: (a, b) => a.verses.reduce((n, v) => n + v.words.length, 0) - b.verses.reduce((n, v) => n + v.words.length, 0) },
  { title: 'Fragmentos famosos', filter: s => s.partial },
  { title: 'Suras queridas', filter: s => !s.partial && s.number > 1 && s.number < 78 },
]

function surahProgress(s: Surah, known: Set<string>) {
  let ok = 0
  let total = 0
  for (const v of s.verses)
    for (const w of v.words) {
      total++
      if (isReadable(wordByKey(w.text)!.items, known)) ok++
    }
  return Math.round((100 * ok) / total)
}

export function SurahList() {
  const [tab, setTab] = useState(0)
  const lessonsDone = useProgress(s => s.lessonsDone)
  const ayahScores = useProgress(s => s.ayahScores)
  const known = useMemo(() => learnedItems(lessonsDone), [lessonsDone])
  return (
    <div>
      <h2>Leer el Corán</h2>
      <p className="muted small">★ legible · ★★ retos superados ({AYAH_PASS}%) · ★★★ todos al 100%</p>
      <div className="seg tabs">
        {GROUPS.map((g, i) => (
          <button key={g.title} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{g.title}</button>
        ))}
      </div>
      {GROUPS.filter((_, i) => i === tab).map(g => {
        const list = QURAN.surahs.filter(g.filter)
        if (g.sort) list.sort(g.sort)
        return (
          <section key={g.title}>

            <div className="surah-list">
              {list.map(s => {
                const pct = surahProgress(s, known)
                const stars = surahStars(s, known, ayahScores)
                return (
                  <Link key={s.id} to={`/leer/${s.id}`} className="surah-card">
                    <span className="surah-num">{s.number}</span>
                    <div className="surah-names">
                      <b>{s.nameSimple}</b>
                      <small>{s.nameEs} · {s.verses.length} {s.verses.length === 1 ? 'aleya' : 'aleyas'}</small>
                      <div className="bar thin"><span style={{ width: `${pct}%` }} /></div>
                    </div>
                    <span className="surah-ar" lang="ar">{s.nameArabic}</span>
                    <span className={`pct${pct === 100 ? ' full' : ''}`}>{pct === 100 ? <span className="stars">{'★'.repeat(stars)}<span className="off">{'★'.repeat(3 - stars)}</span></span> : `${pct}%`}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

const MODES: Record<TranslitMode, string> = { auto: 'Pista: auto', always: 'Pista: siempre', never: 'Pista: nunca' }
const NEXT_MODE: Record<TranslitMode, TranslitMode> = { auto: 'never', never: 'always', always: 'auto' }

const NEXT_MARKS: Record<MarksMode, MarksMode> = { all: 'auto', auto: 'none', none: 'all' }
const MARKS_LABEL: Record<MarksMode, string> = { all: 'ـَ Con signos', auto: '👁️ Signos: auto', none: '👁️ Sin signos' }

export function SurahView() {
  const surah = surahById(useParams().id ?? '')
  const lessonsDone = useProgress(s => s.lessonsDone)
  const translit = useProgress(s => s.translit)
  const setTranslit = useProgress(s => s.setTranslit)
  const ayahScores = useProgress(s => s.ayahScores)
  const marks = useProgress(s => s.marks)
  const setMarks = useProgress(s => s.setMarks)
  const wordStats = useProgress(s => s.wordStats)
  const known = useMemo(() => learnedItems(lessonsDone), [lessonsDone])
  const [showEs, setShowEs] = useState(true)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState<{ v: number; w: number | null } | null>(null)
  const playToken = useRef(0)

  useEffect(() => () => stop(), [])
  if (!surah) return <Navigate to="/leer" replace />

  const playFrom = async (start: number, continuous: boolean) => {
    const token = ++playToken.current
    const alive = () => playToken.current === token
    for (const v of surah.verses.filter(x => x.number >= start)) {
      document.getElementById(`ayah-${v.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      if (slow) {
        // Palabra a palabra: cada palabra suena sola y se resalta.
        for (let w = 0; w < v.words.length && alive(); w++) {
          setPlaying({ v: v.number, w })
          await playWord(v.words[w].audio)
          await new Promise(r => setTimeout(r, 250))
        }
      } else {
        setPlaying({ v: v.number, w: null })
        await playVerseKaraoke(surah, v, w => alive() && setPlaying({ v: v.number, w }))
      }
      if (!alive() || !continuous) break
    }
    if (alive()) setPlaying(null)
  }

  const halt = () => {
    playToken.current++
    stop()
    setPlaying(null)
  }

  return (
    <div className="reader">
      <header className="reader-head">
        <Link to="/leer" className="back">←</Link>
        <div>
          <h2 lang="ar" className="surah-title">{surah.nameArabic}</h2>
          <small>{surah.nameSimple} · {surah.nameEs}</small>
        </div>
      </header>
      <div className="reader-tools">
        {playing ? (
          <button className="btn" onClick={halt}>⏹ Parar</button>
        ) : (
          <button className="btn primary" onClick={() => playFrom(surah.verses[0].number, true)}>▶ Escuchar</button>
        )}
        <button className={`btn${slow ? ' on' : ''}`} onClick={() => setSlow(!slow)} title="Reproducir cada palabra por separado">
          {slow ? '🐢 Palabra a palabra' : '🎤 Karaoke'}
        </button>
        <button className="btn" onClick={() => setTranslit(NEXT_MODE[translit])}>{MODES[translit]}</button>
        <button className={`btn${marks !== 'all' ? ' on' : ''}`} onClick={() => setMarks(NEXT_MARKS[marks])} title="Quitar las harakāt de las palabras que ya lees sin ellas">
          {MARKS_LABEL[marks]}
        </button>
        <button className="btn" onClick={() => setShowEs(!showEs)}>{showEs ? 'Ocultar' : 'Ver'} traducción</button>
      </div>

      {surah.number !== 1 && surah.number !== 9 && surah.verses[0].number === 1 && (
        <p className="basmala" lang="ar">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
      )}

      {surah.verses.map(v => (
        <div key={v.number} id={`ayah-${v.number}`} className={`ayah${playing?.v === v.number ? ' playing' : ''}`}>
          <div className="ayah-words" dir="rtl">
            {v.words.map((w, i) => {
              const key = cleanText(w.text)
              const ok = isReadable(wordByKey(key)!.items, known)
              const naked = marks === 'none' || (marks === 'auto' && !!wordStats[key]?.nm)
              return <ArabicWord key={i} text={w.text} audio={w.audio} size="lg" dim={!ok && !naked} naked={naked} connected={i > 0} active={playing?.v === v.number && playing.w === i} />
            })}
            <button className="ayah-num" onClick={() => playFrom(v.number, false)} title="Escuchar aleya">
              {v.number}
            </button>
          </div>
          <div className="ayah-foot">
            {showEs && <p className="ayah-es">{v.es}</p>}
            {readableFraction(v, known) === 1 && (
              <Link to={`/reto/${surah.id}/${v.number}`} className={`ayah-practice${(ayahScores[`${surah.id}:${v.number}`] ?? 0) >= AYAH_PASS ? ' passed' : ''}`} title="Reto de esta aleya">
                🧩{ayahScores[`${surah.id}:${v.number}`] !== undefined ? ` ${ayahScores[`${surah.id}:${v.number}`]}%` : ''}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
