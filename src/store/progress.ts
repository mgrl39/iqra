import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LESSONS } from '../lib/curriculum'
import { newCard, schedule, type SrsCard } from '../lib/srs'
import { NAKED_MASTERED, TIERS, WORD_MASTERED, nextPoints } from '../lib/mastery'
import type { Quest, QuestKind } from '../lib/quests'

export const MASTERED = 0.7
export type TranslitMode = 'auto' | 'always' | 'never'
export type Theme = 'black' | 'light'
/** Harakāt en el lector: todas, quitar las de palabras que ya lees sin ellas, o ninguna. */
export type MarksMode = 'all' | 'auto' | 'none'

export interface WordStat {
  s: number // racha de aciertos
  m?: number // fecha en que entró en la colección
  c?: number // aciertos totales
  ns?: number // racha leyéndola sin harakāt
  nm?: number // fecha en que la lees sin harakāt (3 seguidas)
}

export interface ExamRecord {
  best: number // mejor nota (%)
  attempts: number
  passed?: number // fecha del primer aprobado
}

interface Data {
  lessonsDone: number
  mastery: Record<string, number> // 0..1, solo para desvanecer la pista
  points: Record<string, number> // puntos de rango por letra/signo
  srs: Record<string, SrsCard> // "i:<item>" | "w:<palabra>"
  xp: number
  streak: number
  lastDay: string
  todayXp: number
  dailyGoal: number
  translit: TranslitMode
  marks: MarksMode
  sound: boolean
  theme: Theme
  seenIntro: boolean
  history: Record<string, number> // XP por día
  achievements: Record<string, number> // id → fecha de desbloqueo
  confusions: Record<string, number> // "correcta|elegida" → veces
  ayahScores: Record<string, number> // "sura:aleya" → mejor nota del reto (0-100)
  exams: Record<string, ExamRecord>
  bestCombo: number
  reviewsDone: number
  perfectQuizzes: number
  wordStats: Record<string, WordStat>
  highScores: Record<string, number>
  quest: { day: string; counts: Partial<Record<QuestKind, number>>; claimed: string[] }
  questsClaimed: number
  placementDone: boolean
  gamesPlayed: number
  goalsClaimed: Record<string, number> // hitos de progreso ya cobrados por serie
  journey: Record<string, number> // nodos del Camino: mejor nota o 100 si se saltaron
  journeyInit: boolean
}

interface Actions {
  completeLesson: (index: number) => void
  answer: (items: string[], correct: boolean) => void
  gainXp: (n: number) => void
  reviewCard: (key: string, correct: boolean) => void
  addCards: (keys: string[]) => void
  recordConfusion: (answer: string, chosen: string) => void
  recordQuiz: (correct: number, total: number, bestCombo: number) => void
  recordAyah: (key: string, score: number) => void
  recordExam: (id: string, score: number, passed: boolean) => boolean
  unlock: (id: string) => void
  setSound: (on: boolean) => void
  setTheme: (t: Theme) => void
  setSeenIntro: () => void
  wordHit: (key: string, correct: boolean) => void
  nakedHit: (key: string, correct: boolean) => void
  setMarks: (m: MarksMode) => void
  boostItems: (items: string[], min: number) => void
  setHighScore: (game: string, score: number) => boolean
  bump: (kind: QuestKind, n?: number) => void
  claimQuest: (q: Quest) => void
  gameFinished: () => void
  setPlacementDone: () => void
  claimGoal: (id: string, count: number, xp: number) => void
  setJourney: (ids: string[], value: number) => void
  setJourneyInit: () => void
  setTranslit: (m: TranslitMode) => void
  setDailyGoal: (n: number) => void
  importData: (d: Partial<Data>) => void
  reset: () => void
}

const initial: Data = {
  lessonsDone: 0,
  mastery: {},
  points: {},
  srs: {},
  xp: 0,
  streak: 0,
  lastDay: '',
  todayXp: 0,
  dailyGoal: 60,
  translit: 'auto',
  marks: 'auto',
  sound: true,
  theme: 'black',
  seenIntro: false,
  history: {},
  achievements: {},
  confusions: {},
  ayahScores: {},
  exams: {},
  bestCombo: 0,
  reviewsDone: 0,
  perfectQuizzes: 0,
  wordStats: {},
  highScores: {},
  quest: { day: '', counts: {}, claimed: [] },
  questsClaimed: 0,
  placementDone: false,
  gamesPlayed: 0,
  goalsClaimed: {},
  journey: {},
  journeyInit: false,
}

export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const yesterdayKey = () => dayKey(new Date(Date.now() - 86_400_000))

/** Suma al contador de misiones de hoy (el combo guarda el máximo). */
function questPatch(q: Data['quest'], kind: QuestKind, n: number): Data['quest'] {
  const today = dayKey()
  const base = q.day === today ? q : { day: today, counts: {}, claimed: [] }
  const prev = base.counts[kind] ?? 0
  return { ...base, counts: { ...base.counts, [kind]: kind === 'combo' ? Math.max(prev, n) : prev + n } }
}

export const useProgress = create<Data & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      completeLesson: index => {
        const lesson = LESSONS[index]
        const { lessonsDone, srs } = get()
        const cards = { ...srs }
        for (const it of lesson.items) cards[`i:${it}`] ??= newCard()
        for (const w of lesson.newWords.slice(0, 8)) cards[`w:${w}`] ??= newCard()
        const isNew = index >= lessonsDone
        set({ lessonsDone: Math.max(lessonsDone, index + 1), srs: cards, ...(isNew ? { quest: questPatch(get().quest, 'lessons', 1) } : {}) })
      },

      answer: (items, correct) => {
        const mastery = { ...get().mastery }
        const points = { ...get().points }
        for (const it of new Set(items)) {
          const m = mastery[it] ?? 0
          mastery[it] = correct ? m + (1 - m) * 0.2 : m * 0.75
          points[it] = nextPoints(points[it] ?? 0, correct)
        }
        set({ mastery, points, ...(correct ? { quest: questPatch(get().quest, 'answers', 1) } : {}) })
      },

      gainXp: n => {
        const today = dayKey()
        const s = get()
        const patch: Partial<Data> = {}
        if (s.lastDay !== today) {
          patch.streak = s.lastDay === yesterdayKey() ? s.streak + 1 : 1
          patch.todayXp = 0
          patch.lastDay = today
        }
        const history = { ...s.history, [today]: (s.history[today] ?? 0) + n }
        set({ ...patch, history, xp: s.xp + n, todayXp: (patch.todayXp ?? s.todayXp) + n, quest: questPatch(s.quest, 'xp', n) })
      },

      reviewCard: (key, correct) =>
        set({
          srs: { ...get().srs, [key]: schedule(get().srs[key], correct) },
          reviewsDone: get().reviewsDone + 1,
          quest: questPatch(get().quest, 'reviews', 1),
        }),

      recordConfusion: (answer, chosen) => {
        const k = `${answer}|${chosen}`
        set({ confusions: { ...get().confusions, [k]: (get().confusions[k] ?? 0) + 1 } })
      },

      recordQuiz: (correct, total, combo) => {
        const s = get()
        set({
          quest: questPatch(s.quest, 'combo', combo),
          bestCombo: Math.max(s.bestCombo, combo),
          perfectQuizzes: s.perfectQuizzes + (total >= 5 && correct === total ? 1 : 0),
        })
      },

      recordAyah: (key, score) =>
        set({ ayahScores: { ...get().ayahScores, [key]: Math.max(score, get().ayahScores[key] ?? 0) }, quest: questPatch(get().quest, 'ayahs', 1) }),

      recordExam: (id, score, passed) => {
        const prev = get().exams[id] ?? { best: 0, attempts: 0 }
        const first = passed && !prev.passed
        set({ exams: { ...get().exams, [id]: { best: Math.max(prev.best, score), attempts: prev.attempts + 1, passed: prev.passed ?? (passed ? Date.now() : undefined) } } })
        return first
      },

      wordHit: (key, correct) => {
        const s = get()
        const prev = s.wordStats[key] ?? { s: 0 }
        const streak = correct ? prev.s + 1 : 0
        const newlyMastered = !prev.m && streak >= WORD_MASTERED
        set({
          wordStats: { ...s.wordStats, [key]: { ...prev, s: streak, m: prev.m ?? (newlyMastered ? Date.now() : undefined), c: (prev.c ?? 0) + (correct ? 1 : 0) } },
          ...(newlyMastered ? { quest: questPatch(s.quest, 'words', 1) } : {}),
        })
      },

      nakedHit: (key, correct) => {
        const s = get()
        const prev = s.wordStats[key] ?? { s: 0 }
        const ns = correct ? (prev.ns ?? 0) + 1 : 0
        const fresh = !prev.nm && ns >= NAKED_MASTERED
        set({
          wordStats: { ...s.wordStats, [key]: { ...prev, ns, nm: prev.nm ?? (fresh ? Date.now() : undefined) } },
          ...(fresh ? { quest: questPatch(s.quest, 'naked', 1) } : {}),
        })
      },
      setMarks: marks => set({ marks }),

      setHighScore: (game, score) => {
        const best = get().highScores[game] ?? 0
        if (score <= best) return false
        set({ highScores: { ...get().highScores, [game]: score } })
        return true
      },

      bump: (kind, n = 1) => set({ quest: questPatch(get().quest, kind, n) }),

      claimQuest: q => {
        const s = get()
        const quest = questPatch(s.quest, q.kind, 0)
        if (quest.claimed.includes(q.id) || (quest.counts[q.kind] ?? 0) < q.target) return
        set({ quest: { ...quest, claimed: [...quest.claimed, q.id] }, questsClaimed: s.questsClaimed + 1 })
        s.gainXp(q.reward)
      },

      gameFinished: () => set({ gamesPlayed: get().gamesPlayed + 1, quest: questPatch(get().quest, 'games', 1) }),
      setPlacementDone: () => set({ placementDone: true }),
      setJourney: (ids, value) => {
        const journey = { ...get().journey }
        for (const id of ids) journey[id] = Math.max(journey[id] ?? 0, value)
        set({ journey })
      },
      setJourneyInit: () => set({ journeyInit: true }),
      claimGoal: (id, count, xp) => {
        if ((get().goalsClaimed[id] ?? 0) >= count) return
        set({ goalsClaimed: { ...get().goalsClaimed, [id]: count } })
        get().gainXp(xp)
      },
      boostItems: (items, min) => {
        const mastery = { ...get().mastery }
        const points = { ...get().points }
        for (const it of items) {
          mastery[it] = Math.max(mastery[it] ?? 0, min)
          points[it] = Math.max(points[it] ?? 0, TIERS[1].min) // saltarse lecciones da Hierro, no más
        }
        set({ mastery, points })
      },
      unlock: id => set({ achievements: { ...get().achievements, [id]: Date.now() } }),
      setSound: sound => set({ sound }),
      setTheme: theme => set({ theme }),
      setSeenIntro: () => set({ seenIntro: true }),

      addCards: keys => {
        const srs = { ...get().srs }
        for (const k of keys) srs[k] ??= newCard()
        set({ srs })
      },

      setTranslit: translit => set({ translit }),
      setDailyGoal: dailyGoal => set({ dailyGoal }),
      importData: d => set({ ...initial, ...d }),
      reset: () => set(initial),
    }),
    {
      name: 'iqra-progress',
      version: 3,
      // v2: fuera la lectura en voz alta autoevaluada; rangos por puntos (empiezan de cero).
      // v3: fuera el juego de memoria (no enseñaba a leer).
      migrate: (old, version) => {
        const d = { ...(old as Record<string, unknown>) }
        if (version < 2) delete d.ayahsRead
        if (version < 3 && d.highScores) {
          const hs = { ...(d.highScores as Record<string, number>) }
          delete hs.memoria
          d.highScores = hs
        }
        return d as unknown as Data & Actions
      },
    },
  ),
)

/** Racha visible: se pierde si ayer no hubo actividad. */
export function currentStreak(s: Pick<Data, 'streak' | 'lastDay'>) {
  return s.lastDay === dayKey() || s.lastDay === yesterdayKey() ? s.streak : 0
}

/** Progreso de hoy de un tipo de misión. */
export const questCount = (s: Pick<Data, 'quest'>, kind: QuestKind) => (s.quest.day === dayKey() ? s.quest.counts[kind] ?? 0 : 0)
export const questClaimed = (s: Pick<Data, 'quest'>, id: string) => s.quest.day === dayKey() && s.quest.claimed.includes(id)

export const todayXpOf = (s: Pick<Data, 'todayXp' | 'lastDay'>) => (s.lastDay === dayKey() ? s.todayXp : 0)

export const exportData = (): Data => {
  const s = useProgress.getState()
  return Object.fromEntries(Object.keys(initial).map(k => [k, s[k as keyof Data]])) as unknown as Data
}
