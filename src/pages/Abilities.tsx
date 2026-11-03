import { Link } from 'react-router-dom'
import { ALL_ITEMS } from '../data/items'
import { LIMITS, MILESTONES, nextMilestone, statsAt } from '../lib/abilities'
import { LESSONS } from '../lib/curriculum'
import { EXAMS } from '../lib/exams'
import { AYAH_PASS } from '../lib/mastery'
import { QURAN } from '../lib/unlock'
import { MASTERED, useProgress } from '../store/progress'
import { NAKED_LADDER, nakedCount, nakedPct } from '../lib/naked'

/** Qué puedes hacer ya y qué podrás hacer, con datos del propio texto. Sin humo. */
export function Abilities() {
  const s = useProgress()
  const now = statsAt(s.lessonsDone)
  const next = nextMilestone(s.lessonsDone)
  const noHint = ALL_ITEMS.filter(it => (s.mastery[it] ?? 0) >= MASTERED).length
  const lessons = [...new Set(MILESTONES.map(m => m.lesson))]
  const juz = QURAN.surahs.filter(x => x.number >= 78)
  const juzDone = juz.filter(x => x.verses.every(v => (s.ayahScores[`${x.id}:${v.number}`] ?? 0) >= AYAH_PASS)).length
  const exam = (id: string) => !!s.exams[id]?.passed

  return (
    <div className="abilities">
      <header className="reader-head">
        <Link to="/" className="back">←</Link>
        <h2>🎯 Qué podrás hacer</h2>
      </header>
      <p className="muted small">Calculado sobre el texto de la app: Al-Fātiḥa, el Juz’ ʿAmma y suras famosas ({now.totalAyahs} aleyas).</p>

      <section className="card now-card">
        <h3>Ahora mismo puedes leer</h3>
        <div className="now-grid">
          <div><b>{now.pct}%</b><small>del texto</small></div>
          <div><b>{now.words.toLocaleString('es')}</b><small>palabras distintas</small></div>
          <div><b>{now.ayahs}</b><small>aleyas enteras</small></div>
          <div><b>{now.surahs}</b><small>suras enteras</small></div>
        </div>
        <p className="muted small">Sin pista latina en {noHint} de {ALL_ITEMS.length} letras y signos.</p>
      </section>

      <h3 className="group-title">Si llegas a…</h3>
      <ol className="ladder">
        {lessons.map(l => {
          const reached = s.lessonsDone >= l
          const st = statsAt(l)
          return (
            <li key={l} className={`rung${reached ? ' reached' : ''}${next?.lesson === l ? ' next' : ''}`}>
              <div className="rung-head">
                <span className="rung-badge">{reached ? '✓' : l}</span>
                <b>{reached ? 'Ya lo tienes' : `Lección ${l}`}</b>
                <small>{st.pct}% del texto · {st.ayahs} aleyas</small>
              </div>
              {MILESTONES.filter(m => m.lesson === l).map(m => (
                <p key={m.id} className="rung-item">
                  <strong>{m.title}</strong>
                  <span>{m.why}</span>
                </p>
              ))}
              {!reached && <small className="rung-left">{l - s.lessonsDone === 1 ? 'Falta 1 lección' : `Faltan ${l - s.lessonsDone} lecciones`}</small>}
            </li>
          )
        })}
        <li className={`rung${s.lessonsDone >= LESSONS.length ? ' reached' : ''}`}>
          <div className="rung-head">
            <span className="rung-badge">{s.lessonsDone >= LESSONS.length ? '✓' : '🔤'}</span>
            <b>Todas las lecciones</b>
          </div>
          <p className="rung-item">
            <strong>Conoces todos los signos del texto</strong>
            <span>Puedes descifrar cualquier palabra de estas suras. El muṣḥaf entero usa los mismos signos, así que cualquier página es descifrable, al principio despacio.</span>
          </p>
        </li>
      </ol>

      <h3 className="group-title">Y después: soltura</h3>
      <ol className="ladder">
        {[
          { done: exam('palabras'), title: `Examen ${EXAMS[1].name}`, text: `Reconoces palabras frecuentes, también solo de oído, en menos de ${EXAMS[1].timed} s.` },
          { done: juzDone === juz.length, title: `Juz’ ʿAmma completo (${juzDone}/${juz.length})`, text: 'Has leído y ordenado de oído cada aleya de las 37 suras cortas, las que más se recitan en la oración.' },
          { done: noHint === ALL_ITEMS.length, title: `Sin pista en todo (${noHint}/${ALL_ITEMS.length})`, text: 'La transliteración ha desaparecido de todas las letras: lees solo el árabe.' },
          { done: exam('qari'), title: `Examen ${EXAMS[4].name}`, text: `${EXAMS[4].count} preguntas a ${EXAMS[4].timed} s con un ${EXAMS[4].pass}%: decodificas sin pararte letra a letra.` },
        ].map(r => (
          <li key={r.title} className={`rung${r.done ? ' reached' : ''}`}>
            <div className="rung-head"><span className="rung-badge">{r.done ? '✓' : '·'}</span><b>{r.title}</b></div>
            <p className="rung-item"><span>{r.text}</span></p>
          </li>
        ))}
      </ol>

      <h3 className="group-title">La meta: leer sin harakāt</h3>
      <p className="muted small">
        El muṣḥaf y casi todo el árabe escrito se leen sin los signos de encima y debajo. Cuenta solo lo que has demostrado:
        una palabra entra cuando la lees sin signos 3 veces seguidas. Ahora: <b>{nakedCount(s.wordStats)}</b> palabras · <b>{nakedPct(s.wordStats)}%</b> del texto.
      </p>
      <ol className="ladder">
        {NAKED_LADDER.map(r => {
          const done = r.test(s.wordStats)
          const p = Math.min(1, r.progress(s.wordStats))
          return (
            <li key={r.id} className={`rung${done ? ' reached' : ''}`}>
              <div className="rung-head">
                <span className="rung-badge">{done ? '✓' : '👁️'}</span>
                <b>{r.title}</b>
                {!done && <small>{Math.floor(p * 100)}%</small>}
              </div>
              <p className="rung-item"><span>{r.why}</span></p>
              {!done && <div className="bar thin"><span style={{ width: `${p * 100}%` }} /></div>}
            </li>
          )
        })}
      </ol>

      <section className="card limits">
        <h3>Lo que esta app no te da</h3>
        {LIMITS.map(l => <p key={l.icon}><span>{l.icon}</span> {l.text}</p>)}
      </section>
    </div>
  )
}
