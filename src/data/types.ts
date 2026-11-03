export interface Word {
  text: string // uthmani con harakat
  en: string // significado palabra a palabra (inglés)
  audio: string // ruta relativa en audio.qurancdn.com
}

export interface Verse {
  number: number
  es: string // traducción de la aleya al español
  t: number[][] // [posición, inicio ms, fin ms] de cada palabra en el audio de la sura
  words: Word[]
}

export interface Surah {
  id: string // "36" o "2-255" para fragmentos
  number: number
  partial: boolean
  audio: string // recitación completa de la sura (Alafasy)
  nameArabic: string
  nameSimple: string
  nameEs: string
  verses: Verse[]
}

export interface Quran {
  surahs: Surah[]
}

export interface Lesson {
  items: string[] // ids de letras/marcas nuevas en esta lección
  newWords: string[] // textos de palabras que se desbloquean (las más frecuentes primero)
  readable: number // ocurrencias legibles acumuladas al terminar la lección
}

export interface Curriculum {
  totalWords: number
  lessons: Lesson[]
}
