import { describe, expect, it } from 'vitest'
import { learnedItems, LESSONS } from './curriculum'
import { EXAMS, examUnlocked } from './exams'
import { clozeQuestion, minimalPairCandidates, minimalPairQuestion, phraseTr, phraseTrQuestion } from './questions'
import { CORPUS, PHRASES, readablePhrases, readableWords } from './unlock'

const bismillah = () => PHRASES.find(p => p.key.normalize('NFC') === 'بِسْمِ ٱللَّهِ'.normalize('NFC'))

describe('frases', () => {
  it('se construyen de palabras seguidas, con frecuencia', () => {
    expect(PHRASES.length).toBeGreaterThan(1000)
    expect(PHRASES[0].count).toBeGreaterThan(1)
    expect(bismillah()).toBeTruthy()
  })
  it('la segunda palabra se enlaza (waṣla)', () => {
    const p = bismillah()!
    expect(phraseTr(p)).toContain('‿')
  })
  it('preguntas de frase con 4 opciones distintas', () => {
    const known = learnedItems(LESSONS.length)
    const pool = readablePhrases(known)
    const q = phraseTrQuestion(pool[3], pool)
    expect(new Set(q.options).size).toBe(4)
    expect(q.options).toContain(q.answer)
  })
})

describe('pares mínimos y huecos', () => {
  const known = learnedItems(LESSONS.length)
  const words = readableWords(known)
  it('cambian una letra por otra que suena parecido', () => {
    const cands = minimalPairCandidates(words, known)
    expect(cands.length).toBeGreaterThan(100)
    for (const w of cands.slice(0, 50)) {
      const q = minimalPairQuestion(w, known)!
      expect(q.options).toContain(w.key)
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      expect(new Set(q.options).size).toBe(q.options.length)
    }
  })
  it('completar: el hueco es la respuesta', () => {
    for (let i = 0; i < 20; i++) {
      const q = clozeQuestion(known, words)!
      expect(q.context!.words[q.context!.blank]).toBe(q.answer)
      expect(q.options).toContain(q.answer)
    }
  })
})

describe('exámenes', () => {
  it('generan el número de preguntas pedido con todo aprendido', () => {
    const known = learnedItems(LESSONS.length)
    for (const e of EXAMS) expect(e.build(known)).toHaveLength(e.count)
  })
  it('se generan también con lo mínimo para presentarse', () => {
    for (const e of EXAMS) expect(e.build(learnedItems(e.minLessons)).length).toBeGreaterThan(e.count * 0.8)
  })
  it('se desbloquean en orden', () => {
    expect(examUnlocked(EXAMS[0], 0, {})).toBe(false)
    expect(examUnlocked(EXAMS[0], EXAMS[0].minLessons, {})).toBe(true)
    expect(examUnlocked(EXAMS[1], LESSONS.length, {})).toBe(false)
    expect(examUnlocked(EXAMS[1], LESSONS.length, { letras: { passed: 1 } })).toBe(true)
  })
  it('corpus intacto', () => expect(CORPUS.length).toBeGreaterThan(1000))
})
