import type { Surah, Verse } from '../data/types'
import { playAyah, playRange } from './audio'

/**
 * Recita una aleya con la voz de Alafasy resaltando cada palabra (tiempos de quran.com).
 * Si el audio de la sura no carga, cae al audio de la aleya sin resaltado.
 */
export async function playVerseKaraoke(surah: Surah, v: Verse, onWord: (index: number | null) => void) {
  if (v.t.length && surah.audio) {
    const from = v.t[0][1]
    const to = Math.max(...v.t.map(x => x[2])) + 250
    let last = -1
    const ok = await playRange(surah.audio, from, to, ms => {
      // El recitador a veces repite palabras: se busca el tramo que suena ahora.
      const seg = v.t.find(([, a, b]) => ms >= a && ms < b) ?? [...v.t].reverse().find(([, a]) => ms >= a)
      const i = seg ? seg[0] - 1 : -1
      if (i !== last) {
        last = i
        onWord(i >= 0 ? i : null)
      }
    })
    onWord(null)
    if (ok) return
  }
  await playAyah(surah.number, v.number)
}
