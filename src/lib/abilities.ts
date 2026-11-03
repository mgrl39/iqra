// Qué puedes hacer de verdad en cada punto. Todo se calcula sobre el texto real de la app
// (qué aleyas y suras se pueden leer enteras con lo aprendido); nada es una promesa inventada.
import type { Surah } from '../data/types'
import { cleanText } from './arabic'
import { LESSONS, learnedItems } from './curriculum'
import { QURAN, TOTAL_OCCURRENCES, isReadable, readableCount, readableWords, wordByKey } from './unlock'

export interface Milestone {
  id: string
  lesson: number // lecciones necesarias
  title: string
  why: string
}

const readableWord = (text: string, known: Set<string>) => isReadable(wordByKey(cleanText(text))!.items, known)
const surah = (id: string) => QURAN.surahs.find(s => s.id === id)!

function firstLessonFor(test: (known: Set<string>) => boolean) {
  for (let l = 0; l <= LESSONS.length; l++) if (test(learnedItems(l))) return l
  return LESSONS.length
}
const surahReadable = (s: Surah) => (k: Set<string>) => s.verses.every(v => v.words.every(w => readableWord(w.text, k)))
const ayahReadable = (s: Surah, n: number) => (k: Set<string>) => s.verses.find(v => v.number === n)!.words.every(w => readableWord(w.text, k))

/** Aleyas y suras con peso real en la vida de un musulmán, con el porqué. */
const FAMOUS: Array<{ id: string; title: string; why: string; test: (k: Set<string>) => boolean }> = [
  { id: 'basmala', title: 'La basmala', why: 'بِسْمِ ٱللَّهِ… abre 113 de las 114 suras.', test: ayahReadable(surah('1'), 1) },
  { id: 'hamd', title: 'Al-ḥamdu li-llāh…', why: 'Segunda aleya de la Fātiḥa.', test: ayahReadable(surah('1'), 2) },
  { id: 'iyyaka', title: 'Iyyāka naʿbudu…', why: 'El centro de la Fātiḥa: “Solo a Ti adoramos”.', test: ayahReadable(surah('1'), 5) },
  { id: 'fatiha', title: 'Al-Fātiḥa entera', why: 'Se recita en cada rakʿa de cada oración.', test: surahReadable(surah('1')) },
  { id: 'ikhlas', title: 'Al-Ikhlāṣ entera', why: 'Qul huwa llāhu aḥad: de las más recitadas.', test: surahReadable(surah('112')) },
  { id: 'kawthar', title: 'Al-Kawthar entera', why: 'La sura más corta del Corán.', test: surahReadable(surah('108')) },
  { id: 'asr', title: 'Al-ʿAṣr entera', why: '3 aleyas que resumen el mensaje.', test: surahReadable(surah('103')) },
  { id: 'muawwidhat', title: 'Al-Falaq y An-Nās', why: 'Las dos suras de protección.', test: k => surahReadable(surah('113'))(k) && surahReadable(surah('114'))(k) },
  { id: 'kursi', title: 'Āyat al-Kursī', why: 'La aleya más grande del Corán (2:255).', test: surahReadable(surah('2-255')) },
  { id: 'baqara-end', title: 'Final de Al-Baqara', why: 'Dos aleyas que la tradición recomienda leer cada noche.', test: surahReadable(surah('2-285')) },
  { id: 'mulk', title: 'Al-Mulk entera', why: '30 aleyas, tradicionalmente leída cada noche.', test: surahReadable(surah('67')) },
  { id: 'yasin', title: 'Yā-Sīn entera', why: '83 aleyas; a menudo llamada “el corazón del Corán”.', test: surahReadable(surah('36')) },
]

/** Primeras veces: se calculan del texto (qué palabra/aleya/sura es la primera legible). */
function firsts(): Milestone[] {
  const out: Milestone[] = []
  const verses = QURAN.surahs.flatMap(s => s.verses.map(v => ({ s, v })))
  const allah = wordByKey('ٱللَّهِ')
  for (let l = 1, seen = new Set<string>(); l <= LESSONS.length; l++) {
    const k = learnedItems(l)
    const words = readableWords(k)
    const add = (id: string, title: string, why: string) => !seen.has(id) && (seen.add(id), out.push({ id, lesson: l, title, why }))
    if (words.length) add('first-word', 'Tu primera palabra del Corán', `${words[0].key} · ${words[0].meaning}`)
    if (allah && isReadable(allah.items, k)) add('allah', 'La palabra Allāh', 'ٱللَّهِ: el nombre más repetido del muṣḥaf (unas 2.700 veces).')
    const pct = () => Math.round((100 * readableCount(k)) / TOTAL_OCCURRENCES)
    if (words.length >= 100) add('w100', '100 palabras distintas', `Son las más frecuentes: con ellas lees el ${pct()} % del texto.`)
    if (words.length >= 500) add('w500', '500 palabras distintas', `Con ellas lees el ${pct()} % del texto.`)
    const ayah = verses.find(({ v }) => v.words.every(w => readableWord(w.text, k)))
    if (ayah) add('first-ayah', 'Tu primera aleya entera', `${ayah.s.nameSimple} ${ayah.v.number}: ${ayah.v.words.map(w => cleanText(w.text)).join(' ')}`)
    const sura = QURAN.surahs.find(x => surahReadable(x)(k))
    if (sura) add('first-surah', 'Tu primera sura entera', `${sura.nameSimple} (${sura.verses.length} aleyas), de principio a fin.`)
  }
  return out
}

export const MILESTONES: Milestone[] = [
  ...firsts(),
  ...FAMOUS.map(f => ({ id: f.id, lesson: firstLessonFor(f.test), title: f.title, why: f.why })),
  ...[25, 50, 75, 90].map(p => ({
    id: `pct-${p}`,
    lesson: firstLessonFor(k => readableCount(k) / TOTAL_OCCURRENCES >= p / 100),
    title: `${p} % del texto`,
    why: p === 25 ? '1 de cada 4 palabras que aparecen.' : p === 50 ? 'La mitad de las palabras que aparecen.' : p === 75 ? '3 de cada 4 palabras que aparecen.' : 'Casi todo lo que aparece.',
  })),
].sort((a, b) => a.lesson - b.lesson)

export interface Stats {
  words: number // palabras distintas legibles
  pct: number // % de las apariciones del texto
  ayahs: number // aleyas legibles enteras
  totalAyahs: number
  surahs: number // suras (o fragmentos) legibles enteras
}

const cache = new Map<number, Stats>()
/** Lo que se puede leer con `lessons` lecciones hechas. */
export function statsAt(lessons: number): Stats {
  let st = cache.get(lessons)
  if (st) return st
  const k = learnedItems(lessons)
  const verses = QURAN.surahs.flatMap(s => s.verses)
  st = {
    words: readableWords(k).length,
    pct: Math.round((100 * readableCount(k)) / TOTAL_OCCURRENCES),
    ayahs: verses.filter(v => v.words.every(w => readableWord(w.text, k))).length,
    totalAyahs: verses.length,
    surahs: QURAN.surahs.filter(s => surahReadable(s)(k)).length,
  }
  cache.set(lessons, st)
  return st
}

/** Hitos reales que se desbloquean al llegar a `lessons` (y no antes). */
export const milestonesAt = (lessons: number) => MILESTONES.filter(m => m.lesson === lessons)
/** Hitos entre dos puntos (ambos en lecciones hechas): (from, to]. */
export const milestonesBetween = (from: number, to: number) => MILESTONES.filter(m => m.lesson > from && m.lesson <= to)

/** El siguiente hito real que aún no tienes. */
export const nextMilestone = (lessonsDone: number) => MILESTONES.find(m => m.lesson > lessonsDone) ?? null

/** Lo que esta app NO te da: para que nadie se lleve a engaño. */
export const LIMITS = [
  { icon: '🗣️', text: 'Entender el árabe. Aprendes a leer (descifrar y pronunciar); las glosas son una ayuda, no un curso de idioma.' },
  { icon: '🎓', text: 'Tajwīd perfecto. La app no te oye: para corregir tu recitación necesitas a alguien que te escuche.' },
  { icon: '🧠', text: 'Memorizar suras. Leer no es saber de memoria (aunque ayuda mucho).' },
  { icon: '📖', text: 'Todo el Corán. La app trae Al-Fātiḥa, el Juz’ ʿAmma y suras famosas; las letras y signos son los mismos del muṣḥaf entero.' },
]
