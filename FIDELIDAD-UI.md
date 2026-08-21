# Fidelidad de la interfaz frente al sistema de diseño

> Última medición: 21 de agosto de 2026 · rama `develop` · último commit `82fcd19`
> Fuente de verdad: **ÁrbolApp Huila Design System** (`f2a48455-80b5-4d27-b3ef-9f7282a24b10`)
> Lienzo de pantallas: **Pantallas v1** (`b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56`)
> Incluye el árbol de trabajo sin commitear de la Fase 3 (mapa interactivo).

Este documento mide **cuánto del sistema de diseño está realmente en el código**, no cuánto
se pretende adoptar. Se mide en dos planos:

- **Pantallas** — cada artboard de `Pantallas v1.dc.html` contra su ruta en el código. El
  score es un juicio de composición y de copy, no una cifra medida.
- **Tokens** — el CSS generado desde `packages/core/src/theme.ts` contra los `tokens/*.css`
  del sistema, variable por variable. Ahí ninguna cifra es una estimación.

---

## Tabla general — pantalla por pantalla

Las 41 pantallas del lienzo más las que existen en el código sin diseño que las respalde.

**Score de fidelidad (1–100).** 90+ coincide y solo falta pulir · 70–89 la pantalla es
reconocible pero divergen jerarquía o copys · 40–69 hay una versión funcional con otra
composición · 10–39 solo un esbozo o un marcador de posición · 1–9 no existe nada.
Mide fidelidad **visual y de composición**, no si la funcionalidad es correcta: una pantalla
puede funcionar perfecto y puntuar bajo.

**Diseño / Código.** ✅ existe · 🟡 existe a medias o embebido en otra pantalla · ⛔ no existe.

| ID | Pantalla | Diseño | Código | Score | Qué falta para la fidelidad completa |
|---|---|---|---|---|---|
| **A1** | Splash | ✅ | 🟡 `app.config.js` | **25** | Solo coincide el fondo `#0B1512`. `splash-icon.png` sigue siendo byte a byte el logo de Expo (mismo MD5 que `expo-logo.png`). Faltan el logotipo «ÁrbolApp Huila» en display 38 px, la micro-etiqueta magenta «UN PROYECTO DE JUVENTUD EN LÍNEA» y el punto esmeralda con `--glow-accent`. |
| **A2.1** | Onboarding 1/3 | ✅ | ✅ `onboarding/index.tsx` | **78** | Reconstruida en U3. Están el bloque superior de fotografía con su pie y los copys del lienzo, y se retiró el encabezado «Paso 1 de 3 / Omitir» que el lienzo no tiene. **Falta la fotografía**: el lienzo pide foto real de campo y eso es contenido del PRAE, no código. El marco queda listo para recibirla. |
| **A2.2** | Onboarding 2/3 | ✅ | ✅ `onboarding/prae.tsx` | **78** | Igual que A2.1, con el cuerpo del lienzo. Falta la fotografía. |
| **A2.3** | Onboarding 3/3 | ✅ | ✅ `onboarding/guardian.tsx` | **78** | Igual que A2.1. Se retiró además el botón «Ya tengo cuenta», que el lienzo no dibuja. Falta la fotografía. |
| **A3** | Inicio de sesión | ✅ | ✅ `(auth)/sign-in.tsx` | **92** | Reconstruida en U3: logotipo sobre el título, separador «O» antes de «Explorar sin cuenta», y «¿Olvidaste tu contraseña?» como enlace alineado a la derecha encima del botón. Sobraba el subtítulo y se quitó. **El logotipo es tipográfico**, no la marca definitiva: esa es Fase 9. |
| **A4** | Registro de Guardián | ✅ | ✅ `(auth)/sign-up.tsx` | **90** | Reconstruida en U3: barra modal, orden de campos del lienzo, enlaces dentro de la etiqueta del checkbox, y fuera el campo de confirmación y el botón «Leer la política…». **Falta el `Select` de rol o institución** — ver PD-06: el lienzo dibuja una lista cerrada pero no enumera sus opciones, y la columna es texto libre. |
| **A5** | Recuperación de contraseña | ✅ | ✅ `(auth)/forgot-password.tsx` | **92** | Reconstruida en U3: barra modal y el aviso «Si existe una cuenta con ese correo…» como caja informativa persistente bajo el formulario, en vez de reemplazar la pantalla. |
| **A6** | Verificación de correo | ✅ | ✅ `(auth)/verify-email.tsx` | **92** | Reconstruida en U3: «Ya verifiqué mi correo» pasa a primario y el contador de reenvío a secundario, como el lienzo. Se retiró el botón «Entrar». Falta el ícono de sobre, que necesita el kit de íconos. |
| **A7** | Privacidad y términos | ✅ | ✅ `app/legal.tsx` | **80** | Barra modal y pie «Versión del 21 ago 2026». Cayó el badge «Borrador», que duplicaba el aviso. **Faltan las pestañas Privacidad / Términos**: el componente `Tabs` existe desde U1, pero repartir el articulado entre las dos es una decisión de contenido legal y el texto es todavía un borrador. |
| **A8** | Mapa · exploración sin cuenta | ✅ | ✅ `(app)/map.tsx` | **85** | Construida en la Fase 3. Están el mapa oscuro, el pill de búsqueda, los chips de filtro, los clústeres, la leyenda de 4 estados y la `GuestBar` con «Crear cuenta de guardián» / «Entrar». Falta que el buscador acepte texto: el placeholder promete «Buscar árbol o vereda…» y hoy solo abre la hoja de veredas, no busca árboles. Tres desviaciones del lienzo son **deliberadas y están razonadas en el código**: la búsqueda es botón y no campo (el teclado taparía el mapa), la leyenda usa 12 px en vez de 11 (el suelo legible a pleno sol) y los controles 44 px en vez de 42 (área táctil mínima). |
| **A9** | Nueva contraseña · 3 estados | ✅ | ✅ `(auth)/reset-password.tsx` | **92** | Reconstruida en U3: barra modal en los tres estados y la ayuda «Mínimo 8 caracteres». **Fuera el campo de confirmación**, según la decisión de PD-04. Faltan los íconos del encabezado. |
| **A10** | Retorno del enlace de correo · 2 estados | ✅ | ✅ `auth/callback.tsx` | **80** | Dibujada el 21 ago 2026 a petición de U0. Ambos estados existen con los copys correctos. Faltan la barra modal y el ícono del encabezado. |
| **B1** | Mapa con ficha flotante | ✅ | 🟡 `(app)/map.tsx` | **65** | Lo mismo que A8, más la `TreeSummarySheet` con especie, ciclo, guardián y chip de estado. Faltan el **FAB «⌖ Sembrar»** (llega con la Fase 4), el botón de capas junto a la búsqueda, y la **barra de 4 pestañas**: hoy siguen siendo 2 y el control de ubicación vive dentro de la fila de búsqueda en vez de ser un FAB propio. |
| **B2** | Mis árboles | ✅ | ⛔ | **1** | **Solo en diseño.** No existe ruta. Faltan encabezado con conteo, tarjetas con miniatura, chip de estado, línea `VEREDA · CICLO`, texto de urgencia, botón «Actualizar» por tarjeta y badge «PENDIENTE DE ENVIAR». |
| **B3** | Actividad | ✅ | ⛔ | **1** | **Solo en diseño.** Faltan la caja de «notificaciones desactivadas» con su botón «Activar» y las secciones PENDIENTES / ANTERIORES con filas fechadas, incluidos los avisos del coordinador. |
| **B4** | Perfil | ✅ | ✅ `(app)/profile.tsx` | **45** | El código lo resuelve como **formulario de edición**; el diseño como **ficha + lista de opciones**. Faltan avatar con iniciales, badge «✦ Guardiana desde 2025», las tres fichas de estadística, las filas de menú con chevron y el pie de versión. La edición debe vivir tras «Editar perfil». |
| **B4b** | Ajustes de notificaciones | ✅ | 🟡 embebido en `profile.tsx` | **38** | Falta la pantalla propia. Los interruptores no son los del diseño: pide «Recordatorios de bitácora» y «Avisos del coordinador» con subtítulo cada uno, más la nota «Aunque desactives los avisos, tus árboles seguirán apareciendo como pendientes». |
| **C1.1** | Registrar · paso 1, ubicación | ✅ | ⛔ | **1** | **Solo en diseño.** Encabezado «PASO 1 DE 4» con progreso, mini-mapa con pin arrastrable, coordenadas con precisión (`±8 m`), enlace «Escribir coordenadas a mano» y selects de municipio y vereda. |
| **C1.2** | Registrar · paso 2, especie | ✅ | ⛔ | **1** | **Solo en diseño.** Campo libre con autocompletado sobre lo ya escrito por otros guardianes, resaltado del fragmento, conteo por variante y nota «Se guarda tal como lo escribas». |
| **C1.3** | Registrar · paso 3, datos | ✅ | ⛔ | **1** | **Solo en diseño.** Selector de fecha con «Hoy, por defecto», altura con sufijo `cm` y contador `− 2 +` de ramas. |
| **C1.4** | Registrar · paso 4, foto | ✅ | ⛔ | **1** | **Solo en diseño.** Cámara en vivo sin galería y tarjeta RESUMEN con la nota «se comprime a ~200 KB». |
| **C1e** | Éxito + permiso de notificaciones | ✅ | ⛔ | **1** | **Solo en diseño.** Confirmación con la próxima fecha de foto y solicitud de permiso («Activar recordatorios» / «Ahora no»). |
| **C2** | Detalle del árbol | ✅ | ⛔ | **1** | **Solo en diseño.** Foto de cabecera, chip de estado, «Actualizar bitácora», comparador ANTES / DESPUÉS, gráfica de altura, lista de entradas con puntualidad y línea «Este árbol pertenece a…». |
| **C3** | Nueva entrada de bitácora | ✅ | ⛔ | **1** | **Solo en diseño.** Cámara con **fantasma de la foto anterior**, altura y ramas, estado de salud (Sano / Con plagas / Débil), notas y coordenada de captura. |
| **C3m** | Reportar árbol muerto | ✅ | ⛔ | **1** | **Solo en diseño.** Aviso de consecuencias, foto de evidencia obligatoria, chips de causa (Sequía / Ganado / Quema / Plaga / Otra) y campo «¿Qué pasó?». |
| **C4** | Visor de fotografía | ✅ | ⛔ | **1** | **Solo en diseño.** Visor a pantalla completa con pie de ciclo, fecha, medidas y coordenada. |
| **D1** | Acceso del coordinador | ✅ | ⛔ | **1** | **Solo en diseño.** `apps/web` sigue siendo la plantilla de `create-next-app`. Falta la composición a dos columnas con el panel de marca y el formulario restringido. |
| **D2** | Tablero de estadísticas | ✅ | ⛔ | **1** | **Solo en diseño.** Barra lateral con badge de moderación, filtros de municipio y año, cuatro fichas de indicador y los gráficos por vereda y por especie. |
| **D3** | Gestión de usuarios | ✅ | ⛔ | **1** | **Solo en diseño.** Tabla de guardianes con rol, conteos, chip de estado y acciones, buscador, y la nota de que el correo solo se ve en el panel. |
| **D4** | Moderación · archivado motivado | ✅ | ⛔ | **1** | **Solo en diseño.** Lista de árboles marcados con su motivo y el diálogo de archivado con motivo obligatorio visible para el guardián. |
| **D5** | Fusión de especies | ✅ | ⛔ | **1** | **Solo en diseño.** Lista de claves con conteos, selección múltiple de variantes, elección del nombre oficial y aviso de que el texto original se conserva. |
| **D6** | Detalle admin y reasignación | ✅ | ⛔ | **1** | **Solo en diseño.** Ficha de datos, mini-mapa, historial de moderación y buscador de guardián activo. |
| **D7** | Exportación PRAE | ✅ | ⛔ | **1** | **Solo en diseño.** Tres tarjetas de reporte con CSV / Excel, nota de exclusión de correos y registro de la última exportación. |
| **E1/E2** | Mapa público con ficha | ✅ | ⛔ | **1** | **Solo en diseño.** Encabezado con los tres indicadores, mapa con clústeres, filtros, leyenda y ficha lateral con medidas, atribución y línea de tiempo de ciclos. |
| **E3** | Variante incrustable | ✅ | ⛔ | **1** | **Solo en diseño.** Versión compacta con clúster, conteo de vivos, firma de marca y enlace «Ver el mapa completo». |
| **F1** | Mis árboles · vacío | ✅ | ⛔ | **1** | **Solo en diseño.** Depende de B2. Ilustración, título «Todavía no has sembrado ningún árbol» y botón «Sembrar mi primer árbol». |
| **F2** | Offline con cola de pendientes | ✅ | 🟡 `connection-banner.tsx` | **20** | Existe la franja de «sin conexión» pero con copy genérico. El diseño cuenta los registros en cola («Sin conexión — 2 registros se enviarán cuando vuelva la señal»), con enlace «Ver» y cierre. Falta entera la sección PENDIENTES DE ENVIAR con sus tarjetas «En cola». |
| **F3** | Permiso de ubicación | ✅ | 🟡 `use-user-location.ts` | **30** | `useUserLocation` pide el permiso y, si lo niegan, el mapa muestra un `Notice` con el motivo. Falta la **pantalla previa** del diseño: el permiso se pide en frío, sin explicar antes para qué se usa el GPS, y no existe la salida «Ahora no — puedo escribir las coordenadas a mano». |
| **F4** | Error de red y sesión expirada | ✅ | 🟡 `map.tsx` + `Notice` + `sign-in` | **45** | El mapa ya tiene su estado de error con título, cuerpo y reintento, y el aviso de caché sin conexión. Falta que sean estados **a pantalla completa** como los dibuja el lienzo, y «Tu sesión venció» sigue siendo un `Notice` dentro de `sign-in` en vez de una pantalla con el texto que tranquiliza sobre los registros pendientes. |
| **F5** | GPS impreciso y cámara denegada | ✅ | ⛔ | **1** | **Solo en diseño.** Franja de GPS débil con la precisión (`±45 m`) sobre el mapa y pantalla de cámara desactivada con «Abrir ajustes del teléfono». |
| **F6** | Errores de perfil · 2 estados | ✅ | 🟡 `(app)/profile.tsx` | **55** | Dibujada el 21 ago 2026 a petición de U0. El código muestra los dos casos con los copys correctos, pero **dentro de la pantalla de perfil**, no como los estados a pantalla completa que dibuja el lienzo. Faltan los íconos del encabezado. |
| — | Falta configurar la aplicación | ⛔ | ✅ `app/_layout.tsx` | **n/a** | **Solo en código.** Pantalla de desarrollo; no necesita diseño. |

### Recuento de inconsistencias

| | Cantidad |
|---|---|
| Pantallas del lienzo con algo construido | **19** de 41 |
| **Pantallas en Claude Design que no existen en el código** | **22** — todas de las Fases 4 a 7 |
| **Pantallas en el código que no existen en Claude Design** | **2**, y ninguna necesita diseño: una sobra y la otra es de desarrollo |

El lienzo creció de 38 a 41 filas el 21 de agosto de 2026: A9, A10 y F6 se dibujaron a
petición de la fase U0 y dejaron de ser pantallas huérfanas del código.

| Bloque | Pantallas | Tras U3 | Tras U0 | Antes de U0 | Tras las fuentes | Antes |
|---|---|---|---|---|---|---|
| A · Móvil sin sesión | 12 | **80,2** | 69,5 | 68,2 | 60,9 | 52,7 |
| B · Móvil con sesión | 5 | **30,0** | 30,0 | 30,0 | 18,8 | 15,0 |
| C · Flujos modales | 9 | **1,0** | 1,0 | 1,0 | 1,0 | 1,0 |
| D · Web administración | 7 | **1,0** | 1,0 | 1,0 | 1,0 | 1,0 |
| E · Web mapa público | 2 | **1,0** | 1,0 | 1,0 | 1,0 | 1,0 |
| F · Estados transversales | 6 | **25,3** | 25,3 | 19,4 | 12,2 | 9,6 |
| **Total del lienzo** | **41** | **≈ 31** | ≈ 28 | ≈ 25 | ≈ 21 | ≈ 18 |

**Fidelidad de lo construido** — la media de las 19 filas que tienen código, que es la
métrica que el plan de fidelidad mueve: **66,3**. Venía de 59,6 tras U0 y de 57,8 al empezar.

**Cómo se recalculó, dos veces.**

1. *Tipografías.* Cargar las tres familias sube la fidelidad de toda pantalla que renderice
   texto con la escala de tipos, y de ninguna otra. Se aplicó **+10** a las pantallas
   construidas que usan `AppText`, **+2** a las que solo mostraban un marcador de posición o
   una franja, y **+0** a A1 —el splash es nativo y no usa las fuentes de la aplicación— y a
   las que solo existen en el diseño. Incremento uniforme, no una medida.
2. *Fase 3.* A8, B1, F3 y F4 se **volvieron a medir contra el código**, no se ajustaron por
   fórmula: el mapa dejó de ser un marcador de posición. Ese salto es lo que mueve el total
   de 21 a 25, y casi todo se concentra en cuatro filas.

**Veredicto de pantallas.** El promedio bajo sigue reflejando que las Fases 4 a 7 no han
empezado: 22 de las 38 pantallas no tienen una sola línea. La lectura útil es la de lo
construido — **68,2** en el bloque A. Ni los tokens ni las fuentes ponen ya el techo. Lo que
queda es maquetación y catálogo: sin `Card`, `Badge`/`StatusDot` y `Dialog`, y sin barra de
encabezado modal, el bloque A no pasa de ~85 por más que se retoque.

> ⚠️ **La Fase 3 está sin commitear.** Las cuatro filas remedidas describen el árbol de
> trabajo del 21 de agosto de 2026, no un commit. `apps/mobile/src/features/map/`,
> `packages/core/src/map.ts` y la migración `20260821140000_tree_card.sql` están sin
> versionar, y `pnpm typecheck` está rojo en `map.tsx` (ver «Cómo se reproduce»).

---

## Tabla general — tokens

La columna **declarado** mide si el valor del token coincide con el del sistema de diseño.
La columna **aplicado** mide si eso llega a la pantalla. Se separan porque un token puede ser
correcto y no pintar nada: fue exactamente el caso de las familias tipográficas, declaradas
con el valor correcto durante toda la adopción de tokens y sin una sola cara cargada hasta
que se resolvió aparte.

| Capa | Alcance | Declarado | Aplicado | Estado |
|---|---|---|---|---|
| Color | 50 variables | **100 %** (50/50) | **100 %** | ✅ |
| Espaciado, radios y área táctil | 16 variables | **100 %** (16/16) | **100 %** | ✅ |
| Escala tipográfica — tamaños, interlineado, pesos, tracking | 17 variables | **100 %** (17/17) | **100 %** | ✅ |
| Familias tipográficas | 3 variables | **100 %** (3/3) | **100 %** | ✅ |
| Efectos, sombras y motion | 9 variables | **100 %** (9/9) | ➖ sin consumir aún | ✅ |
| **Total de tokens** | **95 variables** | **100 %** | — | ✅ |
| Consumo en móvil | 24 archivos | — | **100 %** | ✅ |
| Consumo en web | `design-tokens.css` + `globals.css` + utilidades Tailwind (`bg-state-overdue`, `text-surface-card`…) | — | **100 %** | ✅ |
| Splash e ícono adaptativo | 2 valores, desde `app.config.js` | — | **100 %** | ✅ |
| Variantes de tipografía | 9 variantes | **100 %** (9/9) | **7 de 9 en uso** | 🔸 `data` y `overline` sin consumir |
| Componentes de interfaz vs. catálogo | 13 del catálogo | — | **12 / 13 portados** | ✅ falta `IconButton` |
| Pantallas vs. lienzo | 38 pantallas | — | **≈ 25 / 100** | 🔧 ver tabla de pantallas |

**Veredicto.** La capa de tokens está completa y verificada, y las tres familias
tipográficas ya se cargan en las dos plataformas. Lo único que separa hoy a la aplicación
del diseño es **maquetación**: la composición de las pantallas de la Fase 2 y los tres
componentes del catálogo que no existen. Ninguna de las dos cosas es un problema de valores,
y por eso no se mezclaron con esta tarea.

---

## Detalle de tokens

Comparación literal de `apps/web/src/app/design-tokens.css` contra los `tokens/*.css` del
sistema de diseño, normalizando solo mayúsculas y espacios (`.14` y `0.14` cuentan igual).

| Grupo | Tokens en el sistema | Coinciden | Faltan | Difieren |
|---|---|---|---|---|
| `colors.css` | 50 | 50 | 0 | 0 |
| `spacing.css` | 16 | 16 | 0 | 0 |
| `typography.css` | 20 | 20 | 0 | 0 |
| `effects.css` | 9 | 8 | 0 | 1 |
| **Total** | **95** | **94** | **0** | **1** |

**Tokens que el código define y el sistema de diseño no: ninguno.** No se inventó ni un
solo valor.

### La única diferencia, y por qué es intencionada

```
--focus-ring
  sistema de diseño:  0 0 0 2px var(--surface-page), 0 0 0 4px var(--border-focus)
  código:             0 0 0 2px #0B1512,             0 0 0 4px #3DDC97
```

Son **el mismo anillo**: `--surface-page` es `#0B1512` y `--border-focus` es `#3DDC97`. El
token se compone en TypeScript a partir de los otros dos tokens, porque React Native no
resuelve `var()`. Si se dejara la indirección, la web tendría un anillo de foco y el móvil
no tendría ninguno. **Fidelidad de valor: 100 %.**

---

## Contraste — WCAG AA

Medido sobre las tres superficies en las que un guardián lee texto, con la aplicación en la
mano y a pleno sol. El umbral de texto pequeño es **4.5:1**.

| Token | `surface-page` | `surface-raised` | `surface-card` | Texto pequeño |
|---|---|---|---|---|
| `text-primary` | 16.49 | 15.39 | 14.16 | ✅ AA |
| `text-secondary` | 8.87 | 8.28 | 7.62 | ✅ AA |
| `text-muted` | 4.01 | 3.74 | **3.44** | ❌ **no** |
| `text-link` | 12.03 | 11.23 | 10.33 | ✅ AA |
| `text-link-hover` | 13.88 | 12.95 | 11.92 | ✅ AA |
| `accent` | 10.51 | 9.81 | 9.03 | ✅ AA |
| `accent-strong` | 12.03 | 11.23 | 10.33 | ✅ AA |
| `accent-pressed` | 6.89 | 6.43 | 5.91 | ✅ AA |
| `state-ok` | 10.51 | 9.81 | 9.03 | ✅ AA |
| `state-due` | 12.87 | 12.01 | 11.05 | ✅ AA |
| `state-overdue` | 7.92 | 7.39 | 6.80 | ✅ AA |
| `state-dead` | 5.59 | 5.22 | 4.80 | ✅ AA |
| `state-archived` | 4.01 | 3.74 | **3.44** | ❌ **no** |
| `success` | 10.51 | 9.81 | 9.03 | ✅ AA |
| `warning` | 12.87 | 12.01 | 11.05 | ✅ AA |
| `danger` | 5.59 | 5.22 | 4.80 | ✅ AA |
| `info` | 8.51 | 7.94 | 7.31 | ✅ AA |
| `brand-magenta` | 5.05 | 4.71 | **4.34** | ❌ **no** |
| `brand-yellow` | 12.87 | 12.01 | 11.05 | ✅ AA |

### Tres tokens del sistema de diseño que no llegan a AA

No se corrigieron en silencio ni se usaron igualmente. Quedan acotados en `theme.ts`:

1. **`text-muted` y `state-archived`** son el mismo gris `#66796F`, con un máximo de
   4.01:1. Válidos como punto, filete, icono o texto grande; **nunca como texto pequeño**.
   El texto pequeño que debe replegarse usa `text-secondary`, que supera 7.6:1 siempre.
   El propio sistema de diseño los incumple en `guidelines/colors-text.html` (etiqueta mono
   de 11 px) y en `guidelines/map-motif.html` (etiquetas de 10 px).
2. **`danger` cae a 4.31:1 sobre `surface-overlay`.** El sistema de diseño no ofrece un rojo
   más claro, así que un diálogo sobre overlay necesita el texto de error a tamaño grande, o
   sobre tarjeta. Ninguna pantalla usa hoy esa combinación.
3. **`brand-magenta`** solo pasa sobre `page` y `raised`. Es acento de marca y no toca el
   mapa, así que su uso previsto es coherente con la medición.

### Una decisión que la medición invirtió

`theme.ts` tenía `dangerText` y `warningText`, añadidos cuando las superficies eran claras y
los colores de marcador no llegaban a 4.5:1 como texto pequeño. Sobre el bosque nocturno
**pasan de sobra por sí mismos**, así que eran alias idénticos sin función y se eliminaron.
No se bajó ningún listón: la garantía la da ahora el propio token.

La trampa del renombrado quedó registrada porque volverá a aparecer: el `colors.textMuted`
del código valía `#A3B8AE`, que en el sistema de diseño se llama **`--text-secondary`**. El
`--text-muted` del sistema es `#66796F`. Renombrar literalmente habría degradado en silencio
cinco usos de 8.87:1 a 4.01:1.

---

## Estados del árbol

Cinco estados, **cinco colores distintos**. Comprobado sobre `colorByTrackingStatus`:

| Estado | Token | Color |
|---|---|---|
| `up_to_date` | `--state-ok` | `#3DDC97` |
| `due_soon` | `--state-due` | `#FFD23F` |
| `overdue` | `--state-overdue` | `#FF8A3D` |
| `dead` | `--state-dead` | `#F0567A` |
| `archived` | `--state-archived` | `#66796F` |

`due_soon` y `overdue` no comparten color: la escalada de recordatorios va del día 0 al +30
y el mapa, la lista y la leyenda tienen que distinguir un árbol por vencer de uno que nadie
ha visitado.

---

## Lo que falta

### ✅ Fuentes — resuelto

Las tres familias se cargan ya en las dos plataformas. `tokens/fonts.css` las trae con un
`@import` de Google Fonts, que en móvil no sirve; se resolvió con `@expo-google-fonts` en
móvil y `next/font/google` en web, ninguno de los dos con tecnología nueva —`expo-font` ya
era dependencia y `next/font` ya servía Geist.

| Familia | Uso | Caras cargadas | Peso |
|---|---|---|---|
| **Bricolage Grotesque** | Titulares, ≥26 px | 600 · 700 | 182 KB |
| **Archivo** | Interfaz y párrafos, ≤20 px | 400 · 500 · 600 · 700 | 483 KB |
| **IBM Plex Mono** | Coordenadas, medidas, fechas, IDs | 500 | 135 KB |

**Solo se empaqueta la cara que algo renderiza.** El índice de cada paquete reexporta todos
sus pesos, así que importar desde la raíz metía unas treinta tipografías en la aplicación
para dibujar siete: se importa por subruta
(`@expo-google-fonts/archivo/400Regular`). El mapa `fontFace` del tema y `appFonts` del
layout raíz enumeran exactamente el mismo conjunto, para que ningún estilo pida una cara que
nadie registró y caiga en silencio a la del sistema.

En React Native el peso no se elige dentro de una familia: cada peso es su propia cara
registrada, y pedir una negrita que no se cargó produce un engrosado sintético. Por eso los
estilos nombran una cara y **nunca** llevan `fontWeight` al lado; los dos `fontWeight`
sueltos que quedaban en `legal.tsx` y `connection-banner.tsx` se sustituyeron por su cara
real.

En web cada familia publica su propia variable (`--font-display-face`) en lugar de pisar la
del sistema de diseño: `globals.css` compone `var(--font-body-face), var(--font-body)`, de
modo que la cara cargada va primera y el stack generado queda de reserva.

**Añadir una cara son dos líneas y ~120 KB**: una entrada en `fontFace` y otra en `appFonts`
del layout raíz. Ese coste es la razón de que haya siete y no treinta, así que una pantalla
nueva se maqueta con las caras registradas salvo que el lienzo pida otra explícitamente.

### Una regla que se hereda de esta capa

**No se editan `design-tokens.css` ni `design-tokens.json`.** Los emite `pnpm tokens` desde
TypeScript. Si el sistema de diseño cambia, se corrige `theme.ts` y se regenera; una
corrección escrita a mano en el CSS se pierde en la siguiente ejecución.

### 🔸 Dos variantes de tipografía que existen y nadie usa

`typography` publica nueve variantes y las pantallas consumen siete. Las dos que sobran no
son de adorno: son exactamente el patrón que más se echa de menos al comparar contra el
lienzo.

| Variante | Cara | Para qué la dibuja el lienzo | Quién debería usarla |
|---|---|---|---|
| `data` | `monoMedium` — IBM Plex Mono | Coordenadas, alturas, fechas, IDs | C1.1 (`2.3894° N · ±8 m`), C2, C3, C4, E1 |
| `overline` | `bodyMedium` en mayúsculas con `tracking.wide` | Micro-etiquetas en versalitas | `VEREDA SAN ANDRÉS · CICLO 2` en B2, `PENDIENTES` en B3, `PASO 1 DE 4` en C1 |

Mientras nadie las use, cada pantalla nueva que necesite una coordenada o una micro-etiqueta
la resolverá con `caption` y perderá la textura del lienzo. **La primitiva ya existe: el
trabajo es aplicarla, no crearla.**

### 🔧 Maquetación de la Fase 2 — tarea aparte

Los componentes de `apps/mobile/src/components/ui/` y las diez pantallas de autenticación y
onboarding **consumen los tokens correctos**, pero su disposición diverge del lienzo. Mezclar
esa reconciliación con la corrección de tokens habría hecho imposible revisar ninguna de las
dos.

- Pantallas contra `Pantallas v1.dc.html`: ya medidas, **68,2 / 100** en el bloque A. El
  detalle está en la tabla de pantallas al inicio de este documento.
- Componentes contra el catálogo: **portados en la fase U1**, 12 de los 13. Ver abajo.

### Catálogo de componentes — estado tras U1

| Catálogo | En el código | Nota |
|---|---|---|
| `Button` | `ui/button.tsx` | ✅ variantes, escala `sm`/`md`/`lg` (32/40/48) e ícono a la izquierda |
| `Input` | `ui/text-field.tsx` | ✅ con anillo de foco. **Corregido: el `TextInput` no declaraba `fontFamily`** |
| `Checkbox` | `ui/checkbox-field.tsx` | ✅ con enlaces dentro de la etiqueta, como pide A4 |
| `Select` | `ui/select.tsx` | ✅ campo del lienzo + `OptionSheet` en vez de un `<select>` nativo |
| `Switch` | RN nativo en `profile.tsx` | 🔸 sin portar; se aborda en U4 |
| `Radio` | — | ➖ ninguna pantalla de la v1 lo usa; se porta cuando aparezca |
| `IconButton` | — | ⛔ **pendiente**: necesita el kit de íconos, que sigue sin portar |
| `Card` | `ui/card.tsx` | ✅ |
| `Badge` | `ui/badge.tsx` | ✅ cinco estados + acento de marca |
| `Tag` | `ui/tag.tsx` | ✅ |
| `StatusDot` | `ui/status-dot.tsx` | ✅ archivado nunca brilla, halo de selección |
| `Tooltip` | — | ➖ no aplica en móvil |
| `Toast` | `ui/notice.tsx` | ✅ relleno suave y marca por tono |
| `Dialog` | `ui/dialog.tsx` | ✅ sustituye a `Alert.alert`, pendiente de cablear en U4 |
| `Tabs` | `ui/tabs.tsx` | ✅ |

Lo que sigue bloqueado es el **kit de íconos** (`ui_kits/mobile/Icons.jsx`): sin él, `Notice`
marca el tono con un glifo de texto y no existe `IconButton`. La app usa hoy símbolos del
sistema (`expo-symbols`) en la barra de pestañas.

### 🔸 Un literal de color que sigue fuera de `packages/core`

| Dónde | Valor | Situación |
|---|---|---|
| `apps/web/src/app/page.tsx` | `#383838`, `#ccc`, `#1a1a1a` | Página de ejemplo de `create-next-app`, intacta. La Fase 6 la sustituye entera. |

El de `app.json` **ya no existe**. La configuración de Expo pasó a `app.config.js`, que lee
`design-tokens.json` —emitido por `pnpm tokens` desde los mismos tokens de TypeScript— para
el color del splash y el fondo del ícono adaptativo. Era el único lugar donde un color se
copiaba a mano, porque un JSON no puede importar TypeScript y la configuración se evalúa
antes de que exista un empaquetador. Comprobado con `npx expo config --type public`: ambos
resuelven a `#0B1512`.

### 🔸 Una inconsistencia del propio sistema de diseño

`guidelines/type-scale.html` dibuja interlineados de **1.1** y **1.2** que no existen como
tokens en `typography.css` (que solo define 1.15, 1.3 y 1.5). El código sigue los **tokens**,
por ser la fuente normativa, y no la tarjeta ilustrativa.

---

## Cómo se reproduce esta medición

```bash
export PATH="/c/Users/etherion/AppData/Roaming/nvm/v24.14.1:$PATH"

pnpm tokens          # regenera design-tokens.css desde packages/core
pnpm typecheck       # los tres paquetes
pnpm lint
pnpm format:check

pnpm --filter @arbolapp/web build
cd apps/mobile
npx expo config --type public          # el splash resuelve desde los tokens
npx expo-doctor
npx expo export --platform android     # comprueba qué caras se empaquetan
```

Estado en la última medición: `next build` compila y los tokens llegan al CSS emitido; Metro
empaqueta Android con **siete** tipografías, las que algo renderiza; **`expo-doctor` pasa
21/21**.

**`pnpm typecheck` está rojo, y no en la capa de diseño.** Falla en la Fase 3, que está en
curso y sin commitear:

```
src/app/(app)/map.tsx(107,26): error TS2304: Cannot find name 'useMunicipalityCounts'.
src/app/(app)/map.tsx(253,48): error TS7006: Parameter 'municipality' implicitly has an 'any' type.
```

`packages/core` y `apps/web` compilan limpios. La regla del proyecto —una tarea no está
terminada hasta que `typecheck`, `lint` y `format` estén en verde— sigue aplicando a quien
cierre la Fase 3; esta medición se tomó igualmente porque los archivos del mapa se leen
aunque no compilen.

### Dos avisos del handoff que ya no aplican

Se comprobaron contra el árbol de trabajo antes de escribir esto:

- **`react-native-maps` ya está en `1.27.2`**, la versión que espera el SDK 57. Por eso
  `expo-doctor` volvió a 21/21 desde el 20/21 que reportaba el handoff.
- **`expo-location` ya está fijo en `57.0.12`**, sin tilde. Cumple `save-exact` de `.npmrc`.
- El error de typecheck tampoco es el que anunciaba el handoff (`lastLoaded` en
  `use-trees-in-viewport.ts`): ese se resolvió y aparecieron los dos de `map.tsx`.
