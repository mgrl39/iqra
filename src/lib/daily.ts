// Elección de aleyas para los retos de lectura.
import type { Surah, Verse } from '../data/types'
import { dayKey } from '../store/progress'
import { cleanText } from './arabic'
import { AYAH_PASS } from './mastery'
import { QURAN, isReadable, wordByKey } from './unlock'

export interface AyahRef {
  surah: Surah
  verse: Verse
  key: string // "sura-id:aleya"
  readable: number // fracción de palabras legibles
}

export const surahById = (id: string) => QURAN.surahs.find(s => s.id === id)

export function readableFraction(v: Verse, known: Set<string>) {
  const ok = v.words.filter(w => isReadable(wordByKey(cleanText(w.text))!.items, known)).length
  return ok / v.words.length
}

/** Aleyas que ya se pueden leer (casi) enteras, de más fácil a más difícil. */
export function readableAyahs(known: Set<string>, minFraction = 1): AyahRef[] {
  const out: AyahRef[] = []
  for (const s of QURAN.surahs)
    for (const v of s.verses) {
      const readable = readableFraction(v, known)
      if (readable >= minFraction) out.push({ surah: s, verse: v, key: `${s.id}:${v.number}`, readable })
    }
  return out.sort((a, b) => b.readable - a.readable || a.verse.words.length - b.verse.words.length)
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** La "aleya del día": legible, con el reto aún sin superar, preferiblemente de Al-Fátiha y corta. */
export function ayahOfTheDay(known: Set<string>, scores: Record<string, number>): AyahRef | null {
  for (const min of [1]) {
    const cands = readableAyahs(known, min).filter(a => (scores[a.key] ?? 0) < AYAH_PASS && a.verse.words.length <= 14)
    if (!cands.length) continue
    const fatiha = cands.filter(a => a.surah.number === 1)
    const pool = fatiha.length ? fatiha : cands.slice(0, 8)
    return pool[hash(dayKey()) % pool.length]
  }
  return null
}
