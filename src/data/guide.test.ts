import { describe, expect, it } from 'vitest'
import { CORPUS, wordByKey } from '../lib/unlock'
import { GUIDE } from './guide'

describe('guía', () => {
  it('todas las palabras de ejemplo existen en el corpus', () => {
    const missing = GUIDE.flatMap(s => s.blocks.flatMap(b => ('words' in b ? b.words : []))).filter(w => !wordByKey(w))
    expect(missing).toEqual([])
  })
  it('las búsquedas encuentran ejemplos', () => {
    for (const s of GUIDE) for (const b of s.blocks) if ('find' in b) expect(CORPUS.filter(b.find).length, s.id).toBeGreaterThanOrEqual(b.n)
  })
})
