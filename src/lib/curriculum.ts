import curriculumJson from '../data/generated/curriculum.json'
import type { Curriculum } from '../data/types'

export const CURRICULUM = curriculumJson as Curriculum
export const LESSONS = CURRICULUM.lessons

/** Items aprendidos tras completar las primeras `lessonsDone` lecciones. */
export function learnedItems(lessonsDone: number): Set<string> {
  return new Set(LESSONS.slice(0, lessonsDone).flatMap(l => l.items))
}

export const lessonOfItem = (item: string) => LESSONS.findIndex(l => l.items.includes(item))
