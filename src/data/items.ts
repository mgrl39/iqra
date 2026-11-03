import { LETTER_BY_ID, LETTERS } from './letters'
import { MARK_BY_ID, MARKS } from './marks'

/** Todo lo que se puede aprender: letras + marcas. */
export const ALL_ITEMS = [...LETTERS.map(l => l.id), ...MARKS.map(m => m.id)]

export const isMark = (id: string) => id in MARK_BY_ID

export function itemInfo(id: string) {
  const l = LETTER_BY_ID[id]
  if (l) return { id, glyph: l.id, chip: l.id, name: l.name, tr: l.tr, sound: l.sound, isLetter: true }
  const m = MARK_BY_ID[id]
  return { id, glyph: m.sample, chip: m.chip, name: m.name, tr: m.tr, sound: m.sound, isLetter: false }
}

/** Qué hay que saber antes de poder aprender cada item. */
export const PREREQS: Record<string, string[]> = {
  tanwin: ['fatha', 'kasra', 'damma'],
  'ة': ['ت', 'ه'],
  'ى': ['ي', 'ا', 'fatha'],
  madd: ['ا'],
  dagger: ['fatha', 'ا'],
  wasla: ['ا', 'ل'],
  small: ['damma', 'kasra', 'و', 'ي'],
  silent: ['ا', 'sukun'],
  shadda: ['sukun'],
}
