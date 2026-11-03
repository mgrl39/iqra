// Vocales y signos. `sample` muestra el signo sobre una letra de ejemplo.

export interface MarkInfo {
  id: string
  name: string
  sample: string
  chip: string // versión compacta sobre tatweel, para listas
  tr: string
  sound: string
}

export const MARKS: MarkInfo[] = [
  { id: 'fatha', chip: 'ـَ', name: 'fatḥa', sample: 'بَ', tr: 'a', sound: 'Rayita encima: "a" corta. بَ = ba.' },
  { id: 'kasra', chip: 'ـِ', name: 'kasra', sample: 'بِ', tr: 'i', sound: 'Rayita debajo: "i" corta. بِ = bi.' },
  { id: 'damma', chip: 'ـُ', name: 'ḍamma', sample: 'بُ', tr: 'u', sound: 'Pequeña و encima: "u" corta. بُ = bu.' },
  { id: 'sukun', chip: 'ـْ', name: 'sukūn', sample: 'بْ', tr: '—', sound: 'Circulito encima: la letra va sin vocal. أَبْ = ab.' },
  { id: 'shadda', chip: 'ـّ', name: 'shadda', sample: 'بّ', tr: 'bb', sound: 'Como una "w" pequeña encima: la letra se dobla. رَبِّ = rabbi.' },
  { id: 'tanwin', chip: 'ـً', name: 'tanwīn', sample: 'بً', tr: 'an · in · un', sound: 'La vocal doble añade "n" al final: ـً an, ـٍ in, ـٌ un.' },
  { id: 'madd', chip: 'ـٓ', name: 'madda', sample: 'آ', tr: 'ā~', sound: 'Ondita encima: se alarga la vocal un poco más (dos o más tiempos).' },
  { id: 'dagger', chip: 'ـٰ', name: 'alif pequeña', sample: 'بٰ', tr: 'ā', sound: 'Una alif diminuta en vertical: se lee "ā" larga aunque no haya ا. ذَٰلِكَ = dhālika.' },
  { id: 'wasla', chip: 'ٱ', name: 'alif waṣla', sample: 'ٱ', tr: '(a/i)', sound: 'Alif con un rizo encima: no suena en mitad de la frase. Si empiezas por ella: "a" (ante ل) o "i".' },
  { id: 'small', chip: 'ـۥ', name: 'wāw / yāʾ pequeñas', sample: 'هُۥ', tr: 'ū / ī', sound: 'Una و o ي diminuta tras la vocal: la alarga. إِنَّهُۥ = innahū.' },
  { id: 'silent', chip: 'ـ۟', name: 'cero (letra muda)', sample: 'ا۟', tr: '∅', sound: 'Un circulito vacío sobre la letra: esa letra no se pronuncia.' },
]

export const MARK_BY_ID = Object.fromEntries(MARKS.map(m => [m.id, m]))
