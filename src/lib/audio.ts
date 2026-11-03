// Audio de recitación: se descarga una vez, se guarda en Cache Storage y se
// reproduce desde ahí (funciona sin conexión para lo ya escuchado).

const WBW = 'https://audio.qurancdn.com/'
const RECITER = 'Alafasy_128kbps'
const CACHE = 'iqra-audio-v1'
const pad3 = (n: number) => String(n).padStart(3, '0')

export const wordAudioUrl = (path: string) => WBW + path
export const ayahAudioUrl = (surah: number, ayah: number) =>
  `https://everyayah.com/data/${RECITER}/${pad3(surah)}${pad3(ayah)}.mp3`

const objectUrls = new Map<string, string>()
let current: HTMLAudioElement | null = null
let currentDone: (() => void) | null = null

async function resolve(src: string): Promise<string> {
  const hit = objectUrls.get(src)
  if (hit) return hit
  try {
    const cache = await caches.open(CACHE)
    let res = await cache.match(src)
    if (!res) {
      res = await fetch(src)
      if (!res.ok) return src
      await cache.put(src, res.clone())
    }
    const url = URL.createObjectURL(await res.blob())
    objectUrls.set(src, url)
    return url
  } catch {
    return src // sin Cache API (p. ej. http sin TLS): se reproduce directamente
  }
}

let generation = 0

export function stop() {
  generation++
  current?.pause()
  current = null
  currentDone?.()
  currentDone = null
}

/** Reproduce y resuelve al terminar (o al ser interrumpido). */
export async function play(src: string): Promise<void> {
  stop()
  const audio = new Audio(await resolve(src))
  current = audio
  return new Promise(done => {
    currentDone = done
    audio.onended = audio.onerror = () => {
      if (current === audio) current = null
      done()
    }
    audio.play().catch(() => done())
  })
}

export const playWord = (path: string) => (path ? play(wordAudioUrl(path)) : Promise.resolve())
export const playAyah = (surah: number, ayah: number) => play(ayahAudioUrl(surah, ayah))

/** Precarga en segundo plano (por ejemplo, las palabras de una lección). */
export const prefetch = (paths: string[]) => paths.filter(Boolean).forEach(p => void resolve(wordAudioUrl(p)))

/**
 * Karaoke: reproduce un tramo de la recitación completa de la sura (streaming, sin
 * caché) y avisa del tiempo actual para resaltar la palabra que suena.
 * Resuelve al terminar el tramo. Si falla (sin conexión…), devuelve false.
 */
export function playRange(url: string, fromMs: number, toMs: number, onTick: (ms: number) => void): Promise<boolean> {
  stop()
  const audio = new Audio(url)
  audio.preload = 'auto'
  current = audio
  return new Promise(done => {
    let raf = 0
    const finish = (ok: boolean) => {
      cancelAnimationFrame(raf)
      audio.pause()
      if (current === audio) current = null
      done(ok)
    }
    currentDone = () => finish(true)
    const tick = () => {
      const ms = audio.currentTime * 1000
      if (ms >= toMs) return finish(true)
      onTick(ms)
      raf = requestAnimationFrame(tick)
    }
    audio.onerror = () => finish(false)
    audio.onended = () => finish(true)
    audio.onloadedmetadata = () => {
      audio.currentTime = fromMs / 1000
      audio.play().then(() => (raf = requestAnimationFrame(tick)), () => finish(false))
    }
  })
}

/** Varias palabras seguidas (frases); se corta si se para o empieza otro audio. */
export async function playWords(paths: string[]) {
  for (const p of paths) {
    const playing = playWord(p) // play() llama a stop() de forma síncrona
    const mine = generation
    await playing
    await new Promise(r => setTimeout(r, 120))
    if (generation !== mine) return
  }
}
