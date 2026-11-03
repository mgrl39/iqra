// Calcula el orden de aprendizaje que desbloquea antes más palabras reales del corpus.
// Algoritmo voraz: en cada paso elige el item (letra o marca) que más acerca palabras
// frecuentes a ser legibles, respetando los prerrequisitos de items.ts.
// Las palabras de Al-Fátiha pesan más: es lo que más se recita.
import { writeFileSync } from 'node:fs'
import { ALL_ITEMS, PREREQS } from '../src/data/items'
import type { Curriculum, Lesson } from '../src/data/types'
import { CORPUS, TOTAL_OCCURRENCES, isReadable, readableCount } from '../src/lib/unlock'

const FIRST_LESSON_SIZE = 3
const LESSON_SIZE = 2
const FATIHA_BONUS = 10

function score(known: Set<string>) {
  let s = 0
  for (const w of CORPUS) {
    let k = 0
    for (const it of w.items) if (known.has(it)) k++
    const f = k / w.items.length
    s += (w.count + (w.inFatiha ? FATIHA_BONUS : 0)) * (f ** 3 + (f === 1 ? 2 : 0))
  }
  return s
}

const known = new Set<string>()
const order: string[] = []
while (order.length < ALL_ITEMS.length) {
  const candidates = ALL_ITEMS.filter(it => !known.has(it) && (PREREQS[it] ?? []).every(p => known.has(p)))
  let best = candidates[0]
  let bestScore = -1
  for (const c of candidates) {
    known.add(c)
    const s = score(known)
    known.delete(c)
    if (s > bestScore) [best, bestScore] = [c, s]
  }
  known.add(best)
  order.push(best)
}

const lessons: Lesson[] = []
const learned = new Set<string>()
for (let i = 0; i < order.length; ) {
  const size = i === 0 ? FIRST_LESSON_SIZE : LESSON_SIZE
  const items = order.slice(i, i + size)
  i += size
  const before = new Set(learned)
  items.forEach(it => learned.add(it))
  const newWords = CORPUS.filter(w => isReadable(w.items, learned) && !isReadable(w.items, before)).map(w => w.key)
  lessons.push({ items, newWords, readable: readableCount(learned) })
}

const curriculum: Curriculum = { totalWords: TOTAL_OCCURRENCES, lessons }
writeFileSync('src/data/generated/curriculum.json', JSON.stringify(curriculum))
lessons.forEach((l, i) =>
  console.log(
    `${String(i + 1).padStart(2)}. ${l.items.join(' ').padEnd(16)} +${String(l.newWords.length).padStart(3)} palabras  ${Math.round((100 * l.readable) / TOTAL_OCCURRENCES)}%  ${l.newWords.slice(0, 4).join(' ')}`,
  ),
)
