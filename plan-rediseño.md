# Plan de rediseño — ÁrbolApp Huila v2

> 21 de agosto de 2026 · rama base `develop`, que avanza mientras se escribe esto
> Lienzo vigente: **`Pantallas v2.dc.html`** — proyecto `b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56`
> Lienzo anterior: `Pantallas v1.dc.html`, conservado como histórico. **Ya no es fuente de verdad.**

## Qué cambió

El rediseño responde a la **guía de branding 2026** y es una inversión completa, no un retoque.

| | v1 (histórico) | v2 (vigente) |
|---|---|---|
| Concepto | Bosque nocturno, árboles como puntos de luz | Papel hoja, luz de día |
| Página | `#0B1512` oscuro | `#F4FDF4` claro |
| Texto | `#E9F4EE` claro sobre oscuro | `#1A1A1A` oscuro sobre claro |
| Primario | Esmeralda `#3DDC97` | Verde Huilense `#008D46` |
| Tinta sobre primario | `#06231A` oscuro | `#FFFFFF` blanco |
| Acento secundario | *no existía* | Naranja Plateño `#F26522` |
| Display | Bricolage Grotesque | **Montserrat** |
| Subtítulos | *no existía como rol* | **Open Sans** |
| Cuerpo | Archivo | **Roboto** |
| Mono | IBM Plex Mono | **Roboto Mono** |
| Juventud en línea | Acento de marca en UI | **Solo filiación, nunca UI** |

**Los cinco estados del árbol cambian de color entero:** al día `#008D46`, por actualizar
`#FFD700`, vencido `#F26522`, muerto `#E31B23`, archivado `#757575`. Siguen siendo cinco
distintos, que es la regla que no se negocia.

### Lo que NO cambió, y por eso este plan es viable

- **Las 44 pantallas son las mismas**, con los mismos identificadores A1–F6. Es un reskin,
  no una re-arquitectura: no hay flujos nuevos ni pantallas retiradas.
- **Escala de espaciado, radios y área táctil: idénticas.** `--space-*`, `--radius-*` y
  `--hit-target:44px` no se tocan.
- **Escala tipográfica idéntica**: tamaños 12/13/15/17/20/26/34/46, interlineados y
  `tracking` iguales. Cambian las familias, no la escala.
- **El catálogo de componentes conserva sus nombres y su API.** `Button`, `Input`,
  `Checkbox`, `Select`, `Switch`, `Radio`, `IconButton`, `Card`, `Badge`, `Tag`,
  `StatusDot`, `Tooltip`, `Dialog`, `Toast`, `Tabs`.

---

## ⚠️ Lo que hay que decidir antes de empezar

**Hay agentes construyendo ahora mismo contra el lienzo muerto.** El árbol de trabajo tiene
la Fase 4 sin commitear —`plant.tsx`, `tree/`, `log/`, `trees.tsx`, `features/planting/`,
`features/growth-log/`, `features/photos/`, una migración— y todo eso se está maquetando
sobre la paleta oscura de v1. Cada hora que pase es trabajo que habrá que rehacer.

Lo mismo con la rama `ui-fidelidad`, que tiene el catálogo portado y el bloque A reconciliado
contra v1 y está sin mezclar.

**Antes de arrancar R1 hay que:** parar o reorientar a los agentes en vuelo, y decidir si la
Fase 4 se termina en v1 y se reskinea después, o se rehace directamente en v2. La segunda es
más barata si la Fase 4 no está cerca de terminar.

### Qué se salva del trabajo previo

| Trabajo | Estado |
|---|---|
| Generador de tokens (`pnpm tokens` → CSS y JSON) | ✅ **intacto**, solo cambian los valores |
| Escalas de espaciado, radios, tipos | ✅ **intactas** |
| Catálogo portado en `ui-fidelidad` (11 componentes) | ✅ **la estructura sirve**; los valores salen de tokens |
| `ScreenHeader` y la ranura `header` de `Screen` | ✅ **intacto** |
| Correcciones estructurales del bloque A | ✅ **intactas**: jerarquía de botones, orden de campos, enlaces en el checkbox, sin confirmación de contraseña |
| Rutas, navegación y textos (`texts.ts`) | ✅ **intactos** |
| Las 7 caras tipográficas empaquetadas | ⛔ **se tiran**: otras cuatro familias |
| Los 50 valores de color | ⛔ **se tiran** |
| Tabla de contraste de `FIDELIDAD-UI.md` | ⛔ **anulada**: se midió sobre superficies oscuras |
| Excepciones de contraste codificadas (D-04, D-09) | ⛔ **hay que rederivar** sobre claro |
| Estilo oscuro del mapa y sprites de marcador | ⛔ **se rehacen**: el mapa ahora es claro |
| Motivo de «puntos de luz» y resplandores | ⛔ **desaparece** |

---

## Cómo se organiza el trabajo

**Fase** = un bloque con una dependencia dura sobre el anterior.
**Ola** = un grupo de tareas **sin dependencias entre sí**, que varios agentes pueden tomar
en paralelo. Las olas dentro de una fase sí van en orden.

**Reglas para todos los agentes:**

1. **El lienzo es `Pantallas v2.dc.html`.** Consultarlo con el MCP `claude_design` antes de
   tocar una pantalla. `Pantallas v1.dc.html` no se abre salvo para comparar.
2. **Ningún valor de color, espaciado o tipografía fuera de `packages/core`.**
3. **No se editan `design-tokens.css` ni `design-tokens.json`**: los emite `pnpm tokens`.
4. **Nunca `fontWeight` junto a `fontFamily`.** En React Native cada peso es una cara propia.
5. Una tarea no está terminada hasta que `typecheck`, `lint` y `format` estén en verde.
6. **Un agente por rama, commits pequeños.** Dentro de una ola nadie toca los archivos de
   otro; si dos tareas se pisan, es que la ola está mal cortada.
7. El protocolo de peticiones al diseño de `PLAN-FIDELIDAD-UI.md` sigue vigente: nivel 1 se
   aplica y se documenta, nivel 2 se redacta como petición, nivel 3 se pregunta.

---

## Resumen de fases y olas

| Fase | Ola | Qué se hace | Agentes |
|---|---|---|---|
| **R1** Fundaciones | **1.1** Tokens | Reescribir `theme.ts` con la paleta 2026: 50 colores, `accent-2` naranja, rampa de marca, efectos y sombras claras. Regenerar CSS y JSON. **Todo lo demás depende de esto.** | **1** |
| | **1.2** Tipografías y esquema | Empaquetar Montserrat, Open Sans, Roboto y Roboto Mono (12 caras) en móvil; `next/font` en web; invertir el esquema de la app: `userInterfaceStyle`, `StatusBar`, splash e ícono adaptativo | **3** |
| | **1.3** Contraste | Medir los 50 tokens sobre las superficies claras, publicar la tabla nueva y fijar qué tokens no pueden llevar texto pequeño | **1** |
| **R2** Catálogo | **2.1** Formularios | `Button`, `IconButton` · `Input`, `DateField`, `StepperField` · `Checkbox`, `Radio`, `Switch`, `Select` | **3** |
| | **2.2** Presentación y feedback | `Card`, `Badge`, `Tag`, `StatusDot` · `Dialog`, `Toast`, `Notice` · `Tabs`, `ChipGroup` | **3** |
| | **2.3** Íconos | Portar `ui_kits/mobile/Icons.jsx`. Desbloquea `IconButton` y las marcas por tono, pendientes desde v1 | **1** |
| **R3** Mapa | **3.1** Estilo y marcadores | Estilo JSON claro del mapa · regenerar los sprites de marcador para fondo claro con los cinco colores nuevos | **2** |
| | **3.2** Superficies sobre el mapa | Búsqueda, chips y leyenda · burbuja de clúster y ficha flotante del árbol | **2** |
| **R4** Móvil | **4.1** Sin sesión | A1–A2 splash y onboarding · A3–A5 acceso y recuperación · A6, A7, A9, A10 verificación, legal y enlaces | **3** |
| | **4.2** Con sesión | B1 mapa · B2 mis árboles y B3 actividad · B4 y B4b perfil y notificaciones | **3** |
| | **4.3** Flujos modales | C1 los cuatro pasos y C1e · C2 detalle y C4 visor · C3 y C3m bitácora y árbol muerto | **3** |
| | **4.4** Estados transversales | F1–F3 vacío, offline y permisos · F4–F6 errores de red, GPS, cámara y perfil | **2** |
| **R5** Web | **5.1** Panel de administración | D1–D2 acceso y tablero · D3–D4 usuarios y moderación · D5–D7 especies, detalle admin y exportación | **3** |
| | **5.2** Mapa público | E1 mapa con ficha · E3 variante incrustable | **2** |
| **R6** Cierre | **6.1** Re-medición | Rehacer `FIDELIDAD-UI.md` contra v2: 44 filas, contraste, catálogo | **1** |
| | **6.2** Validación | Accesibilidad sobre claro · **render real en dispositivo**, que no se ha hecho ni una vez | **2** |

**Pico de paralelismo: 3 agentes.** Total de olas: 15.

---

## Fase R1 · Fundaciones

Nada de lo demás puede empezar hasta que los tokens estén. Es la única fase con un
cuello de botella real.

### Ola 1.1 · Tokens — 1 agente, en solitario

Un solo archivo y una sola fuente de verdad; dos agentes aquí se pisarían en cada línea.

- Reescribir `packages/core/src/theme.ts`: los 50 colores, la rampa de marca nueva
  (`huila-green`, `plateno-orange`, `sun-yellow`, `ripe-red`, `river-blue`, `earth-brown`,
  `leaf-white`, `ink`, `slate-grey`), `accent2` y sus variantes, los cinco estados nuevos.
- Sombras y resplandores claros: `shadow-card` y `shadow-overlay` pasan a tinta al 6–22 %,
  `glow-accent` a verde, `glow-magenta` a naranja.
- `colorByTrackingStatus` con los colores nuevos.
- Regenerar con `pnpm tokens` y comprobar que `design-tokens.css` y `.json` cuadran.
- **No tocar** espaciado, radios ni escala de tipos: son idénticos.

**Verificación:** los 50 tokens coinciden literalmente con `tokens/colors.css` del lienzo.

### Ola 1.2 · Tipografías y esquema — 3 agentes

| Agente | Alcance |
|---|---|
| **A · Fuentes móvil** | `@expo-google-fonts/montserrat` (600/700/800), `open-sans` (400/600/700), `roboto` (400/500/700 + itálica 400), `roboto-mono` (400/500). Reescribir `fontFace` y `appFonts`. **Son 12 caras contra las 7 de hoy: ~1,4 MB.** Importar por subruta, nunca desde la raíz del paquete. |
| **B · Fuentes web** | `next/font/google` con las mismas cuatro familias y `globals.css` componiendo `var(--font-*-face), var(--font-*)` |
| **C · Esquema de la app** | `userInterfaceStyle: 'dark'` → `'light'` en `app.config.js`; `<StatusBar style="light">` → `"dark"`; splash e ícono adaptativo pasan a `#F4FDF4` desde los tokens |

El rol `subhead` (Open Sans) **es nuevo** y hay que añadirlo a la escala de `typography`.

### Ola 1.3 · Contraste — 1 agente

Toda la tabla de contraste que hay hoy se midió sobre superficies oscuras y **no vale**. Con
texto oscuro sobre papel claro, quién pasa y quién no cambia por completo.

- Medir los 50 tokens sobre `surface-page`, `surface-raised`, `surface-card` y
  `surface-overlay` — que ahora son casi el mismo blanco, lo que cambia el problema.
- Prestar atención a los estados: `--state-due` es `#FFD700`, **amarillo puro sobre blanco**,
  que casi con seguridad no llega a AA como texto pequeño. Ese es el caso que va a decidir
  cómo se dibuja la insignia «Por actualizar».
- Publicar la tabla y las reglas antes de que R2 empiece: las excepciones que el catálogo
  tiene codificadas hoy se derivaron sobre oscuro y hay que rehacerlas.

---

## Fase R2 · Catálogo de componentes

Depende de R1 completa. Las tres olas podrían solaparse, pero 2.3 conviene antes de que las
pantallas de R4 empiecen a pedir íconos.

### Ola 2.1 · Formularios — 3 agentes

| Agente | Componentes |
|---|---|
| **A** | `Button` (variantes, escala 32/40/48, ícono a la izquierda), `IconButton` |
| **B** | `Input`/`TextField` con anillo de foco, prefijo y sufijo; `DateField`; `StepperField` |
| **C** | `Checkbox` con enlaces en la etiqueta, `Radio`, `Switch`, `Select` |

**Ojo con `on-accent`:** pasa de tinta oscura a blanco. Todo botón primario cambia el color
de su rótulo, y el par blanco sobre `#008D46` hay que verificarlo, no asumirlo.

### Ola 2.2 · Presentación y feedback — 3 agentes

| Agente | Componentes |
|---|---|
| **A** | `Card`, `Badge`, `Tag`, `StatusDot` |
| **B** | `Dialog`, `Toast`, `Notice` |
| **C** | `Tabs`, `ChipGroup` |

Sobre claro, `Card` ya no se distingue por ser «un paso más claro que la página»: la página
es `#F4FDF4` y la tarjeta blanca. **La separación pasa a ser el borde y la sombra**, y eso
cambia cómo se construye la jerarquía en toda pantalla con tarjetas.

### Ola 2.3 · Íconos — 1 agente

Portar `ui_kits/mobile/Icons.jsx`. Lleva pendiente desde v1 y es lo que impide tener
`IconButton` y las marcas por tono del `Notice`, que hoy son glifos de texto. Decidir si se
añade `react-native-svg` o se generan como componentes.

---

## Fase R3 · Mapa

El cambio de motivo más profundo del rediseño. Depende de R1; puede ir en paralelo con R2.

### Ola 3.1 · Estilo y marcadores — 2 agentes

| Agente | Alcance |
|---|---|
| **A** | Estilo JSON claro para Google Maps, sustituyendo `darkMapStyle` |
| **B** | Regenerar los sprites de marcador con los cinco colores nuevos sobre fondo claro: `scripts/generate-marker-sprites.mjs` y los PNG de `assets/markers/` en ×1, ×2 y ×3 |

Los sprites son bitmaps pregenerados, no vistas. **Un marcador diseñado para brillar sobre
negro desaparece sobre blanco**: hay que rehacer el contorno, no solo el relleno.

### Ola 3.2 · Superficies sobre el mapa — 2 agentes

| Agente | Alcance |
|---|---|
| **A** | Búsqueda, chips de filtro y leyenda: hoy son translúcidos sobre oscuro y el lienzo los pone en blanco al 94 % |
| **B** | Burbuja de clúster y ficha flotante del árbol |

---

## Fase R4 · Pantallas móviles

Depende de R2. Cuatro olas, cortadas para que ningún agente comparta archivos.

**Antes de cada ola conviene decidir, pantalla por pantalla, si se reskinea o se construye
de cero en v2.** Las de la Fase 4 del producto —B2, C1, C2, C3— están a medias contra v1: si
siguen sin terminar, sale más barato rehacerlas ya en v2.

| Ola | Agente A | Agente B | Agente C |
|---|---|---|---|
| **4.1** Sin sesión | A1 splash, A2 onboarding ×3 | A3 acceso, A4 registro, A5 recuperación | A6 verificación, A7 legal, A9 ×3, A10 ×2 |
| **4.2** Con sesión | B1 mapa | B2 mis árboles, B3 actividad | B4 perfil, B4b notificaciones |
| **4.3** Modales | C1 pasos 1–4 y C1e | C2 detalle, C4 visor | C3 bitácora, C3m árbol muerto |
| **4.4** Transversales | F1 vacío, F2 offline, F3 ubicación | F4 red y sesión, F5 GPS y cámara, F6 perfil | — |

**Dos topes que el rediseño no levanta**, y que conviene no volver a descubrir tarde:

- **A1** necesita el logotipo definitivo. La guía de branding 2026 existe, así que puede que
  ya esté disponible: comprobarlo antes de dar la pantalla por bloqueada.
- **A2** necesita las fotografías de campo del PRAE.

---

## Fase R5 · Web

Depende de R1 y R2. **`apps/web` sigue siendo la plantilla de `create-next-app`**: aquí no
hay reskin, se construye de cero directamente en v2, que es la única ventaja de haber llegado
tarde.

| Ola | Agente A | Agente B | Agente C |
|---|---|---|---|
| **5.1** Panel | D1 acceso, D2 tablero | D3 usuarios, D4 moderación | D5 especies, D6 detalle admin, D7 exportación |
| **5.2** Mapa público | E1 mapa con ficha | E3 variante incrustable | — |

---

## Fase R6 · Cierre

### Ola 6.1 · Re-medición — 1 agente

Rehacer `FIDELIDAD-UI.md` entero contra v2: las 44 filas, la tabla de contraste nueva, el
estado del catálogo. El documento actual mide contra un lienzo que ya no existe y **cada
cifra que contiene es engañosa hasta que se rehaga**.

### Ola 6.2 · Validación — 2 agentes

| Agente | Alcance |
|---|---|
| **A** | Accesibilidad sobre claro: áreas táctiles, etiquetas, lectores de pantalla, y que ningún token prohibido lleve texto pequeño |
| **B** | **Levantar la app y mirarla.** Android e iOS, y `next build` servido |

El segundo no es un trámite. En todo el trabajo de fidelidad hecho hasta hoy —cuatro fases,
decenas de cambios visuales— **no se ha renderizado la aplicación ni una sola vez**. Un
rediseño que invierte el esquema de color entero no se puede dar por bueno sin verlo.
