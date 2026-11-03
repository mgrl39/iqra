import { describe, expect, it } from 'vitest'
import quran from '../data/generated/quran.json'
import type { Quran } from '../data/types'
import { ALL_ITEMS } from '../data/items'
import { cleanText, graphemes, itemsOf, translitString } from './arabic'

const q = quran as Quran
const allWords = q.surahs.flatMap(s => s.verses.flatMap(v => v.words))

describe('transliteración de Al-Fátiha', () => {
  const cases: Array<[string, string]> = [
    ['بِسْمِ', 'bismi'],
    ['ٱللَّهِ', 'allahi'],
    ['ٱلرَّحْمَـٰنِ', 'arraḥmāni'],
    ['ٱلرَّحِيمِ', 'arraḥīmi'],
    ['ٱلْحَمْدُ', 'alḥamdu'],
    ['لِلَّهِ', 'lillahi'],
    ['رَبِّ', 'rabbi'],
    ['ٱلْعَـٰلَمِينَ', 'alʿālamīna'],
    ['مَـٰلِكِ', 'māliki'],
    ['يَوْمِ', 'yawmi'],
    ['ٱلدِّينِ', 'addīni'],
    ['إِيَّاكَ', 'ʾiyyāka'],
    ['نَعْبُدُ', 'naʿbudu'],
    ['ٱهْدِنَا', 'ihdinā'],
    ['ٱلصِّرَٰطَ', 'aṣṣirāṭa'],
    ['ٱلْمُسْتَقِيمَ', 'almustaqīma'],
    ['أَنْعَمْتَ', 'ʾanʿamta'],
    ['عَلَيْهِمْ', 'ʿalayhim'],
    ['غَيْرِ', 'ghayri'],
    ['ٱلْمَغْضُوبِ', 'almaghḍūbi'],
    ['وَلَا', 'walā'],
    ['ٱلضَّآلِّينَ', 'aḍḍāllīna'],
  ]
  for (const [ar, tr] of cases) it(`${ar} → ${tr}`, () => expect(translitString(ar)).toBe(tr))
})

describe('casos especiales', () => {
  it('tanwin fatḥ con alif muda', () => expect(translitString('أَزْوَٰجًۭا')).toBe('ʾazwāŷan'))
  it('wāw pequeña alarga', () => expect(translitString('إِنَّهُۥ')).toBe('ʾinnahū'))
  it('hamza sobre tatweel', () => expect(translitString('بِـَٔايَـٰتِنَا')).toBe('biʾāyātinā'))
  it('wāw con alif pequeña = ā', () => expect(translitString('ٱلزَّكَوٰةَ')).toBe('azzakāta'))
  it('signo de pausa ignorado', () => expect(cleanText('كَلَّا ۖ')).toBe('كَلَّا'))
  it('shadda inicial no se dobla', () => expect(translitString('مُّمَدَّدَةٍۭ')).toBe('mumaddadatin'))
  it('waṣla en mitad de frase se enlaza', () => {
    expect(translitString('ٱلْأَرْضِ', true)).toBe('‿lʾarḍi')
    expect(translitString('ٱلرَّحْمَـٰنِ', true)).toBe('‿rraḥmāni')
    expect(translitString('وَٱلْأَرْضِ', true)).toBe('walʾarḍi')
  })
  it('letra muda', () => expect(translitString('أَنَا۠')).toBe('ʾana'))
})

describe('todo el corpus', () => {
  it('cada palabra produce clústeres y transliteración', () => {
    for (const w of allWords) {
      expect(graphemes(w.text).length, w.text).toBeGreaterThan(0)
      expect(translitString(w.text).length, w.text).toBeGreaterThan(0)
    }
  })
  it('todos los items existen en el temario', () => {
    const known = new Set(ALL_ITEMS)
    for (const w of allWords) for (const it of itemsOf(w.text)) expect(known.has(it), `${it} en ${w.text}`).toBe(true)
  })
})

describe('glosario español', () => {
  it('cada entrada corresponde a una palabra del corpus', async () => {
    const { GLOSSES_ES } = await import('../data/glosses-es')
    const keys = new Set(allWords.map(w => cleanText(w.text).normalize('NFC')))
    const missing = Object.keys(GLOSSES_ES).filter(k => !keys.has(k.normalize('NFC')))
    expect(missing).toEqual([])
  })
})
