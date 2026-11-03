// Misiones diarias: tres retos al día con recompensa de XP.

export type QuestKind = 'answers' | 'games' | 'ayahs' | 'reviews' | 'combo' | 'xp' | 'lessons' | 'words' | 'naked'

export interface Quest {
  id: string
  kind: QuestKind
  target: number
  icon: string
  text: string
  reward: number
}

const POOL: Quest[] = [
  { id: 'answers-20', kind: 'answers', target: 20, icon: '✅', text: 'Acierta 20 preguntas', reward: 20 },
  { id: 'answers-40', kind: 'answers', target: 40, icon: '✅', text: 'Acierta 40 preguntas', reward: 35 },
  { id: 'games-2', kind: 'games', target: 2, icon: '🎮', text: 'Termina 2 juegos', reward: 20 },
  { id: 'games-4', kind: 'games', target: 4, icon: '🎮', text: 'Termina 4 juegos', reward: 35 },
  { id: 'answers-80', kind: 'answers', target: 80, icon: '✅', text: 'Acierta 80 preguntas', reward: 60 },
  { id: 'games-6', kind: 'games', target: 6, icon: '🎮', text: 'Termina 6 juegos', reward: 55 },
  { id: 'ayahs-1', kind: 'ayahs', target: 1, icon: '🧩', text: 'Haz 1 reto de aleya', reward: 20 },
  { id: 'ayahs-3', kind: 'ayahs', target: 3, icon: '🧩', text: 'Haz 3 retos de aleya', reward: 40 },
  { id: 'reviews-10', kind: 'reviews', target: 10, icon: '🔁', text: 'Haz 10 repasos', reward: 20 },
  { id: 'combo-8', kind: 'combo', target: 8, icon: '⚡', text: 'Combo de 8', reward: 25 },
  { id: 'combo-15', kind: 'combo', target: 15, icon: '⚡', text: 'Combo de 15', reward: 40 },
  { id: 'xp-80', kind: 'xp', target: 80, icon: '💎', text: 'Gana 80 XP', reward: 25 },
  { id: 'lessons-1', kind: 'lessons', target: 1, icon: '📚', text: 'Completa 1 lección', reward: 25 },
  { id: 'naked-3', kind: 'naked', target: 3, icon: '👁️', text: 'Lee 3 palabras nuevas sin harakāt', reward: 40 },
  { id: 'words-5', kind: 'words', target: 5, icon: '📖', text: 'Domina 5 palabras nuevas', reward: 30 },
]

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11)

/** Las tres misiones del día (fijas para cada fecha, de tipos distintos). */
export function questsFor(day: string, allLessonsDone: boolean): Quest[] {
  const pool = POOL.filter(q => !(allLessonsDone && q.kind === 'lessons'))
  const out: Quest[] = []
  let h = hash(day)
  while (out.length < 3) {
    const q = pool[h % pool.length]
    if (!out.some(x => x.kind === q.kind)) out.push(q)
    h = hash(String(h))
  }
  return out
}
