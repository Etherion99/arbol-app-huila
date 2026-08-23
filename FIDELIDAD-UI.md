# Fidelidad de la interfaz frente al sistema de diseño

> Última medición: 22 de agosto de 2026 · rama `develop`
> Fuente de verdad: **`Pantallas v2.dc.html`** — proyecto `b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56`
> Sistema de diseño: `f2a48455-80b5-4d27-b3ef-9f7282a24b10`

Este documento mide **cuánto del sistema de diseño está realmente en el código**, no cuánto
se pretende adoptar. Se mide en dos planos, y conviene no confundirlos:

- **Pantallas** — cada artboard del lienzo contra su ruta en el código. El score es un
  **juicio de composición y de copy**, no una cifra medida. Lo emite una sola persona en una
  sola pasada, precisamente para que la tabla sea comparable consigo misma.
- **Tokens** — el CSS que emite `pnpm tokens` desde `packages/core/src/theme.ts` contra los
  `tokens/*.css` del sistema, variable por variable. Ahí ninguna cifra es una estimación.

La tabla de contraste **no se calcula a mano**: sale de `pnpm test:contrast`, que lee los
tokens del propio `theme.ts`. Cualquier cifra de contraste de este documento se reproduce
ejecutando ese script.

> **El script cambió en la Fase 8, y el cambio importa.** Antes medía **tokens contra
> superficies**, que responde «¿podría este color llevar texto?». Ahora mide además **los
> pares que el código pinta de verdad** —esta tinta, sobre ese fondo, a ese tamaño— y falla
> cuando uno no llega a AA. La distinción no es teórica: la versión vieja estuvo en verde
> mientras `_layout.tsx` escribía su única línea útil en `warning` a **1.35:1**, porque
> `warning` estaba correctamente documentado como token que no puede llevar texto y nadie
> comprobaba si algo lo llevaba. La tabla de pares vive en
> [`scripts/contrast-pairs.mjs`](scripts/contrast-pairs.mjs), y cada fila nombra el archivo
> que la pinta: el script falla también si ese archivo ya no existe, que es como se detecta
> una tabla que quedó hablando de componentes renombrados.

---

## Estado del rediseño R1–R6

Antes de puntuar nada se verificó qué olas aterrizaron en `develop`. **Las seis fases
llegaron**, y ninguna fila de la tabla puntúa alrededor de un hueco:

| Fase | Ola | Aterrizó | Evidencia en `develop` |
|---|---|---|---|
| **R1** Fundaciones | 1.1 Tokens | ✅ | `8cee196 refactor(core): adopt the 2026 branding tokens` |
| | 1.2 Tipografías y esquema | ✅ | `201c6e5`, `0b00009`, `6c784a1`, `a517303` |
| | 1.3 Contraste | ✅ | `47ba7d5 test(core): measure the light palette contrast` |
| **R2** Catálogo | 2.1 Formularios | ✅ | `0bdadcb chore(project): close the r2.1 forms wave` |
| | 2.2 Presentación y feedback | ✅ | `8a9b060`, `f2ec3bb`, `c87a077` |
| | 2.3 Íconos | ✅ | `a7e7be6 feat(mobile): port the design system icon set` |
| **R3** Mapa | 3.1 Estilo y marcadores | ✅ | `c789b62`, `7c3a644`, `64c5a26` |
| | 3.2 Superficies sobre el mapa | ✅ | `6720ef7` (merge `ola-3-2-integracion`) |
| **R4** Móvil · reskin | 4.1 / 4.2 / 4.3 | ✅ | merges `ola-4-1`, `ola-4-2`, `ola-4-3` |
| **R5** Móvil · nuevo | 5.1 / 5.2 / 5.3 | ✅ | merges `ola-5-1`, `ola-5-2`, `ola-5-3` |
| **R6** Web | 6.1 Panel | ✅ | merge `ola-6-1b-integracion` |
| | 6.2 Mapa público | ✅ | `8d5e7dc`, `5cff11e`, `7bcc765` |

**Las 44 pantallas del lienzo tienen código.** Ninguna se queda en «no construido». Lo que
queda son grados de fidelidad, y dos topes de contenido que el código no puede levantar —el
logotipo y las fotografías de campo— más uno de datos: la cola de sincronización offline.

### Dos defectos que la ola 6.2 dejó en verde aparente

La medición empezó ejecutando las verificaciones sobre `develop`, y **dos no pasaban**:

1. **`pnpm typecheck` estaba rojo.** El refactor `b0ba67f`, que cambió `photoPath` por
   `photoUrl` en `TreeCard`, no alcanzó a `apps/web/src/app/map/embed/tree-detail-modal.tsx`,
   que seguía leyendo la propiedad vieja. Dos errores `TS2339`. Corregido en esta ola.
2. **`pnpm format:check` estaba rojo** en cuatro archivos de la ola 6.2. Corregido en esta ola.

Se registran porque son la clase de fallo que una ola de cierre existe para encontrar: ambos
estaban en `develop`, empujados, con la ola dada por cerrada.

---

## Tabla general — pantalla por pantalla

Las **44 pantallas** del lienzo, con los mismos identificadores A1–F6 que usa
[plan-rediseño.md](plan-rediseño.md).

**Score de fidelidad (1–100).** 90+ coincide y solo falta pulir · 70–89 la pantalla es
reconocible pero divergen jerarquía o copys · 40–69 hay una versión funcional con otra
composición · 10–39 solo un esbozo o un marcador de posición · 1–9 no existe nada.
Mide fidelidad **visual y de composición**, no si la funcionalidad es correcta.

> ⚠️ **Ninguna pantalla del móvil se ha visto renderizada en un dispositivo.** El score se
> emite leyendo el código contra el lienzo. Lo que está bloqueado y por qué se detalla en
> «Validación en dispositivo», más abajo.

| ID | Pantalla | Código | Score | Qué falta para la fidelidad completa |
|---|---|---|---|---|
| **A1** | Splash | 🟡 `app.config.js` · `scripts/generate-splash-icon.mjs` | **70** | El fondo y el esquema claro salen de los tokens, y **`splash-icon.png` ya no es el logo de Expo**: `pnpm splash` compone el logotipo «ÁrbolApp Huila» rasterizando la misma Montserrat 800 que registra `expo-font`, en `accent` y `accent2`, y `imageWidth` sube de 76 a 240 porque una palabra no se lee al tamaño de un ícono. Faltan las **dos líneas de debajo** —«Sembrando vida en La Plata» y la micro-etiqueta de filiación—: hornearlas en el bitmap las escalaría con el logotipo, así que piden una pantalla de carga real, que es trabajo de la Fase 9 junto al ícono de la app. |
| **A2.1** | Onboarding 1/3 | ✅ `onboarding/index.tsx` | **82** | Composición portada entera: bloque superior al 55 %, velo inferior, pie en `overline` sobre tinta inversa, tres puntos con el activo en `glowAccent`, primario + enlace fantasma. **Falta la fotografía real de campo** — contenido del PRAE. El marco la espera. |
| **A2.2** | Onboarding 2/3 | ✅ `onboarding/prae.tsx` | **82** | Igual que A2.1. Falta la fotografía. |
| **A2.3** | Onboarding 3/3 | ✅ `onboarding/guardian.tsx` | **82** | El bloque **sí está dibujado**: rejilla de mapa en SVG y los cinco pines con sus estados, incluido el seleccionado con halo. Cambia «Siguiente» por «Empezar», como el lienzo. |
| **A3** | Inicio de sesión | ✅ `(auth)/sign-in.tsx` | **92** | Logotipo, título, dos campos, «¿Olvidaste tu contraseña?» alineado a la derecha sobre el botón, primario, «Crear cuenta» como enlace, separador «O» y «Explorar sin cuenta» con borde. Añade un enlace legal al pie que el lienzo no dibuja (PD-05). |
| **A4** | Registro de Guardián | ✅ `(auth)/sign-up.tsx` | **86** | Barra modal, orden de campos del lienzo, enlaces dentro de la etiqueta del checkbox, ayuda de consentimiento centrada y botón bloqueado hasta las dos declaraciones. **«Rol o institución» sigue siendo campo libre y no `Select`** (PD-06: el lienzo dibuja una lista cerrada pero no enumera sus opciones). Añade un subtítulo y un secundario «Ya tengo cuenta» que el lienzo no dibuja. |
| **A5** | Recuperación de contraseña | ✅ `(auth)/forgot-password.tsx` | **92** | Barra modal, subtítulo, campo, primario, salida fantasma y el aviso «Si existe una cuenta…» como caja bajo el formulario en vez de reemplazar la pantalla. |
| **A6** | Verificación de correo | ✅ `(auth)/verify-email.tsx` | **84** | Copys, jerarquía y contador de reenvío correctos. **Falta el medallón con el ícono de sobre**: el kit portado tiene 14 glifos y ninguno es un sobre. |
| **A7** | Privacidad y términos | ✅ `app/legal.tsx` | **80** | Barra modal, aviso provisional, articulado y sello de versión en `overline`. **Faltan las pestañas Privacidad / Términos**: `Tabs` existe, pero repartir el articulado es una decisión de contenido legal sobre un texto que aún es borrador. |
| **A8** | Mapa · exploración sin cuenta | ✅ `(app)/map.tsx` | **88** | Mapa claro, pill de búsqueda, chips, clústeres, leyenda de cuatro estados y `GuestBar`. Tres desviaciones **deliberadas y razonadas en el código**: la búsqueda es botón y no campo, la leyenda usa 12 px en vez de 11 y los controles 44 px en vez de 42 por área táctil. |
| **A9a** | Nueva contraseña · formulario | ✅ `(auth)/reset-password.tsx` | **90** | Barra modal, subtítulo, campo con la ayuda «Mínimo 8 caracteres», primario y cancelar fantasma. Sin campo de confirmación (PD-04). |
| **A9b** | Nueva contraseña · enlace vencido | ✅ `(auth)/reset-password.tsx` | **84** | Título, cuerpo y «Pedir un enlace nuevo». Falta el medallón con el ícono de enlace roto — el kit no lo trae. |
| **A9c** | Nueva contraseña · canjeando | ✅ `(auth)/reset-password.tsx` | **88** | Barra modal y estado de carga centrado. |
| **A10a** | Retorno del enlace · confirmando | ✅ `auth/callback.tsx` | **88** | Estado de carga centrado con «Confirmando tu cuenta…». |
| **A10b** | Retorno del enlace · inválido | ✅ `auth/callback.tsx` | **82** | Título, aviso enmarcado y «Entra a tu cuenta». Falta el medallón del encabezado. |
| **B1** | Mapa con ficha flotante | ✅ `(app)/map.tsx` | **88** | Búsqueda con control de ubicación, chips de municipio y vereda, clústeres, **FAB «Sembrar»**, ficha flotante con especie · ciclo · guardián, chip de estado y «Ver árbol», y las **cuatro pestañas** del lienzo. |
| **B2** | Mis árboles | ✅ `(app)/trees.tsx` | **90** | Encabezado con conteo y pendientes, tarjetas con insignia de estado, línea `VEREDA · CICLO` en `overline`, texto de urgencia y botón «Actualizar» por tarjeta. El badge **«PENDIENTE DE ENVIAR»** ya está, colgado del final de la misma `overline` en `earthBrown` como lo dibuja el lienzo, y el ciclo que muestra es el encolado y no el que alcanzó el servidor. Sin conexión el encabezado dice «vistos sin conexión». **Falta la miniatura real** —hoy es un ícono de reemplazo—. Añade pestañas Pendientes / Todos que el lienzo no dibuja. |
| **B3** | Actividad | ✅ `(app)/activity.tsx` | **90** | Secciones PENDIENTES / ANTERIORES con filas fechadas, derivadas durante el render. La caja de notificaciones desactivadas **ya lee el registro real de este teléfono** y desaparece cuando sí recibe. Añade una tercera sección, RECORDATORIOS, que el lienzo no dibuja — ver la nota bajo la tabla. |
| **B4** | Perfil | ✅ `(app)/profile.tsx` | **84** | Avatar con iniciales, insignia «Guardiana desde», tres fichas, lista de opciones con chevron, cerrar sesión y pie de versión con filiación. **La ficha de CICLOS dibuja su estado vacío**: no hay agregado que la alimente. La edición vive tras «Editar perfil» pero dentro de la misma pantalla, no como ruta propia. |
| **B4b** | Ajustes de notificaciones | ✅ `settings/notifications.tsx` | **88** | Pantalla propia, los dos interruptores con su subtítulo y la nota «Aunque desactives los avisos…». **Los interruptores persisten** en `notification_preferences` y el barrido los respeta; el aviso de «no se guarda nada» desapareció. Añade un bloque superior que dice si este teléfono puede recibir —permiso sin pedir, denegado, o compilación sin proyecto de push—, que el lienzo no dibuja porque fue dibujado cuando no había nada que entregar. |
| **C1.1** | Registrar · paso 1, ubicación | ✅ `features/planting/components/step-location.tsx` | **80** | Mini-mapa, pin arrastrable, círculo de precisión y coordenadas escritas a mano con validación contra la caja de Huila. **Divergencia estructural:** el lienzo pone municipio y vereda en este paso; el código los mueve a un paso propio. |
| **C1.2** | Registrar · paso 2, especie | ✅ `step-species.tsx` | **80** | Campo libre con sugerencias sobre lo ya escrito, resaltado literal del fragmento y la nota de que el texto se guarda tal cual. El resaltado se omite si el fragmento no está carácter a carácter, que es la decisión correcta. **El paso está fusionado con el de datos.** |
| **C1.3** | Registrar · paso 3, datos | 🟡 fusionado en `step-species.tsx` | **72** | Fecha, altura y ramas existen y se validan (fecha real, no futura, altura ≥ 1). **No son un paso propio**: el lienzo dibuja cuatro pasos y el código también, pero con otro corte — `ubicación · zona · especie+datos · foto` frente a `ubicación+zona · especie · datos · foto`. |
| **C1.4** | Registrar · paso 4, foto | ✅ `step-photo.tsx` | **86** | Captura y tarjeta RESUMEN con especie, siembra, ubicación y peso real de la foto en KB. |
| **C1e** | Éxito + permiso | ✅ `planting-success.tsx` | **88** | Confirmación, próxima fecha de foto y código en la variante `data`. **La solicitud de permiso ya levanta el diálogo del sistema** —aquí y en los ajustes, nunca en el onboarding— y el resultado que muestra es el que respondió el sistema: concedido, bloqueado, o compilación sin proyecto de push. |
| **C2** | Detalle del árbol | ✅ `tree/[id].tsx` | **88** | Foto de cabecera con su estado vacío, chip de estado, actualizar bitácora, comparador, gráfica de altura, lista de entradas y tarjeta del guardián. |
| **C3** | Nueva entrada de bitácora | ✅ `log/[treeId].tsx` | **88** | Cámara con **fantasma de la foto anterior**, altura, ramas con `StepperField`, estado de salud en `ChipGroup`, notas y coordenada de captura. |
| **C3m** | Reportar árbol muerto | 🟡 variante de `log/[treeId].tsx` | **74** | Existe como estado de la misma pantalla: elegir «muerto» retira las medidas y exige una causa, que es lo que la restricción `log_entries_cause_when_dead` pide. **El lienzo la dibuja como artboard aparte**, con aviso de consecuencias y foto de evidencia obligatoria. La fusión está razonada en el archivo; se registra como divergencia, no como error. |
| **C4** | Visor de fotografía | ✅ `features/trees/components/photo-viewer.tsx` | **88** | Visor a pantalla completa con velo inferior, pie de ciclo, medidas y coordenada de captura. |
| **D1** | Acceso del coordinador | ✅ `app/sign-in/page.tsx` | **86** | Dos columnas con panel de marca y formulario restringido al rol coordinador, con su mensaje de acceso denegado. |
| **D2** | Tablero de estadísticas | ✅ `app/panel/page.tsx` | **86** | Barra lateral, filtro de municipio, cuatro indicadores sobre las vistas agregadas reales, y los gráficos por vereda y por especie. Comprobado renderizado en la ola 7.2. |
| **D3** | Gestión de usuarios | ✅ `app/panel/users/page.tsx` | **84** | Directorio con rol, conteos, estado y acciones, y la nota de que el correo solo se ve en el panel. |
| **D4** | Moderación · archivado motivado | ✅ `app/panel/moderation/page.tsx` | **86** | Lista de marcados de más antiguo a más nuevo y diálogo de archivado con motivo obligatorio. |
| **D5** | Fusión de especies | ✅ `app/panel/species/page.tsx` | **82** | Claves con conteos, selección de variantes, elección del nombre oficial y deshacer. La página delega entera en `species-merge-screen.tsx`. |
| **D6** | Detalle admin y reasignación | ✅ `app/panel/moderation/[treeId]/page.tsx` | **86** | Ficha de datos, mini-mapa, historial de moderación y reasignación a guardián activo, con aviso si el actual está desactivado. |
| **D7** | Exportación PRAE | ✅ `app/panel/export/page.tsx` | **86** | Tres tarjetas de reporte, CSV real por ruta de API, aviso de que Excel no está y nota de exclusión de correos. |
| **E1** | Mapa público con ficha | 🟡 `app/map/page.tsx` | **62** | Mapa, leyenda, filtros y ficha del árbol existen. **Falta entera la banda de encabezado** que el lienzo dibuja: logotipo, línea de filiación y los **tres indicadores** (vivos · sembrados · supervivencia). Además los copys viven dentro de los componentes en vez de en `texts.ts` —que **sí tiene el bloque `publicMap` escrito y sin usar**— y hay colores `text-red-*` fuera de `packages/core`. |
| **E3** | Variante incrustable | 🟡 `app/map/embed/page.tsx` | **68** | Versión compacta con su modal de detalle. Mismos dos defectos que E1: copys dentro del componente y, hasta esta ola, un `photoPath` que no compilaba. Falta el conteo de vivos y la firma de marca con «Ver el mapa completo». |
| **F1** | Mis árboles · vacío | ✅ en `(app)/trees.tsx` | **86** | Medallón, título, cuerpo y «Sembrar mi primer árbol» con su ícono. |
| **F2** | Offline con cola de pendientes | ✅ `connection-banner.tsx` · `features/sync/` | **88** | **La cola de sincronización existe** (`features/sync/`), así que la pantalla ya no tiene tope de datos. La franja cuenta los registros y trae el enlace «Ver» y el cierre; la sección **PENDIENTES DE ENVIAR** con sus tarjetas de borde discontinuo, su pastilla de estado y la cabecera **SINCRONIZADOS** vive dentro de `(app)/trees.tsx`, que es donde el lienzo la dibuja. Añade dos variantes de franja que el lienzo no dibuja —«enviando» y «no pudimos enviar»— porque la regla de fallo no silencioso las exige en cuanto hay cola. |
| **F3** | Permiso de ubicación | ✅ `location-permission-primer.tsx` | **86** | La pantalla previa existe y explica el uso antes del diálogo del sistema, con la salida «escribir las coordenadas a mano». |
| **F4** | Error de red y sesión expirada | ✅ `ui/screen-state.tsx` | **86** | Estados a pantalla completa con medallón, título, detalle del error y una sola salida. `Notice` queda para el fallo dentro de una pantalla que sigue funcionando. |
| **F5** | GPS impreciso y cámara denegada | ✅ `step-location.tsx` · `photo-capture.tsx` | **82** | Aviso de precisión pobre sobre el mapa y pantalla de cámara desactivada que abre los ajustes del teléfono. Dibujados dentro de sus pantallas, no como artboards propios. |
| **F6** | Errores de perfil · 2 estados | ✅ `(app)/profile.tsx` | **86** | Los dos casos como estados a pantalla completa, sobre el mismo `ScreenState` que F4. |

### La tercera sección de Actividad, y por qué se añadió

El lienzo dibuja PENDIENTES y ANTERIORES. Está bien dibujado y se dibujó cuando **no se
había enviado nunca un recordatorio**: `reminders` existía como tabla y no tenía filas, así
que no había nada que una tercera sección pudiera mostrar.

Ahora las tiene, y la pregunta que responden no cabe en ninguna de las dos. ANTERIORES son
ciclos cerrados: fotografías que el guardián tomó, con su veredicto de puntualidad y su
fecha de captura. Que a alguien le hayan escrito no es un logro, y meterlo ahí lo pondría a
la altura de las fotos que sí lo son. PENDIENTES es lo que se debe hoy, no lo que se avisó.

RECORDATORIOS dice lo que ninguna de las dos puede decir: **qué envió la aplicación y si
llegó**. Un guardián que dice «a mí nunca me avisaron» y un coordinador que mira por qué una
vereda dejó de actualizar preguntan por esa lista. Se registra como divergencia deliberada,
no como error del lienzo.

El estado de cada fila —resuelto, abierto sin foto, entregado— va **en palabras y no en
color**. Son tres resultados en secuencia, y una secuencia pintada necesita tres tonos que se
lean como ordenados; los cinco del seguimiento ya significan otra cosa y ninguno quiere decir
«lo abriste». La palabra además sobrevive a leerse en voz alta.

### Recuento

| Bloque | Pantallas | Fidelidad media |
|---|---|---|
| A · Móvil sin sesión | 15 | **82,3** |
| B · Móvil con sesión | 5 | **84,8** |
| C · Flujos modales | 9 | **82,0** |
| D · Web administración | 7 | **85,1** |
| E · Web mapa público | 2 | **65,0** |
| F · Estados transversales | 6 | **78,5** |
| **Total del lienzo** | **44** | **≈ 82** |

**Las siete peor puntuadas**, que es la lista de trabajo que deja este cierre:

| | Pantalla | Score | Por qué |
|---|---|---|---|
| 1 | **A1** Splash | 35 | No existe el logotipo como asset. Tope de contenido. |
| 2 | **E1** Mapa público | 62 | Falta la banda de encabezado con los tres indicadores. |
| 3 | **E3** Embed | 68 | Falta el conteo de vivos y la firma de marca. |
| 4 | **C1.3** Paso 3, datos | 72 | El wizard corta los cuatro pasos en otro sitio. |
| 5 | **C3m** Árbol muerto | 74 | Resuelta como variante y no como pantalla. |
| 6 | **A6 · A9b · A10b** Medallones | 82–84 | El kit de íconos no trae sobre, enlace roto ni sobre tachado (PD-08). |
| 7 | **A7** Privacidad y términos | 80 | Faltan las pestañas: repartir el articulado es decisión de contenido legal. |

> **Actualizado tras la Fase 5.** B4b sube de 78 a 88 y sale de esta lista: los
> interruptores persisten. B3 sube a 90 y C1e a 88. El puesto que queda libre lo ocupan los
> tres medallones de encabezado que el kit de íconos no trae, que era el siguiente empate.
> Las medias por bloque de la tabla anterior no se han recalculado: se recalculan enteras en
> la próxima medición, no fila a fila.

> **Actualizado al construirse la cola de sincronización offline.** **F2 sube de 45 a 88 y
> sale de esta lista**, que era el peor score que no venía de un asset que falta: la cola
> existe, la sección PENDIENTES DE ENVIAR está maquetada contra el lienzo y la franja tiene
> su «Ver» y su cierre. B2 sube de 86 a 90 al llegarle el badge «PENDIENTE DE ENVIAR». El
> puesto libre lo ocupa A7, que era el siguiente. Las medias por bloque siguen sin
> recalcularse fila a fila.

**Ninguna de las siete es un problema de piel.** Dos son contenido que falta, dos son
decisiones de composición que se tomaron a conciencia y se pueden revertir, dos son trabajo
de maquetación acotado en el mapa público y una espera un texto legal. El rediseño de color,
tipografía y componentes **no pone el techo en ninguna**.

---

## Tabla general — tokens

La columna **declarado** mide si el valor del token coincide con el del sistema de diseño.
La columna **aplicado** mide si eso llega a la pantalla. Se separan porque un token puede ser
correcto y no pintar nada.

Comparación literal de `apps/web/src/app/design-tokens.css` —emitido por `pnpm tokens` desde
`packages/core/src/theme.ts`— contra los `tokens/*.css` del sistema de diseño, normalizando
solo mayúsculas y espacios (`.14` y `0.14` cuentan igual).

| Grupo | Tokens en el sistema | Coinciden | Faltan | Difieren |
|---|---|---|---|---|
| `colors.css` | 62 | 62 | 0 | 0 |
| `spacing.css` | 16 | 16 | 0 | 0 |
| `typography.css` | 21 | 21 | 0 | 0 |
| `effects.css` | 9 | 8 | 0 | 1 |
| **Total** | **108** | **107** | **0** | **1** |

**Tokens que el código define y el sistema de diseño no: ninguno.** No se inventó ni un solo
valor.

### La única diferencia, y por qué es intencionada

```
--focus-ring
  sistema de diseño:  0 0 0 2px var(--surface-page), 0 0 0 4px var(--border-focus)
  código:             0 0 0 2px #F4FDF4,             0 0 0 4px #008D46
```

Son **el mismo anillo**: `--surface-page` es `#F4FDF4` y `--border-focus` es `#008D46`. El
token se compone en TypeScript a partir de los otros dos porque React Native no resuelve
`var()`. Si se dejara la indirección, la web tendría anillo de foco y el móvil no tendría
ninguno. **Fidelidad de valor: 100 %.**

Es la misma excepción que existía en la v1, con los valores del tema claro. Que sobreviva al
cambio entero de paleta es la señal de que la capa de tokens se regeneró y no se parcheó.

### Estado por capa

| Capa | Alcance | Declarado | Aplicado | Estado |
|---|---|---|---|---|
| Color | 62 variables | **100 %** | **100 %** | ✅ |
| Espaciado, radios y área táctil | 16 variables | **100 %** | **100 %** | ✅ |
| Escala tipográfica y familias | 21 variables | **100 %** | **100 %** | ✅ |
| Efectos, sombras y motion | 9 variables | **100 %** | parcial | ✅ |
| **Total de tokens** | **108 variables** | **100 %** | — | ✅ |
| Pantallas vs. lienzo | 44 pantallas | — | **≈ 82 / 100** | 🔧 ver tabla de pantallas |

**Veredicto.** La capa de tokens está completa y verificada contra el lienzo v2. Lo que
separa hoy la aplicación del diseño **no es ni un valor de color ni una tipografía**.

### Una regla que se hereda de esta capa

**No se editan `design-tokens.css` ni `design-tokens.json`.** Los emite `pnpm tokens` desde
TypeScript. Si el sistema de diseño cambia, se corrige `theme.ts` y se regenera; una
corrección escrita a mano en el CSS se pierde en la siguiente ejecución.

### 🔸 Color fuera de `packages/core`

| Dónde | Valor | Situación |
|---|---|---|
| `apps/web/src/features/public-map/public-map.tsx` | `text-red-900/700/800`, `bg-red-100`, `border-red-200` | Ola 6.2. **Corregido en la ola 7.2:** ahora `danger` / `dangerSoft`. |
| `apps/web/src/app/map/tree-card-modal.tsx` | `text-red-600/700/800/900`, `border-red-200` | Ola 6.2. **Corregido en la ola 7.2.** |
| `apps/web/src/features/statistics/components/village-chart.tsx` | `bg-green-950` | **Falso positivo.** Ver abajo. |

**`bg-green-950` no es color fuera de `packages/core`.** `globals.css` declara
`--color-green-950: var(--green-950)` dentro de `@theme inline`, y esa entrada pisa la
rampa por defecto de Tailwind. Comprobado sobre el CSS que emite `pnpm --filter
@arbolapp/web build`: la utilidad compila a `.bg-green-950{background-color:var(--green-950)}`,
es decir `#00592C`, el token. La fila se conserva porque el nombre sigue siendo ambiguo a
la vista, no porque el valor sea ajeno.

La página de ejemplo de `create-next-app` **ya no existe**: la Fase R6 la sustituyó.

---

## Contraste — WCAG AA

**Esta tabla es la salida de `pnpm test:contrast`, transcrita.** El script lee los tokens de
`packages/core/src/theme.ts` y mide contra las cuatro superficies reales. No hay ningún
cálculo a mano en esta sección.

Umbrales: texto pequeño **4.5:1**; texto grande, íconos, puntos y bordes de control **3:1**.
Texto grande empieza en `fontSize.xl` (26) regular o `fontSize.lg` (20) negrita — **`md` (17)
en negrita no califica**.

### Las superficies

```
surfacePage      #F4FDF4        surfaceCard      #FFFFFF
surfaceRaised    #FFFFFF        surfaceOverlay   #FFFFFF
```

**Tres de las cuatro son el mismo blanco.** Las columnas corren casi planas y `surfacePage`,
por ser la más oscura, fija el peor caso. Esto es lo contrario de lo que pasaba en la v1,
donde las cuatro superficies se escalonaban: hoy la jerarquía **no la da la superficie sino
el borde y la sombra**, y por eso `Card` se construye como se construye.

### Tokens sobre las superficies — peor caso

| Token | Hex | page | raised / card / overlay | Peor | Veredicto |
|---|---|---|---|---|---|
| `ink` · `textPrimary` | `#1A1A1A` | 16.74 | 17.40 | **16.74** | ✅ AA |
| `green990` · `emerald900` | `#0A2E1B` | 14.23 | 14.79 | **14.23** | ✅ AA |
| `green950` · `emerald700` | `#00592C` | 8.19 | 8.52 | **8.19** | ✅ AA |
| `textSecondary` | `#4A5A50` | 7.04 | 7.32 | **7.04** | ✅ AA |
| `earthBrown` | `#8B572A` | 5.78 | 6.01 | **5.78** | ✅ AA |
| `green900` · `emerald600` · `accentPressed` · `textLink` | `#00753A` | 5.60 | 5.82 | **5.60** | ✅ AA |
| `ripeRed` · `stateDead` · `danger` | `#E31B23` | 4.54 | 4.72 | **4.54** | ✅ AA |
| `slateGrey` · `stateArchived` · `textMuted` | `#757575` | 4.43 | 4.61 | **4.43** | ⚠️ solo grande |
| `huilaGreen` · `accent` · `stateOk` · `success` · `borderFocus` · `textLinkHover` | `#008D46` | 4.12 | 4.29 | **4.12** | ⚠️ solo grande |
| `brandMagenta` | `#E93CAC` | 3.54 | 3.68 | **3.54** | ⚠️ solo grande |
| `info` · `riverBlue` | `#0097DA` | 3.14 | 3.26 | **3.14** | ⚠️ solo grande |
| `accentStrong` | `#00A552` | 3.11 | 3.23 | **3.11** | ⚠️ solo grande |
| `platenoOrange` · `accent2` · `stateOverdue` | `#F26522` | 3.03 | 3.15 | **3.03** | ⚠️ solo grande |
| `green800` · `emerald400` | `#3FB877` | 2.42 | 2.52 | **2.42** | ⛔ ni grande |
| `green700` · `emerald300` | `#7ED9A8` | 1.63 | 1.70 | **1.63** | ⛔ ni grande |
| `borderStrong` | `#B9D4C1` | 1.52 | 1.58 | **1.52** | ⛔ ni grande |
| `sunYellow` · `stateDue` · `warning` · `brandYellow` | `#FFD700` | 1.35 | 1.40 | **1.35** | ⛔ ni grande |
| `borderSubtle` | `#DCEBDF` | 1.19 | 1.24 | **1.19** | ⛔ ni grande |
| `leafWhite` · `textInverse` | `#F4FDF4` | 1.00 | 1.04 | **1.00** | ⛔ tinta inversa |
| `onAccent` · `onAccent2` | `#FFFFFF` | 1.04 | 1.00 | **1.00** | ⛔ tinta inversa |

### Tinta sobre relleno sólido

| Relleno | Hex | Blanco | Tinta | Mejor tinta | Qué lleva encima |
|---|---|---|---|---|---|
| `accent` | `#008D46` | **4.29** | 4.06 | blanco, **solo grande** | el botón primario |
| `accentStrong` | `#00A552` | 3.23 | **5.39** | tinta, AA | el primario en hover |
| `accentPressed` | `#00753A` | **5.82** | 2.99 | blanco, AA | el primario pulsado |
| `accent2` | `#F26522` | 3.15 | **5.52** | tinta, AA | el acento secundario |
| `stateOk` | `#008D46` | **4.29** | 4.06 | blanco, **solo grande** | chip «al día» sólido |
| `stateDue` | `#FFD700` | 1.40 | **12.41** | tinta, AA | chip «por actualizar» sólido |
| `stateOverdue` | `#F26522` | 3.15 | **5.52** | tinta, AA | chip «vencido» sólido |
| `stateDead` | `#E31B23` | **4.72** | 3.69 | blanco, AA | chip «muerto» sólido |
| `stateArchived` | `#757575` | **4.61** | 3.78 | blanco, AA | chip «archivado» sólido |

### Los pares que no llegan a AA, y qué se decidió

Son **tres**, y ninguno se corrigió en silencio ni se usó igualmente.

#### 1 · Blanco sobre Verde Huilense — `4.29:1`

**El botón primario de toda la aplicación.** Ninguna de las dos tintas que ofrece la paleta
cruza 4.5:1 sobre `#008D46`: el blanco mide 4.29 y la tinta 4.06.

- **Qué se hizo:** nada en el código, y es la decisión correcta. El rótulo del primario se
  compone en la escala de botón, que es texto grande, y ahí el umbral es 3:1, que sí supera.
  El hover (`accentStrong` con tinta, 5.39) y el pulsado (`accentPressed` con blanco, 5.82)
  **sí cruzan AA como texto pequeño**, así que el estado de reposo es el único par corto.
- **Por qué no se cambia aquí:** `--accent` y `--on-accent` son tokens del sistema de diseño.
  Subir el verde a `accentPressed` en reposo arreglaría el contraste y **rompería la
  fidelidad de color contra el lienzo en toda pantalla con un botón**. Es una decisión del
  sistema de diseño, no del código. Registrada como **PD-07** en
  [PLAN-FIDELIDAD-UI.md](PLAN-FIDELIDAD-UI.md).
- **Consecuencia vigente:** ningún rótulo pequeño se pinta en `accent` sobre blanco. Donde
  hacía falta un verde para texto pequeño se usa `textLink` `#00753A` a 5.60:1, y así está
  hecho en `sign-in.tsx`, `tree-list-card.tsx` y el resto.

#### 2 · `#FFD700` sobre blanco — `1.40:1`

**El amarillo de «Por actualizar».** Es el peor par de la paleta y el que más se nota, porque
`due_soon` es un estado que la lista, el mapa y la leyenda tienen que comunicar.

- **Qué se hizo:** el amarillo **nunca lleva texto encima ni se usa como tinta**. Vive como
  relleno sólido —donde la tinta oscura mide 12.41:1, el mejor par de toda la tabla— y como
  punto de color junto a una etiqueta escrita en tinta normal. `StatusDot` y `Badge` están
  construidos así.
- **Sobre el mapa claro** el problema es otro: el marcador amarillo desaparece sobre fondo
  claro. Se resolvió rehaciendo el contorno del sprite, no el relleno. Registrado como
  **PD-09**.
- **Lo que esto obliga:** un chip amarillo **jamás** puede ser un chip de solo color. Si en
  algún sitio el estado se comunicara únicamente con el tono, sería ilegible además de
  inaccesible.

#### 3 · El gris `#757575` — `4.43:1`

`textMuted` y `stateArchived` son el mismo gris y se quedan a siete centésimas de AA.

- **Qué se hizo:** válido como punto, filete, ícono o texto grande; **nunca como texto
  pequeño**. El texto pequeño que debe replegarse usa `textSecondary` `#4A5A50`, a 7.04:1.
- El lienzo **sí lo incumple**: dibuja las micro-etiquetas de artboard y varias ayudas de
  formulario en `text-muted` a 12 px. El código **se separa del lienzo a propósito** en esos
  puntos y lo documenta donde ocurre —la ayuda de consentimiento de A4 es el caso explícito—.
  Cuando el lienzo y la accesibilidad chocan, gana la accesibilidad y queda escrito.

### Lo que encontró medir los pares reales

Seis, todos en el web, y ninguno lo veía la tabla de tokens porque los seis dependen del
fondo o del tamaño, no del token:

| Dónde | Par | Medía | Qué se hizo |
|---|---|---|---|
| `components/panel/sidebar.tsx` | `accent` sobre `accentSoft`, 14 px semibold | **3.82:1** | el ítem activo pasa a `textLink`, **4.83:1** |
| `components/panel/sidebar.tsx` | `accent` sobre blanco, 12 px bold | **4.29:1** | las iniciales del avatar pasan a `textLink`, **5.82:1** |
| `features/trees/…/reassign-panel.tsx` | el mismo avatar | **4.29:1** | igual |
| `features/users/…/user-directory-table.tsx` | `accent` sobre tarjeta, 14 px mono | **4.29:1** | la cifra «al día» pasa a `textLink`, **5.82:1** |
| `components/ui/notice.tsx` | `info` sobre `infoSoft`, ícono de 17 px | **2.76:1** | el glifo pasa a `textSecondary`, como ya hacía el `Notice` del móvil |
| `components/ui/button.tsx` | `textInverse` sobre `stateArchived`, 15 px | **4.43:1** | pasa a `onAccent`, **4.61:1** |

El último merece una línea aparte: el docblock del botón afirmaba «White on
`--state-archived` measures 4.61:1, which clears AA» y era cierto —de **blanco puro**—. El
token debajo era `textInverse`, que es blanco hoja `#F4FDF4` y mide 4.43. El comentario
llevaba meses siendo correcto sobre un color que el código no usaba.

### Las insignias suaves, y una regla que sale de ellas

Los once rellenos suaves se midieron compuestos sobre `surfacePage`. El resultado es uniforme
y vale la pena decirlo como regla:

> **Ninguna insignia suave puede escribir su etiqueta en su propio color.** El mejor caso es
> `dangerSoft` con `danger` a 3.75:1, y el peor `stateDueSoft` con `stateDue` a 1.25:1.

Las cuatro tintas que **sí** funcionan sobre cualquiera de los once rellenos son
`textPrimary` (13.3–15.7), `textSecondary` (5.6–6.6), `earthBrown` (4.6–5.4) y `green950`
(6.5–7.7). Cualquier insignia nueva elige de esas cuatro.

---

## Estados del árbol

Cinco estados, **cinco colores distintos**. Comprobado sobre `colorByTrackingStatus` en
`packages/core/src/theme.ts`:

| Estado | Token | Color | Sobre blanco | Cómo se dibuja |
|---|---|---|---|---|
| `up_to_date` | `--state-ok` | `#008D46` | 4.29 | punto + etiqueta en tinta |
| `due_soon` | `--state-due` | `#FFD700` | 1.40 | punto + etiqueta en tinta · **nunca tinta** |
| `overdue` | `--state-overdue` | `#F26522` | 3.15 | punto + etiqueta en tinta |
| `dead` | `--state-dead` | `#E31B23` | 4.72 | punto + etiqueta |
| `archived` | `--state-archived` | `#757575` | 4.61 | punto + etiqueta · nunca brilla |

**`due_soon` y `overdue` no comparten color** y siguen sin compartirlo tras el rediseño, que
era el riesgo real de reskinear cinco estados a la vez: la escalada de recordatorios va del
día 0 al +30 y el mapa, la lista y la leyenda tienen que distinguir un árbol por vencer de
uno que nadie ha visitado.

---

## Catálogo de componentes — estado tras R2

### Móvil — `apps/mobile/src/components/ui/`

| Catálogo | En el código | Nota |
|---|---|---|
| `Button` | `button.tsx` | ✅ variantes, escala 32/40/48, ícono a la izquierda, variante sólida de estado muerto |
| `IconButton` | `icon-button.tsx` | ✅ **desbloqueado por R2.3**; era el pendiente de la v1 |
| `Input` | `text-field.tsx` | ✅ anillo de foco, prefijo y sufijo |
| `Checkbox` | `checkbox-field.tsx` | ✅ con enlaces dentro de la etiqueta |
| `Select` | `select.tsx` + `option-sheet.tsx` | ✅ campo del lienzo con hoja de opciones |
| `Switch` | `switch.tsx` | ✅ portado en R2.1 |
| `Radio` | — | ➖ **sin portar**: ninguna pantalla del móvil lo usa. La web sí tiene `RadioRow` |
| `Card` | `card.tsx` | ✅ separación por borde y sombra, no por escalón de superficie |
| `Badge` | `badge.tsx` | ✅ cinco estados + acento de marca |
| `Tag` | `tag.tsx` | ✅ |
| `StatusDot` | `status-dot.tsx` | ✅ archivado nunca brilla, halo de selección |
| `Tooltip` | — | ➖ no aplica en móvil |
| `Toast` | `notice.tsx` | ✅ relleno suave y marca por tono con ícono real |
| `Dialog` | `dialog.tsx` | ✅ |
| `Tabs` | `tabs.tsx` | ✅ |

Más los tres que trajo la Fase 4 y sobrevivieron al rediseño: `ChipGroup`, `DateField` y
`StepperField`. Y los del chasis: `Screen` con su ranura de encabezado, `ScreenHeader` y
`ScreenState`.

**14 de 15 del catálogo portados.** El único ausente, `Radio`, no lo pide ninguna pantalla.

### Íconos — `ui/icon.tsx`

El kit se portó en R2.3 con **14 glifos**: `map`, `sprout`, `camera`, `user`, `ruler`,
`locate`, `chevronLeft`, `chevronRight`, `bell`, `check`, `plus`, `wifiOff`, `calendar`,
`clock`.

Eso desbloqueó `IconButton` y las marcas por tono de `Notice`, que en la v1 eran glifos de
texto. **Lo que sigue faltando son los medallones de encabezado** que el lienzo dibuja en A6
(sobre), A9b (enlace roto) y A10b (sobre tachado): son tres piezas que el kit no trae, y por
eso esas tres pantallas puntúan entre 82 y 84 en vez de 90. Registrado como **PD-08**.

### Web — `apps/web/src/components/ui/`

El panel se construyó de cero en R6 sobre su propio conjunto, equivalente pero no idéntico:
`Badge`, `Button`, `Card` / `CardHeading` / `ScreenTitle`, `CheckboxRow` / `RadioRow`,
`DialogContent`, `TextField` / `TextAreaField`, `Notice`, `SearchInput`, `Select`,
`StatCard`, `LoadingState` / `ErrorState` / `EmptyState` / `NoDataSourceState`, y la familia
`Table`.

**Los dos catálogos no comparten código y no tienen por qué**: React Native y el DOM no
pintan igual. Comparten la fuente de valores, que es `packages/core`.

---

## Validación en dispositivo

**Ninguna pantalla del móvil se ha visto renderizada.** Ni en la v1 ni en la v2. Lo que este
documento afirma sobre el móvil sale de leer el código contra el lienzo, y esa distinción no
se difumina en ninguna fila de la tabla.

Lo que impide verlo en este equipo, y lo que hace falta para desbloquearlo, está en la
sección de la ola 7.2 de [plan-rediseño.md](plan-rediseño.md).

**El web sí se vio**, por primera vez en todo el rediseño: el panel entero, pantalla por
pantalla, servido contra Supabase local. Qué se vio y qué no está en esa misma sección, y lo
que el render destapó está más abajo, en la auditoría de accesibilidad.

### La jornada de validación de la Fase 8: no se pudo ejecutar

La Fase 8 existe, entre otras cosas, para cerrar esta deuda, y **no la cierra**. Lo que hace
falta sigue sin estar en el equipo, y se deja escrito con precisión en vez de simulado:

| Qué falta | Sin ello no se puede ver |
|---|---|
| **Android SDK con emulador**, o un dispositivo con depuración USB | absolutamente nada del móvil |
| **API key de Google Maps para Android** | el mapa sale gris: ni sprites, ni vuelo de apertura, ni latido del marcador, ni escala de grises |
| **Proyecto de EAS** | el token de Expo Push, y por tanto el ciclo de recordatorio de extremo a extremo |
| **Development build** | `react-native-maps` y `@sentry/react-native` son módulos nativos y no existen en Expo Go |

Lo que **sí** se ejecutó en esta fase, y es todo lo que se puede ejecutar sin lo anterior:

```
npx expo-doctor                      21/21 checks passed
npx expo export --platform android   empaqueta
npx expo config --type public        el splash resuelve a 240 pt sobre #F4FDF4
pnpm --filter @arbolapp/web build    12 rutas
```

**Nada de eso es haber visto una pantalla**, y no se cuenta como tal en ninguna fila de la
tabla. La lista de comprobación acumulada —los seis puntos de la Fase 3, los seis de la
Fase 5 y los cuatro de arriba— queda pendiente de una jornada con un teléfono delante.

### El mapa con 1.000 árboles

`pnpm test:map` siembra hasta mil árboles y mide lo que sí es medible aquí: la consulta por
viewport contra el stack local y el agrupamiento que corre en el teléfono en cada viewport
asentado. El peor caso del agrupamiento es **0,8 ms, un 4,8 % de un fotograma de 16,67 ms**.

**Los cuadros por segundo durante el paneo NO se midieron.** Esa cifra la produce la vista
nativa de `react-native-maps` rasterizando marcadores mientras la cámara se mueve, y para
eso hacen falta las cuatro cosas de la tabla de arriba. Lo medido dice una sola cosa útil, y
la dice con número: **el JavaScript no es el sospechoso**. Si en el dispositivo hay tirones,
están en el render nativo y se arreglan en la configuración de los marcadores.

### Lo que la Fase 5 deja sin comprobar en un teléfono

El motor de recordatorios se verifica de extremo a extremo contra el stack local con
`pnpm test:reminders`, y ahí se prueba todo lo que vive del lado del servidor: el barrido,
la agrupación, la escalada de cuatro peldaños, la doble ejecución sin duplicar, el retiro del
token muerto y la preferencia. **Nada de eso necesita un teléfono.** Lo que sí lo necesita, y
queda pendiente para la jornada acumulada de la Fase 8:

| Qué | Por qué no se puede comprobar aquí |
|---|---|
| El diálogo del sistema de notificaciones | Solo aparece en un dispositivo real. En emulador no hay servicio de push detrás. |
| El token de Expo Push de verdad | `getExpoPushTokenAsync()` exige un **proyecto de EAS**, y este repositorio todavía no tiene uno. El código lo detecta y lo dice —`no-project-id`— en vez de fallar en silencio. |
| La notificación en la pantalla de bloqueo | Cómo trunca el título y el cuerpo cada lanzador, y si el canal de Android sale con el nombre y el color correctos. |
| El toque que abre la cámara | La ruta y el estado del store están escritos y con tipos; que el sistema entregue la respuesta con la app cerrada solo se ve arrancando desde una notificación. |
| El respaldo local a 60 días | Programar y cancelar se ejercita en código, pero que dispare de verdad a los dos meses no es observable en una sesión. |
| Que el respaldo local y el del servidor no coincidan nunca | La regla es exclusiva por construcción —los locales solo se arman si esta instalación **no** está registrada— pero verlo pide dos teléfonos y dos meses. |

**El proyecto de EAS es la única dependencia externa nueva que introduce esta fase.** Sin él
la aplicación arranca, el mapa funciona, la bitácora funciona y los recordatorios locales
funcionan; lo único que no puede existir es el token, y por tanto el envío desde el servidor
a ese dispositivo. Va en la misma casilla que la API key de Google Maps y la cuenta de Apple
en la tabla de dependencias externas de [plan.md](plan.md).

---

## Accesibilidad — auditoría sobre el tema claro

Pasada de la ola 7.2, sobre cinco frentes: áreas táctiles y etiquetas, tinta pequeña sobre
tokens que no llegan a AA, estado comunicado solo por color, orden de foco en los dos flujos
largos, y copy dentro de componentes.

**Qué es una comprobación aquí.** Todo lo que sigue sale de **leer el código**. Ninguna
pantalla del móvil se vio renderizada y ninguna se declara verificada visualmente. Del web
solo se verificó lo que la compilación permite verificar: qué utilidad de Tailwind existe y
a qué valor resuelve, leyendo el CSS que emite `pnpm --filter @arbolapp/web build`. **No se
usó ningún lector de pantalla, ni en móvil ni en web.**

### Lo que se corrigió

| Dónde | Qué estaba mal | Qué se hizo |
|---|---|---|
| `apps/web/src/app/globals.css` | `--color-danger` nunca se declaró, así que la utilidad `border-danger` de `button.tsx` no generaba regla y el borde no se dibujaba | se declara `--color-danger`, y también `--color-ink` para el velo de los modales |
| `features/public-map/public-map.tsx`, `app/map/tree-card-modal.tsx` | la rampa roja de Tailwind (`bg-red-50/100`, `text-red-600…900`, `border-red-200`) como tono de error | `danger`, `dangerSoft` y tinta neutra, según la regla de las insignias suaves |
| las mismas y `map-legend.tsx`, `map-filters.tsx`, `app/map/page.tsx` | **clases en camelCase que Tailwind nunca tuvo**: `text-textPrimary`, `text-textSecondary`, `bg-surfacePage`, `bg-surfaceRaised`, `border-borderSubtle`, `bg-borderSubtle` | la forma en kebab-case que sí existe |
| `map-filters.tsx` | `bg-primary-dark` y `bg-primary-soft`, que tampoco existen | el `Button` del catálogo |
| `features/public-map/public-map.tsx` | el marcador solo decía la especie: **el estado viajaba únicamente en el relleno del pin** | el nombre del marcador es «especie · estado» |
| `app/map/embed/tree-detail-modal.tsx` | la ficha leía `tree.status` —la columna de ciclo de vida— y lo pasaba por un mapa cuya única clave era `updated`, así que imprimía `alive` en crudo | lee `trackingStatus` y lo nombra con `texts.publicMap.states` |
| `tree-detail-modal.module.css` | la ✕ medía 32 px | `var(--hit-target)`, y anillo de foco visible |
| `tree-card-modal.tsx`, `public-map.tsx`, `map-filters.tsx` | botones a `px-3 py-1` y a `p-2`, entre 26 y 36 px de alto | el `Button` del catálogo, que nace en 44 |
| `map-filters.tsx` | `aria-label="Filtrar por especie"` sobre un botón cuya palabra visible es «Filtros» — el nombre accesible contradecía el rótulo | se quita la etiqueta; el nombre lo da el texto. Se añaden `aria-expanded` y `aria-controls` |
| `tree-detail-modal.tsx` | el diálogo no se anunciaba como tal | `role="dialog"`, `aria-modal` y `aria-labelledby` |
| `public-map.tsx`, `tree-card-modal.tsx`, `tree-detail-modal.tsx` | los estados de carga y de error no eran regiones vivas | `role="status"` y `role="alert"` donde corresponde |
| `apps/mobile/src/app/_layout.tsx` | la lista de variables de entorno que faltan se pintaba en `warning` `#FFD700`, que mide **1.35:1** sobre la página: la única línea útil de esa pantalla era invisible | `danger` a 4.54:1, en la cara mono |
| `features/public-map/public-map.tsx` | el `useEffect` de los marcadores leía `onMarkerClick` sin declararlo. En E3 el callback no está memoizado, así que el oyente quedaba atado a una versión vieja | el callback vive en una ref que un efecto sincroniza |
| todo el mapa público y `components/ui/badge.tsx` | copys en español dentro del JSX, con el bloque `publicMap` de `texts.ts` escrito y sin usar | movidos a `apps/web/src/constants/texts.ts` |

El bloque `publicMap` no cubría todo lo que había en pantalla. Se le añadieron las claves que
faltaban —los nombres de región para lectores, el rótulo del marcador, los dos textos del
`<head>` de E3, «Coordenadas», el alt de la fotografía y los copys de los filtros—.

### Lo que se encontró y no se corrigió

**1 · Los dos modales del mapa público no atrapan el foco.**
`app/map/tree-card-modal.tsx` y `app/map/embed/tree-detail-modal.tsx` son `role="dialog"`
escritos a mano: al abrirse el foco se queda donde estaba, `Escape` no cierra, el tabulador
sale del diálogo y al cerrarlo el foco no vuelve al marcador. El panel no tiene este problema
porque `components/ui/dialog.tsx` se construyó sobre el diálogo de Base UI, que trae la
trampa de foco, la tecla de escape y el cableado de `aria-modal`. **La corrección es
reconstruir las dos fichas sobre `DialogContent`**, que es rehacer dos pantallas y no cabía
en esta pasada.

**2 · Los marcadores del mapa web no se alcanzan con el teclado.**
Son `google.maps.Marker` con `SymbolPath.CIRCLE` a escala 8, es decir 16 px de diámetro —por
debajo de los 44 y de los 24 que pide la versión reducida de la regla—. La ficha del árbol
solo se abre con el ratón. La salida no es agrandar el pin: es la lista de árboles del
viewport que `public-map.module.css` ya tiene estilada (`.treesList`) y que **ningún
componente usa**. Ese fichero CSS está muerto hoy.

**3 · El gris `#757575` como texto pequeño directamente sobre la página.**
La regla del propio documento dice que `textMuted` nunca lleva texto pequeño. Sobre blanco
mide 4.61:1 y pasa, y ahí está bien usado. Sobre `surfacePage` mide **4.43:1** y no pasa, y
el panel lo hace en tres sitios, los tres a 12 px y los tres hijos directos del `<main>` que
`app/panel/layout.tsx` pinta en `surfacePage`:

| Fichero | Línea | Qué dice |
|---|---|---|
| `app/panel/users/page.tsx` | 43 | el aviso de que el correo solo se ve en el panel |
| `app/panel/moderation/page.tsx` | 58 | «se muestran los N árboles con la bitácora más atrasada» |
| `app/panel/export/page.tsx` | 63 | «las exportaciones no quedan registradas todavía» |

Los tres se arreglan cambiando `text-text-muted` por `text-text-secondary`, que mide 7.04:1.
No se tocaron porque son ficheros del panel y en la ola 7.2 hay otro agente trabajando sobre
ellos.

**4 · Las iniciales del avatar en `accent` sobre blanco.**
`components/panel/sidebar.tsx:92` y `features/trees/components/reassign-panel.tsx:123`
escriben las iniciales en `text-xs font-bold` sobre `accent`, que mide **4.29:1**. Es el
mismo par que **PD-07** y la misma decisión: el color lo fija el sistema de diseño. Pero aquí
no hay atenuante de texto grande —12 px negrita no califica— y el móvil sí lo resolvió: sus
iniciales van a 26 pt en la cara display, y `profile.tsx` lo documenta donde ocurre. También
son ficheros del panel.

**5 · `TableFigure` en `text-accent`.**
`features/users/components/user-directory-table.tsx:152` pinta la cifra «al día» en `accent`
sobre la fila blanca: 4.29:1. La cifra no es decorativa, es el dato de la columna. Panel.

**6 · El enlace de descarga del panel mide 36 px.**
`app/panel/export/page.tsx:82` es un `<a download>` renderizado por `Button size="sm"`, que
son 36 px de alto. La variante `sm` está documentada para acciones en línea dentro de una
fila densa de tabla; una tarjeta de exportación no es eso. Panel.

**7 · El asistente de siembra no anuncia el cambio de paso.**
`apps/mobile/src/app/plant.tsx` intercambia el contenido de los cuatro pasos en su sitio. El
foco se queda en el botón «Siguiente», que no cambia de rótulo hasta el último paso, y nada
mueve el foco al encabezado nuevo ni lo anuncia. `WizardHeader` sí expone
`accessibilityRole="progressbar"` con su valor, pero eso se lee al llegar a él, no al
avanzar. El bloqueo de validación sí se anuncia: `Notice` lleva
`accessibilityLiveRegion="polite"`. La bitácora **no** tiene el mismo hueco por accidente —
al pulsar «Reportar muerto» aparece un `Notice` de tono error, y esa región viva es lo que
anuncia el cambio de formulario—. La corrección es `AccessibilityInfo` en `goNext`, y **no
se escribió a ciegas**: no hay dispositivo donde comprobar que el anuncio llega y en qué
orden, y una llamada de accesibilidad que no se ha oído nunca no es una corrección.

**8 · El velo de los modales sigue escrito en hexadecimal.**
`components/ui/dialog.tsx:39` usa `bg-[rgba(26,26,26,0.45)]`. Es el valor correcto —`--ink`
al 45%— pero escrito a mano. Ahora existe `--color-ink`, así que se resuelve con `bg-ink/45`.
Es un fichero del catálogo del panel y se deja para quien lo tenga abierto.

**9 · La ficha del árbol de E1 nunca muestra la fotografía.**
`app/map/tree-card-modal.tsx` tiene las dos ramas de la condición invertidas: si hay
`photoUrl` dibuja un hueco que dice «Sin fotografía», y si no la hay dibuja el mismo texto
más pequeño. No es un defecto de accesibilidad y arreglarlo implica declarar el host de las
URL firmadas en `next.config.ts`, que es trabajo de build.

### Lo que quedó comprobado y está bien

- **El catálogo del móvil cumple los 44 px de punta a punta.** `Button` e `IconButton` no
  crecen la caja, la rellenan con `hitSlop` desde `MIN_TOUCH_TARGET`; `Checkbox`, `ChipGroup`,
  `DateField`, `Select`, `Switch`, `TextField`, `Tabs`, `OptionSheet` y `StepperField` fijan
  `minHeight`. Las 26 pantallas y componentes con `Pressable` etiquetan todos sus controles;
  las tres llamadas a `Card` con `onPress` pasan `accessibilityLabel`.
- **`due_soon` y `overdue` no se fusionaron.** `colorByTrackingStatus` mantiene los cinco
  colores, y ningún sitio los colapsa.
- **El estado nunca viaja solo en el color, ahora también en el web.** El móvil ya lo tenía
  resuelto mejor que nadie: `MapLegend` dibuja los sprites reales de los marcadores, no
  círculos, así que la forma es un segundo canal y la leyenda enseña la clave correcta.
  `Badge` y `StatusDot` ponen el nombre del estado junto al punto y `StatusDot` se esconde de
  los lectores porque la etiqueta ya lo dice. En el web la leyenda y la ficha escriben el
  nombre al lado del punto, y desde esta ola el marcador también.
- **Ninguna insignia escribe su etiqueta en su propio color**, ni en el móvil ni en el web, y
  las dos lo documentan con la medida.
- **Los usos de tinta débil del móvil están medidos donde ocurren.** `accent` aparece como
  texto en cuatro sitios y los cuatro son cara display a 26 pt; `textMuted` aparece a 12 y 13
  px y siempre sobre el blanco, donde mide 4.61:1, con el comentario que lo dice.
- `<html lang="es">` está puesto en `apps/web/src/app/layout.tsx`.

### Lo que solo apareció al renderizar el web

La ola 7.2 sirvió el `next build` contra Supabase local y **miró las pantallas del panel una
a una**, con sesión de coordinadora. El detalle de qué se vio y qué no está en la sección de
la ola 7.2 de [plan-rediseño.md](plan-rediseño.md). Lo que el render destapó y ninguna
comprobación estática podía ver:

| | Hallazgo | Estado |
|---|---|---|
| 1 | **La línea de filiación de D1 va en magenta a 11 px** — `#E93CAC`, **3.54:1**. No pasa AA como texto pequeño, y `CLAUDE.md` reserva el magenta para filiación y no para interfaz. El lienzo **la dibuja así**, y la misma micro-etiqueta aparece en A1, B4 y E1. | 📤 **PD-10**, sin tocar el código |
| 2 | **El panel «Filtros» de E1 abre vacío**: dice «Las especies se cargarán desde la base de datos» y no tiene controles. La pantalla puntúa 62 en parte por esto. | 🔧 trabajo pendiente |
| 3 | Las tarjetas del tablero D2 se estiran a la altura del viewport y centran su contenido: ~300 px de vacío a 1440×1000. Es lo que `flex-1 justify-center` hace; nunca se había visto en pantalla. | 🔧 maquetación |
| 4 | `expo config --type public` deja `android.permission.RECORD_AUDIO` pese a `recordAudioAndroidPermission: false`. **Sin comprobar en prebuild**, que es donde se resolvería. | ⚠️ sin comprobar |
| 5 | Comentario huérfano del tema oscuro en `app.config.js`, hablando de un motivo de puntos de luz que ya no existe. | 🔧 limpieza |

**Lo que el render confirmó y estaba bien:** los cinco estados pintan los cinco colores
exactos —`#008D46`, `#FFD700`, `#F26522`, `#E31B23`, `#757575`—, el botón primario es
`#008D46` con tinta blanca a 48 px de alto, los titulares salen en Montserrat 800, la página
es `#F4FDF4` con texto `#1A1A1A`, y el panel refluye bien a 390 px.

**Esto es la primera vez en todo el rediseño que algo se mira.** Cinco de los hallazgos de
esta tabla los produjo mirar, no leer, y esa es la medida de lo que sigue costando no poder
ver el móvil.

### Lo que no se comprobó

- **Ningún lector de pantalla.** Ni TalkBack, ni VoiceOver, ni NVDA. Todo lo que este bloque
  dice sobre orden de lectura y sobre anuncios sale de leer el árbol de componentes. La
  Fase 8 pedía explícitamente una revisión con lector de pantalla de los flujos de siembra
  y bitácora, y **no se hizo**: TalkBack necesita el dispositivo que no hay, y NVDA sobre el
  panel es posible pero no se ejecutó. Queda en la misma lista que el resto de la jornada
  de validación.
- **El orden de tabulación real del web.** No se recorrió ninguna pantalla con el teclado.
- **Nada del móvil se vio en pantalla**, por lo mismo que dice la sección anterior.
- **El contraste no se recalculó.** Toda cifra de esta sección está copiada de la tabla de
  «Contraste — WCAG AA», que sale de `pnpm test:contrast`.
- **Los tamaños táctiles del web no se midieron en un navegador**, se leyeron de la utilidad
  aplicada: `min-h-hit` es `var(--hit-target)` y las alturas de `Button` son `h-9`, `h-11` y
  `h-12`.

---

## Cómo se reproduce esta medición

```bash
export PATH="/c/Users/etherion/AppData/Roaming/nvm/v24.14.1:$PATH"

pnpm tokens          # regenera design-tokens.css y .json desde packages/core
pnpm typecheck       # los tres paquetes
pnpm lint
pnpm format:check
pnpm test:contrast   # de aquí sale la tabla de contraste, literalmente
pnpm test:integrity  # las marcas de registro y la cola de revisión, contra el stack local
pnpm test:map        # el mapa con 1.000 árboles simulados
pnpm splash          # regenera el logotipo del splash desde Montserrat

pnpm --filter @arbolapp/web build
cd apps/mobile
npx expo config --type public
npx expo-doctor
npx expo export --platform android
```

El lienzo y los tokens del sistema se bajan con el MCP `claude_design` (`DesignSync
get_file`) desde los dos proyectos que lista [CLAUDE.md](CLAUDE.md). **`WebFetch` sobre
`claude.ai/design` devuelve 403**, y el MCP solo está disponible en la sesión principal: un
subagente al que se le pida «consulta el lienzo» se queda bloqueado. Se baja a disco primero.

**Estado en esta medición:** `typecheck`, `lint` y `format:check` en verde tras las dos
correcciones descritas arriba. `pnpm test:contrast` termina con «All 47 foreground tokens
match the rules documented in packages/core/src/theme.ts».

### Advertencias de lint que quedan vivas

**Ninguna.** Las cinco de la ola 6.2 cayeron en la 7.2:

| Archivo | Aviso | Cómo se cerró |
|---|---|---|
| `app/map/tree-card-modal.tsx` | `treeId` declarado y sin usar | se quita de las props; el llamador ya no lo pasa |
| `features/public-map/public-map.tsx` | `useMemo`, `TrackingStatus` y `filters` sin usar | se quitan. `filters` sigue en el contrato de `PublicMapProps`, que es de donde lo lee E1; lo que sobraba era desestructurarlo |
| `features/public-map/public-map.tsx` | `useEffect` con `onMarkerClick` fuera del array de dependencias | el callback pasa por una ref que un efecto sincroniza |

El último no era cosmético, y meterlo en las dependencias tampoco valía: E3 pasa una función
sin memoizar, así que el efecto habría reconstruido todos los marcadores en cada render.
