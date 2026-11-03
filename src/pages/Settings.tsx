import { useRef } from 'react'
import { LESSONS } from '../lib/curriculum'
import { exportData, useProgress, type TranslitMode } from '../store/progress'

export function Settings() {
  const s = useProgress()
  const file = useRef<HTMLInputElement>(null)

  const download = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `iqra-progreso-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const upload = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (typeof data.lessonsDone !== 'number') throw new Error()
      s.importData(data)
      alert('Progreso importado.')
    } catch {
      alert('Ese archivo no parece un progreso de Iqra.')
    }
  }

  return (
    <div className="settings">
      <h2>Ajustes</h2>

      <section className="card">
        <h3>Transliteración</h3>
        <p className="muted">En «auto», la pista latina de cada letra desaparece cuando ya la dominas.</p>
        <div className="seg">
          {(['auto', 'always', 'never'] as TranslitMode[]).map(m => (
            <button key={m} className={s.translit === m ? 'on' : ''} onClick={() => s.setTranslit(m)}>
              {{ auto: 'Auto', always: 'Siempre', never: 'Nunca' }[m]}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Tema</h3>
        <div className="seg">
          <button className={s.theme === 'black' ? 'on' : ''} onClick={() => s.setTheme('black')}>⚫ Negro</button>
          <button className={s.theme === 'light' ? 'on' : ''} onClick={() => s.setTheme('light')}>☀️ Claro</button>
        </div>
      </section>

      <section className="card">
        <h3>Sonido y vibración</h3>
        <div className="seg">
          <button className={s.sound ? 'on' : ''} onClick={() => s.setSound(true)}>Activados</button>
          <button className={!s.sound ? 'on' : ''} onClick={() => s.setSound(false)}>Silencio</button>
        </div>
        <p className="muted small">Efectos al acertar y al fallar. El audio de la recitación siempre suena.</p>
      </section>

      <section className="card">
        <h3>Meta diaria</h3>
        <div className="seg">
          {[30, 60, 100, 150].map(g => (
            <button key={g} className={s.dailyGoal === g ? 'on' : ''} onClick={() => s.setDailyGoal(g)}>
              {g} XP
            </button>
          ))}
        </div>
        <p className="muted small">60 XP son unos 5 minutos.</p>
      </section>

      <section className="card">
        <h3>¿Ya conoces algunas letras?</h3>
        <p className="muted">Puedes saltarte lecciones. Las desbloqueadas se pueden repetir cuando quieras.</p>
        <select value={s.lessonsDone} onChange={e => {
            // Completar también las intermedias para que sus letras entren en el repaso.
            for (let i = s.lessonsDone; i < Number(e.target.value); i++) s.completeLesson(i)
          }}>
          {LESSONS.map((_, i) => (
            <option key={i} value={i + 1} disabled={i + 1 < s.lessonsDone}>
              Completadas hasta la lección {i + 1}
            </option>
          ))}
          {s.lessonsDone === 0 && <option value={0}>Ninguna</option>}
        </select>
      </section>

      <section className="card">
        <h3>Tu progreso</h3>
        <p className="muted">Se guarda en este navegador. Expórtalo para pasarlo a otro dispositivo.</p>
        <div className="row">
          <button className="btn" onClick={download}>Exportar</button>
          <button className="btn" onClick={() => file.current?.click()}>Importar</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
          <button
            className="btn danger"
            onClick={() => confirm('¿Borrar todo el progreso? No se puede deshacer.') && s.reset()}
          >
            Borrar todo
          </button>
        </div>
      </section>

      <p className="muted small center">
        Texto y audio palabra a palabra: quran.com · Recitación: Mishary Alafasy (everyayah.com) · Traducción: Isa García
      </p>
    </div>
  )
}
