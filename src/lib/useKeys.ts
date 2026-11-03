import { useEffect, useRef } from 'react'

/** Atajos de teclado: { '1': fn, Enter: fn, Backspace: fn, … }. Ignora si se escribe en un input. */
export function useKeys(map: Record<string, () => void>) {
  const ref = useRef(map)
  ref.current = map
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      const fn = ref.current[e.key]
      if (fn) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
