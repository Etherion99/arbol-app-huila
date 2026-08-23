# Plan de rediseño — ÁrbolApp Huila v2

> ## ✅ COMPLETADO — 22 de agosto de 2026
>
> Las siete fases R1–R7 aterrizaron en `develop`. **Las 44 pantallas del lienzo v2 tienen
> código** y la capa de tokens coincide al 100 % con el sistema de diseño.
>
> La medición de cierre está en [FIDELIDAD-UI.md](FIDELIDAD-UI.md): fidelidad global
> **≈ 82 / 100**, con la tabla de contraste emitida por `pnpm test:contrast`.
>
> **Lo que quedó fuera, y por qué:**
>
> | Qué | Por qué | Quién lo desbloquea |
> |---|---|---|
> | El logotipo de A1 | La guía de branding 2026 existe solo como fotografía de una página impresa. No hay vector ni marca exportada. | Diseño |
> | Las fotografías de campo de A2 | Contenido del PRAE. El marco las espera. | El PRAE |
> | La sección de pendientes de F2 | Necesita la cola de sincronización offline, que es trabajo de datos y no de pantalla. | [plan.md](plan.md) |
> | Persistencia de B4b | `expo-notifications` no es dependencia del proyecto. | [plan.md](plan.md) |
> | Los tres medallones de A6, A9b y A10b | El kit portado no trae sobre ni enlace roto. PD-08. | Diseño |
> | Las pestañas de A7 | Repartir el articulado es una decisión de contenido legal sobre un borrador. | Producto |
> | La banda de encabezado de E1 y la firma de E3 | Maquetación acotada que la ola 6.2 no alcanzó. | Trabajo pendiente |
> | **Ver la aplicación móvil renderizada** | Ni Android SDK, ni claves de Maps, ni Mac. | El usuario |
>
> **El panel web sí se vio**, servido desde `next build` contra el Supabase local: nueve
> pantallas capturadas y miradas una por una. **La aplicación móvil sigue sin renderizarse
> ni una sola vez.** El detalle de qué se ejecutó, qué se vio y qué comandos tiene que
> disparar el usuario está en el cierre de la ola 7.2, al final de este documento.
>
> Este documento se conserva como registro de cómo se organizó el rediseño. **Ya no dirige
> trabajo.** El protocolo de peticiones al diseño y el registro PD-XX siguen vigentes en
> [PLAN-FIDELIDAD-UI.md](PLAN-FIDELIDAD-UI.md).


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

## Punto de partida

La Fase 4 aterrizó y `ui-fidelidad` se mezcló. El árbol está limpio y **todo lo construido
está en v1**, es decir, todo hay que reskinearlo. La foto exacta:

| Bloque | En el código | Falta construir |
|---|---|---|
| **A** sin sesión | A1–A10, las doce | — |
| **B** con sesión | B1 mapa, B2 mis árboles, B4 perfil | B3 actividad, B4b ajustes |
| **C** modales | C1 registro, C2 detalle, C3 bitácora | C1e éxito, C3m muerto, C4 visor |
| **D** panel web | — | las siete |
| **E** mapa público | — | las dos |
| **F** transversales | parcial, dentro de otras pantallas | las seis como pantalla propia |

**19 de 44 pantallas existen y se reskinean; 25 se construyen ya en v2.** Eso es una ventaja:
lo que no existe no hay que migrarlo, se hace bien a la primera.

El catálogo quedó consolidado: los once componentes portados más `ChipGroup`, `DateField` y
`StepperField` que trajo la Fase 4. **Un solo catálogo, sin duplicados** — el refactor
`b64ee78` resolvió el choque entre `select-field` y `select`, y entre `state-badge` y `badge`.

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
7. **Al cerrar una ola, sus ramas se fusionan a `develop`.** La ola siguiente ramifica
   desde `develop`, nunca desde la rama de la anterior. Encadenar ramas entre olas obliga a
   cada agente a heredar trabajo sin revisar y deja las verificaciones midiendo un árbol
   que nadie aprobó; una ola no está cerrada hasta que está en `develop`.
8. El protocolo de peticiones al diseño de `PLAN-FIDELIDAD-UI.md` sigue vigente: nivel 1 se
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
| **R4** Móvil · reskin | **4.1** Sin sesión | Reskin de A1–A2 · A3–A5 · A6, A7, A9, A10. Las doce existen | **3** |
| | **4.2** Con sesión | Reskin de B1 mapa · B2 mis árboles · B4 perfil | **3** |
| | **4.3** Flujos modales | Reskin de C1 los cuatro pasos · C2 detalle · C3 bitácora | **3** |
| **R5** Móvil · nuevo | **5.1** Lo que falta con sesión | Construir en v2: B3 actividad · B4b ajustes de notificaciones | **2** |
| | **5.2** Modales que faltan | Construir en v2: C1e éxito y permiso · C3m árbol muerto · C4 visor | **3** |
| | **5.3** Estados transversales | Construir en v2: F1–F3 vacío, offline y permisos · F4–F6 red, GPS, cámara y perfil | **2** |
| **R6** Web | **6.1** Panel de administración | Construir en v2: D1–D2 acceso y tablero · D3–D4 usuarios y moderación · D5–D7 especies, detalle admin y exportación | **3** |
| | **6.2** Mapa público | Construir en v2: E1 mapa con ficha · E3 variante incrustable | **2** |
| **R7** Cierre | **7.1** Re-medición | Rehacer `FIDELIDAD-UI.md` contra v2: 44 filas, contraste, catálogo | **1** |
| | **7.2** Validación | Accesibilidad sobre claro · **render real en dispositivo**, que no se ha hecho ni una vez | **2** |

**Pico de paralelismo: 3 agentes.** Siete fases, **17 olas**, 34 tareas de agente.

**R4 y R5 están separadas a propósito.** Reskinear una pantalla que existe y construir una
nueva no son el mismo trabajo: en la primera el riesgo es romper algo que funciona y se mide
contra lo que ya hay; en la segunda el riesgo es inventar. Mezclarlas en una ola obliga a un
agente a cambiar de modo a media tarea.

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

## Fase R4 · Móvil — reskin de lo que existe

Depende de R2. **Las 19 pantallas de estas tres olas ya están construidas**, así que el
trabajo es cambiarles la piel sin romperles el comportamiento. Cortadas para que ningún
agente comparta archivos.

| Ola | Agente A | Agente B | Agente C |
|---|---|---|---|
| **4.1** Sin sesión | A1 splash, A2 onboarding ×3 | A3 acceso, A4 registro, A5 recuperación | A6 verificación, A7 legal, A9 ×3, A10 ×2 |
| **4.2** Con sesión | B1 mapa | B2 mis árboles | B4 perfil |
| **4.3** Modales | C1 pasos 1–4 | C2 detalle del árbol | C3 bitácora |

**Regla de esta fase: no se toca el comportamiento.** Si al reskinear aparece un defecto
funcional, se anota y se deja; arreglarlo aquí mezcla dos cambios en un diff que nadie podrá
revisar. Las correcciones estructurales del bloque A —jerarquía de botones, orden de campos,
enlaces en el checkbox, sin confirmación de contraseña— **ya están hechas y se conservan**.

**Dos topes que el rediseño no levanta:**

- **A1** necesita el logotipo definitivo. La guía de branding 2026 existe, así que puede que
  ya esté disponible: comprobarlo antes de dar la pantalla por bloqueada.
- **A2** necesita las fotografías de campo del PRAE.

---

## Fase R5 · Móvil — lo que falta, directo en v2

Depende de R2, no de R4: son archivos nuevos y no chocan con el reskin. Puede solaparse.

Aquí no hay migración y esa es la ventaja de haber llegado tarde: **se construye ya en la
paleta buena**, sin pasar por v1.

| Ola | Agente A | Agente B | Agente C |
|---|---|---|---|
| **5.1** Con sesión | B3 actividad | B4b ajustes de notificaciones | — |
| **5.2** Modales | C1e éxito y permiso | C3m reportar árbol muerto | C4 visor de fotografía |
| **5.3** Transversales | F1 vacío, F2 offline, F3 ubicación | F4 red y sesión, F5 GPS y cámara, F6 perfil | — |

**F2 sigue con su tope**: la cola de pendientes necesita la cola de sincronización offline,
que es trabajo de datos y no de pantalla.

---

## Fase R6 · Web

Depende de R1 y R2. **`apps/web` sigue siendo la plantilla de `create-next-app`**: aquí
tampoco hay reskin, se construye de cero directamente en v2.

| Ola | Agente A | Agente B | Agente C |
|---|---|---|---|
| **6.1** Panel | D1 acceso, D2 tablero | D3 usuarios, D4 moderación | D5 especies, D6 detalle admin, D7 exportación |
| **6.2** Mapa público | E1 mapa con ficha | E3 variante incrustable | — |

---

## Fase R7 · Cierre

### Ola 7.1 · Re-medición — 1 agente

Rehacer `FIDELIDAD-UI.md` entero contra v2: las 44 filas, la tabla de contraste nueva, el
estado del catálogo. El documento actual mide contra un lienzo que ya no existe y **cada
cifra que contiene es engañosa hasta que se rehaga**.

### Ola 7.2 · Validación — 2 agentes

| Agente | Alcance |
|---|---|
| **A** | Accesibilidad sobre claro: áreas táctiles, etiquetas, lectores de pantalla, y que ningún token prohibido lleve texto pequeño |
| **B** | **Levantar la app y mirarla.** Android e iOS, y `next build` servido |

El segundo no es un trámite. En todo el trabajo de fidelidad hecho hasta hoy —cuatro fases,
decenas de cambios visuales— **no se ha renderizado la aplicación ni una sola vez**. Un
rediseño que invierte el esquema de color entero no se puede dar por bueno sin verlo.

---

## Cierre de la ola 7.2 · agente B — qué se validó y qué sigue sin verse

> 22 de agosto de 2026

Esta sección separa siempre tres cosas distintas, y conviene leerlas como tales:

| Palabra | Qué significa aquí |
|---|---|
| **Visto** | Se renderizó en pantalla y hay una captura que alguien miró. |
| **Responde** | El comando terminó bien o la ruta devolvió 200. Nadie miró cómo se ve. |
| **Sin ver** | Escrito, con el tipado y el empaquetado en verde, pero jamás dibujado. |

### 1 · Lo que se ejecutó, con resultado literal

| Comando | Dónde | Resultado |
|---|---|---|
| `pnpm typecheck` | raíz | Verde en `packages/core`, `apps/mobile` y `apps/web`. |
| `pnpm lint` | raíz | **0 errores, 5 avisos** preexistentes, todos en `apps/web/src/app/map/tree-card-modal.tsx` y `apps/web/src/features/public-map/public-map.tsx`. |
| `pnpm format:check` | raíz | Verde. |
| `npx expo-doctor` | `apps/mobile` | **21/21 checks passed. No issues detected!** |
| `npx expo export --platform android` | `apps/mobile` | Empaqueta con Metro de verdad: **1 740 módulos, sin un solo error ni aviso**. Bundle Hermes de 4,7 MB y 63 assets. |
| `npx expo config --type public` | `apps/mobile` | `userInterfaceStyle: 'light'`, splash `backgroundColor: '#F4FDF4'`, `adaptiveIcon.backgroundColor: '#F4FDF4'`. Los tres resuelven desde `design-tokens.json`, no desde hex escrito a mano. |
| `pnpm db:start` + `npx supabase status` | raíz | Docker disponible; el stack levanta. API `http://127.0.0.1:55321`, Studio `:55323`, correo `:55324`. `supabase_imgproxy` y `supabase_pooler` quedan parados por configuración. |
| `pnpm --filter @arbolapp/web build` | raíz | Compila con Turbopack en 3,8 s. **12 rutas**, TypeScript en verde. |
| `pnpm --filter @arbolapp/web start` | raíz | Sirve. El 3000 estaba ocupado, así que se sirvió en `PORT=3210`. |

**`expo export` es lo más cerca de arrancar que hay sin dispositivo**, y por eso está aquí:
empaqueta con el Metro real y caza los fallos de importación y de resolución que `tsc` no ve.
No apareció ninguno. Eso descarta la clase de error que rompe la app al primer arranque, y
**no dice absolutamente nada sobre cómo se ve**.

#### Tipografías que el bundle de Android empaqueta

Siete ficheros, y las cuatro familias del branding 2026 están todas:

| Familia | Pesos empaquetados | Rol |
|---|---|---|
| Montserrat | 600 SemiBold, 700 Bold | Titulares |
| Open Sans | 600 SemiBold | Subtítulos |
| Roboto | 400 Regular, 500 Medium | Cuerpo |
| Roboto Mono | 500 Medium | Coordenadas y medidas |
| Material Symbols | 400 Regular | Íconos (963 KB, el asset más pesado del bundle) |

No se empaquetan Montserrat 400/500 ni Open Sans 400: si alguna pantalla las pide, cae al
peso más cercano y nadie ha visto ocurrir eso.

### 2 · El panel web, que es lo único del rediseño que se ha visto renderizado

Se sirvió el `next build` contra el Supabase local con su `seed.sql` completo —194 árboles,
seis guardianes y una coordinadora— y se recorrieron las pantallas en un Chrome sin cabeza,
capturando cada una. **Estas sí se miraron.** La sesión se abrió con la coordinadora del seed
(`coordinacion@iesansebastian.edu.co`), así que ninguna pantalla del panel se quedó en la
redirección a `/sign-in`.

| Pantalla | Ruta | Qué se vio |
|---|---|---|
| **D1 Acceso** | `/sign-in` | Tema claro correcto: página `#F4FDF4`, texto `#1A1A1A`. Botón primario Verde Huilense `#008D46` con tinta blanca y 48 px de alto. Wordmark en verde con «Huila» en Naranja Plateño. El panel decorativo de la izquierda dibuja una retícula con cuatro marcadores. A 390 px el panel decorativo desaparece y el formulario ocupa el ancho. |
| **D1 denegado** | `/sign-in?denied=not-coordinator` | Entrando con una cuenta de guardián sale el aviso ámbar «Esta cuenta es de guardián. El panel es solo para el rol de coordinador; usa la aplicación móvil para ver tus árboles». El gate funciona y lo dice en castellano. |
| **D2 Tablero** | `/panel` | Cuatro tarjetas de indicador con datos reales (194 sembrados, 182 vivos, 93,8 % de supervivencia, 47,5 % de puntualidad), barras por vereda y lista por especie. `h1` en Montserrat 800 a 34 px sobre `#1A1A1A`. |
| **D3 Usuarios** | `/panel/users` | Tabla de seis guardianes más la coordinadora, con el correo en Roboto Mono, chips de estado y la nota de que el correo solo se ve aquí. |
| **D4 Moderación** | `/panel/moderation` | 56 tarjetas de árboles marcados, en rejilla de tres columnas, cada una con «Ver el árbol» y «Archivar». |
| **D4 modal** | idem | El diálogo «Archivar «Aguacates · HUI-LP-0109»» abre sobre un velo, con el motivo obligatorio y el botón de confirmar deshabilitado mientras no hay texto. |
| **D5 Especies** | `/panel/species` | Las 26 claves con su conteo, con las variantes que el seed escribe a mano (`mandarino` / `MANDARINOS`, `limón` / `LIMONES` / `Limón Tahití`) listadas por separado, que es justo lo que la pantalla de fusión existe para resolver. |
| **D6 Detalle admin** | `/panel/moderation/[treeId]` | Ficha con datos, estado «Vencido» en Naranja Plateño y panel de reasignación con los cinco guardianes activos. El recuadro del minimapa dice «El mapa web llega en una fase posterior» y el historial de moderación dice «Este dato aún no está disponible»: ambos huecos son visibles y honestos. |
| **D7 Exportar** | `/panel/export` | Tres tarjetas de reporte con botón CSV activo y botón Excel deshabilitado, más el aviso de que el inventario devuelve como máximo 1 000 árboles. |
| **E1 Mapa público** | `/map` | **Sin lienzo de mapa**, como estaba previsto: falta la clave de Google Maps y sale «Clave de Google Maps no configurada». Lo que sí se vio es la cromática que importa: la leyenda pinta los **cinco estados con cinco colores distintos y exactos** — `#008D46`, `#FFD700`, `#F26522`, `#E31B23`, `#757575`. El botón «Filtros» abre su panel. A 390 px leyenda y botón reflúyen bien. |
| **E3 Incrustable** | `/map/embed` | Responde y monta, pero sin clave solo se ve el mismo mensaje: **no hay leyenda ni filtros que mirar**. De esta variante no se ha visto ninguna superficie propia. |
| **Raíz** | `/` | Redirige al panel con la sesión abierta. |

#### Lo que el render destapó y el tipado no podía destapar

1. **Magenta de Juventud en línea dentro de la interfaz, en D1.** El renglón
   `PRAE «DE LA PANTALLA A LA REALIDAD»` se pinta con la clase `text-jil-magenta`, que
   resuelve a `#E93CAC`, en Roboto Mono de 11 px. `CLAUDE.md` dice que el magenta y el
   amarillo de Juventud en línea son **solo filiación y nunca entran en la interfaz**, y
   además ese color sobre el blanco del panel decorativo mide alrededor de **3,7 : 1**, que a
   11 px no pasa AA. Es el hallazgo más claro de esta ola, y `pnpm test:contrast` no podía
   verlo porque valida tokens sueltos y no pares de componente.
2. **El panel de «Filtros» de E1 está maquetado pero vacío.** Abre y muestra «Filtrar por
   especie — Las especies se cargarán desde la base de datos», y lo mismo para las zonas. No
   hay todavía ningún control de filtro real.
3. **El botón «Filtros» mide 42 px de alto**, por debajo del mínimo de 44 px que fija
   `CLAUDE.md`. Vive en `apps/web/src/app/map/map-filters.tsx`, que es alcance del agente A
   de esta misma ola.
4. **Las dos tarjetas del tablero se estiran a la altura del viewport** y su contenido queda
   centrado en vertical, así que a 1440 × 1000 sobran unos 300 px de vacío arriba y abajo de
   las barras. Es el comportamiento que pide `flex-1 justify-center`, no un fallo, pero es una
   decisión que hasta hoy nadie había visto en pantalla y conviene contrastarla con el lienzo.
5. **`expo config --type public` deja `android.permission.RECORD_AUDIO` en la lista de
   permisos**, pese a que `app.config.js` declara `microphonePermission: false` y
   `recordAudioAndroidPermission: false` precisamente para evitarlo. Falta comprobar si el
   plugin lo retira al generar el manifiesto en el prebuild; hasta entonces queda anotado.
6. **Comentario huérfano del tema oscuro** en `apps/mobile/app.config.js`: la clave de iOS se
   justifica diciendo que sin ella «el estilo oscuro no se aplica y el motivo de puntos de luz
   se pierde». Ese motivo dejó de existir con la v2.

Ninguno de los seis se corrigió aquí: esta ola valida y anota, y tres de ellos caen en
ficheros que el agente A tenía abiertos en paralelo.

### 3 · La aplicación móvil sigue sin renderizarse, y esto es lo que falta

**No se ha visto ni una pantalla del móvil.** Ni en esta ola ni en ninguna de las siete. Lo
que hay es empaquetado en verde, que es una cosa distinta y mucho más pequeña.

En este equipo la validación en dispositivo no se puede disparar, y no por falta de ganas:

| Tope | Estado comprobado |
|---|---|
| Android SDK | `ANDROID_HOME` y `ANDROID_SDK_ROOT` vacíos, `adb` no está en el `PATH`. No hay emulador ni Gradle. |
| iOS | Es Windows. Ni simulador ni build local, por definición. |
| Claves de Google Maps | `PENDIENTE` en `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` y en la de iOS. Sin ellas el mapa sale gris. |
| Expo Go | No sirve: el proyecto usa `expo-dev-client` y `react-native-maps`, que necesitan una build de desarrollo. |

### 4 · Cómo dispara el usuario la validación en dispositivo

`apps/mobile/eas.json` ya trae el perfil `development` con `developmentClient: true`,
distribución interna y `buildType: apk`, así que la ruta viable es build en la nube. Para esto
no hace falta tocar el repositorio, salvo el `projectId` del punto 2.

#### Lo imprescindible, que solo puede aportar el usuario

1. **Una cuenta de Expo.** Gratuita, con cola de build compartida.
2. **Un `projectId` de EAS.** `eas.json` declara `appVersionSource: "remote"`, y la
   configuración es `app.config.js` (JavaScript), así que **EAS no puede escribir el
   `projectId` por su cuenta**: solo escribe en `app.json`. Hay que copiarlo a mano a
   `extra.eas.projectId`.
3. **Una clave de Google Maps para Android**, restringida al package name
   `co.edu.iesansebastian.arbolapp`. Va como variable de entorno de EAS, **no en `.env`**:
   `.env` no se sube a la build.
4. **Un teléfono Android físico** donde instalar el APK.

#### La secuencia exacta

```bash
# Node 24: en este equipo la 18 es la del sistema y no sirve para el SDK 57.
export PATH="/c/Users/etherion/AppData/Roaming/nvm/v24.14.1:$PATH"

# 1. Cuenta de Expo, una sola vez.
npx eas-cli login

# 2. Crear el proyecto en la cuenta. Devuelve un projectId que hay que copiar
#    a mano a `extra.eas.projectId` en apps/mobile/app.config.js.
cd apps/mobile
npx eas-cli init

# 3. Las variables que la build necesita, en el entorno `development`.
#    La clave de Maps termina dentro del APK de todos modos, así que lo que la
#    protege es la restricción por package name, no el secreto.
npx eas-cli env:create --environment development \
  --name EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY --value "<clave-android>"
npx eas-cli env:create --environment development \
  --name EXPO_PUBLIC_SUPABASE_URL --value "http://<IP-del-equipo>:55321"
npx eas-cli env:create --environment development \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<ANON_KEY de npx supabase status>"

# 4. La build de desarrollo. Sale un APK con enlace y QR para instalar.
npx eas-cli build -p android --profile development

# 5. Instalado el APK, el servidor de Metro contra el dev client.
npx expo start --dev-client
```

#### La trampa del `127.0.0.1`

Contra el Supabase local, **en un teléfono físico `127.0.0.1` es el propio teléfono**. Hay que
poner la IP del equipo en la red (`ipconfig`, la IPv4 del adaptador Wi-Fi), con el teléfono en
esa misma red y el cortafuegos de Windows dejando entrar el puerto 55321. La build de
desarrollo es una variante de depuración, así que admite tráfico HTTP en claro; una build
`preview` o `production` **no**, y ahí el stack local deja de servir. Esto ya está anotado en
`.env.example`, en la sección de Supabase.

#### Lo opcional, y lo que es un gasto del usuario

- **iOS.** Hace falta un Mac para compilar en local, o una cuenta de Apple Developer para que
  EAS firme y distribuya a un dispositivo registrado. **Es una decisión y un gasto del
  usuario**, no algo que el repositorio pueda resolver.
- **Clave de Maps para iOS**, restringida al bundle ID `co.edu.iesansebastian.arbolapp`. Sin
  ella la app cae a Apple Maps.
- **Un proyecto de Supabase en la nube**, que evitaría la gimnasia de la IP local y dejaría
  probar desde cualquier red.

### 5 · Qué queda pendiente después de esta ola

| Qué | Estado | Quién lo desbloquea |
|---|---|---|
| Las 19 pantallas del móvil | **Sin ver.** Empaquetan sin error; nadie las ha mirado. | El usuario, con la secuencia de arriba |
| El lienzo del mapa en E1 y E3 | **Sin ver.** Falta `NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY`. | El usuario |
| Las superficies propias de E3 | **Sin ver.** Sin clave no monta ni leyenda ni filtros. | El usuario |
| El magenta `#E93CAC` de D1 | Visto y medido: 3,7 : 1 a 11 px, y es un color de filiación. | Trabajo pendiente |
| Los filtros de E1 | Vistos: el panel abre vacío. | Trabajo pendiente |
| El `RECORD_AUDIO` del manifiesto | Anotado, sin comprobar en el prebuild. | Trabajo pendiente |
