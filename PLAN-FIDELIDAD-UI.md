# Plan de trabajo — fidelidad de la interfaz

> Versión 1 · 21 de agosto de 2026 · rama `ui-fidelidad`, desde `develop` @ `83dda86`
> Medición de partida: [FIDELIDAD-UI.md](FIDELIDAD-UI.md)
> Plan de producto: [plan.md](plan.md) — este documento **no lo sustituye**. Aquel construye
> funcionalidad por fases; este reconcilia con el lienzo lo que ya existe.

## Punto de partida

| Métrica | Hoy | Objetivo del plan |
|---|---|---|
| **Fidelidad de lo construido** — media de las 16 pantallas que tienen código | **57,8** | **≈ 83** |
| Bloque A · móvil sin sesión | 68,2 | ≈ 90 |
| Fidelidad global del lienzo — las 38 pantallas | 25 | ≈ 35 |

La métrica que este plan mueve es la primera. **La global no puede subir mucho aquí**: 22 de
las 38 pantallas no tienen una línea de código y construirlas es trabajo de las Fases 4 a 7
de [plan.md](plan.md), no de fidelidad. Prometer otra cosa sería confundir dos tareas.

Ni los tokens ni las tipografías ponen ya el techo: los 95 tokens coinciden al 100 % y las
tres familias se cargan en las dos plataformas. **El techo actual es el catálogo de
componentes y la maquetación.**

---

## Cómo se pide un ajuste al diseño

El lienzo de Claude Design es la fuente de verdad. Pero implementar una pantalla revela cosas
que dibujarla no revela, y un agente que se topa con una de ellas no debe ni improvisar ni
quedarse parado. Hay tres niveles, y la frontera entre ellos es una sola pregunta:

> **¿El cambio altera para qué sirve la pantalla, o cómo se llega a ella?**
> Si sí, es radical: se detiene y se pregunta.
> Si solo altera cómo muestra lo que ya muestra, es un ajuste.

### Nivel 1 · Ajuste menor — el agente lo aplica y lo documenta

No necesita aprobación previa. Son casos donde seguir el dibujo al pie de la letra rompería
algo que este proyecto no puede romper:

- **Accesibilidad.** Contraste por debajo de AA en texto pequeño, área táctil por debajo de
  44 px, cuerpo de texto por debajo de 12 px. La app se lee a pleno sol, de pie, en una
  vereda, y a veces con una mano sujetando una rama.
- **Un estado que el lienzo no dibujó** de una pantalla que sí dibujó: cargando, vacío,
  error, deshabilitado, sin conexión.
- **Una restricción de plataforma** que hace imposible la interacción dibujada.
- **Un texto que contradice a otra pantalla** ya implementada.

**Obligatorio en los tres casos:** comentario en el código explicando el porqué, fila
actualizada en `FIDELIDAD-UI.md`, y entrada en el registro de desviaciones de abajo.

> **Precedente ya en el repositorio.** A8 tiene tres desviaciones de este nivel, razonadas en
> `map-search-bar.tsx` y `map-legend.tsx`: la búsqueda es botón y no campo porque el teclado
> taparía el mapa, la leyenda usa 12 px en vez de 11, y los controles 44 px en vez de 42. Ese
> es exactamente el estándar de prueba: si no puedes escribir el comentario, no es un ajuste
> de nivel 1.

### Nivel 2 · Requiere el lienzo — el agente redacta la petición, no la maqueta

El agente **nunca inventa disposición, color ni tipografía definitivos**. Cuando falta
diseño, redacta una petición y sigue con otra pantalla. Casos:

- Una pantalla que existe en el código y no en el lienzo.
- Una pantalla **nueva** que la implementación revela necesaria: un paso de confirmación, un
  estado intermedio, una bifurcación que en el dibujo no se veía.
- Un campo que el modelo de datos exige y el lienzo no dibujó.
- Una inconsistencia entre dos pantallas del propio lienzo.

Mientras llega el diseño, hay dos salidas legítimas: **dejar la pantalla sin tocar y seguir
con otra** (preferible), o implementar una versión provisional marcada como tal en el código
y con score congelado en `FIDELIDAD-UI.md`. Nunca dar por buena una maqueta inventada.

**Formato de la petición.** Cada una se escribe en el registro de abajo con estos campos:

```
### PD-00 · <nombre de la pantalla o del estado>

Bloque y posición sugerida:  (p. ej. «bloque A, después de A8»)
Por qué hace falta:          (qué reveló la implementación)
Archivo del código:          (ruta)
Estados a dibujar:           (lista)
Copys definitivos:           (literales de constants/texts.ts — no reescribir)
Precedente en el lienzo:     (qué pantalla ya dibujada sirve de patrón)
Qué NO cambiar:              (lo que la petición no debe tocar)
```

De ahí sale el prompt para Claude Design. **La petición la lleva el usuario**, no el agente:
escribir en el lienzo es una acción hacia fuera y no se hace sin que la pidan.

### Nivel 3 · Radical — se detiene y se pregunta al usuario

No son peticiones de diseño, son **decisiones de producto**. El agente se detiene:

- Cambiar la estructura de navegación: número de pestañas, orden del flujo, qué pantalla es
  la entrada.
- Quitar o añadir una pantalla del alcance de la v1.
- Cambiar la acción principal de una pantalla.
- Tocar la paleta, los **cinco colores de estado del árbol**, la escala tipográfica o la
  marca.
- Cualquier cosa que contradiga las reglas de dominio de `CLAUDE.md`.

### La deuda inversa

Toda desviación aceptada de nivel 1 **tiene que acabar entrando al lienzo**. Si no, la
siguiente medición la vuelve a marcar como defecto y alguien la «corrige» deshaciendo una
decisión razonada. Por eso el registro:

| # | Pantalla | Desviación | Nivel | Razonada en | ¿En el lienzo? |
|---|---|---|---|---|---|
| D-01 | A8 | Búsqueda como botón, no campo de texto | 1 | `map-search-bar.tsx` | ⛔ pendiente |
| D-02 | A8 | Leyenda a 12 px en vez de 11 | 1 | `map-legend.tsx` | ⛔ pendiente |
| D-03 | A8 | Controles a 44 px en vez de 42 | 1 | `map-search-bar.tsx` | ⛔ pendiente |
| D-04 | `Badge` | El rótulo de «Archivado» y el de marca no usan su color de estado, sino un neutro legible. El color sigue en el borde y el punto. | 1 | `badge.tsx` | ⛔ pendiente |
| D-05 | `Tabs` | Alto 44 px en vez de 34 | 1 | `tabs.tsx` | ⛔ pendiente |
| D-06 | `Tag` | La ✕ conserva sus 12 px pero su área táctil crece a 44 con `hitSlop` | 1 | `tag.tsx` | ⛔ pendiente |
| D-07 | `Button` | `sm` y `md` conservan los 32/40 del catálogo y llegan a 44 con `hitSlop` | 1 | `button.tsx` | ⛔ pendiente |
| D-08 | `Select` | Abre una hoja de opciones en vez de un desplegable nativo | 1 | `select.tsx` | ⛔ pendiente |
| D-09 | `Select` | El texto de sugerencia usa `textSecondary`, no el gris `textMuted` del catálogo | 1 | `select.tsx` | ⛔ pendiente |
| D-10 | A8 | La `GuestBar` lleva un enlace «Privacidad y términos» que el lienzo no dibuja | 1 | `guest-bar.tsx` | 📤 pedido como PD-05 |

**D-10 merece explicación porque nació de retirar algo.** Al quitar la pestaña «Cuenta»
—que el lienzo no tiene— el invitado se quedaba **sin ninguna puerta al aviso de
privacidad**: las otras tres rutas a `/legal` salen de perfil, acceso y registro, todas tras
la pantalla de acceso. Un visitante que abre la app y se queda en el mapa está siendo
geolocalizado y está viendo datos de guardianes, y la Ley 1581 no admite que el aviso esté
una pantalla más adentro. El enlace es discreto, en `textSecondary`, para no competir con
las dos acciones que la pantalla sí pide.

**D-04 y D-09 son la misma regla aplicada dos veces**, y merece la pena decirla entera: el
sistema de diseño usa `--text-muted` y `--state-archived` —el mismo gris— como texto pequeño
en varios sitios, y ese gris no llega al 4.5:1. **En este proyecto el gris se queda en el
borde, el punto y el icono; el texto pasa a `textSecondary`.**

> **Remedido sobre el tema claro el 22 de agosto de 2026.** El gris ya no es `#66796F` a
> 4.01:1 sino `#757575` a **4.43:1** sobre `surface-page`. La cifra cambia, la regla no: sigue
> por debajo de 4.5 y sigue sin poder llevar texto pequeño. El detalle está en
> «Contraste sobre el tema claro» más abajo.

---

## Contraste sobre el tema claro

Medición del 22 de agosto de 2026, con `pnpm test:contrast`. El script lee los tokens de
`packages/core/src/theme.ts` —no una copia— y falla si alguno deja de cumplir la regla que el
docblock de ese archivo declara para él. Las reglas por token viven ahí, que es donde las
busca quien va a elegir un color; aquí solo está el **veredicto de cada excepción que ya
estaba escrita en el código**.

Todas se razonaron sobre fondo oscuro y todas había que rehacerlas. Ninguna se toca en esta
ola: reescribir componentes es R2 y R3.

| # | Dónde | Excepción tal como está hoy | Veredicto |
|---|---|---|---|
| C-01 | `ui/badge.tsx` | «Archivado» y el rótulo de marca usan un neutro legible en vez de su color de estado. El comentario cita 3.44:1 y 4.34:1 sobre tarjeta oscura. | **Se mantiene y se extiende a los cinco tonos.** Las cifras cambian pero el sentido no: ningún tono llega a 4.5 sobre su propio relleno. Cifras nuevas en PD-07. |
| C-02 | `ui/select.tsx` | El texto de sugerencia usa `textSecondary` en vez del gris del catálogo. Cita 3.4:1. | **Se mantiene.** El gris es ahora `#757575` a **4.43:1** sobre la página: sigue sin llegar a 4.5. Corregir solo la cifra del comentario. |
| C-03 | `features/map/map-legend.tsx` | Las etiquetas de la leyenda en `textSecondary` a 12 px. | **Se mantiene, y deja de ser desviación.** El lienzo v2 dibuja esa misma leyenda con `--text-secondary` y el color solo en el punto. El código y el lienzo coinciden. |
| C-04 | `features/map/tree-summary-sheet.tsx` | La línea de metadatos en `textSecondary` en vez del gris. Cita 3.44:1. | **Se mantiene.** Mismo caso que C-02: 4.43:1, sigue corto. Corregir la cifra. |
| C-05 | `constants/theme.ts`, `bodyMuted` | `textSecondary` en vez del gris. Cita 4.01:1. | **Se mantiene.** La cifra correcta es **4.43:1**. |
| C-06 | `ui/dialog.tsx` | El cuerpo se pone en `surfaceCard` y no en `surfaceOverlay` porque `danger` «solo llega a 4.31:1 sobre el overlay». | **Desaparece.** En la paleta v2 `surfaceCard` y `surfaceOverlay` son **el mismo `#FFFFFF`**, así que la elección ya no defiende nada: `danger` da 4.72:1 en las dos y 4.54:1 sobre la página. El componente puede quedarse donde está, pero el razonamiento de contraste se retira. |
| C-07 | `ui/button.tsx`, rótulo `primary` | El comentario dice «tinta oscura sobre el relleno verde: el par supera AA de sobra, cosa que el blanco sobre ese mismo verde no hace». | **Se retira: hoy es falso en las dos direcciones.** El código ya usa `onAccent`, que en v2 es **blanco**, así que el comentario contradice a su propia línea. Y ninguna de las dos tintas supera AA: blanco 4.29:1, tinta oscura 4.06:1. Escala a **PD-07**. |
| C-08 | `ui/button.tsx`, rótulo `ghost` | Usa `emerald400` porque «es un paso más brillante que el relleno del acento, y eso es lo que lo mantiene legible sin fondo». | **Cambia a `textLink` `#00753A`.** El razonamiento era de tema oscuro: sobre papel blanco `emerald400` `#3FB877` cae a **2.42:1**, por debajo incluso del 3:1. Es un rótulo prácticamente invisible. `textLink` da **5.60:1** y ya es el verde que la paleta reserva para texto. |
| C-09 | `ui/status-dot.tsx` | El anillo del punto es `rgba(7, 14, 12, 0.9)` «contra el suelo nocturno, para que el punto siga legible sobre una teja pálida». | **El anillo se queda; el motivo se reescribe.** Ya no hay suelo nocturno, pero el anillo sigue haciendo falta y sigue funcionando: separa el punto de una teja clara a 14.86:1 y mantiene ≥3:1 con los cinco estados (el peor es `stateDead`, 3.27:1). Lo que caduca es la frase, no el valor. |

### Dos hallazgos que la lista no traía

- **`map-search-bar.tsx` tiene un fondo del tema oscuro sin migrar.** La barra se pinta con
  `rgba(21, 37, 31, 0.92)`, que compuesto sobre la página da `#273630`, casi negro. Sobre él,
  el `textSecondary` que el propio archivo eligió «porque supera AA en toda superficie» da
  **1.73:1**, y el marcador de posición es ilegible. La excepción de C-02 es correcta; lo que
  está roto es la superficie. **Es trabajo de R2 y merece prioridad**, porque es la primera
  pantalla de la app.
- **C-08 es el mismo tipo de resto**: un token pensado para brillar sobre negro que en papel
  blanco desaparece. Conviene barrer `emerald300`, `emerald400`, `green700` y `green800` en
  R2: los cuatro están por debajo de 3:1 y ninguno puede llevar texto ni icono.

---

## Registro de peticiones de diseño

Estado al 21 de agosto de 2026. Los copys citados son **literales verificados** contra
`apps/mobile/src/constants/texts.ts`: están en producción y no se reescriben.

| # | Qué | Bloquea | Estado |
|---|---|---|---|
| PD-01 | A9 Nueva contraseña, 3 estados | U3, U4 | ✅ **dibujada** — A9a, A9b, A9c |
| PD-02 | A10 Retorno del enlace de correo, 2 estados | U3 | ✅ **dibujada** — A10a, A10b |
| PD-03 | F6 Errores de perfil, 2 estados | U4 | ✅ **dibujada** |
| PD-04 | Incoherencia A4 / A9 sobre confirmar contraseña | U3 | ✅ **resuelta** — sin confirmación en ninguna |
| PD-05 | Enlace al aviso legal en la barra de A8 | — | 📤 redactada en U2 |
| PD-06 | Qué opciones lleva el `Select` de «Rol o institución» de A4 | A4 | 📤 redactada en U3 |
| PD-07 | Tinta blanca sobre `--accent` en el botón primario, y la insignia de estado | **R2 entera** | 📤 redactada el 22 de agosto de 2026 |

### PD-07 · El botón primario y la insignia de estado no llegan a AA

| | |
|---|---|
| **Bloque y posición** | No es pantalla nueva. Afecta al `Button` primario y al `Badge`, es decir a casi todos los artboards del lienzo v2. |
| **Por qué hace falta** | `scripts/check-contrast.mjs` mide la paleta 2026 contra WCAG 2.1. El botón primario es `--on-accent` (blanco) sobre `--accent` `#008D46`: **4.29:1**, por debajo del 4.5:1 que exige el texto pequeño. El lienzo v2 lo dibuja así **35 veces**, a 13, 14, 15 y 16 px, todos tamaños pequeños. Invertir la tinta no salva nada: `--text-primary` sobre el mismo verde da **4.06:1**, peor. **Ninguna tinta de la paleta funciona sobre `--accent`**, así que la solución no está en el código. |
| **Archivo del código** | `apps/mobile/src/components/ui/button.tsx` (variante `primary`), `apps/mobile/src/components/ui/badge.tsx` |
| **Qué hace falta decidir** | Ver las cuatro opciones de abajo. |
| **Qué NO cambiar** | El Verde Huilense `#008D46` **sigue siendo el primario de la marca** y el naranja `#F26522` el secundario. La petición no propone repintar la marca, sino decidir qué relleno lleva el control que se pulsa. |

**Opciones para el botón primario, con la cifra de cada una:**

| # | Propuesta | Ratio con blanco | Coste |
|---|---|---|---|
| A | Rellenar con `--accent-pressed` `#00753A` y dejar `--accent` para bordes, iconos y el punto de estado | **5.82:1** ✅ | El botón se oscurece un paso. `--accent-pressed` queda libre para otro valor. |
| B | Oscurecer `--accent` mismo hasta cruzar 4.5:1 | — | Toca la marca. Es **nivel 3**: no lo decide un agente. |
| C | Subir el rótulo a texto grande (≥20 px en negrita o ≥26 px normal) | 4.29:1 vale como texto grande | Rompe la escala del lienzo, que usa 13–16 px, y hace enormes todos los botones. |
| D | Aceptar el 3:1 de gráficos y documentar la excepción | 4.29:1 la cumple | **Es la opción que más se paga aquí**: la app se lee a pleno sol, de pie, en una vereda, que es exactamente el escenario para el que existe el 4.5:1. |

**Recomendación: la opción A.** Es la única que cruza AA sin tocar la marca ni la escala
tipográfica, y `#00753A` ya está en la paleta como `--accent-pressed`, `--text-link`,
`--green-900` y `--emerald-600`, así que no inventa ningún verde nuevo.

**La insignia de estado es un problema aparte, y más grave.** Ninguno de los once rellenos
`*-soft` puede llevar su propio color como rótulo una vez compuesto el alfa sobre la página:

| Insignia | Su color como tinta | `--text-primary` | `--text-secondary` | `--earth-brown` |
|---|---|---|---|---|
| Al día | 3.45 ⛔ | 14.00 ✅ | 5.89 ✅ | 4.83 ✅ |
| Por actualizar | **1.25** ⛔⛔ | 15.52 ✅ | 6.52 ✅ | 5.36 ✅ |
| Vencido | 2.55 ⛔ | 14.08 ✅ | 5.92 ✅ | 4.86 ✅ |
| Muerto | 3.62 ⛔ | 13.34 ✅ | 5.61 ✅ | 4.61 ✅ |
| Archivado | 3.66 ⛔ | 13.82 ✅ | 5.81 ✅ | 4.77 ✅ |
| Juventud en línea | 2.95 ⛔ | 13.96 ✅ | 5.87 ✅ | 4.82 ✅ |

**Y aquí el lienzo v2 ya decidió, al menos para el amarillo.** «Por actualizar» se dibuja con
relleno `--state-due-soft`, punto `--state-due` y **rótulo `--earth-brown` `#8B572A`**, que
da 5.36:1 sobre ese relleno. Sin borde. Es exactamente el patrón que hace falta, y la guía
`guidelines/colors-states.html` lo refuerza: dibuja los cinco estados como punto de color con
la etiqueta en `--text-primary`.

**Lo que falta decidir, entonces, no es el amarillo sino los otros cuatro.** El componente
`components/display/Badge.jsx` del sistema de diseño sigue poniendo `color: var(--state-ok)`,
`var(--state-overdue)`, `var(--state-archived)` y `var(--jil-magenta)` como tinta, y el lienzo
v2 le hace caso en esos cuatro. Las tres fuentes no coinciden entre sí. La pregunta para
diseño es: **¿se extiende el patrón de `--earth-brown` a los cinco estados —una tinta oscura
propia de cada color— o los cinco pasan a `--text-primary` como ya hace la guía de estados?**

> ⚠️ Mientras PD-07 no se resuelva, `Badge` **no puede** usar el color de estado como rótulo
> en ningún tono. El color vive en el borde y el punto. Es la regla que D-04 ya aplicaba a dos
> tonos y que la medición extiende a los cinco.

### PD-06 · Las opciones del select de A4

| | |
|---|---|
| **Bloque y posición** | A4, campo «Rol o institución». No es pantalla nueva. |
| **Por qué hace falta** | El lienzo dibuja el campo como **lista cerrada** con «Egresada» elegida, pero **nunca enumera las opciones**. Y `users.institution` es `text` libre y anulable en la base. Convertirlo en lista decide qué puede contestar un guardián, y eso no se deduce de un dibujo. |
| **Archivo del código** | `apps/mobile/src/app/(auth)/sign-up.tsx`, hoy un campo de texto |
| **Qué hace falta decidir** | La lista de valores, si admite «Otra» con texto libre, y si el campo sigue siendo opcional. D3 muestra «Egresada», «Docente» y «Representante» en la tabla de usuarios, que parecen tres de ellos. |
| **Consecuencia técnica** | Si la lista es cerrada, `institution` deja de ser texto libre y necesita catálogo o `check`, lo que es cambio de esquema y migración versionada. |
| **Qué NO cambiar** | El orden del campo dentro del formulario, ya alineado con el lienzo. |

### PD-05 · Enlace al aviso legal en la barra del mapa sin cuenta

| | |
|---|---|
| **Bloque y posición** | A8, dentro de la barra inferior. No es pantalla nueva. |
| **Por qué hace falta** | La pestaña «Cuenta» se retiró en U2 porque el lienzo no la dibuja, y con ella se fue la única ruta a `/legal` que tenía un invitado. Las otras tres salen de perfil, acceso y registro. |
| **Archivo del código** | `apps/mobile/src/features/map/components/guest-bar.tsx` |
| **Qué dibujar** | Un tercer enlace, «Privacidad y términos», junto a «Entrar» y por debajo de «Crear cuenta de guardián». Discreto, en `--text-secondary`. |
| **Qué NO cambiar** | La jerarquía: «Crear cuenta de guardián» sigue siendo la acción principal y el enlace legal no compite con ella. |

**Las cuatro llegaron el 21 de agosto de 2026 y las cuatro se validaron contra el lienzo.**
Los siete estados existen con los copys literales, y PD-04 se resolvió por la recomendación:
`Especificación de Pantallas.dc.html` recoge que *ninguna creación de contraseña lleva campo
de confirmación*. Consecuencias directas para U3:

- **Quitar el campo de confirmación de `reset-password.tsx` y de `sign-up.tsx`**, con sus
  campos en el esquema de Zod. El lienzo solo nombra el primero, pero la decisión está
  escrita como regla y A4 nunca lo tuvo dibujado.
- **Añadir la ayuda «Mínimo 8 caracteres» a A9a**, que el lienzo dibuja y el código no tiene.
- A9 y A10 necesitan la **barra modal** de U2, como el resto del bloque A.

**Dos huecos menores, ninguno bloqueante:**

- A10 y F6 **no tienen ficha** en `Especificación de Pantallas.dc.html`; A9 sí. La spec ya
  estaba parcial por diseño, y el lienzo manda en disposición, así que no frena U3.
- `github.md` del proyecto de diseño sigue apuntando a la rama `fase-0-fundaciones`, que ya
  no existe, y a `packages/core/src/dominio.ts`, renombrado a `domain.ts`. Conviene
  resincronizar contra `develop`.

### PD-01 · A9 Nueva contraseña

| | |
|---|---|
| **Bloque y posición** | Bloque A, después de A8. Sigue a A5 en el flujo. |
| **Por qué hace falta** | A5 dibuja *pedir* el enlace de recuperación, pero no la pantalla donde se escribe la contraseña nueva. Es donde aterriza el enlace del correo, así que un guardián que recupera su cuenta la ve siempre. |
| **Archivo del código** | `apps/mobile/src/app/(auth)/reset-password.tsx` |
| **Precedente en el lienzo** | A4 para el formulario, A5 para la barra modal y el bloque informativo. |

**Estados a dibujar — tres, uno al lado del otro.** Los tres llevan la barra de encabezado
modal (flecha atrás + título) que usan A4, A5, A6 y A7.

*A9a · Formulario* — es el estado normal.

| Elemento | Copy literal |
|---|---|
| Título | `Nueva contraseña` |
| Subtítulo | `Elige una contraseña que no uses en otro lado.` |
| Campo 1 | `Contraseña nueva` — con alternador de visibilidad, como A3 |
| Campo 2 | `Repite la contraseña nueva` — **ver PD-04 antes de dibujarlo** |
| Botón primario | `Guardar contraseña` |
| Enlace secundario | `Cancelar y volver a iniciar sesión` |

*A9b · Enlace vencido* — el enlace ya se usó o caducó.

| Elemento | Copy literal |
|---|---|
| Título | `El enlace ya no sirve` |
| Cuerpo | `Este enlace ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».` |
| Botón primario | `Pedir un enlace nuevo` |

*A9c · Canjeando el enlace* — el instante en que el código del correo se cambia por una
sesión. Estado de carga a pantalla completa, indicador en `--accent`, texto `Cargando…`.

**Qué NO cambiar:** el flujo de recuperación (A5 → correo → A9), ni los copys de arriba.

### PD-02 · A10 Retorno del enlace de correo

| | |
|---|---|
| **Bloque y posición** | Bloque A, después de A9. Es la contraparte de A6. |
| **Por qué hace falta** | Al tocar el enlace de verificación desde el correo, la app abre esta pantalla puente mientras canjea el código. Si el enlace ya no sirve, es aquí donde se dice. |
| **Archivo del código** | `apps/mobile/src/app/auth/callback.tsx` |
| **Precedente en el lienzo** | A6 para el tono y el ícono; A9c para el estado de carga. |

*A10a · Confirmando* — carga a pantalla completa con el texto `Confirmando tu cuenta…`.

*A10b · Enlace inválido*

| Elemento | Copy literal |
|---|---|
| Título | `El enlace ya no sirve` |
| Aviso en tono de error | `Ese enlace venció o ya se usó. Pide uno nuevo.` |
| Botón primario | `Entra a tu cuenta` |

**Qué NO cambiar:** que sea una pantalla de paso. Cuando el canje funciona nadie la ve más de
un instante, y el diseño no debe convertirla en un paso con confirmación manual.

### PD-03 · F6 Errores de perfil

| | |
|---|---|
| **Bloque y posición** | Bloque F, después de F5. |
| **Por qué hace falta** | El perfil tiene dos fallos que el lienzo no cubre y que hoy se pintan como avisos sueltos dentro de la pantalla, no como los estados a pantalla completa que F4 sí dibuja. |
| **Archivo del código** | `apps/mobile/src/app/(app)/profile.tsx` |
| **Precedente en el lienzo** | F4, los dos estados a pantalla completa. Mismo patrón exacto. |

*F6a · No se pudo cargar*

| Elemento | Copy literal |
|---|---|
| Título | `No pudimos cargar tu perfil` |
| Aviso en tono de error | `No pudimos completar la acción. Inténtalo de nuevo en un momento.` |
| Botón | `Reintentar` |

*F6b · Cuenta sin perfil de Guardián* — la cuenta existe pero no tiene fila de perfil. Solo
pasa si la identidad se creó fuera de la app, y por eso la salida es cerrar sesión.

| Elemento | Copy literal |
|---|---|
| Título | `No encontramos tu perfil` |
| Cuerpo | `Tu cuenta existe pero no tiene perfil de Guardián. Cierra sesión y vuelve a entrar; si sigue igual, escribe a la coordinación del PRAE.` |
| Botón destructivo | `Cerrar sesión` |

**Qué NO cambiar:** que F6b ofrezca cerrar sesión y no reintentar. Reintentar no arregla una
cuenta sin perfil, y ofrecerlo haría girar al guardián en un bucle.

### PD-04 · Incoherencia del lienzo — confirmar la contraseña

**No es una pantalla nueva: es una contradicción que hay que resolver antes de dibujar A9a.**

- **A4 Registro de Guardián** no lleva campo de confirmación. Lleva alternador de visibilidad
  y la ayuda `Mínimo 8 caracteres`.
- **El código de A4** sí lo lleva (`Repite la contraseña`), y por eso la medición lo marca
  como sobrante.
- **A9a**, si se dibuja como está el código, lo llevaría también — perpetuando la
  contradicción dentro del propio lienzo.

**Recomendación:** quitarlo en las dos. El alternador de visibilidad ya deja verificar lo
escrito, un campo menos en un formulario que se lee a pleno sol es una ganancia real, y una
contraseña mal tecleada se recupera con el mismo flujo de A5. Es además lo que el lienzo ya
decidió para A4.

**Decida lo que decida el diseño, las dos pantallas quedan iguales**, y la decisión se anota
en `Especificación de Pantallas.dc.html` para que no se vuelva a abrir.

---

## Reglas que aplican a todas las fases

1. **Una fase no está terminada hasta que `typecheck`, `lint` y `format` estén en verde.**
   Regla de `CLAUDE.md`, sin excepciones.
2. **Cada fase cierra actualizando `FIDELIDAD-UI.md`**: las filas que tocó, su score nuevo y
   las medias. Una fase que no vuelve a medir no se puede evaluar.
3. **Antes de tocar una pantalla, se consulta el lienzo** con el MCP `claude_design`. No se
   trabaja de memoria ni de la tabla: la tabla resume, el lienzo decide.
4. **Ningún literal de color, espaciado o tipografía fuera de `packages/core`.**
5. **Nunca `fontWeight` junto a `fontFamily`.** En React Native cada peso es una cara propia;
   se nombra la cara con `fontFace.*`. Hay siete registradas; añadir una son dos líneas y
   ~120 KB.
6. **Commits pequeños y frecuentes.** Este worktree corre en paralelo con las Fases 4+, que
   consumen `Button`, `Notice` y `AppText`. Cambiar una primitiva y acumularla dos semanas
   produce un conflicto que git fusiona sin avisar porque no es de líneas, es de
   comportamiento.

---

## Fase U0 · Encargo al diseño — ✅ redactada el 21 de agosto de 2026

**Duración:** 1 día del agente, más el tiempo de respuesta del diseño · **Arranca ya, en paralelo con U1**

Cinco pantallas del código no existen en el lienzo, y una de ellas se necesita en U3. El
encargo tiene tiempo de espera, así que sale primero.

Las cuatro peticiones están redactadas en el **[registro de peticiones de
diseño](#registro-de-peticiones-de-diseño)**, con siete estados en total y los copys
verificados literalmente contra `constants/texts.ts`:

| # | Qué | Estados | Bloquea |
|---|---|---|---|
| PD-01 | A9 Nueva contraseña | 3 | U3, U4 |
| PD-02 | A10 Retorno del enlace de correo | 2 | U3 |
| PD-03 | F6 Errores de perfil | 2 | U4 |
| PD-04 | Incoherencia A4 / A9 sobre confirmar contraseña | — | U3 |

**No se piden:** «Tu cuenta» (sobra, ver U2) ni «Falta configurar la aplicación» (pantalla de
desarrollo).

**Se piden siete estados y no cuatro pantallas.** El código resuelve «Nueva contraseña» con
tres renderizados distintos según si el enlace se está canjeando, venció o es válido; si el
lienzo dibuja solo el formulario, la reconciliación vuelve a quedar a medias.

**Verificación:** ✅ las cuatro peticiones redactadas con el formato acordado y con los copys
verificados. **Pendiente:** que el usuario las lleve a Claude Design y que el lienzo responda.
U3 puede empezar por A3–A8 sin esperar; A9 y A10 entran cuando lleguen.

---

## Fase U1 · Catálogo de componentes — ✅ completada el 21 de agosto de 2026

**Duración:** 3 días · **Dependencias:** ninguna · **Es la fase que desbloquea todo lo demás**

**Entregado.** Cinco componentes nuevos —`Card`, `Badge`, `Tag`, `StatusDot`, `Dialog`,
`Select` y `Tabs`, siete en realidad— y los cuatro existentes auditados contra el catálogo.
`OptionSheet` salió de `features/map/` al catálogo: una lista de opciones no es del mapa, y
el `Select` la necesita. El estado componente a componente está en `FIDELIDAD-UI.md`.

**Tres hallazgos que la auditoría destapó y no estaban en el plan:**

1. **El `TextInput` no declaraba `fontFamily`.** Las tres tipografías se cargan desde la capa
   de tokens, pero un `TextInput` no es un `AppText` y no hereda nada: **todos los campos de
   formulario de la aplicación venían renderizando en la fuente del sistema** mientras cada
   etiqueta a su lado era Archivo. Corregido.
2. **El catálogo incumple su propio contraste en dos sitios** (D-04, D-09).
3. **El kit de íconos sigue sin portar**, y es lo que bloquea `IconButton` y deja el `Notice`
   marcando el tono con un glifo de texto. Candidato a fase propia.

**Verificación:** `typecheck`, `lint` y `format` en verde. `IconButton` queda pendiente y
`Radio` no se porta porque ninguna pantalla de la v1 lo usa.

Cinco componentes del sistema de diseño no existen en el código, y son la pieza más repetida
del lienzo. Mientras falten, ni las pantallas de este plan ni las de las Fases 4 a 7 se pueden
construir con fidelidad.

| Componente | Lo necesitan | Hoy se resuelve con |
|---|---|---|
| `Card` | B2, B3, B4, C2, E1 y toda tarjeta del lienzo | Bordes a mano en `StyleSheet` locales |
| `Badge` / `Tag` / `StatusDot` | Los chips de estado del árbol, en casi toda pantalla | Nada |
| `Dialog` | D4, y el cierre de sesión de B4 | `Alert.alert` nativo |
| `Select` | A4, C1.1, filtros del mapa | Campo de texto libre |
| `Tabs` | A7 | Secciones planas |

Además, **auditar contra el catálogo** los cuatro que ya existen: `Button`, `TextField`,
`CheckboxField` y `Notice`. De la medición ya salen cuatro deudas concretas:

- `Button` necesita la variante con ícono a la izquierda («⌖ Sembrar», «↻ Actualizar») y
  contrastar alturas: el lienzo usa 52 px en las llamadas principales del onboarding.
- `TextField` necesita el anillo de foco con `effects.focusRing`, y los campos con sufijo
  (`cm`) y con ícono que piden C1.3 y C3.
- `CheckboxField` necesita soportar **enlaces dentro de la etiqueta**: así presenta A4
  «Acepto la _política de privacidad_ y los _términos de uso_».
- `Notice` no es el `Toast`/`Callout` del sistema: le falta el ícono por tono y el fondo
  suave (`dangerSoft`, `infoSoft`) en vez de solo el borde de color.

**Ninguna pantalla se toca en esta fase.** Mezclar primitivas y maquetación hace irrevisables
las dos.

**Verificación:** cada componente contrastado contra su `.jsx` y su `.prompt.md` en el sistema
de diseño; `typecheck`, `lint`, `format` en verde; fila de componentes de `FIDELIDAD-UI.md`
medida por primera vez.

---

## Fase U2 · Chasis de pantalla — ✅ completada el 21 de agosto de 2026

**Duración:** 2 días · **Dependencias:** U1

**Entregado.** `ScreenHeader` con el chevron de `expo-symbols` —el mismo origen que ya usa la
barra de pestañas, en vez de añadir `react-native-svg`— y una ranura `header` en `Screen`,
fuera del área de scroll. Cableado en A4, A5 y A7. La variante `headerTitle` entra al tema:
display a 20, que es lo que dibuja el lienzo.

**El plan decía cuatro pantallas y son tres.** A6 y A10a **no llevan barra en el lienzo**, y
comprobarlo antes de escribirla evitó ponerles una flecha atrás: son pantallas de espera —una
aguarda un correo, la otra se abrió desde él— y no hay a dónde volver.

**A7 dejó de usar la cabecera nativa del stack**, que traía la tipografía de la plataforma en
vez de la del proyecto. De paso cayó el badge «Borrador», que decía lo mismo que el aviso de
debajo.

**`data` y `overline`: solo la primera encontró consumidor.** La línea `especie · CICLO 2 ·
guardián` de la ficha del mapa pasa a mono. `overline` sigue sin usarse **y no es un
descuido**: las micro-etiquetas en versalitas del lienzo viven en B2, B3 y C1, que no existen.
Entra con ellas.

**Verificación:** `typecheck`, `lint` y `format` en verde.

Tres cambios estructurales que arreglan varias pantallas de una vez.

1. **Barra de encabezado modal** — flecha atrás + título. El lienzo la usa en A4, A5, A6, A7,
   B4b y las cuatro de C1. Hoy el código pone un título `display` dentro del cuerpo. Se
   resuelve en `Screen` o en un `ScreenHeader` propio: **arregla cuatro pantallas de golpe y
   deja lista la Fase 4.**
2. **Aplicar `data` y `overline`.** Las dos variantes de tipografía existen y nadie las usa, y
   son justo el patrón que más se echa de menos: `data` (IBM Plex Mono) para coordenadas,
   alturas y fechas; `overline` (mayúsculas con `tracking.wide`) para las micro-etiquetas tipo
   `VEREDA SAN ANDRÉS · CICLO 2`. Empezar por el mapa, que ya muestra coordenadas.
3. **Eliminar la pestaña «Tu cuenta»** (`(app)/account.tsx`). Existe solo porque la barra
   tiene 2 pestañas; en el diseño el invitado no tiene pestaña propia y las llamadas a
   registrarse viven en la barra inferior de A8 — que la Fase 3 **ya construyó** como
   `GuestBar`. Quitarla es hoy seguro y no lo era antes.

> ⚠️ El punto 3 toca la estructura de navegación, que es **nivel 3**. Está aquí porque el
> lienzo ya lo decidió y la Fase 3 ya construyó el reemplazo; aun así, se confirma con el
> usuario antes de borrar la ruta.

**Verificación:** A4, A5, A6 y A7 suben por la barra modal; ninguna pantalla pierde puntos.

---

## Fase U3 · Bloque A — ✅ completada el 21 de agosto de 2026

**Duración:** 1 semana · **Dependencias:** U1, U2 y la respuesta de U0

**Bloque A de 68,2 a 80,2.** Las doce filas —diez del plan más A9 y A10, que U0 añadió al
lienzo— quedan así:

| | Antes | Ahora | |
|---|---|---|---|
| A3 Inicio de sesión | 80 | **92** | logotipo, separador «O», enlace de contraseña reubicado |
| A4 Registro | 82 | **90** | orden de campos, enlaces en el checkbox, fuera la confirmación |
| A5 Recuperación | 78 | **92** | aviso persistente bajo el formulario |
| A6 Verificación | 82 | **92** | jerarquía de botones invertida |
| A9 Nueva contraseña | 72 | **92** | barra modal, ayuda, fuera la confirmación (PD-04) |
| A2.1–A2.3 Onboarding | 60–65 | **78** | marco de fotografía y copys del lienzo |
| A7 Privacidad | 65 | **80** | barra modal y pie de versión |
| A1 · A8 · A10 | — | **sin cambio** | bloqueadas, ver abajo |

**Tres pantallas no se movieron, y ninguna por falta de trabajo:**

- **A1 (25)** espera el logotipo. `splash-icon.png` sigue siendo el logo de Expo y la
  identidad visual es Fase 9. Retocar las proporciones de un marcador de posición no es
  fidelidad, es teatro.
- **A8 (85)** necesita que el buscador acepte texto y busque **árboles**, no solo veredas.
  Eso pide un endpoint de búsqueda que no existe: es trabajo de datos, no de maquetación.
- **A10 (80)** ya estaba bien; lo que le falta son los íconos.

**Dos topes nuevos, ambos por decisiones que no son de maquetación:**

- **A4 se queda en 90** hasta PD-06. El lienzo dibuja «Rol o institución» como lista cerrada
  y no dice qué contiene; la columna es texto libre. Convertirla decide qué puede contestar
  un guardián y arrastra un cambio de esquema.
- **A7 se queda en 80** hasta que exista el texto legal definitivo. `Tabs` está listo desde
  U1, pero repartir el articulado entre Privacidad y Términos es decidir contenido legal
  sobre un borrador.

**Verificación:** `typecheck`, `lint` y `format` en verde.

Es lo único construido de verdad y donde está el margen. Pantalla por pantalla, con el detalle
que ya recoge la tabla de `FIDELIDAD-UI.md`:

| Pantalla | Hoy | Meta | Trabajo principal |
|---|---|---|---|
| A3 Inicio de sesión | 80 | 95 | Logotipo sobre el título, separador «O», mover «¿Olvidaste tu contraseña?» a enlace encima del botón |
| A4 Registro | 82 | 95 | Orden de campos, `Select` de rol, enlaces dentro del checkbox, quitar el botón sobrante |
| A5 Recuperación | 78 | 95 | Caja informativa persistente bajo el formulario en vez de cambiar de pantalla |
| A6 Verificación | 82 | 95 | Invertir la jerarquía de botones, ícono de sobre |
| A7 Privacidad | 65 | 95 | `Tabs` Privacidad / Términos, encabezados del lienzo, pie de versión |
| A8 Mapa invitado | 85 | 92 | Que el buscador acepte texto y busque árboles, no solo veredas |
| A2.1–A2.3 Onboarding | 60–65 | **75 (tope)** | Composición del bloque de fotografía y copys del lienzo |
| A1 Splash | 25 | **40 (tope)** | Fondo y proporciones correctos |

### Dos topes que no dependen del código

- **A1 no puede pasar de ~40.** El lienzo pide el logotipo «ÁrbolApp Huila» en display 38 px y
  la micro-etiqueta magenta; hoy `splash-icon.png` es byte a byte el logo de Expo. La
  identidad visual definitiva es **Fase 9** de `plan.md`. Se deja la composición lista y el
  archivo se sustituye cuando exista la marca.
- **A2 no puede pasar de ~75.** El lienzo pide *fotografía real de campo* con pie «VEREDA SAN
  ANDRÉS» y «GUARDIANA Y SU MANDARINO». Eso es **contenido del PRAE**, no código. Se deja el
  bloque de 460 px con su degradado y un marcador, y entra la foto cuando llegue.

Ambos topes se registran como bloqueo en `FIDELIDAD-UI.md` para que la próxima medición no los
lea como trabajo sin hacer.

**Meta de la fase:** bloque A de 68,2 a **≈ 90**.

---

## Fase U4 · Perfil y notificaciones

**Duración:** 4 días · **Dependencias:** U1 (`Card`, `Dialog`), U2 (barra modal)

B4 y B4b son las dos pantallas construidas con peor score, y por la misma razón: el código las
resolvió como **formulario** y el diseño las resuelve como **ficha + lista de opciones**.

- **B4 Perfil** (45 → 88): avatar con iniciales, nombre y rol, badge «✦ Guardiana desde
  2025», las tres fichas de estadística, las filas de menú con chevron —«Editar perfil»,
  «Ajustes de notificaciones», «Privacidad y términos», «Ver la guía de nuevo», «Acerca de
  ÁrbolApp»— y el pie `v1.0.0 · UN PROYECTO DE JUVENTUD EN LÍNEA`. La edición de nombre e
  institución se muda detrás de «Editar perfil».
- **B4b Ajustes de notificaciones** (38 → 95): pantalla propia, con los dos interruptores del
  lienzo y sus subtítulos, más la nota al pie. Siguen desactivados hasta la Fase 5, y eso se
  dice en pantalla.
- **Sustituir `Alert.alert`** del cierre de sesión por el `Dialog` del catálogo.
- **F6** (errores de perfil), en cuanto llegue el diseño de U0.

**Tope:** las tres fichas de estadística —árboles, al día, ciclos— necesitan un conteo por
guardián que hoy no existe. Si la consulta no está, se maquetan con su estado de carga y la
pantalla se queda en ~80 hasta que la Fase 4 la surta.

---

## Fase U5 · Estados transversales

**Duración:** 3 días · **Dependencias:** U1, U2

- **F4 Error de red y sesión expirada** (45 → 92): los dos estados **a pantalla completa** que
  dibuja el lienzo. Hoy el error vive dentro del formulario y el aviso de sesión vencida es un
  `Notice` en `sign-in`. Incluye el texto que tranquiliza sobre los registros pendientes, que
  en una vereda no es un detalle.
- **F3 Permiso de ubicación** (30 → 92): la pantalla previa que explica para qué se usa el GPS
  **antes** de que salte el diálogo del sistema, con la salida «Ahora no — puedo escribir las
  coordenadas a mano». Hoy el permiso se pide en frío.
- **F2 Offline con cola** (20 → **45, tope**): la franja puede contar registros y ofrecer
  «Ver», pero la sección PENDIENTES DE ENVIAR necesita la **cola de sincronización**, que es
  Fase 4. Se deja el componente listo para recibir el conteo.

---

## Fase U6 · Cierre del mapa

**Duración:** 2 días · **Dependencias:** U1, U2 · **No cierra del todo en este plan**

B1 está en 65 y le faltan tres cosas, de las cuales solo una depende de fidelidad:

- **Botón de capas** junto a la búsqueda. Se puede hacer ahora.
- **FAB «⌖ Sembrar»** — abre el registro de árbol, que es **Fase 4**. Se deja el componente y
  su hueco; no se pone un botón que no lleve a ningún sitio, que es lo que la propia
  `GuestBar` razona en su comentario.
- **Barra de 4 pestañas** — necesita que B2 «Mis árboles» y B3 «Actividad» existan, o sea
  Fases 4 y 5. Poner cuatro pestañas de las que dos no llevan a nada sería peor que dos.

**Meta realista:** B1 a **78**. Cierra a ~95 cuando la Fase 4 entregue B2 y el registro.

---

## Resumen

| Fase | Estado | Depende de | Mueve | Resultado |
|---|---|---|---|---|
| **U0** Encargo al diseño | ✅ **completada** | — | Desbloquea A9, A10, F6 | 4 peticiones, 7 estados dibujados |
| **U1** Catálogo de componentes | ✅ **completada** | — | Desbloquea todo | 12 de 13 portados |
| **U2** Chasis de pantalla | ✅ **completada** | U1 | A4, A5, A7 | barra modal, `data`, sin pestaña invitado |
| **U3** Bloque A | ✅ **completada** | U1, U2, U0 | 68,2 → **80,2** | 9 de 12 pantallas movidas |
| **U4** Perfil y notificaciones | ⬜ pendiente | U1, U2 | B4, B4b: 45/38 → 88/95 | |
| **U5** Estados transversales | ⬜ pendiente | U1, U2 | F2, F3, F4 | |
| **U6** Cierre del mapa | ⬜ pendiente | U1, U2 | B1: 65 → 78 | |

**Fidelidad de lo construido: 57,8 → 66,3.** Meta del plan, ≈ 83.

Los topes que quedan **no son de maquetación**: A1 y la marca (Fase 9), A2 y las fotografías
del PRAE, A4 y PD-06, A7 y el texto legal definitivo, A8 y un endpoint de búsqueda, B1 y las
Fases 4–5, F2 y la cola de sincronización.

### Lo que este plan deja explícitamente fuera

No por olvido, sino porque no es trabajo de fidelidad:

- **Las 22 pantallas que solo existen en el diseño** — Fases 4 a 7 de `plan.md`.
- **`apps/web`**, que sigue siendo la plantilla de `create-next-app`. Los nueve diseños de D y
  E parten de cero en las Fases 6 y 7.
- **La identidad visual** — Fase 9. Es el tope de A1.
- **Las fotografías de campo** del onboarding. Es el tope de A2.

### Orden de ataque, en una línea

**U0 y U1 arrancan a la vez.** U1 es la que más sube el score por unidad de trabajo y
desbloquea todo lo demás; U0 no cuesta casi nada y tiene tiempo de espera. Después U2, que
arregla cuatro pantallas con un solo componente. U3, U4 y U5 son independientes entre sí y
pueden reordenarse según convenga. U6 al final, porque es la que menos cierra.
