// Corpus de palabras únicas y cálculo de cuáles se pueden leer con lo aprendido.
import quranJson from '../data/generated/quran.json'
import type { Quran } from '../data/types'
import { GLOSSES_ES } from '../data/glosses-es'
import { cleanText, itemsOf } from './arabic'

export const QURAN = quranJson as Quran

// Comparación en NFC: el orden de las marcas (shadda+fatḥa / fatḥa+shadda) no importa.
const glosses = new Map(Object.entries(GLOSSES_ES).map(([k, v]) => [k.normalize('NFC'), v]))

export interface CorpusWord {
  key: string
  text: string
  en: string
  meaning: string // español si lo tenemos; si no, la glosa inglesa de quran.com
  ref: string // primera aparición, "sura:aleya"
  inFatiha: boolean
  audio: string
  count: number
  items: string[]
}

const byKey = new Map<string, CorpusWord>()
for (const s of QURAN.surahs)
  for (const v of s.verses)
    for (const w of v.words) {
      const key = cleanText(w.text)
      const prev = byKey.get(key)
      if (prev) {
        prev.count++
        prev.inFatiha ||= s.number === 1
      } else
        byKey.set(key, {
          key,
          text: key,
          en: w.en,
          meaning: glosses.get(key.normalize('NFC')) ?? w.en,
          ref: `${s.number}:${v.number}`,
          inFatiha: s.number === 1,
          audio: w.audio,
          count: 1,
          items: [...itemsOf(key)],
        })
    }

/** Palabras únicas, de más a menos frecuentes. */
export const CORPUS = [...byKey.values()].sort((a, b) => b.count - a.count)
export const CORPUS_BY_KEY = byKey
export const TOTAL_OCCURRENCES = CORPUS.reduce((n, w) => n + w.count, 0)

export const isReadable = (items: Iterable<string>, known: Set<string>) => {
  for (const it of items) if (!known.has(it)) return false
  return true
}

export const readableWords = (known: Set<string>) => CORPUS.filter(w => isReadable(w.items, known))

export const readableCount = (known: Set<string>) =>
  CORPUS.reduce((n, w) => (isReadable(w.items, known) ? n + w.count : n), 0)

// Búsqueda tolerante al orden de las marcas (para textos escritos a mano en la guía, etc.)
const nfc = (t: string) => cleanText(t).normalize('NFC')
const byNfc = new Map(CORPUS.map(w => [nfc(w.key), w]))
export const wordByKey = (text: string) => byKey.get(cleanText(text)) ?? byNfc.get(nfc(text))

// ------------------------------------------------------------ frases (dos palabras seguidas)

export interface Phrase {
  key: string // "palabra1 palabra2"
  words: [CorpusWord, CorpusWord]
  audios: [string, string]
  ref: string
  count: number
  items: string[]
}

const phraseMap = new Map<string, Phrase>()
for (const s of QURAN.surahs)
  for (const v of s.verses)
    for (let i = 0; i + 1 < v.words.length; i++) {
      const a = byKey.get(cleanText(v.words[i].text))!
      const b = byKey.get(cleanText(v.words[i + 1].text))!
      const key = `${a.key} ${b.key}`
      const prev = phraseMap.get(key)
      if (prev) prev.count++
      else
        phraseMap.set(key, {
          key,
          words: [a, b],
          audios: [v.words[i].audio, v.words[i + 1].audio],
          ref: `${s.number}:${v.number}`,
          count: 1,
          items: [...new Set([...a.items, ...b.items])],
        })
    }

/** Parejas de palabras seguidas del texto, de más a menos frecuentes. */
export const PHRASES = [...phraseMap.values()].sort((a, b) => b.count - a.count)

export const readablePhrases = (known: Set<string>) => PHRASES.filter(p => isReadable(p.items, known))
