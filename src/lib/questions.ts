// Generadores de preguntas de opción múltiple. Devuelven datos; QuizRunner los pinta.
import { LETTERS, LETTER_BY_ID } from '../data/letters'
import { isMark } from '../data/items'
import type { Lesson } from '../data/types'
import { DAMMA, FATHA, FATHATAN, KASRA, KASRATAN, DAMMATAN, SHADDA, SUKUN, DAGGER_ALIF, cleanText, graphemes, letterForms, stripMarks, translitString, vowelVariants } from './arabic'
import { CORPUS, CORPUS_BY_KEY, PHRASES, QURAN, isReadable, readablePhrases, readableWords, wordByKey, type CorpusWord, type Phrase } from './unlock'

export type QuestionKind = 'glyph' | 'wordTr' | 'audioWord' | 'trWord' | 'form' | 'phraseTr' | 'audioPhrase' | 'cloze' | 'naked' | 'vocalize' | 'mark'

export interface Question {
  kind: QuestionKind
  label: string // instrucción
  prompt: string // lo que se muestra (glifo, palabra o transliteración)
  options: string[]
  optionsAr: boolean
  answer: string
  items: string[] // items que se refuerzan/penalizan
  word?: CorpusWord
  phrase?: Phrase
  /** Aleya con un hueco (preguntas de completar). */
  context?: { words: string[]; blank: number; ref: string }
  srsKey?: string
  /** Qué letra representa cada opción (para registrar confusiones). */
  optionItems?: Record<string, string>
  /** Es una repetición de una pregunta fallada. */
  retry?: boolean
  /** La palabra se muestra sin harakāt: acertar cuenta para leer "a pelo". */
  naked?: boolean
  /** Signo perdido: índice del clúster al que le falta el signo. */
  markAt?: number
}

export const shuffle = <T,>(xs: T[]): T[] => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)]

/** Elige `n` distractores distintos de `answer`; `preferred` va primero (barajado). */
function distractors(answer: string, preferred: string[], fallback: string[], n = 3): string[] {
  const out: string[] = []
  for (const x of [...shuffle(preferred), ...shuffle(fallback)]) {
    if (out.length === n) break
    if (x && x !== answer && !out.includes(x)) out.push(x)
  }
  return out
}

const options = (answer: string, ds: string[]) => shuffle([answer, ...ds])

// Letras que se confunden por la forma: los mejores distractores.
const SHAPE_GROUPS = [
  ['ب', 'ت', 'ث', 'ن', 'ي'],
  ['ج', 'ح', 'خ'],
  ['د', 'ذ', 'ر', 'ز'],
  ['س', 'ش', 'ص', 'ض'],
  ['ط', 'ظ'],
  ['ع', 'غ', 'ء'],
  ['ف', 'ق', 'و'],
  ['ا', 'ل', 'ك'],
  ['ه', 'ة', 'م'],
  ['ى', 'ي'],
]
const lookalikes = (l: string) => SHAPE_GROUPS.find(g => g.includes(l))?.filter(x => x !== l) ?? []

const SIMPLE_CONSONANTS = LETTERS.map(l => l.id).filter(l => !['ا', 'ء', 'ة', 'ى', 'و', 'ي'].includes(l))

// ------------------------------------------------------------- items

const SYLLABLES: Record<string, (c: string) => string> = {
  fatha: c => c + FATHA,
  kasra: c => c + KASRA,
  damma: c => c + DAMMA,
  sukun: c => 'مَ' + c + SUKUN,
  shadda: c => 'مَ' + c + SHADDA + FATHA,
  tanwin: c => c + pick([FATHATAN, KASRATAN, DAMMATAN]),
  dagger: c => c + FATHA + DAGGER_ALIF,
  madd: c => c + FATHA + 'ا' + 'ٓ',
}
const SYLLABLE_VARIANTS = (c: string) =>
  [c + FATHA, c + KASRA, c + DAMMA, c + FATHA + 'ا', c + KASRA + 'ي', c + DAMMA + 'و', c + FATHATAN, c + KASRATAN, c + DAMMATAN, 'مَ' + c + SUKUN, 'مَ' + c + SHADDA + FATHA].map(
    w => translitString(w),
  )

export function itemQuestion(item: string, known: Set<string>): Question {
  if (!isMark(item)) {
    const info = LETTER_BY_ID[item]
    const trOf = (l: string) => LETTER_BY_ID[l].tr
    const knownLetters = LETTERS.map(l => l.id).filter(l => known.has(l))
    const ds = distractors(info.tr, [...lookalikes(item), ...knownLetters].map(trOf), LETTERS.map(l => l.tr))
    const byTr = Object.fromEntries(LETTERS.map(l => [l.tr, l.id]))
    const opts = options(info.tr, ds)
    return {
      kind: 'glyph',
      label: '¿Cómo suena esta letra?',
      prompt: item,
      options: opts,
      optionsAr: false,
      answer: info.tr,
      items: [item],
      srsKey: `i:${item}`,
      optionItems: Object.fromEntries(opts.map(o => [o, o === info.tr ? item : byTr[o]])),
    }
  }
  const make = SYLLABLES[item]
  if (make) {
    const cands = SIMPLE_CONSONANTS.filter(c => known.has(c))
    const c = pick(cands.length ? cands : ['ب', 'م', 'ن'])
    const glyph = make(c)
    const answer = translitString(glyph)
    return {
      kind: 'glyph',
      label: '¿Cómo se lee?',
      prompt: glyph,
      options: options(answer, distractors(answer, SYLLABLE_VARIANTS(c), [])),
      optionsAr: false,
      answer,
      items: [item],
      srsKey: `i:${item}`,
    }
  }
  // Marcas sin sílaba de plantilla (waṣla, letras pequeñas, letra muda): palabra real que la contenga.
  const pool = readableWords(new Set([...known, item]))
  const word = pool.find(w => w.items.includes(item)) ?? CORPUS.find(w => w.items.includes(item))!
  return { ...wordTrQuestion(word, pool), items: [item], srsKey: `i:${item}` }
}

// ------------------------------------------------------------- palabras

/** Distractores de palabras parecidas en longitud. */
function similarWords(word: CorpusWord, pool: CorpusWord[]) {
  const len = word.key.length
  const others = (pool.length >= 4 ? pool : CORPUS.slice(0, 60)).filter(w => w.key !== word.key)
  return shuffle(others).sort((a, b) => Math.abs(a.key.length - len) - Math.abs(b.key.length - len))
}

export function wordTrQuestion(word: CorpusWord, pool: CorpusWord[]): Question {
  const answer = translitString(word.key)
  const ds = distractors(answer, similarWords(word, pool).slice(0, 8).map(w => translitString(w.key)), CORPUS.slice(0, 40).map(w => translitString(w.key)))
  return { kind: 'wordTr', label: '¿Cómo se lee esta palabra?', prompt: word.key, options: options(answer, ds), optionsAr: false, answer, items: word.items, word, srsKey: `w:${word.key}` }
}

export function audioWordQuestion(word: CorpusWord, pool: CorpusWord[]): Question {
  const ds = distractors(word.key, similarWords(word, pool).slice(0, 8).map(w => w.key), CORPUS.slice(0, 40).map(w => w.key))
  return { kind: 'audioWord', label: 'Escucha: ¿qué palabra es?', prompt: word.key, options: options(word.key, ds), optionsAr: true, answer: word.key, items: word.items, word, srsKey: `w:${word.key}` }
}

export function trWordQuestion(word: CorpusWord, pool: CorpusWord[]): Question {
  const tr = translitString(word.key)
  const ds = distractors(word.key, similarWords(word, pool).slice(0, 8).map(w => w.key), CORPUS.slice(0, 40).map(w => w.key))
  return { kind: 'trWord', label: '¿Cuál de estas es…?', prompt: tr, options: options(word.key, ds), optionsAr: true, answer: word.key, items: word.items, word, srsKey: `w:${word.key}` }
}

export function formQuestion(letter: string, known: Set<string>): Question {
  const f = letterForms(letter)
  const [name, glyph] = pick(
    [['al principio', f.initial], ['en medio', f.medial], ['al final', f.final]].filter(([, g]) => g !== letter) as [string, string][],
  )
  const knownLetters = LETTERS.map(l => l.id).filter(l => known.has(l) && !['ء', 'ة', 'ى'].includes(l))
  const ds = distractors(letter, [...lookalikes(letter).filter(l => !['ء', 'ة', 'ى'].includes(l)), ...knownLetters], SIMPLE_CONSONANTS)
  const opts = options(letter, ds)
  return {
    kind: 'form',
    label: `Esta letra va ${name} de palabra. ¿Cuál es?`,
    prompt: glyph,
    options: opts,
    optionsAr: true,
    answer: letter,
    items: [letter],
    optionItems: Object.fromEntries(opts.map(o => [o, o])),
  }
}

// ------------------------------------------------------------- frases

export const phraseTr = (p: Phrase) => `${translitString(p.words[0].key)} ${translitString(p.words[1].key, true)}`

function similarPhrases(p: Phrase, pool: Phrase[]) {
  const len = p.key.length
  const others = (pool.length >= 4 ? pool : PHRASES.slice(0, 60)).filter(x => x.key !== p.key)
  return shuffle(others).sort((a, b) => Math.abs(a.key.length - len) - Math.abs(b.key.length - len)).slice(0, 8)
}

export function phraseTrQuestion(p: Phrase, pool: Phrase[]): Question {
  const answer = phraseTr(p)
  // Distractores: frases parecidas y la misma frase leída sin enlazar (error típico).
  const unlinked = `${translitString(p.words[0].key)} ${translitString(p.words[1].key)}`
  const ds = distractors(answer, [...similarPhrases(p, pool).map(phraseTr), ...(unlinked !== answer ? [unlinked] : [])], PHRASES.slice(0, 40).map(phraseTr))
  return { kind: 'phraseTr', label: '¿Cómo se leen juntas?', prompt: p.key, options: options(answer, ds), optionsAr: false, answer, items: p.items, phrase: p }
}

export function audioPhraseQuestion(p: Phrase, pool: Phrase[]): Question {
  // Distractores que comparten una de las dos palabras: obliga a leer las dos.
  const share = pool.filter(x => x.key !== p.key && (x.words[0] === p.words[0] || x.words[1] === p.words[1])).map(x => x.key)
  const ds = distractors(p.key, [...share.slice(0, 2), ...similarPhrases(p, pool).map(x => x.key)], PHRASES.slice(0, 40).map(x => x.key))
  return { kind: 'audioPhrase', label: 'Escucha: ¿qué frase es?', prompt: p.key, options: options(p.key, ds), optionsAr: true, answer: p.key, items: p.items, phrase: p }
}

// ------------------------------------------------------------- pares mínimos

/** Letras que suenan parecido para un hispanohablante. */
const SOUND_PAIRS: Array<[string, string]> = [
  ['ح', 'ه'], ['ح', 'خ'], ['ع', 'غ'], ['س', 'ص'], ['س', 'ث'], ['ت', 'ط'], ['ت', 'ث'],
  ['د', 'ض'], ['ذ', 'ز'], ['ذ', 'ظ'], ['ز', 'ظ'], ['ض', 'ظ'], ['ق', 'ك'], ['ص', 'ض'],
]
const soundAlikes = (l: string) => SOUND_PAIRS.flatMap(([a, b]) => (a === l ? [b] : b === l ? [a] : []))

/**
 * Oyes la palabra real y eliges entre ella y la misma palabra con una letra
 * cambiada por otra que suena parecido (entrenamiento de pares mínimos).
 */
export function minimalPairQuestion(word: CorpusWord, known: Set<string>): Question | null {
  const letters = [...new Set([...word.key].filter(ch => soundAlikes(ch).some(x => known.has(x))))]
  if (!letters.length) return null
  const target = pick(letters)
  const fakes = soundAlikes(target).filter(x => known.has(x)).slice(0, 2).map(x => ({ x, text: word.key.replace(target, x) }))
  const opts = shuffle([word.key, ...fakes.map(f => f.text)])
  return {
    kind: 'audioWord',
    label: '👂 Oído fino: ¿cuál suena?',
    prompt: word.key,
    options: opts,
    optionsAr: true,
    answer: word.key,
    items: [target, ...fakes.map(f => f.x)],
    word,
    optionItems: Object.fromEntries([[word.key, target], ...fakes.map(f => [f.text, f.x])]),
  }
}

export const minimalPairCandidates = (pool: CorpusWord[], known: Set<string>) =>
  pool.filter(w => [...w.key].some(ch => soundAlikes(ch).some(x => known.has(x))))

// ------------------------------------------------------------- completar aleya

/** Tramo de aleya (≤ 9 palabras) con una palabra legible escondida. */
export function clozeQuestion(known: Set<string>, pool: CorpusWord[]): Question | null {
  const verses = QURAN.surahs.flatMap(s => s.verses.map(v => ({ s, v })))
  for (let tries = 0; tries < 40; tries++) {
    const { s, v } = pick(verses)
    const words = v.words.map(w => cleanText(w.text))
    const entries = words.map(w => wordByKey(w)!)
    const okIdx = entries.map((e, i) => (isReadable(e.items, known) ? i : -1)).filter(i => i >= 0)
    if (okIdx.length < Math.min(3, words.length) || words.length < 3) continue
    const start = Math.max(0, Math.min(words.length - 9, pick(okIdx) - 4))
    const chunk = words.slice(start, start + 9)
    const inChunk = okIdx.filter(i => i >= start && i < start + chunk.length)
    if (!inChunk.length) continue
    const blank = pick(inChunk)
    const word = entries[blank]
    const ds = distractors(word.key, similarWords(word, pool).slice(0, 8).map(w => w.key), CORPUS.slice(0, 40).map(w => w.key))
    return {
      kind: 'cloze',
      label: 'Escucha y completa la aleya',
      prompt: word.key,
      options: options(word.key, ds),
      optionsAr: true,
      answer: word.key,
      items: word.items,
      word,
      context: { words: chunk, blank: blank - start, ref: `${s.number}:${v.number}` },
    }
  }
  return null
}

/** Palabras largas (6+ letras): las difíciles de los exámenes altos. */
export const longWords = (pool: CorpusWord[]) => pool.filter(w => graphemes(w.key).length >= 6)

// ------------------------------------------------------------- sin harakāt

let skeletons: Map<string, CorpusWord[]> | null = null
/** Palabras del texto con el mismo esqueleto (mismas letras, otras vocales): ملك → مَلِك، مُلْك، مَـٰلِك… */
export function homographs(word: CorpusWord): CorpusWord[] {
  if (!skeletons) {
    skeletons = new Map()
    for (const w of CORPUS) {
      const k = stripMarks(w.key)
      skeletons.set(k, [...(skeletons.get(k) ?? []), w])
    }
  }
  return (skeletons.get(stripMarks(word.key)) ?? []).filter(w => w.key !== word.key)
}

/** Palabras que merece la pena leer sin harakāt (2+ letras). */
export const nakedCandidates = (pool: CorpusWord[]) => pool.filter(w => [...stripMarks(w.key)].length >= 2)

/** Ves la palabra sin vocales y eliges cómo se lee: obliga a deducir las harakāt. */
export function nakedTrQuestion(word: CorpusWord, pool: CorpusWord[]): Question {
  const answer = translitString(word.key)
  const preferred = [...homographs(word).map(w => w.key), ...vowelVariants(word.key, 6)].map(w => translitString(w))
  const ds = distractors(answer, preferred, similarWords(word, pool).slice(0, 8).map(w => translitString(w.key)))
  return { kind: 'naked', label: 'Sin harakāt · ¿cómo se lee?', prompt: stripMarks(word.key), options: options(answer, ds), optionsAr: false, answer, items: word.items, word, naked: true }
}

/** Oyes la palabra y eliges la escritura con las vocales correctas. */
export function vocalizeQuestion(word: CorpusWord): Question | null {
  const variants = [...homographs(word).map(w => w.key), ...vowelVariants(word.key, 5)]
  const seen = new Set([translitString(word.key)])
  const ds = variants.filter(v => !seen.has(translitString(v)) && seen.add(translitString(v))).slice(0, 3)
  if (ds.length < 2) return null
  return { kind: 'vocalize', label: 'Escucha · ¿qué vocales lleva?', prompt: stripMarks(word.key), options: options(word.key, ds), optionsAr: true, answer: word.key, items: word.items, word }
}

const MARK_NAME: Record<string, string> = { [FATHA]: 'fatha', [KASRA]: 'kasra', [DAMMA]: 'damma', [SUKUN]: 'sukun', [SHADDA]: 'shadda' }
const DOT = '\u25CC'

/** A una letra le falta su signo: escucha y elige cuál. */
export function missingMarkQuestion(word: CorpusWord): Question | null {
  const cs = graphemes(word.key)
  const slots = cs.flatMap((c, i) => c.marks.filter(m => MARK_NAME[m]).map(m => ({ i, m })))
  if (!slots.length) return null
  const { i, m } = pick(slots)
  const prompt = cs.map((c, k) => (k === i ? c.base + c.marks.filter(x => x !== m).join('') : c.text)).join('')
  const choices = m === SHADDA ? [SHADDA, FATHA, KASRA, DAMMA] : [FATHA, KASRA, DAMMA, SUKUN]
  // El signo va sobre la misma letra (فَ فِ فُ فْ): se ve grande y se aprende la sílaba.
  const base = cs[i].base && cs[i].base !== '\u0640' ? cs[i].base : DOT
  const opt = (x: string) => base + x
  return {
    kind: 'mark',
    label: 'Escucha · ¿qué signo falta en la letra marcada?',
    prompt,
    options: shuffle(choices.map(opt)),
    optionsAr: true,
    answer: opt(m),
    items: [MARK_NAME[m]],
    word,
    markAt: i,
    optionItems: Object.fromEntries(choices.map(x => [opt(x), MARK_NAME[x]])),
  }
}

// ------------------------------------------------------------- conjuntos

const wordQuestion = (w: CorpusWord, pool: CorpusWord[]) =>
  pick([wordTrQuestion, wordTrQuestion, audioWordQuestion, trWordQuestion])(w, pool)

export function lessonQuestions(lesson: Lesson, known: Set<string>): { first: Question[]; second: Question[] } {
  const first = lesson.items.flatMap(it => [itemQuestion(it, known), itemQuestion(it, known)])
  const pool = readableWords(known)
  const fresh = lesson.newWords.slice(0, 6).map(k => CORPUS_BY_KEY.get(k)!)
  const second = fresh.map(w => wordQuestion(w, pool))
  // Una frase de dos palabras cuando ya hay alguna legible.
  const phrases = readablePhrases(known)
  if (phrases.length >= 4) second.push(pick([phraseTrQuestion, audioPhraseQuestion])(pick(phrases.slice(0, 40)), phrases))
  // Lecciones con pocas palabras nuevas: completar con sílabas y palabras ya legibles.
  while (second.length < 5) {
    second.push(pool.length > 1 && Math.random() < 0.5 ? wordQuestion(pick(pool), pool) : itemQuestion(pick(lesson.items), known))
  }
  return { first: shuffle(first), second: shuffle(second) }
}

export function questionForCard(key: string, known: Set<string>): Question | null {
  if (key.startsWith('i:')) return itemQuestion(key.slice(2), known)
  const w = CORPUS_BY_KEY.get(key.slice(2))
  return w ? { ...wordQuestion(w, readableWords(known)), srsKey: key } : null
}
