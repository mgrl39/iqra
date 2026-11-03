# Iqra · اقرأ

Web para aprender a leer el Corán en árabe sin transliteración. Cada letra que aprendes **desbloquea palabras reales** de Al-Fátiha y del Juz' Amma. La pista latina desaparece letra a letra según la vas dominando.

**Contenido:** Al-Fátiha, todo el Juz' Amma, Āyat al-Kursī, el final de Al-Baqara, Al-Kahf 1–10, Yā-Sīn, Ar-Raḥmān y Al-Mulk.

**Meta a largo plazo:** leer sin harakāt (sin los signos de encima y debajo). Una palabra cuenta como leída "a pelo" cuando la aciertas sin signos 3 veces seguidas. El lector puede quitar los signos de esas palabras (o de todas).

**Funciones:**
- **Flujo**: una sesión sin fin. Cambia de ejercicio cada 8 preguntas (lectura, oído, sin harakāt, signos, frases, aleyas, repaso), presenta letras nuevas cuando toca y sube la intensidad con temporizador.
- **El Camino**: un mapa de 7 unidades y 103 pasos que incluye las 21 lecciones ordenadas por las palabras que desbloquean. Cada unidad termina con un repaso y un rango que hay que alcanzar, y lleva exámenes jefe, metas de vocabulario, metas sin harakāt y suras enteras (Juz' Amma y grandes suras).
- Examen de salto: con un 95 % saltas hasta cualquier lección. Si no llegas, se perdonan los fallos sueltos y avanzas hasta donde lo dominas.
- 19 juegos, todos abiertos desde el principio. Usan un "frente de juego" que avanza por maestría: cuando todo lo que tienes delante llega a Hierro, entra la siguiente lección. Lo aún no visto lleva su pista, así que se aprende jugando.
  - Sin harakāt: Sin harakāt, Signo perdido, Aleya desnuda, Sin red.
  - Lectura: lectura rápida, Construye, frases de dos palabras, formas, caza de letras, puntos débiles.
  - Oído: Buen oído, Dictado, Ordena la aleya, Completa, Oído fino (pares mínimos).
  - Récords: Maratón, Lluvia, Relámpago, Parejas.
- Avisos sin interrupciones: durante un ejercicio no salta nada; lo ganado se enseña al terminar, y fuera de los ejercicios sale un solo aviso cada vez.
- Retos de aleya verificables: lees cada palabra y ordenas la aleya al oído. La nota da las estrellas de cada sura.
- 5 exámenes de certificación, cronometrados y sin segunda oportunidad: Letras, Palabras, Frases, Aleyas y Qāriʾ.
- Rangos por letra y signo, de Novato a Leyenda (12 en total). Cada acierto suma 1 punto y cada fallo resta 3, pero nunca bajas de rango. Llegar a Maestro exige 2.000 aciertos.
- Rangos de palabra dentro de la colección, 30 títulos de nivel con una curva de XP creciente, 49 logros y misiones diarias.
- Repaso espaciado, lector con karaoke o palabra a palabra, y una guía con el alfabeto, letras solares y lunares, hamza, signos del muṣḥaf, pausas y tajwīd básico.
- Significado de las palabras en español para las 259 más frecuentes (en inglés para el resto).

100 % estática: sin backend. El progreso se guarda en el navegador (se puede exportar e importar en Ajustes).

## Uso

```bash
npm install
npm run dev        # desarrollo en http://localhost:5173
npm test           # tests
npm run build      # genera dist/ (súbelo a GitHub Pages, Netlify, Cloudflare Pages…)
```

## Datos

`src/data/generated/` se genera con `npm run data`:

- `scripts/fetch-quran.ts` descarga el texto uthmani palabra a palabra de la API de quran.com. Para añadir suras, edita `SELECTION`.
- `scripts/build-curriculum.ts` calcula el orden de las lecciones: en cada paso elige la letra o marca que más palabras frecuentes desbloquea.

El audio se reproduce desde audio.qurancdn.com (palabra a palabra) y everyayah.com (aleyas, Mishary Alafasy). Lo ya escuchado queda en caché para usarlo sin conexión.
