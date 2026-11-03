import { create } from 'zustand'

export interface Toast {
  id: number
  icon: string
  title: string
  text?: string
}

interface ToastState {
  /** El único aviso visible (nunca se apilan). */
  current: Toast | null
  queue: Toast[]
  /** Avisos guardados mientras haces un ejercicio: se enseñan al terminar. */
  held: Toast[]
  quiet: boolean
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: () => void
  setQuiet: (q: boolean) => void
  clearHeld: () => void
}

let next = 1
let timer: ReturnType<typeof setTimeout> | undefined
const SHOW_MS = 2600

/** Varios avisos seguidos se funden en uno: "3 novedades". */
const merge = (ts: Toast[]): Toast =>
  ts.length === 1 ? ts[0] : { id: next++, icon: '✨', title: `${ts.length} novedades`, text: ts.slice(0, 3).map(t => `${t.icon} ${t.title}`).join(' · ') }

export const useToasts = create<ToastState>()((set, get) => {
  const show = () => {
    const { current, queue } = get()
    if (current || !queue.length) return
    set({ current: merge(queue), queue: [] })
    clearTimeout(timer)
    timer = setTimeout(() => get().dismiss(), SHOW_MS)
  }
  return {
    current: null,
    queue: [],
    held: [],
    quiet: false,
    push: t => {
      const toast = { ...t, id: next++ }
      if (get().quiet) return set({ held: [...get().held, toast] })
      set({ queue: [...get().queue, toast] })
      // Pequeña espera para agrupar lo que llega a la vez.
      setTimeout(show, 120)
    },
    dismiss: () => {
      clearTimeout(timer)
      set({ current: null })
      setTimeout(show, 200)
    },
    setQuiet: quiet => {
      const { held } = get()
      if (!quiet && held.length) {
        set({ quiet, held: [], queue: [...get().queue, ...held] })
        setTimeout(show, 300)
      } else set({ quiet })
    },
    clearHeld: () => set({ held: [] }),
  }
})
