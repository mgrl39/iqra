// El Camino: todas las lecciones más repasos, rangos, exámenes, vocabulario y suras,
// agrupados en unidades. Fácil de avanzar paso a paso, pero largo: no se termina en un día.
import type { Surah } from '../data/types'
import { ALL_ITEMS, itemInfo } from '../data/items'
import { LETTERS } from '../data/letters'
import { cleanText } from './arabic'
import { LESSONS, learnedItems } from './curriculum'
import { EXAMS } from './exams'
import { AYAH_PASS, TIERS } from './mastery'
import { QURAN, isReadable, wordByKey } from './unlock'
import { FATIHA, nakedCount, nakedSurahFrac } from './naked'

export type NodeKind = 'lesson' | 'review' | 'rank' | 'exam' | 'surah' | 'vocab' | 'naked'

export interface JNode {
  id: string
  kind: NodeKind
  title: string
  sub: string
  glyph: string // lo que se pinta dentro del nodo
  after: number // lecciones que hay que tener hechas para abrirlo
  gate: boolean // si bloquea lo que viene detrás
  lesson?: number
  items?: string[]
  tier?: number // rango mínimo (índice de TIERS) para los nodos de rango
  examId?: string
  surahId?: string
  target?: number
}

export interface Unit {
  n: number
  title: string
  icon: string
  nodes: JNode[]
}

/** Nota mínima de un repaso de unidad. */
export const REVIEW_PASS = 85

const UNIT_INFO: Array<[string, string]> = [
  ['Primeros pasos', '🌱'],
  ['Más letras', '🔤'],
  ['Sílabas y signos', '✍️'],
  ['Casi todo', '⛰️'],
  ['Lector completo', '🏁'],
]
const LESSON_UNITS = [4, 4, 4, 4, 5] // 21 lecciones en 5 unidades (cada fin de unidad coincide con un examen)
const VOCAB_TARGETS = [0, 15, 40, 80, 150]
const BRONZE = 2
const SILVER = 3
const GOLD = 4

const wordsIn = (s: Surah) => s.verses.reduce((n, v) => n + v.words.length, 0)

/** Primera lección con la que una sura se puede leer entera. */
function readableAt(s: Surah) {
  for (let l = 0; l <= LESSONS.length; l++) {
    const known = learnedItems(l)
    if (s.verses.every(v => v.words.every(w => isReadable(wordByKey(cleanText(w.text))!.items, known)))) return l
  }
  return LESSONS.length
}

const surahNode = (s: Surah, after: number, gate: boolean): JNode => ({
  id: `surah-${s.id}`,
  kind: 'surah',
  title: s.nameSimple,
  sub: `${s.verses.length} ${s.verses.length === 1 ? 'aleya' : 'aleyas'} · supera todos sus retos`,
  glyph: s.nameArabic,
  after,
  gate,
  surahId: s.id,
})

const rankNode = (id: string, items: string[], tier: number, after: number, label: string): JNode => ({
  id,
  kind: 'rank',
  title: `${label} a ${TIERS[tier].name}`,
  sub: `${items.length} letras y signos con ${TIERS[tier].min}+ puntos`,
  glyph: TIERS[tier].icon,
  after,
  gate: true,
  items,
  tier,
})

const vocabNode = (target: number, after: number, gate: boolean): JNode => ({
  id: `vocab-${target}`,
  kind: 'vocab',
  title: `${target} palabras`,
  sub: 'Colecciónalas acertando 3 seguidas',
  glyph: '📚',
  after,
  gate,
  target,
})

/** Leer sin harakāt: `target` palabras, o una sura entera si lleva `surahId`. */
const nakedNode = (target: number, after: number, gate: boolean, surah?: Surah): JNode => ({
  id: surah ? `naked-${surah.id}` : `naked-${target}`,
  kind: 'naked',
  title: surah ? `${surah.nameSimple} sin harakāt` : `${target} sin harakāt`,
  sub: surah ? 'Todas sus palabras, sin un signo' : 'Palabras que lees a pelo (3 aciertos seguidos)',
  glyph: '👁️',
  after,
  gate,
  target,
  surahId: surah?.id,
})
// Unidades 2-5: opcionales (para quien quiera adelantarse); en las suras ya son obligatorios.
const NAKED_OPTIONAL = [0, 10, 25, 50, 80]

function build(): Unit[] {
  const units: Unit[] = []
  const fatiha = QURAN.surahs.find(s => s.number === 1)!
  const fatihaAt = readableAt(fatiha)
  let lesson = 0
  LESSON_UNITS.forEach((size, u) => {
    const nodes: JNode[] = []
    const first = lesson
    for (let k = 0; k < size; k++, lesson++) {
      const l = LESSONS[lesson]
      nodes.push({
        id: `lesson-${lesson}`,
        kind: 'lesson',
        title: `Lección ${lesson + 1}`,
        sub: `${l.items.map(it => itemInfo(it).name).join(' · ')}`,
        glyph: l.items.map(it => itemInfo(it).chip).join(' '),
        after: lesson,
        gate: true,
        lesson,
      })
      if (lesson + 1 === fatihaAt) nodes.push(surahNode(fatiha, lesson + 1, false))
    }
    const items = LESSONS.slice(first, lesson).flatMap(l => l.items)
    nodes.push({
      id: `review-${u}`,
      kind: 'review',
      title: 'Repaso de unidad',
      sub: `20 preguntas · ${REVIEW_PASS}% para pasar`,
      glyph: '📝',
      after: lesson,
      gate: true,
      items,
    })
    nodes.push(rankNode(`rank-${u}`, items, BRONZE, lesson, 'Unidad'))
    if (VOCAB_TARGETS[u]) nodes.push(vocabNode(VOCAB_TARGETS[u], lesson, false))
    if (NAKED_OPTIONAL[u]) nodes.push(nakedNode(NAKED_OPTIONAL[u], lesson, false))
    if (u === 4) nodes.push(nakedNode(0, lesson, false, fatiha))
    const exam = EXAMS.find(e => e.minLessons === lesson)
    if (exam)
      nodes.push({ id: `exam-${exam.id}`, kind: 'exam', title: `Jefe: ${exam.name}`, sub: `${exam.count} preguntas · ${exam.pass}%`, glyph: '👑', after: lesson, gate: false, examId: exam.id })
    units.push({ n: u + 1, title: UNIT_INFO[u][0], icon: UNIT_INFO[u][1], nodes })
  })

  // Después del alfabeto: leer suras enteras, de la más corta a la más larga, sin atajos.
  const all = LESSONS.length
  const juz = QURAN.surahs.filter(s => s.number >= 78).sort((a, b) => wordsIn(a) - wordsIn(b))
  const juzNodes: JNode[] = []
  juz.forEach((s, i) => {
    juzNodes.push(surahNode(s, all, true))
    if (i === 4) juzNodes.push(nakedNode(100, all, true))
    if (i === 9) juzNodes.push(vocabNode(250, all, true))
    if (i === 14) juzNodes.push(nakedNode(150, all, true))
    if (i === 22) juzNodes.push(nakedNode(250, all, true))
    if (i === 30) juzNodes.push(nakedNode(350, all, true))
    if (i === 18) juzNodes.push(rankNode('rank-all-silver', ALL_ITEMS, SILVER, all, 'Todo'))
    if (i === 27) juzNodes.push(vocabNode(400, all, true))
  })
  units.push({ n: 6, title: "Juz' Amma", icon: '🌙', nodes: juzNodes })

  const big = QURAN.surahs.filter(s => s.number > 1 && s.number < 78).sort((a, b) => wordsIn(a) - wordsIn(b))
  const bigNodes: JNode[] = [rankNode('rank-letters-gold', LETTERS.map(l => l.id), GOLD, all, 'Letras')]
  big.forEach((s, i) => {
    bigNodes.push(surahNode(s, all, true))
    if (i === 2) bigNodes.push(vocabNode(600, all, true))
    if (i === 1) bigNodes.push(nakedNode(500, all, true))
    if (i === 4) bigNodes.push(nakedNode(700, all, true))
  })
  bigNodes.push(rankNode('rank-all-gold', ALL_ITEMS, GOLD, all, 'Todo'))
  bigNodes.push(vocabNode(1000, all, true))
  bigNodes.push(nakedNode(1000, all, true))
  units.push({ n: 7, title: 'Grandes suras', icon: '🕌', nodes: bigNodes })
  return units
}

export const UNITS = build()
export const NODES = UNITS.flatMap(u => u.nodes)
export const NODE_BY_ID = new Map(NODES.map(n => [n.id, n]))

// ------------------------------------------------------------ estado

export interface JState {
  lessonsDone: number
  points: Record<string, number>
  exams: Record<string, { passed?: number }>
  wordStats: Record<string, { m?: number; nm?: number }>
  ayahScores: Record<string, number>
  journey: Record<string, number>
}

export type NodeStatus = 'done' | 'open' | 'locked'

/** Progreso de un nodo (0..1) y texto corto "x/y". */
export function nodeProgress(n: JNode, s: JState): { frac: number; label: string } {
  switch (n.kind) {
    case 'lesson':
      return { frac: s.lessonsDone > n.lesson! ? 1 : 0, label: '' }
    case 'review': {
      const best = s.journey[n.id] ?? 0
      return { frac: Math.min(1, best / REVIEW_PASS), label: best ? `mejor ${best}%` : '' }
    }
    case 'rank': {
      if (s.journey[n.id]) return { frac: 1, label: 'superado' }
      const min = TIERS[n.tier!].min
      const ok = n.items!.filter(it => (s.points[it] ?? 0) >= min).length
      return { frac: ok / n.items!.length, label: `${ok}/${n.items!.length}` }
    }
    case 'exam': {
      const passed = !!s.exams[n.examId!]?.passed
      return { frac: passed ? 1 : 0, label: passed ? 'aprobado' : '' }
    }
    case 'vocab': {
      const c = Object.values(s.wordStats).filter(w => w.m).length
      return { frac: Math.min(1, c / n.target!), label: `${Math.min(c, n.target!)}/${n.target}` }
    }
    case 'naked': {
      if (n.surahId) {
        const f = nakedSurahFrac(QURAN.surahs.find(x => x.id === n.surahId) ?? FATIHA, s.wordStats)
        return { frac: f, label: `${Math.round(f * 100)}%` }
      }
      const c = nakedCount(s.wordStats)
      return { frac: Math.min(1, c / n.target!), label: `${Math.min(c, n.target!)}/${n.target}` }
    }
    case 'surah': {
      const surah = QURAN.surahs.find(x => x.id === n.surahId)!
      const ok = surah.verses.filter(v => (s.ayahScores[`${surah.id}:${v.number}`] ?? 0) >= AYAH_PASS).length
      return { frac: ok / surah.verses.length, label: `${ok}/${surah.verses.length}` }
    }
  }
}

/** Estado de cada nodo: hecho, abierto o bloqueado (un nodo-puerta sin hacer cierra lo que sigue). */
export function journeyStatus(s: JState): Map<string, NodeStatus> {
  const out = new Map<string, NodeStatus>()
  let blocked = false
  for (const n of NODES) {
    const done = nodeProgress(n, s).frac >= 1
    const st: NodeStatus = done ? 'done' : !blocked && s.lessonsDone >= n.after ? 'open' : 'locked'
    out.set(n.id, st)
    if (n.gate && !done) blocked = true
  }
  return out
}

/** Lo siguiente que toca: el primer nodo-puerta abierto (si no hay, cualquier abierto). */
export function currentNode(s: JState, status = journeyStatus(s)) {
  return NODES.find(n => n.gate && status.get(n.id) === 'open') ?? NODES.find(n => status.get(n.id) === 'open') ?? null
}

/** ¿Se puede empezar la lección `index` (0-based)? */
export const lessonOpen = (index: number, s: JState) => journeyStatus(s).get(`lesson-${index}`) !== 'locked'

/** Repasos y rangos que quedan antes de la lección `lessons` (se dan por hechos al saltar con examen). */
export const gatesBefore = (lessons: number) => NODES.filter(n => /^(review|rank)-\d+$/.test(n.id) && n.after <= lessons).map(n => n.id)

/** Unidades completas (todas sus puertas hechas). */
export function unitsDone(s: JState) {
  const st = journeyStatus(s)
  return UNITS.filter(u => u.nodes.every(n => !n.gate || st.get(n.id) === 'done')).length
}

/** Pantalla a la que lleva un nodo abierto. */
export function nodeRoute(n: JNode) {
  switch (n.kind) {
    case 'lesson': return `/leccion/${n.lesson! + 1}`
    case 'review':
    case 'rank': return `/entrenar/${n.id}`
    case 'exam': return `/examen/${n.examId}`
    case 'surah': return `/leer/${n.surahId}`
    case 'vocab': return '/practicar/lectura-rapida'
    case 'naked': return '/practicar/sin-harakat'
  }
}
