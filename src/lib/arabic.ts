// Análisis del texto uthmani: clústeres (letra + marcas), "items" que hay que
// conocer para leer una palabra y transliteración por partes.

export const FATHA = 'َ'
export const DAMMA = 'ُ'
export const KASRA = 'ِ'
export const FATHATAN = 'ً'
export const DAMMATAN = 'ٌ'
export const KASRATAN = 'ٍ'
export const SHADDA = 'ّ'
export const SUKUN = 'ْ'
export const MADDAH = 'ٓ'
export const HAMZA_ABOVE = 'ٔ'
export const DAGGER_ALIF = 'ٰ'
export const TATWEEL = 'ـ'
export const ALIF_WASLA = 'ٱ'
const SMALL_WAW = 'ۥ'
const SMALL_YEH = 'ۦ'
const SILENT_MARKS = new Set(['۟', '۠'])

/** Signos de pausa y símbolos que no forman parte de la lectura de la palabra. */
const IGNORED = /[\sۖ-ۜ۞۩]/g

export interface Cluster {
  base: string
  marks: string[]
  text: string
}

export interface Part {
  text: string
  /** Items que hay que dominar para que esta parte de la pista se oculte. */
  items: string[]
}

const isBase = (ch: string) => {
  const c = ch.codePointAt(0)!
  return (c >= 0x0621 && c <= 0x064a) || ch === ALIF_WASLA || ch === TATWEEL || ch === SMALL_WAW || ch === SMALL_YEH
}

/** Quita signos de pausa y espacios. Es la clave para identificar una palabra. */
// آ precompuesta se separa en ا + madda: en el texto uthmani funciona como alif de prolongación.
export const cleanText = (word: string) => word.replace(IGNORED, '').replace(/\u0622/g, 'ا' + MADDAH)

export function graphemes(word: string): Cluster[] {
  const out: Cluster[] = []
  for (const ch of cleanText(word)) {
    if (isBase(ch) || out.length === 0) {
      out.push({ base: isBase(ch) ? ch : '', marks: isBase(ch) ? [] : [ch], text: ch })
    } else {
      const last = out[out.length - 1]
      last.marks.push(ch)
      last.text += ch
    }
  }
  return out
}

// ---------------------------------------------------------------- items

const BASE_ITEMS: Record<string, string[]> = {
  'أ': ['ا', 'ء'],
  'إ': ['ا', 'ء'],
  [ALIF_WASLA]: ['ا', 'wasla'],
  'ؤ': ['و', 'ء'],
  'ئ': ['ي', 'ء'],
  [TATWEEL]: [],
  [SMALL_WAW]: ['small'],
  [SMALL_YEH]: ['small'],
}

const MARK_ITEMS: Record<string, string> = {
  [FATHA]: 'fatha',
  [KASRA]: 'kasra',
  [DAMMA]: 'damma',
  [FATHATAN]: 'tanwin',
  [KASRATAN]: 'tanwin',
  [DAMMATAN]: 'tanwin',
  [SHADDA]: 'shadda',
  [SUKUN]: 'sukun',
  [MADDAH]: 'madd',
  [DAGGER_ALIF]: 'dagger',
  [HAMZA_ABOVE]: 'ء',
  '۟': 'silent',
  '۠': 'silent',
}

export const baseItems = (base: string) => BASE_ITEMS[base] ?? (base ? [base] : [])

export function clusterItems(c: Cluster): string[] {
  const items = [...baseItems(c.base)]
  for (const m of c.marks) if (MARK_ITEMS[m]) items.push(MARK_ITEMS[m])
  return items
}

/** Todo lo que hay que haber aprendido para leer la palabra. */
export function itemsOf(word: string): Set<string> {
  const s = new Set<string>()
  for (const c of graphemes(word)) for (const it of clusterItems(c)) s.add(it)
  return s
}

// ------------------------------------------------------- transliteración
// Esquema pensado para hispanohablantes: خ = j (como la jota), ج = ŷ, ث = th…

export const CONSONANTS: Record<string, string> = {
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'ŷ', 'ح': 'ḥ', 'خ': 'j', 'د': 'd', 'ذ': 'dh',
  'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ',
  'ع': 'ʿ', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ء': 'ʾ', 'أ': 'ʾ', 'إ': 'ʾ', 'ؤ': 'ʾ', 'ئ': 'ʾ', 'ة': 't',
}

const SHORT: Record<string, ['a' | 'i' | 'u', string]> = {
  [FATHA]: ['a', 'fatha'],
  [KASRA]: ['i', 'kasra'],
  [DAMMA]: ['u', 'damma'],
}
const TANWIN: Record<string, string> = { [FATHATAN]: 'an', [KASRATAN]: 'in', [DAMMATAN]: 'un' }
const LONG = { a: 'ā', i: 'ī', u: 'ū' } as const

/** Letras que pueden alargar la vocal anterior (y qué vocal alargan). */
const CARRIERS: Record<string, Array<'a' | 'i' | 'u'>> = {
  'ا': ['a'],
  'ى': ['a', 'i'],
  'و': ['u'],
  'ي': ['i'],
  [TATWEEL]: ['a'],
  [SMALL_WAW]: ['u'],
  [SMALL_YEH]: ['i'],
}

/**
 * Transliteración por clúster; cada clúster tiene 0 o más partes.
 * `connected`: la palabra va en mitad de una frase, así que su alif waṣla inicial
 * no suena y se enlaza con la anterior (فِى ٱلْأَرْضِ = fī‿l-arḍi, no "fī al-arḍi").
 */
export function transliterate(word: string, connected = false): Part[][] {
  const cs = graphemes(word)
  const out: Part[][] = []
  // Última vocal corta emitida, por si la siguiente letra la alarga.
  let last: { part: Part; v: 'a' | 'i' | 'u' } | null = null

  cs.forEach((c, i) => {
    const m = new Set(c.marks)
    const parts: Part[] = []
    out.push(parts)
    const items = baseItems(c.base)
    const short = c.marks.map(x => SHORT[x]).find(Boolean)
    const tanwin = c.marks.find(x => TANWIN[x])
    const hasVowel = !!short || !!tanwin
    const next = cs[i + 1]

    if (c.marks.some(x => SILENT_MARKS.has(x))) {
      last = null
      return
    }

    // 1. ¿Es una letra de prolongación? (ا ى و ي sin vocal propia, ـٰ, ۥ, ۦ)
    const carrier = CARRIERS[c.base]
    const isCarrier =
      carrier && !hasVowel && !m.has(SUKUN) && !m.has(SHADDA) && !m.has(HAMZA_ABOVE)
    if (isCarrier) {
      const extra = [...items, ...c.marks.filter(x => x === DAGGER_ALIF || x === MADDAH).map(x => MARK_ITEMS[x])]
      if (last && (carrier.includes(last.v) || (m.has(DAGGER_ALIF) && last.v === 'a'))) {
        last.part.text = LONG[last.v]
        last.part.items.push(...extra)
      } else if (m.has(DAGGER_ALIF)) {
        parts.push({ text: 'ā', items: extra })
      }
      last = null
      return
    }

    // 2. Alif wasla: solo suena al empezar a leer la palabra.
    if (c.base === ALIF_WASLA) {
      if (i === 0) parts.push({ text: connected ? '‿' : next?.base === 'ل' ? 'a' : 'i', items: ['wasla'] })
      last = null
      return
    }

    // 3. Consonante
    let cons = CONSONANTS[c.base] ?? ''
    let consItems = items
    if (m.has(HAMZA_ABOVE)) {
      cons = 'ʾ'
      consItems = ['ء']
    }
    if (c.base === 'ة' && !hasVowel) cons = 'h'
    const bare = !hasVowel && !m.has(SUKUN) && !m.has(SHADDA) && !m.has(DAGGER_ALIF)
    if (bare && next?.marks.includes(SHADDA) && c.base !== 'ة') {
      // Letra sin marcas antes de una shadda: se asimila (ٱلرَّحْمَـٰنِ → ar-raḥmān)
      last = null
      return
    }
    if (cons) parts.push({ text: cons, items: consItems })
    // Shadda inicial viene de la asimilación con la palabra anterior: aislada no se dobla.
    if (cons && m.has(SHADDA) && i > 0) parts.push({ text: cons, items: ['shadda'] })

    // 4. Vocal
    if (tanwin) {
      parts.push({ text: TANWIN[tanwin], items: ['tanwin'] })
      // Con last = null, el alif que sigue al tanwin fatḥ (ـًا) queda mudo.
      last = null
    } else if (m.has(DAGGER_ALIF)) {
      parts.push({ text: 'ā', items: short ? [short[1], 'dagger'] : ['dagger'] })
      last = null
    } else if (short) {
      const part = { text: short[0], items: [short[1]] }
      parts.push(part)
      last = { part, v: short[0] }
    } else {
      last = null
    }
  })
  return out
}

export const translitString = (word: string, connected = false) =>
  transliterate(word, connected)
    .flat()
    .map(p => p.text)
    .join('')

// --------------------------------------------------------- formas

const NON_CONNECTORS = new Set(['ا', 'د', 'ذ', 'ر', 'ز', 'و', 'ء', 'ة', 'ى'])

export const connectsForward = (letter: string) => !NON_CONNECTORS.has(letter)

/** Las formas de una letra según su posición, con tatweel (ـ) para que se vean los trazos de unión. */
export function letterForms(letter: string) {
  const fwd = connectsForward(letter)
  return {
    isolated: letter,
    initial: fwd ? letter + TATWEEL : letter,
    medial: fwd ? TATWEEL + letter + TATWEEL : TATWEEL + letter,
    final: TATWEEL + letter,
  }
}

// --------------------------------------------------------- sin harakāt

/** Signos que desaparecen al escribir "sin harakāt" (queda el rasm con sus puntos). */
const STRIP = new RegExp(`[${FATHA}${DAMMA}${KASRA}${FATHATAN}${DAMMATAN}${KASRATAN}${SHADDA}${SUKUN}${MADDAH}${DAGGER_ALIF}${TATWEEL}${SMALL_WAW}${SMALL_YEH}ۖ-ٰۭ]`, 'g')

/** La palabra como se vería sin vocales ni signos: ٱلْحَمْدُ → الحمد. */
export const stripMarks = (word: string) => cleanText(word).replace(STRIP, '').replace(/ٱ/g, 'ا').normalize('NFC')

const VOWELS = [FATHA, KASRA, DAMMA]

/**
 * Misma palabra con otras vocales (mismas letras): los distractores perfectos para
 * aprender a deducir las harakāt. Devuelve hasta `n` variantes distintas del original.
 */
export function vowelVariants(word: string, n = 3): string[] {
  const cs = graphemes(word)
  const slots = cs.map((c, i) => ({ c, i })).filter(({ c }) => c.marks.some(m => VOWELS.includes(m) || m === SUKUN))
  const base = cleanText(word)
  const out = new Set<string>()
  const swap = (marks: string[]) => {
    const v = marks.find(m => VOWELS.includes(m) || m === SUKUN)!
    const others = [...VOWELS, SUKUN].filter(x => x !== v && !(x === SUKUN && marks.includes(SHADDA)))
    const r = others[Math.floor(Math.random() * others.length)]
    return marks.map(m => (m === v ? r : m))
  }
  for (let tries = 0; tries < 40 && out.size < n && slots.length; tries++) {
    const changes = Math.random() < 0.6 || slots.length < 2 ? 1 : 2
    const pickSlots = [...slots].sort(() => Math.random() - 0.5).slice(0, changes).map(s => s.i)
    const text = cs.map((c, i) => (pickSlots.includes(i) ? c.base + swap(c.marks).join('') : c.text)).join('')
    if (text !== base) out.add(text)
  }
  return [...out]
}
