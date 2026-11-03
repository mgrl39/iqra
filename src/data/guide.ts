// Contenido de la Guía: explicaciones cortas con ejemplos reales del corpus.
import { SUKUN } from '../lib/arabic'
import type { CorpusWord } from '../lib/unlock'

export type Block =
  | { p: string }
  | { words: string[] } // palabras exactas del corpus
  | { find: (w: CorpusWord) => boolean; n: number } // búsqueda en el corpus
  | { table: Array<[string, string, string]> } // [glifo, nombre, explicación]
  | { letters: string[]; caption: string }
  | { alphabet: true }

export interface GuideSection {
  id: string
  icon: string
  title: string
  items?: string[] // items del temario relacionados (para "Saber más")
  blocks: Block[]
}

const SUN = ['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن']
const MOON = ['ا', 'ب', 'ج', 'ح', 'خ', 'ع', 'غ', 'ف', 'ق', 'ك', 'م', 'ه', 'و', 'ي']
const QALQALA = ['ق', 'ط', 'ب', 'ج', 'د']

export const GUIDE: GuideSection[] = [
  {
    id: 'alfabeto',
    icon: '🔤',
    title: 'El alfabeto',
    blocks: [{ p: '28 letras. Misma familia = misma forma, distintos puntos.' }, { alphabet: true }],
  },
  {
    id: 'escritura',
    icon: '✍️',
    title: 'La escritura',
    blocks: [
      { p: '← Se lee de derecha a izquierda. Las letras se unen y cambian un poco de forma.' },
      { letters: ['ا', 'د', 'ذ', 'ر', 'ز', 'و'], caption: 'Estas 6 no se unen con la siguiente' },
      { words: ['وَرَبُّكَ', 'ٱلْأَرْضِ', 'ذَٰلِكَ', 'أَدْرَىٰكَ'] },
    ],
  },
  {
    id: 'vocales',
    icon: '🔊',
    title: 'Vocales',
    items: ['fatha', 'kasra', 'damma', 'ا', 'و', 'ي'],
    blocks: [
      { table: [['ـَ', 'fatḥa', 'a'], ['ـِ', 'kasra', 'i'], ['ـُ', 'ḍamma', 'u']] },
      { table: [['ـَا', 'ā', 'fatḥa + ا'], ['ـِي', 'ī', 'kasra + ي'], ['ـُو', 'ū', 'ḍamma + و']] },
      { words: ['مَا', 'فِى', 'يُؤْمِنُونَ', 'قَالَ', 'فِيهَا', 'يَقُولُ'] },
    ],
  },
  {
    id: 'sukun-shadda',
    icon: '⭕',
    title: 'Sukūn y shadda',
    items: ['sukun', 'shadda'],
    blocks: [
      { table: [['ـْ', 'sukūn', 'sin vocal'], ['ـّ', 'shadda', 'letra doble']] },
      { words: ['قُلْ', 'لَمْ', 'هَلْ', 'رَبِّ', 'إِنَّ', 'ثُمَّ'] },
    ],
  },
  {
    id: 'tanwin',
    icon: '➿',
    title: 'Tanwīn',
    items: ['tanwin'],
    blocks: [
      { table: [['ـً', '-an', 'la ا no suena'], ['ـٍ', '-in', ''], ['ـٌ', '-un', '']] },
      { words: ['نَفْسٌۭ', 'شَىْءٍ', 'حِسَابًۭا', 'نَارًۭا'] },
      { p: '⏸ Al parar: -un/-in se callan, -an → ā.' },
    ],
  },
  {
    id: 'al',
    icon: '☀️',
    title: 'ٱلْ · solares y lunares',
    items: ['wasla', 'ل'],
    blocks: [
      { p: 'ٱ solo suena al empezar. En medio se enlaza: بِسْمِ ٱللَّهِ = bismi‿llāh.' },
      { letters: MOON, caption: '🌙 Lunares: la ل suena' },
      { words: ['ٱلْحَمْدُ', 'ٱلْعَـٰلَمِينَ', 'ٱلْمُسْتَقِيمَ', 'ٱلْأَرْضِ'] },
      { letters: SUN, caption: '☀️ Solares: la ل calla y la siguiente se dobla' },
      { words: ['ٱلرَّحْمَـٰنِ', 'ٱلدِّينِ', 'ٱلصِّرَٰطَ', 'ٱلنَّاسِ'] },
    ],
  },
  {
    id: 'hamza',
    icon: 'ء',
    title: 'Hamza',
    items: ['ء'],
    blocks: [
      { p: 'Corte de voz (uh‿oh). El soporte no suena.' },
      { table: [['أ إ', 'sobre alif', 'إ = i'], ['ؤ', 'sobre wāw', ''], ['ئ', 'sobre yāʾ', ''], ['ء', 'sola', '']] },
      { words: ['أَن', 'إِنَّ', 'يُؤْمِنُونَ', 'شَىْءٍ', 'ٱلسَّمَآءِ'] },
    ],
  },
  {
    id: 'finales',
    icon: '🔚',
    title: 'ة y ى',
    items: ['ة', 'ى'],
    blocks: [
      { table: [['ة', 'tāʾ marbūṭa', 't · h al parar'], ['ى', 'alif maqṣūra', 'ā']] },
      { words: ['وَٰحِدَةًۭ', 'فَـٰكِهَةٌۭ', 'عَلَىٰ', 'إِلَىٰ', 'ٱلْكُبْرَىٰ'] },
    ],
  },
  {
    id: 'uthmani',
    icon: '📜',
    title: 'Signos del muṣḥaf',
    items: ['dagger', 'madd', 'small', 'silent'],
    blocks: [
      { table: [
        ['ـٰ', 'alif pequeña', 'ā'],
        ['ـٓ', 'madda', 'alarga 4–6 tiempos'],
        ['ـۥ ـۦ', 'wāw/yāʾ pequeñas', 'ū · ī'],
        ['ـ۟', 'cero', 'no suena'],
        ['ـۢ', 'mīm pequeña', 'n → m'],
        ['ن', 'nūn sin signo', 'nasal / se funde'],
      ] },
      { words: ['ذَٰلِكَ', 'هَـٰذَا', 'ٱلضَّآلِّينَ', 'إِنَّهُۥ', 'كَانُوا۟', 'مِنۢ'] },
    ],
  },
  {
    id: 'pausa',
    icon: '⏸️',
    title: 'Pausas',
    blocks: [
      { table: [
        ['ۘ', 'mīm', 'para siempre'],
        ['ۗ', 'qilā', 'mejor parar'],
        ['ۚ', 'ŷīm', 'como quieras'],
        ['ۖ', 'ṣilā', 'mejor seguir'],
        ['ۛ ۛ', 'tres puntos', 'para en uno solo'],
        ['ۙ', 'lā', 'no pares'],
        ['۩', 'saŷda', 'postración'],
        ['۞', 'ḥizb', 'cuarto de ḥizb'],
      ] },
    ],
  },
  {
    id: 'tajwid',
    icon: '🎵',
    title: 'Tajwīd básico',
    blocks: [
      { table: [['نّ مّ', 'ghunna', 'nasal, 2 tiempos']] },
      { words: ['إِنَّ', 'ثُمَّ', 'جَهَنَّمَ', 'ٱلنَّاسِ'] },
      { table: [['قْ طْ بْ جْ دْ', 'qalqala', 'rebotan']] },
      { find: w => QALQALA.some(l => w.key.includes(l + SUKUN)), n: 4 },
      { table: [['ـٓ', 'madd', '4–6 tiempos']] },
      { words: ['ٱلضَّآلِّينَ', 'جَآءَ', 'شَآءَ', 'ٱلسَّمَآءِ'] },
      { table: [['ن', 'ikhfāʾ', 'n oculta, nasal']] },
      { words: ['أَنتُمْ', 'يَنظُرُونَ', 'كُنتُمْ'] },
    ],
  },
  {
    id: 'consejos',
    icon: '🧭',
    title: 'Trucos',
    blocks: [
      { p: '🗣️ Siempre en voz alta.' },
      { p: '🎤 Karaoke primero, luego léela tú.' },
      { p: '👉 Sigue el texto con el dedo.' },
      { p: '🙈 Intenta antes de mirar la pista.' },
      { p: '🔥 5 minutos cada día > 1 hora el domingo.' },
    ],
  },
]

const BY_ITEM = new Map<string, GuideSection>()
for (const s of GUIDE) for (const it of s.items ?? []) BY_ITEM.set(it, s)

export const guideFor = (item: string) => BY_ITEM.get(item)
