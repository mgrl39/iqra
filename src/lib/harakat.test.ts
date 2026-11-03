import { describe, expect, it } from 'vitest'
import { stripMarks, translitString, vowelVariants } from './arabic'
import { homographs, missingMarkQuestion, nakedTrQuestion, vocalizeQuestion } from './questions'
import { CORPUS, wordByKey } from './unlock'
import { gameLevel } from '../games/common'
import { learnedItems } from './curriculum'
import { readableWords } from './unlock'
import { NODES } from './journey'
import { nakedCount, nakedPct } from './naked'
import { useToasts } from '../store/toasts'

describe('sin harakāt', () => {
  it('quita vocales y signos, deja el rasm', () => {
    expect(stripMarks('ٱلْحَمْدُ')).toBe('الحمد')
    expect(stripMarks('ٱلرَّحْمَـٰنِ')).toBe('الرحمن')
    expect(stripMarks('بِسْمِ')).toBe('بسم')
  })
  it('las variantes cambian solo las vocales', () => {
    const vs = vowelVariants('بِسْمِ', 3)
    expect(vs.length).toBeGreaterThan(0)
    for (const v of vs) {
      expect(stripMarks(v)).toBe('بسم')
      expect(v).not.toBe('بِسْمِ')
    }
  })
  it('hay homógrafos reales en el texto', () => {
    expect(CORPUS.some(w => homographs(w).length > 0)).toBe(true)
  })
  it('preguntas sin signos bien formadas', () => {
    for (const w of CORPUS.slice(0, 80)) {
      const q = nakedTrQuestion(w, CORPUS.slice(0, 200))
      expect(q.options).toContain(q.answer)
      expect(new Set(q.options).size).toBe(q.options.length)
      expect(q.prompt).toBe(stripMarks(w.key))
      expect(q.answer).toBe(translitString(w.key))
      const v = vocalizeQuestion(w)
      if (v) {
        expect(v.options).toContain(w.key)
        expect(new Set(v.options.map(o => translitString(o))).size).toBe(v.options.length)
      }
      const m = missingMarkQuestion(w)
      if (m) {
        expect(m.options).toContain(m.answer)
        expect(m.prompt).not.toBe(w.key)
      }
    }
  })
  it('cuenta solo palabras demostradas', () => {
    const k = wordByKey('ٱللَّهِ')!.key
    expect(nakedCount({ [k]: { nm: 1 }, x: {} })).toBe(1)
    expect(nakedPct({ [k]: { nm: 1 } })).toBeGreaterThan(0)
  })
})

describe('juegos desde el principio', () => {
  it('con 0 lecciones ya hay palabras para jugar', () => {
    const l = gameLevel(0, {})
    expect(readableWords(learnedItems(l)).length).toBeGreaterThanOrEqual(40)
  })
  it('el frente avanza al dominar lo que tiene delante', () => {
    const l = gameLevel(0, {})
    const pts = Object.fromEntries([...learnedItems(l)].map(it => [it, 10]))
    expect(gameLevel(0, pts)).toBeGreaterThan(l)
    expect(gameLevel(21, {})).toBe(21)
  })
  it('el Camino incluye la meta sin harakāt', () => {
    expect(NODES.filter(n => n.kind === 'naked').length).toBeGreaterThanOrEqual(8)
    expect(NODES.some(n => n.kind === 'naked' && n.gate)).toBe(true)
  })
})

describe('avisos', () => {
  it('durante un ejercicio se guardan y no se enseñan', () => {
    const t = useToasts.getState()
    t.setQuiet(true)
    t.push({ icon: '🏅', title: 'A' })
    t.push({ icon: '🏅', title: 'B' })
    expect(useToasts.getState().current).toBeNull()
    expect(useToasts.getState().held).toHaveLength(2)
    t.setQuiet(false)
    expect(useToasts.getState().held).toHaveLength(0)
    expect(useToasts.getState().queue).toHaveLength(2)
  })
})

describe('estadísticas de palabra', () => {
  it('acertar con signos no borra la racha sin signos', async () => {
    const { useProgress } = await import('../store/progress')
    const st = useProgress.getState()
    for (let i = 0; i < 3; i++) {
      st.wordHit('مَا', true)
      useProgress.getState().nakedHit('مَا', true)
    }
    expect(useProgress.getState().wordStats['مَا'].nm).toBeTruthy()
  })
})
