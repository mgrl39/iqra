// Las letras (y las tres formas especiales ء ة ى) con pistas de pronunciación para hispanohablantes.

export interface LetterInfo {
  id: string
  name: string
  nameAr: string
  tr: string
  sound: string
}

export const LETTERS: LetterInfo[] = [
  { id: 'ا', name: 'alif', nameAr: 'ألف', tr: 'ā', sound: 'Sin sonido propio: alarga la "a" anterior (ā) o sirve de soporte a la hamza.' },
  { id: 'ب', name: 'bāʾ', nameAr: 'باء', tr: 'b', sound: 'Como la "b" española de "barco". Un punto debajo.' },
  { id: 'ت', name: 'tāʾ', nameAr: 'تاء', tr: 't', sound: 'Como la "t" española. Dos puntos encima.' },
  { id: 'ث', name: 'thāʾ', nameAr: 'ثاء', tr: 'th', sound: 'Como la "z" de España en "zapato". Tres puntos encima.' },
  { id: 'ج', name: 'ŷīm', nameAr: 'جيم', tr: 'ŷ', sound: 'Como "dy" o la "y" fuerte de "yo" (inglés "jam"). Punto en el vientre.' },
  { id: 'ح', name: 'ḥāʾ', nameAr: 'حاء', tr: 'ḥ', sound: 'Una "h" soplada desde la garganta, como cuando empañas un cristal. Sin puntos.' },
  { id: 'خ', name: 'jāʾ', nameAr: 'خاء', tr: 'j', sound: 'Como la "j" española de "jamón". Punto encima.' },
  { id: 'د', name: 'dāl', nameAr: 'دال', tr: 'd', sound: 'Como la "d" de "dedo". No se une a la letra siguiente.' },
  { id: 'ذ', name: 'dhāl', nameAr: 'ذال', tr: 'dh', sound: 'Como la "d" suave de "nada" (inglés "this"). Un punto encima de د.' },
  { id: 'ر', name: 'rāʾ', nameAr: 'راء', tr: 'r', sound: 'Una "r" vibrante, como en "pero". No se une a la siguiente.' },
  { id: 'ز', name: 'zāy', nameAr: 'زاي', tr: 'z', sound: 'Una "s" sonora, como el zumbido de una abeja (inglés "zoo"). ر con punto.' },
  { id: 'س', name: 'sīn', nameAr: 'سين', tr: 's', sound: 'Como la "s" de "sol". Tres dientecitos.' },
  { id: 'ش', name: 'shīn', nameAr: 'شين', tr: 'sh', sound: 'Como "sh" para pedir silencio. س con tres puntos.' },
  { id: 'ص', name: 'ṣād', nameAr: 'صاد', tr: 'ṣ', sound: 'Una "s" enfática: la lengua baja y la boca más hueca.' },
  { id: 'ض', name: 'ḍād', nameAr: 'ضاد', tr: 'ḍ', sound: 'Una "d" enfática y profunda. ص con punto.' },
  { id: 'ط', name: 'ṭāʾ', nameAr: 'طاء', tr: 'ṭ', sound: 'Una "t" enfática, con la boca hueca.' },
  { id: 'ظ', name: 'ẓāʾ', nameAr: 'ظاء', tr: 'ẓ', sound: 'Una "dh" enfática. ط con punto.' },
  { id: 'ع', name: 'ʿayn', nameAr: 'عين', tr: 'ʿ', sound: 'Se aprieta la garganta, como un pequeño "aa" estrangulado. No existe en español: escúchala.' },
  { id: 'غ', name: 'ghayn', nameAr: 'غين', tr: 'gh', sound: 'Como la "r" francesa o una "g" gargareada. ع con punto.' },
  { id: 'ف', name: 'fāʾ', nameAr: 'فاء', tr: 'f', sound: 'Como la "f" española. Un punto encima.' },
  { id: 'ق', name: 'qāf', nameAr: 'قاف', tr: 'q', sound: 'Una "k" muy atrás, en la campanilla. Dos puntos encima.' },
  { id: 'ك', name: 'kāf', nameAr: 'كاف', tr: 'k', sound: 'Como la "k" de "kilo".' },
  { id: 'ل', name: 'lām', nameAr: 'لام', tr: 'l', sound: 'Como la "l" de "luna".' },
  { id: 'م', name: 'mīm', nameAr: 'ميم', tr: 'm', sound: 'Como la "m" de "mamá".' },
  { id: 'ن', name: 'nūn', nameAr: 'نون', tr: 'n', sound: 'Como la "n" de "nube". Un punto encima.' },
  { id: 'ه', name: 'hāʾ', nameAr: 'هاء', tr: 'h', sound: 'Una "h" aspirada suave, como en inglés "house". En español no hay.' },
  { id: 'و', name: 'wāw', nameAr: 'واو', tr: 'w', sound: 'Como la "u" de "huevo" (w). Tras ḍamma alarga la "u" (ū).' },
  { id: 'ي', name: 'yāʾ', nameAr: 'ياء', tr: 'y', sound: 'Como la "y" de "yate". Tras kasra alarga la "i" (ī).' },
  { id: 'ء', name: 'hamza', nameAr: 'همزة', tr: 'ʾ', sound: 'Un corte de voz, como el que hay en "uh-oh". Puede ir sola o sobre ا و ي.' },
  { id: 'ة', name: 'tāʾ marbūṭa', nameAr: 'تاء مربوطة', tr: 't / h', sound: 'Solo al final de palabra. Se lee "t" si sigue vocal y "h" al pararse.' },
  { id: 'ى', name: 'alif maqṣūra', nameAr: 'ألف مقصورة', tr: 'ā', sound: 'Parece una ي sin puntos y al final de palabra alarga la "a" (ā).' },
]

export const LETTER_BY_ID = Object.fromEntries(LETTERS.map(l => [l.id, l]))

/** Truco visual para recordar cada letra. */
export const LETTER_TIPS: Record<string, string> = {
  'ا': 'Un palo vertical, como un "1". Es la letra más fácil.',
  'ب': 'Una barca con UN pasajero debajo (b de "bajo").',
  'ت': 'La misma barca con DOS puntos encima, como dos ojos: t.',
  'ث': 'La barca con TRES puntos encima: th (tres → th).',
  'ج': 'Un gancho con el punto DENTRO de la panza.',
  'ح': 'El mismo gancho sin puntos: solo aire desde la garganta.',
  'خ': 'El gancho con el punto ENCIMA: la jota.',
  'د': 'Un codo pequeño, como un "د" que se apoya. Nunca se une a la siguiente.',
  'ذ': 'El codo de د con un punto encima.',
  'ر': 'Una coma grande que baja por debajo de la línea.',
  'ز': 'La coma de ر con un punto encima.',
  'س': 'Tres dientecitos: s de "sierra".',
  'ش': 'Los tres dientes con tres puntos encima (sh, sh, sh).',
  'ص': 'Un óvalo alargado tumbado con un dientecito.',
  'ض': 'El óvalo de ص con un punto encima.',
  'ط': 'El óvalo con un palo vertical: como una maleta con asa.',
  'ظ': 'La maleta ط con un punto.',
  'ع': 'Como un "3" al revés o una "c" con cola.',
  'غ': 'La ع con un punto encima.',
  'ف': 'Un circulito con UN punto encima.',
  'ق': 'Un circulito con DOS puntos y una cola más honda que la ف.',
  'ك': 'Una esquina con una pequeña "s" dentro (una hamza pequeña).',
  'ل': 'Como un anzuelo: un palo alto que acaba en curva.',
  'م': 'Una bolita con cola hacia abajo.',
  'ن': 'Un cuenco con un punto encima.',
  'ه': 'Cambia mucho de forma: suelta parece un circulito, en medio unas "gafas" (ـهـ).',
  'و': 'Una bolita con cola, como un "9" inclinado.',
  'ي': 'Una barca ondulada con dos puntos DEBAJO.',
  'ء': 'Una "c" pequeñita flotando. Puede ir sola o sentada sobre ا و ي.',
  'ة': 'Una ه con dos puntos encima. Solo al final.',
  'ى': 'Una ي sin puntos al final de palabra.',
}

/** Letras sueltas del Corán (muqaṭṭaʿāt): el nombre de la letra recitado. */
export interface Muqattaat {
  text: string
  tr: string
  audio: string
  ref: string
}
const M = (text: string, tr: string, ref: string): Muqattaat => {
  const [s, a] = ref.split(':').map(Number)
  return { text, tr, ref, audio: `wbw/${String(s).padStart(3, '0')}_${String(a).padStart(3, '0')}_001.mp3` }
}
const NUN = M('نٓ', 'nūn', '68:1')
const QAF = M('قٓ', 'qāf', '50:1')
const SAD = M('صٓ', 'ṣād', '38:1')
const TAHA = M('طه', 'ṭā hā', '20:1')
const YASIN = M('يسٓ', 'yā sīn', '36:1')
const HAMIM = M('حمٓ', 'ḥā mīm', '40:1')
const AIN = M('عٓسٓقٓ', 'ʿayn sīn qāf', '42:2')
const KAF = M('كٓهيعٓصٓ', 'kāf hā yā ʿayn ṣād', '19:1')
const ALM = M('الٓمٓ', 'alif lām mīm', '2:1')
const ALR = M('الٓر', 'alif lām rā', '10:1')

export const MUQATTAAT: Record<string, Muqattaat> = {
  'ن': NUN, 'ق': QAF, 'ص': SAD, 'ط': TAHA, 'ه': TAHA, 'ي': YASIN, 'س': YASIN,
  'ح': HAMIM, 'م': ALM, 'ع': AIN, 'ك': KAF, 'ا': ALM, 'ل': ALM, 'ر': ALR,
}

/** Familias de letras que comparten forma y solo cambian los puntos. */
export const FAMILIES: string[][] = [
  ['ب', 'ت', 'ث', 'ن', 'ي'],
  ['ج', 'ح', 'خ'],
  ['د', 'ذ'],
  ['ر', 'ز'],
  ['س', 'ش'],
  ['ص', 'ض'],
  ['ط', 'ظ'],
  ['ع', 'غ'],
  ['ف', 'ق'],
  ['ه', 'ة'],
  ['ا', 'ل', 'ك', 'م', 'و', 'ء', 'ى'],
]
export const familyOf = (l: string) => FAMILIES.find(f => f.includes(l)) ?? [l]
