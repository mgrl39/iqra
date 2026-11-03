import { create } from 'zustand'

export interface Float {
  id: number
  text: string
  x: number
  y: number
  tone: 'xp' | 'bonus' | 'bad'
}

interface FloatState {
  floats: Float[]
  push: (text: string, tone?: Float['tone']) => void
}

let next = 1
let pointer = { x: 210, y: 360 }
if (typeof window !== 'undefined')
  window.addEventListener('pointerdown', e => (pointer = { x: e.clientX, y: e.clientY }), { passive: true })

/** Números que suben desde el último toque (+XP, multiplicadores…). */
export const useFloats = create<FloatState>()((set, get) => ({
  floats: [],
  push: (text, tone = 'xp') => {
    const id = next++
    set({ floats: [...get().floats, { id, text, tone, x: pointer.x + (Math.random() * 40 - 20), y: pointer.y - 20 }] })
    setTimeout(() => set({ floats: get().floats.filter(f => f.id !== id) }), 1000)
  },
}))

/** Multiplicador de XP según el combo: ×1 → ×3 de 5 en 5 aciertos. */
export const comboMultiplier = (combo: number) => 1 + Math.min(4, Math.floor(combo / 5)) * 0.5

/** Intensidad visual del combo (0-3): activa el resplandor del borde de pantalla. */
export function setHeat(combo: number) {
  document.documentElement.dataset.heat = String(combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1 : 0)
}
