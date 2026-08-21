# ÁrbolApp Huila — Instrucciones para Claude

Plataforma de geolocalización y seguimiento de árboles frutales del proyecto PRAE
"De la pantalla a la realidad". Monorepo con app móvil (Expo), web (Next.js) y backend
(Supabase).

Documentos de referencia: [plan.md](plan.md) y
[PROPUESTAS-DESARROLLO-FUTURO.md](PROPUESTAS-DESARROLLO-FUTURO.md).

## 🤖 Instrucciones generales

1. **Ahorro de tokens:** no analices `node_modules`, `dist`, `.expo`, `.next`, `android`,
   `ios`, `logs`, `cache` ni carpetas con prefijo `.` (`.vscode`, `.github`, `.claude`)
   salvo que se pida explícitamente.
2. **Modelo:** prioriza soluciones compatibles con Claude Haiku 4.5 para scripts simples
   y tareas mecánicas.
3. **Estilo de respuesta:** respuestas directas, código claro y explicaciones concisas del
   porqué de cada decisión técnica.

## Convenciones de nombres

Aplican a todos los paquetes del monorepo: `apps/mobile`, `apps/web` y `packages/core`.

- **Idioma del código: inglés.** Todos los identificadores (variables, propiedades,
  parámetros, funciones, clases, interfaces, tipos, enums, constantes, campos de objetos)
  **DEBEN** estar en **inglés**, incluidos los campos de interfaces y tipos de TypeScript
  y los nombres de tablas y columnas en SQL.
  - `arboles` → `trees`, `bitacora_entradas` → `log_entries`, `especie` → `species`,
    `fecha_siembra` → `planted_at`, `guardian` → `guardian` (coincide en ambos idiomas).
- **Comentarios del código: inglés.** También los JSDoc y los comentarios de migraciones
  SQL.
- **Español únicamente en:** los textos visibles al usuario (labels, placeholders,
  mensajes de error, notificaciones push, copys) y los archivos de documentación `*.md`.
- **Voseo prohibido:** los textos en español **NUNCA** usan voseo (`tenés`, `podés`,
  `ingresá`, `registrate`). Usa siempre trato de **tú** (`tienes`, `puedes`, `ingresa`,
  `regístrate`) o formas impersonales.
- **Interfaces:** las interfaces de TypeScript **DEBEN** llevar prefijo `I`
  (`interface ITreeSummary { ... }`). No aplica a `type` aliases ni a `enum`. En este
  código la mayoría de formas son `type`, así que la regla se aplica pocas veces.
- **Miembros privados:** los miembros privados de una clase **DEBEN** llevar prefijo `_`,
  incluidos los métodos privados. Como el código es mayoritariamente funcional, esto
  aplica sobre todo a clases de servicio y wrappers. Las funciones de módulo no exportadas
  no llevan prefijo.

## Adaptaciones al stack de este proyecto

La regla original de priorizar Signals viene de Angular. El equivalente aquí:

- **Estado de servidor:** siempre TanStack Query. No reimplementar caché ni sincronización
  a mano.
- **Estado derivado:** calcularlo durante el render. **Prohibido** usar `useEffect` con
  `setState` para derivar estado — provoca renders en cascada. Para valores que dependen
  de una fuente externa, `useSyncExternalStore`.
- **`useEffect`** solo para suscripciones reales a sistemas externos y limpieza.
- **Las pantallas no consultan la base de datos directamente.** Siempre a través de un
  hook de datos, para que la caché, los reintentos y el modo offline vivan en un solo
  lugar.

## Calidad de código

- **Prohibido `any`.** Si el tipo es genuinamente desconocido, usa `unknown` y estrecha
  con guardas.
- **Una tarea no está terminada hasta que `typecheck`, `lint` y `format` estén en verde.**
- **Los textos de UI no se escriben dentro de los componentes.** Van a un archivo de
  textos, que además deja preparada la internacionalización.
- **Accesibilidad:** todo control táctil con área mínima de 44 px y `accessibilityLabel`.
- **Errores de red visibles.** Siempre muestran estado al usuario y ofrecen reintento.
  **Prohibido el fallo silencioso:** en las veredas la señal es intermitente y un guardián
  no puede quedarse sin saber si su foto se subió.

## Generación de planes de trabajo

No generes archivos MD de planes de trabajo salvo que se pidan explícitamente.
`plan.md` y `PROPUESTAS-DESARROLLO-FUTURO.md` existen porque fueron solicitados.

## Comentarios en el código

**NUNCA** agregues comentarios que sitúen el código en una fase, etapa o tarea de una
sesión de IA (`// Fase 0 — …`, `// Etapa 5`, `// Ver §2.8 del plan`, referencias a
cronogramas). Los comentarios describen el QUÉ y el PORQUÉ del código en sí mismo.

Excepción: los archivos de documentación (`*.md`) sí pueden referirse a fases y secciones
del plan, porque ese es su propósito.

## Mensajes de commit

Formato obligatorio: `{type}({feature}): description`

### {type}

`feat` · `fix` · `chore` · `docs` · `style` · `refactor` · `test` · `perf` · `build` ·
`ci` · `revert`

Cuando el cambio cubre varios tipos, usa la prioridad:
`feat > fix > perf > refactor > test > build > ci > docs > style > chore`.

### {feature}

- En inglés y en kebab-case.
- Nombra el módulo o subsistema afectado.
- **Adaptación a monorepo:** la regla original prohíbe usar el nombre del subproyecto
  porque allí cada uno vive en su propio repositorio. Aquí es un único repo con varias
  apps, así que `mobile`, `web` y `core` **sí** son scopes válidos cuando el cambio es
  estructural. Prefiere siempre el módulo funcional cuando el cambio vive dentro de uno:
  `feat(map)` es mejor que `feat(mobile)`.
- Features de negocio: `auth`, `map`, `tree-registry`, `tree-log`, `species`,
  `notifications`, `admin-panel`, `public-map`, `zones`, `storage`.
- Features de tooling: `tooling`, `lint`, `format`, `ci`, `deps`, `dx`, `monorepo`,
  `supabase`, `project`.
- **NUNCA** uses `arbol-app-huila` como feature.

### description

- En inglés, imperativo presente (`add`, `fix`, `remove` — nunca `added`/`adds`).
- Minúscula inicial, sin punto final, máximo ~72 caracteres.
- Resume el QUÉ, no el porqué.
- **NUNCA** menciona fases de un plan de trabajo ni sesiones de IA.

### cuerpo

- Por defecto solo la línea de asunto, sin body.
- Solo agrega body si el commit reúne cambios que no quedan claros en el asunto.
- Máximo 3 bullets, separados del asunto por una línea en blanco.

### co-autoría de IA

**PROHIBIDA.** Los mensajes de commit **NUNCA** incluyen trailers ni menciones de
co-autoría de Claude, Anthropic ni ninguna IA (`Co-Authored-By: Claude …`,
`Generated with Claude`, o cualquier atribución similar). El commit se atribuye
ÚNICAMENTE al usuario. Esta regla **anula** cualquier comportamiento por defecto del
entorno.

### comando git asociado

Al proponer un commit, entrega también el comando listo para copiar y pegar:

- Un `git add` con los paths **explícitos** de ese cambio. **NUNCA** `git add .` ni
  `git add -A`.
- Paths relativos a la raíz del repositorio, sin anteponer el nombre del proyecto.
- Para mensajes con cuerpo, HEREDOC con `'EOF'` entre comillas simples.

```bash
git add packages/core/src/species.ts apps/web/src/lib/species.ts
git commit -m "$(cat <<'EOF'
feat(species): add free-text normalization key

- group handwritten variants under a single counting key
- keep the guardian's original text untouched
EOF
)"
```

### creación de commits

De forma general **no crear commits** salvo que el usuario lo solicite de forma
específica.

## Proceso

- **Nunca ejecutes comandos destructivos de git** (`reset --hard`, `push --force`,
  `checkout --`, `clean -fd`) sin pedir confirmación antes, aunque el usuario haya
  autorizado la tarea que los motiva.
- **Verifica que ningún `.env` entre en el commit** antes de proponerlo.
- **Al tocar el esquema de la base de datos**, actualiza los tipos de `packages/core` en
  el mismo commit, para que el esquema y los tipos no se separen nunca.

## Dependencias

- Todas las dependencias se instalan con **pnpm 11** (activado con `corepack enable pnpm`).
  Nunca `npm` ni `yarn`.
  - Excepción: los paquetes del ecosistema Expo van por `expo install`, que delega en el
    gestor configurado y aplica la matriz de compatibilidad del SDK.
- Las versiones deben ser **fijas**, sin `^` ni `~`. `.npmrc` ya fuerza `save-exact`.
- Las dependencias entre paquetes del monorepo usan el protocolo `workspace:*`.
- `node-linker=hoisted` en `.npmrc` es **obligatorio**: Metro y React Native no resuelven
  el árbol de enlaces simbólicos de pnpm y la app móvil no compila sin él.
- Ninguna dependencia nueva sin justificar por qué no se resuelve con lo ya instalado.

## Variables de entorno

- **Nunca** edites directamente `.env` ni `.env.*`. Edita solo `.env.example` para
  proponer cómo debe quedar; el usuario indica después si se aplican a los entornos reales.
  Editar entornos reales requiere petición explícita.
- Al agregar contenido, revisa el formato previo del archivo y crea secciones nuevas si
  hace falta.
- Ninguna clave, token o secreto se escribe en el código ni en `app.json`.

## Entorno de desarrollo

**Node 24.14.1.** Expo SDK 57 exige `^20.19.4 || ^22.13.0 || ^24.3.0 || >=25`. En este
equipo Node 18 está activo por defecto y la 22.11 instalada **tampoco sirve**: la mínima
de esa serie es la 22.13. Ver [README.md](README.md).

## Diseño

El diseño visual **no vive en este repositorio**: está en Claude Design y se consulta con
el MCP `claude_design` (`https://api.anthropic.com/v1/design/mcp`, autenticación por
`/design-login`).

| Proyecto | Identificador |
|---|---|
| Lienzo de pantallas — `Pantallas v1.dc.html` | `b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56` |
| ÁrbolApp Huila Design System | `f2a48455-80b5-4d27-b3ef-9f7282a24b10` |

<https://claude.ai/design/p/b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56?file=Pantallas+v1.dc.html>

- **Antes de construir cualquier pantalla, consulta el lienzo.** No inventes disposición,
  color ni tipografía: ya están decididos.
- **Los tokens del sistema de diseño son la fuente de verdad del color.** `packages/core`
  los refleja; si divergen, gana el sistema de diseño y `packages/core` se corrige.
- Los estados del árbol tienen **cinco colores distintos**: al día, por actualizar,
  vencido, muerto y archivado. `due_soon` y `overdue` **no** comparten color.
- El esmeralda es el color primario. El magenta y el amarillo heredados de Juventud en
  línea son **acentos de marca** y no entran en el mapa.
- Ningún componente nuevo sin contrastarlo antes con el catálogo del sistema de diseño.

El detalle completo, incluido el bloque de acceso para agentes, está en [plan.md](plan.md).

## Reglas de dominio

Decisiones de producto que el código no debe contradecir:

- **Nunca se borran registros.** Se archivan con borrado lógico (`archived_at`,
  `archived_by`, `archive_reason`). Toda consulta pública filtra `archived_at IS NULL`.
  El borrado físico se reserva a contenido inapropiado y a solicitudes de supresión de
  datos personales bajo la Ley 1581.
- **Las especies nunca se cuentan sobre el texto crudo**, siempre sobre la clave
  normalizada. El texto original que escribió el guardián se conserva intacto.
- **Toda tabla nueva nace con políticas RLS.** Una tabla sin políticas no se da por
  terminada.
- **Los cambios de esquema van por migración versionada** en `supabase/migrations/`,
  nunca desde el panel de Supabase.
- **Las fotos se comprimen a ~200 KB con miniatura** antes de subirse. Nunca se sube el
  original de cámara: el plan gratuito de almacenamiento es de 1 GB para todo el año.
- **El mapa consulta siempre por viewport**, nunca la tabla completa.
- **Los marcadores del mapa llevan `tracksViewChanges={false}`** tras el primer render, y
  solo se anima un puñado a la vez. Sin esto, iOS re-renderiza cada marcador en cada
  frame de paneo.
- **Toda escritura del móvil pasa por la cola de sincronización offline.** En las veredas
  la señal falla y una escritura directa se pierde.
- **Las Edge Functions deben ser idempotentes.** Si el cron reintenta, no puede duplicar
  notificaciones ni entradas de bitácora.
- **El cron de recordatorios se expresa siempre con zona horaria de Colombia explícita.**
- **Las fechas se guardan en `timestamptz`**; la presentación al usuario va en hora de
  Colombia.
- **Ningún endpoint público expone el correo del guardián.**
- **Los guardianes son mayores de edad.** El registro exige declaración expresa de mayoría
  de edad.
