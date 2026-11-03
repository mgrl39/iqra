import { describe, expect, it } from 'vitest'
import { isDue, newCard, schedule } from './srs'

const DAY = 86_400_000

describe('srs', () => {
  it('los aciertos espacian cada vez más', () => {
    let c = newCard(0)
    c = schedule(c, true, 0)
    expect(c.interval).toBe(1)
    c = schedule(c, true, c.due)
    expect(c.interval).toBe(3)
    c = schedule(c, true, c.due)
    expect(c.interval).toBeGreaterThanOrEqual(7)
  })
  it('un fallo reinicia y vuelve pronto', () => {
    let c = schedule(newCard(0), true, 0)
    c = schedule(c, false, DAY)
    expect(c.reps).toBe(0)
    expect(isDue(c, DAY + 11 * 60_000)).toBe(true)
    expect(isDue(c, DAY + 5 * 60_000)).toBe(false)
  })
})
