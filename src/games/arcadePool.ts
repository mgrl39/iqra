// Material para los juegos arcade: letras, sílabas y palabras según lo aprendido.
import { LETTERS, LETTER_BY_ID } from '../data/letters'
import { DAMMA, FATHA, KASRA, graphemes, translitString } from '../lib/arabic'
import { readablePhrases, type CorpusWord } from '../lib/unlock'
import { playWord, playWords } from '../lib/audio'
import { phraseTr, pick } from '../lib/questions'

export interface Card {
  ar: string
  tr: string
  items: string[]
  audio?: string
  audios?: string[] // frases
  word?: CorpusWord
}

export const playCard = (c: Card) => (c.audios ? playWords(c.audios) : c.audio ? playWord(c.audio) : Promise.resolve())

const VOWELS: Array<[string, string]> = [
  [FATHA, 'fatha'],
  [KASRA, 'kasra'],
  [DAMMA, 'damma'],
]
const SIMPLE = (l: string) => !['ا', 'ء', 'ة', 'ى'].includes(l)

export function makePool(known: Set<string>, words: CorpusWord[]) {
  const letters: Card[] = LETTERS.filter(l => known.has(l.id) && l.id !== 'ى' && l.id !== 'ة').map(l => ({ ar: l.id, tr: LETTER_BY_ID[l.id].tr, items: [l.id] }))
  const syllables: Card[] = []
  for (const l of LETTERS.filter(x => known.has(x.id) && SIMPLE(x.id)))
    for (const [v, vid] of VOWELS) if (known.has(vid)) syllables.push({ ar: l.id + v, tr: translitString(l.id + v), items: [l.id, vid] })
  const short: Card[] = words
    .filter(w => graphemes(w.key).length <= 5)
    .slice(0, 150)
    .map(w => ({ ar: w.key, tr: translitString(w.key), items: w.items, audio: w.audio, word: w }))
  const phrases: Card[] = readablePhrases(known)
    .filter(p => graphemes(p.words[0].key).length + graphemes(p.words[1].key).length <= 8)
    .slice(0, 120)
    .map(p => ({ ar: p.key, tr: phraseTr(p), items: p.items, audios: p.audios }))
  return { letters, syllables, words: short, phrases }
}

export type Pool = ReturnType<typeof makePool>

/** Elige una carta: la dificultad sube con la puntuación. */
export function drawCard(p: Pool, score: number): Card {
  const tiers: Card[][] = [p.letters]
  if (score >= 6 && p.syllables.length) tiers.push(p.syllables)
  if (score >= 14 && p.words.length >= 4) tiers.push(p.words)
  if (score >= 25 && p.phrases.length >= 4) tiers.push(p.phrases)
  const nonEmpty = tiers.filter(t => t.length)
  return pick(pick(nonEmpty.length ? nonEmpty : [p.letters]))
}

/** Opciones de respuesta: la correcta + 3 transliteraciones del mismo tipo. */
export function trOptions(card: Card, p: Pool): string[] {
  const same = [p.letters, p.syllables, p.words, p.phrases].find(t => t.includes(card)) ?? p.letters
  const others = [...new Set([...same, ...p.letters, ...p.syllables].map(c => c.tr))].filter(t => t !== card.tr)
  const ds: string[] = []
  while (ds.length < 3 && others.length) ds.push(others.splice(Math.floor(Math.random() * others.length), 1)[0])
  return [card.tr, ...ds].sort(() => Math.random() - 0.5)
}
