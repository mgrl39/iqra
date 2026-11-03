import { describe, expect, it } from 'vitest'
import { TIERS, hitsToNextTier, nextPoints, tierIndex, wordTier } from './mastery'
import { questsFor } from './quests'
import { levelOf, xpForLevel } from './achievements'

describe('rangos', () => {
  it('suben con los puntos', () => {
    expect(tierIndex(0)).toBe(0)
    expect(tierIndex(10)).toBe(1)
    expect(tierIndex(149)).toBe(3)
    expect(tierIndex(150)).toBe(4)
    expect(tierIndex(99999)).toBe(TIERS.length - 1)
  })
  it('maestro cuesta miles de aciertos', () => {
    expect(TIERS.find(t => t.name === 'Maestro')!.min).toBeGreaterThanOrEqual(2000)
    expect(TIERS.length).toBeGreaterThanOrEqual(10)
  })
  it('aciertos hasta el siguiente', () => {
    expect(hitsToNextTier(0)).toBe(10)
    expect(hitsToNextTier(12)).toBe(18)
    expect(hitsToNextTier(5000)).toBeNull()
  })
  it('un fallo resta pero no baja de rango', () => {
    expect(nextPoints(20, true)).toBe(21)
    expect(nextPoints(20, false)).toBe(17)
    expect(nextPoints(31, false)).toBe(30)
    expect(nextPoints(0, false)).toBe(0)
  })
  it('rangos de palabra', () => {
    expect(wordTier(3)).toBe(0)
    expect(wordTier(10)).toBe(1)
    expect(wordTier(100)).toBe(3)
  })
  it('niveles cada vez más caros', () => {
    expect(levelOf(0).level).toBe(1)
    expect(levelOf(xpForLevel(10)).level).toBe(10)
    expect(xpForLevel(11) - xpForLevel(10)).toBeGreaterThan(xpForLevel(3) - xpForLevel(2))
    expect(xpForLevel(20)).toBeGreaterThan(40000)
  })
})

describe('misiones', () => {
  it('tres de tipos distintos, fijas por día', () => {
    for (const day of ['2026-11-02', '2026-11-03', '2027-01-01']) {
      const q = questsFor(day, false)
      expect(q).toHaveLength(3)
      expect(new Set(q.map(x => x.kind)).size).toBe(3)
      expect(questsFor(day, false)).toEqual(q)
    }
  })
  it('sin misiones de lección si ya está todo aprendido', () => {
    for (let d = 1; d <= 28; d++) expect(questsFor(`2026-02-${String(d).padStart(2, '0')}`, true).some(q => q.kind === 'lessons')).toBe(false)
  })
})
