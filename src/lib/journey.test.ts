import { describe, expect, it } from 'vitest'
import { LESSONS } from './curriculum'
import { NODES, UNITS, currentNode, gatesBefore, journeyStatus, lessonOpen, type JState } from './journey'

const base: JState = { lessonsDone: 0, points: {}, exams: {}, wordStats: {}, ayahScores: {}, journey: {} }

describe('el Camino', () => {
  it('tiene todas las lecciones y mucho más', () => {
    expect(NODES.filter(n => n.kind === 'lesson')).toHaveLength(LESSONS.length)
    expect(NODES.length).toBeGreaterThan(LESSONS.length * 3)
    expect(UNITS.length).toBeGreaterThanOrEqual(7)
    expect(new Set(NODES.map(n => n.id)).size).toBe(NODES.length)
  })
  it('al empezar solo está abierta la primera lección', () => {
    const st = journeyStatus(base)
    expect(st.get('lesson-0')).toBe('open')
    expect(st.get('lesson-1')).toBe('locked')
    expect(currentNode(base)!.id).toBe('lesson-0')
  })
  it('el repaso y el rango de la unidad bloquean la siguiente lección', () => {
    const s = { ...base, lessonsDone: 4 }
    expect(lessonOpen(4, s)).toBe(false)
    expect(currentNode(s)!.id).toBe('review-0')
    const items = UNITS[0].nodes.find(n => n.kind === 'rank')!.items!
    const ready = { ...s, journey: { 'review-0': 90 }, points: Object.fromEntries(items.map(it => [it, 30])) }
    expect(lessonOpen(4, ready)).toBe(true)
  })
  it('saltar con examen da por hechas las puertas de lo saltado', () => {
    const ids = gatesBefore(12)
    expect(ids).toEqual(['review-0', 'rank-0', 'review-1', 'rank-1', 'review-2', 'rank-2'])
    const s = { ...base, lessonsDone: 12, journey: Object.fromEntries(ids.map(id => [id, 100])) }
    expect(lessonOpen(12, s)).toBe(true)
  })
})
