# Fidelidad de la interfaz frente al sistema de diseño

> Última medición: 21 de agosto de 2026 · rama `develop`
> Fuente de verdad: **ÁrbolApp Huila Design System** (`f2a48455-80b5-4d27-b3ef-9f7282a24b10`)
> Lienzo de pantallas: **Pantallas v1** (`b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56`)

Este documento mide **cuánto del sistema de diseño está realmente en el código**, no cuánto
se pretende adoptar. Todas las cifras salen de comparar el CSS generado desde
`packages/core/src/theme.ts` contra los `tokens/*.css` del sistema de diseño, variable por
variable. Ninguna es una estimación.

---

## Tabla general

La columna **declarado** mide si el valor del token coincide con el del sistema de diseño.
La columna **aplicado** mide si eso llega a la pantalla. Se separan porque un token puede
ser correcto y no pintar nada: es exactamente lo que pasa hoy con las fuentes.

| Capa | Alcance | Declarado | Aplicado | Estado |
|---|---|---|---|---|
| Color | 50 variables | **100 %** (50/50) | **100 %** | ✅ |
| Espaciado, radios y área táctil | 16 variables | **100 %** (16/16) | **100 %** | ✅ |
| Escala tipográfica — tamaños, interlineado, pesos, tracking | 17 variables | **100 %** (17/17) | **100 %** | ✅ |
| Familias tipográficas | 3 variables | **100 %** (3/3) | **0 %** | ⛔ bloqueado |
| Efectos, sombras y motion | 9 variables | **100 %** (9/9) | ➖ sin consumir aún | ✅ |
| **Total de tokens** | **95 variables** | **100 %** | — | ✅ |
| Consumo en móvil | 24 archivos | — | **100 %** | ✅ |
| Consumo en web | `design-tokens.css` + `globals.css` | — | **100 %** | ✅ |
| Splash e ícono adaptativo | 2 valores | — | **100 %** | ✅ |
| Componentes de interfaz vs. catálogo | 7 componentes | — | *no evaluado* | 🔧 pendiente |
| Pantallas vs. lienzo | 10 pantallas | — | *no evaluado* | 🔧 pendiente |

**Veredicto.** La capa de tokens está completa y verificada. Lo que separa hoy a la
aplicación del diseño no son los valores, sino **las fuentes** —el único elemento visual
del sistema que no se ha podido cargar— y la **maquetación** de las pantallas de la Fase 2,
que es una tarea aparte y deliberadamente no se mezcló con esta.

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

### ⛔ Fuentes — bloqueado, requiere permiso

Es **el único hueco de fidelidad visual que queda**. El sistema de diseño pide tres familias
y ninguna está en el repositorio, así que ambas aplicaciones caen al `system-ui` del final de
cada pila.

| Familia | Uso | Pesos | Dónde |
|---|---|---|---|
| **Bricolage Grotesque** | Titulares y cifras, ≥26 px | 600 · 700 · 800 | `--font-display` |
| **Archivo** | Interfaz y párrafos, ≤20 px | 400 · 500 · 600 · 700 + itálica 400 | `--font-body` |
| **IBM Plex Mono** | Coordenadas, medidas, fechas, IDs | 400 · 500 · 600 | `--font-mono` |

`tokens/fonts.css` las carga con un `@import` de Google Fonts, que en móvil no sirve. La vía
correcta en este repositorio es `@expo-google-fonts`, y **`expo-font` ya es dependencia**
(`57.0.1`), así que no hay tecnología nueva que justificar:

```bash
cd apps/mobile
npx expo install @expo-google-fonts/bricolage-grotesque @expo-google-fonts/archivo @expo-google-fonts/ibm-plex-mono
```

Falta además cargarlas en el layout raíz con `useFonts` y una compuerta de splash, y aplicar
`fontFamily` en `apps/mobile/src/constants/theme.ts`. En la web se resuelve con
`next/font/google`, que ya se usa para Geist y no añade dependencias.

**Este comando fue denegado por el clasificador de permisos del entorno.** No se rodeó. Para
desbloquearlo hay que autorizar `npx expo install` o ejecutarlo manualmente.

### 🔧 Maquetación de la Fase 2 — tarea aparte

Los componentes de `apps/mobile/src/components/ui/` y las diez pantallas de autenticación y
onboarding **consumen los tokens correctos**, pero su disposición nunca se contrastó con el
lienzo. Mezclar esa reconciliación con la corrección de tokens habría hecho imposible revisar
ninguna de las dos.

- Componentes contra el catálogo: `Button`, `Input`, `Checkbox`, `Card`, `Badge`, `Toast`,
  `Dialog`.
- Pantallas contra `Pantallas v1.dc.html`.

### 🔸 Dos literales de color que siguen fuera de `packages/core`

| Dónde | Valor | Situación |
|---|---|---|
| `apps/web/src/app/page.tsx` | `#383838`, `#ccc`, `#1a1a1a` | Página de ejemplo de `create-next-app`, intacta. La Fase 6 la sustituye entera. |
| `apps/mobile/app.json` | `#0B1512` ×2 | Correcto y alineado, pero copiado a mano: **JSON no puede importar TypeScript.** |

Eliminar el segundo requiere migrar `app.json` a `app.config.js` y hacer que el generador
emita también un `design-tokens.json`. Se intentó y **la operación fue denegada por el
clasificador de permisos** (borrado de `app.json`), y sin poder ejecutar `npx expo config`
para comprobar que la configuración resuelve, se revirtió antes que dejar una configuración
de Expo sin verificar.

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
cd apps/mobile && npx expo-doctor      # 21/21
```

Estado en la última medición: **typecheck, lint y format en verde**; `expo-doctor` **21/21
sin incidencias**; Metro empaqueta Android; `next build` compila y los tokens llegan al CSS
emitido.
