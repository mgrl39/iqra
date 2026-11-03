// Descarga el texto uthmani palabra por palabra desde la API pública de quran.com
// y lo guarda en src/data/generated/quran.json. Se ejecuta en build, no en el navegador.
import { mkdirSync, writeFileSync } from 'node:fs'
import type { Quran, Surah } from '../src/data/types'

// Qué se descarga: suras completas o fragmentos famosos (from/to = aleyas).
interface Selection {
  n: number
  from?: number
  to?: number
  title?: string // nombre del fragmento, si no es la sura entera
}
const SELECTION: Selection[] = [
  { n: 1 },
  { n: 2, from: 255, to: 255, title: 'Āyat al-Kursī' },
  { n: 2, from: 285, to: 286, title: 'Final de Al-Baqara' },
  { n: 18, from: 1, to: 10, title: 'Al-Kahf (1–10)' },
  { n: 36 },
  { n: 55 },
  { n: 67 },
  // Juz' 'Amma completo (78–114)
  ...Array.from({ length: 37 }, (_, i) => ({ n: 78 + i })),
]
const API = 'https://api.quran.com/api/v4'
const TRANSLATION_ES = 83 // Sheikh Isa García
const RECITER = 7 // Mishary Alafasy (murattal), con tiempos por palabra

async function get(url: string) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res.json()
    if (attempt === 3) throw new Error(`${res.status} ${url}`)
    await new Promise(r => setTimeout(r, 1000 * attempt))
  }
}

const stripHtml = (s: string) => s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').trim()

async function fetchSurah({ n, from, to, title }: Selection): Promise<Surah> {
  const { chapter } = await get(`${API}/chapters/${n}?language=es`)
  const all: any[] = (
    await get(`${API}/verses/by_chapter/${n}?words=true&word_fields=text_uthmani&translations=${TRANSLATION_ES}&per_page=300`)
  ).verses
  const verses = all.filter(v => (!from || v.verse_number >= from) && (!to || v.verse_number <= to))
  // Tiempos de cada palabra dentro del audio de la sura completa (para el modo karaoke).
  const recitation = (await get(`https://api.qurancdn.com/api/qdc/audio/reciters/${RECITER}/audio_files?chapter=${n}&segments=true`)).audio_files[0]
  const timings = new Map<string, number[][]>(recitation.verse_timings.map((t: any) => [t.verse_key, t.segments.filter((x: number[]) => x.length === 3)]))
  const pad = (x: number) => String(x).padStart(3, '0')
  return {
    id: from ? `${n}-${from}` : String(n),
    number: n,
    nameArabic: chapter.name_arabic,
    nameSimple: title ?? chapter.name_simple,
    nameEs: title ? `${chapter.name_simple} ${from}${to !== from ? `–${to}` : ''}` : chapter.translated_name.name,
    partial: !!from,
    audio: recitation.audio_url,
    verses: verses.map((v: any) => ({
      number: v.verse_number,
      es: stripHtml(v.translations?.[0]?.text ?? ''),
      // [posición de la palabra, inicio ms, fin ms]
      t: timings.get(v.verse_key) ?? [],
      words: v.words
        .filter((w: any) => w.char_type_name === 'word')
        .map((w: any) => ({
          text: w.text_uthmani,
          en: w.translation?.text ?? '',
          // OJO: el audio_url de la API se desplaza tras los signos de pausa;
          // el archivo correcto es el de la posición de la palabra.
          audio: `wbw/${pad(n)}_${pad(v.verse_number)}_${pad(w.position)}.mp3`,
        })),
    })),
  }
}

const surahs: Surah[] = []
for (const sel of SELECTION) {
  process.stdout.write(`${sel.n}${sel.from ? `:${sel.from}` : ''}… `)
  surahs.push(await fetchSurah(sel))
}
const quran: Quran = { surahs }
mkdirSync('src/data/generated', { recursive: true })
writeFileSync('src/data/generated/quran.json', JSON.stringify(quran))
console.log(`\n${surahs.length} suras guardadas.`)
