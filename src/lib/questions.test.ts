import { describe, expect, it } from 'vitest'
import { LESSONS, learnedItems } from './curriculum'
import { formQuestion, lessonQuestions, type Question } from './questions'

const check = (q: Question) => {
  expect(q.options).toContain(q.answer)
  expect(new Set(q.options).size).toBe(q.options.length)
  expect(q.options.length).toBe(4)
}

describe('preguntas', () => {
  it('cada lección genera preguntas válidas (4 opciones distintas con la respuesta)', () => {
    for (let run = 0; run < 5; run++)
      LESSONS.forEach((lesson, i) => {
        const { first, second } = lessonQuestions(lesson, learnedItems(i + 1))
        expect(second.length).toBeGreaterThanOrEqual(5)
        ;[...first, ...second].forEach(check)
      })
  })
  it('formas de letra', () => {
    const known = learnedItems(LESSONS.length)
    for (const l of ['ب', 'ع', 'ه', 'د', 'و']) for (let i = 0; i < 5; i++) check(formQuestion(l, known))
  })
})
