// Leer sin harakāt: el objetivo a largo plazo. Todo se mide con palabras reales que has
// demostrado leer sin signos (3 aciertos seguidos), nunca con estimaciones.
import type { Surah } from '../data/types'
import { cleanText } from './arabic'
import { CORPUS, TOTAL_OCCURRENCES, QURAN } from './unlock'

type Stats = Record<string, { nm?: number }>

export const nakedKeys = (ws: Stats) => Object.keys(ws).filter(k => ws[k].nm)
export const nakedCount = (ws: Stats) => nakedKeys(ws).length

const COUNT = new Map(CORPUS.map(w => [w.key, w.count]))
/** % de las apariciones del texto que ya lees sin harakāt. */
export function nakedPct(ws: Stats) {
  let n = 0
  for (const k of nakedKeys(ws)) n += COUNT.get(k) ?? 0
  return Math.round((1000 * n) / TOTAL_OCCURRENCES) / 10
}

/** Palabras de una sura que ya lees sin harakāt (fracción 0..1). */
export function nakedSurahFrac(s: Surah, ws: Stats) {
  const words = s.verses.flatMap(v => v.words.map(w => cleanText(w.text)))
  return words.filter(k => ws[k]?.nm).length / words.length
}

export const FATIHA = QURAN.surahs.find(s => s.number === 1)!

/** Escalones del objetivo final, con lo que significan de verdad. */
export const NAKED_LADDER: Array<{ id: string; title: string; why: string; test: (ws: Stats) => boolean; progress: (ws: Stats) => number }> = [
  { id: 'n10', title: '10 palabras sin harakāt', why: 'Las reconoces por su forma, como leemos nosotros.', test: ws => nakedCount(ws) >= 10, progress: ws => nakedCount(ws) / 10 },
  { id: 'n50', title: '50 palabras sin harakāt', why: 'Las más repetidas del Corán, a pelo.', test: ws => nakedCount(ws) >= 50, progress: ws => nakedCount(ws) / 50 },
  { id: 'nfatiha', title: 'Al-Fātiḥa sin harakāt', why: 'Todas sus palabras, sin un solo signo.', test: ws => nakedSurahFrac(FATIHA, ws) >= 1, progress: ws => nakedSurahFrac(FATIHA, ws) },
  { id: 'n25p', title: '25 % del texto sin harakāt', why: '1 de cada 4 palabras que aparecen.', test: ws => nakedPct(ws) >= 25, progress: ws => nakedPct(ws) / 25 },
  { id: 'n200', title: '200 palabras sin harakāt', why: 'Ya deduces las vocales por costumbre.', test: ws => nakedCount(ws) >= 200, progress: ws => nakedCount(ws) / 200 },
  { id: 'n50p', title: '50 % del texto sin harakāt', why: 'La mitad de lo que lees, sin ayuda.', test: ws => nakedPct(ws) >= 50, progress: ws => nakedPct(ws) / 50 },
  { id: 'n500', title: '500 palabras sin harakāt', why: 'Nivel de lector: los signos ya son solo una comprobación.', test: ws => nakedCount(ws) >= 500, progress: ws => nakedCount(ws) / 500 },
]
