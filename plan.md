# ÁrbolApp Huila — Plan de trabajo por fases

> Versión 1 · 20 de agosto de 2026
> Plan de construcción de la v1 según las decisiones confirmadas en
> [PROPUESTAS-DESARROLLO-FUTURO.md](PROPUESTAS-DESARROLLO-FUTURO.md).
> Las semanas son **semanas de trabajo efectivo de una persona a tiempo completo**;
> si el desarrollo es de medio tiempo, duplicar la duración.

## Configuración base acordada

| Parámetro | Valor |
|---|---|
| Package name / Bundle ID | `co.edu.iesansebastian.arbolapp` |
| Dominio propio | Omitido por ahora — subdominios de Vercel |
| Correo transaccional | Servicio incluido de Supabase (con su límite de envíos) |
| Titularidad de cuentas | **Pendiente de definir** |
| API key de Google Maps | Se asume disponible; placeholder hasta recibirla |
| Cuenta Apple Developer | En trámite |
| Identidad visual | Sistema de diseño adoptado por completo: tokens y las tres tipografías |
| Política de privacidad | Pantalla y ruta reservadas, contenido pendiente |

---

## Resumen de fases

| Fase | Nombre | Duración | Hito | Estado | Claude Design |
|---|---|---|---|---|---|
| **0** | Fundaciones | 3 días | | ✅ completada | ✅ tokens adoptados |
| **1** | Modelo de datos y backend | 1 sem | | ✅ completada | ➖ no aplica |
| **2** | Autenticación y perfil | 4 días | | ✅ completada | 🔧 **corregir** — consume los tokens, falta reconciliar maquetación con el lienzo |
| **3** | Mapa interactivo | 1,5 sem | **A** | ✅ completada — 👁️ validación visual diferida | ✅ **requerido** — `ui_kits/mobile/MapScreen` |
| **4** | Registro de árbol y bitácora | 1,5 sem | **B** | pendiente | ✅ **requerido** — `TreeDetailScreen`, `TreeListScreen` |
| **5** | Notificaciones bimestrales | 1 sem | | pendiente | 🔸 parcial — pantalla de actividad y ajustes |
| **6** | Panel de administración | 1,5 sem | **C** | pendiente | ✅ **requerido** — `ui_kits/web/AdminScreens` |
| **7** | Mapa público web | 4 días | | pendiente | ✅ **requerido** — `ui_kits/web/PublicMap` |
| **8** | Endurecimiento | 1 sem | | pendiente | 🔸 parcial — estados vacíos, de error y accesibilidad |
| **9** | Publicación | 1 sem + revisión | **D** | pendiente | ✅ **requerido** — ícono, splash y capturas de tienda |

### Lo que se diseñó antes de que existiera el sistema de diseño

Las Fases 0 y 2 se construyeron sin referencia visual, con una paleta provisional
inventada para salir del paso. La capa de **tokens** ya está reconciliada; lo que queda
es la **maquetación**, que es otra tarea y no debe mezclarse con la anterior:

| Qué | Dónde | Estado |
|---|---|---|
| Paleta completa | `packages/core/src/theme.ts` | ✅ grupos, nombres y variantes `*-soft` del sistema de diseño |
| Estados del árbol | `colorByTrackingStatus` | ✅ cinco estados, cinco colores distintos |
| Escalas de espaciado y radios | `packages/core/src/theme.ts` | ✅ `spacing.css` y `effects.css` adoptados |
| Tipografía y efectos | `packages/core/src/theme.ts` | ✅ tamaños, interlineados, pesos, sombras y motion |
| Variables CSS para la web | `apps/web/src/app/design-tokens.css` | ✅ generadas desde TypeScript con `pnpm tokens` |
| Color del splash y del ícono adaptativo | `apps/mobile/app.config.js` | ✅ leído de los tokens; `app.json` ya no existe |
| Fuentes | `apps/mobile`, `apps/web` | ✅ Montserrat, Open Sans, Roboto y Roboto Mono cargadas en las dos plataformas |
| **Componentes de interfaz** | `apps/mobile/src/components/ui/` | 🔧 pendiente — contrastar con `Button`, `Input`, `Checkbox`, `Card`, `Badge`, `Toast` y `Dialog` |
| **Las 10 pantallas de autenticación** | `apps/mobile/src/app/(auth)/`, `onboarding/` | 🔧 pendiente — contrastar con `Pantallas v1.dc.html` |

---

## Referencias de diseño

El diseño visual **no vive en este repositorio**: está en Claude Design, repartido en dos
proyectos que se consultan desde cualquier agente a través del MCP `claude_design`.

| Proyecto | Identificador | Contenido |
|---|---|---|
| **Pantallas v1** | `b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56` | Lienzo con las pantallas de la v1 (`Pantallas v1.dc.html`) |
| **ÁrbolApp Huila Design System** | `f2a48455-80b5-4d27-b3ef-9f7282a24b10` | Tokens, componentes y kits de interfaz |

Enlace directo al lienzo:
<https://claude.ai/design/p/b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56?file=Pantallas+v1.dc.html>

### Cómo accede un agente

```
Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login)
to import this project:
https://claude.ai/design/p/b4f2c6e6-b7c0-4ed3-ad11-bc0528be9e56?file=Pantallas+v1.dc.html

Focus on these files (the whole project is readable):
- `Pantallas v1.dc.html`

Also read these files the selection imports:
- `_ds/rbolapp-huila-design-system-f2a48455-80b5-4d27-b3ef-9f7282a24b10/_ds_bundle.js`
- `_ds/rbolapp-huila-design-system-f2a48455-80b5-4d27-b3ef-9f7282a24b10/styles.css`
- `_ds/rbolapp-huila-design-system-f2a48455-80b5-4d27-b3ef-9f7282a24b10/tokens/colors.css`
- `_ds/rbolapp-huila-design-system-f2a48455-80b5-4d27-b3ef-9f7282a24b10/tokens/effects.css`
- `_ds/rbolapp-huila-design-system-f2a48455-80b5-4d27-b3ef-9f7282a24b10/tokens/fonts.css`
- `_ds/rbolapp-huila-design-system-f2a48455-80b5-4d27-b3ef-9f7282a24b10/tokens/spacing.css`
- `_ds/rbolapp-huila-design-system-f2a48455-80b5-4d27-b3ef-9f7282a24b10/tokens/typography.css`
- `support.js`

Implement: `Pantallas v1.dc.html`
```

### Qué hay en el sistema de diseño

- **Tokens** — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `fonts.css`.
- **Componentes** — formularios (`Button`, `Input`, `Checkbox`, `Radio`, `Select`,
  `Switch`, `IconButton`), presentación (`Card`, `Badge`, `Tag`, `StatusDot`, `Tooltip`),
  retroalimentación (`Dialog`, `Toast`) y navegación (`Tabs`). Cada uno con su `.jsx`,
  su `.d.ts` y su `.prompt.md`.
- **Kits de interfaz** — móvil (`MapScreen`, `TreeDetailScreen`, `TreeListScreen`,
  `Icons`) y web (`AdminScreens`, `PublicMap`).
- **Guías** — marca, motivo del mapa, y las escalas de color, tipografía y espaciado.

### La paleta quedó resuelta

La tensión entre el verde de la app y el magenta heredado de Juventud en línea se
resolvió así: **esmeralda como color primario** —los árboles como puntos de luz sobre un
fondo de bosque nocturno— y el **magenta y amarillo de Juventud en línea confinados a
acentos de marca**, sin entrar en el mapa.

Los estados del árbol tienen ahora **cinco colores distintos**:

| Estado | Token | Color |
|---|---|---|
| Al día | `--state-ok` | `#3DDC97` |
| Por actualizar | `--state-due` | `#FFD23F` |
| Vencido | `--state-overdue` | `#FF8A3D` |
| Muerto | `--state-dead` | `#F0567A` |
| Archivado | `--state-archived` | `#66796F` |

**El código ya está alineado.** `packages/core/src/theme.ts` refleja los grupos del
sistema de diseño —superficies, bordes, acento, herencia de marca, estados, retroalimentación
y texto, con sus variantes `*-soft`—, adopta la escala de espaciado, tipografía y efectos, y
da **cinco colores distintos** para los cinco estados. La web recibe los mismos valores como
propiedades personalizadas generadas desde TypeScript con `pnpm tokens`; nadie transcribe un
color a mano en una hoja de estilos.

Tres tokens del propio sistema de diseño **no alcanzan AA (4.5:1) como texto pequeño** y
están acotados en el código: `--text-muted` y `--state-archived` (el mismo gris `#66796F`,
máximo 4.01:1) valen como punto, filete o texto grande, nunca como texto pequeño; y
`--danger` cae a 4.31:1 sobre `--surface-overlay`, para lo que el sistema de diseño no
ofrece un rojo más claro.

El detalle, con la tabla de medidas y lo que falta, está en
[FIDELIDAD-UI.md](FIDELIDAD-UI.md).

### Estado del lienzo

`Pantallas v1.dc.html` cubre en alta fidelidad las pantallas de móvil, del panel web y
del mapa público. `Especificación de Pantallas.dc.html` está **parcial**: tiene contexto,
sistema de diseño, navegación y las fichas de las pantallas sin sesión; faltan las fichas
de las pantallas autenticadas.

La última sincronización del proyecto de diseño apunta a la rama `fase-0-fundaciones`,
que ya no existe, y a `packages/core/src/dominio.ts`, renombrado a `domain.ts`. Conviene
resincronizarlo contra `develop`.

---

## Fase 0 — Fundaciones ✅ *completada el 20 de agosto de 2026*

**Duración:** 3 días · **Dependencias:** ninguna

Dejar el terreno listo para que todo lo demás avance sin fricción.

**Tareas**

- Monorepo con `apps/mobile`, `apps/web`, `packages/core`, `supabase/`.
- Expo **SDK 57** (React Native 0.86, React 19.2) con TypeScript, Expo Router y `expo-dev-client`; **Next.js 16.3** con Tailwind 4 y shadcn/ui. Los generadores traen versiones más nuevas que las previstas al redactar este plan; se adoptan tal cual.
- `app.json` con `co.edu.iesansebastian.arbolapp` para Android e iOS.
- Proyecto Supabase en región *East US*; variables de entorno con placeholders, incluida la key de Maps.
- Paleta provisional en `packages/core`: verde esmeralda `#2ECC71` (activo), ámbar `#F1C40F` (por actualizar), gris `#7F8C8D` (archivado), fondo oscuro para el mapa. Definida como tokens, para que el rediseño sea cambiar un solo archivo.
- ESLint, Prettier y GitHub Actions con typecheck y lint en cada push.
- Primer *development build* de Android por EAS, para verificar que la cadena de compilación funciona antes de depender de ella.

**Criterio de aceptación:** la app arranca en un dispositivo Android real y la web en local, ambas leyendo del mismo proyecto Supabase.

**Riesgo:** la primera compilación con EAS suele fallar por credenciales o versiones. Resolverlo aquí y no en la semana de publicación.

### Resultado

Verificado: `expo-doctor` pasa sus 21 comprobaciones, Metro empaqueta la app de Android
completa, Next compila, y formato, tipos y lint están limpios en los tres paquetes.

**Requisito de Node descubierto en el camino:** Expo SDK 57 exige
`^20.19.4 || ^22.13.0 || ^24.3.0`. El equipo tenía activo Node 18 y la versión 22
instalada es la 22.11, que **tampoco sirve**. Se trabaja con **Node 24.14.1**, ya
instalada vía nvm. Queda declarado en `engines` y en el CI.

**Pendiente de la fase, por requerir credenciales del proyecto:**

- Crear el proyecto Supabase en región East US (necesita la cuenta).
- Primera compilación de desarrollo con EAS (necesita sesión de Expo). `eas.json` ya está escrito con los perfiles `development`, `preview` y `production`.

---

## Fase 1 — Modelo de datos y backend

**Duración:** 1 semana · **Dependencias:** Fase 0

El esquema completo, con las decisiones ya tomadas incorporadas desde el inicio.

**Tablas**

- `users` — perfil de Guardián, con declaración de mayoría de edad y aceptación de términos fechada.
- `zones` — departamento, municipio y vereda como catálogo jerárquico de texto, **con la columna `geometry` creada y vacía** para la migración futura de §2.9.
- `trees` — especie (texto original + clave normalizada), `location geometry(Point,4326)`, fecha de siembra, guardián, estado (`alive` / `at_risk` / `dead` / `replanted`), `last_updated_at`, `next_reminder_at` como columna generada, y campos de archivado.
- `log_entries` — los campos aprobados: foto y miniatura, `captured_at` de EXIF, altura, ramas visibles, estado de salud, notas, coordenada de captura, ciclo y puntualidad.
- `species` — clave normalizada, nombre oficial, contador y registro de fusiones.
- `devices` y `reminders` — soporte del motor de notificaciones.

**Tareas**

- Habilitar PostGIS e índices GiST sobre `trees.location`.
- Políticas RLS: el guardián lee todo lo público y escribe solo lo suyo; el coordinador tiene acceso total; el visitante anónimo solo lee árboles no archivados.
- Buckets de Storage con políticas de acceso a las fotos.
- Función `trees_in_viewport(bbox, zoom, filters)` para el mapa.
- Datos de prueba: 200 árboles ficticios distribuidos en veredas de La Plata.
- **Convención transversal:** toda consulta pública filtra `archived_at IS NULL`.

**Criterio de aceptación:** se puede consultar por viewport y devolver solo los árboles visibles, con RLS activo y verificado con dos usuarios distintos.

---

## Fase 2 — Autenticación y perfil de Guardián

**Duración:** 4 días · **Dependencias:** Fase 1 · **Diseño:** pantallas sin sesión de `Pantallas v1.dc.html`

**Tareas**

- Registro con correo y contraseña, verificación por correo, recuperación de contraseña.
- Formulario de alta: nombre, correo, rol o institución, **casilla de declaración de mayoría de edad** y aceptación de términos.
- Pantalla de política de privacidad y términos con contenido provisional, ruta y enlaces ya cableados.
- Onboarding de tres pantallas y opción "explorar sin cuenta".
- Perfil editable y cierre de sesión.

**Nota operativa:** con el correo incluido de Supabase el envío está limitado por hora. Registrar guardianes en grupos pequeños y no en una jornada masiva simultánea. Si más adelante se necesita, conectar Resend es cuestión de horas.

**Criterio de aceptación:** un usuario nuevo se registra, verifica su correo, entra y ve su perfil.

---

## Fase 3 — Mapa interactivo · **Hito A**

**Duración:** 1,5 semanas · **Dependencias:** Fase 1, y la API key de Maps para probar en dispositivo · **Diseño:** `ui_kits/mobile/MapScreen` y los tokens de estado

El corazón de la aplicación y la pantalla de entrada.

**Tareas**

- Librería de mapas: **resuelta — `react-native-maps` 1.27.2.** Da Google Maps en Android y en iOS, así que un solo JSON de estilo sostiene el motivo de "puntos de luz" en ambas; `expo-maps` usa Apple Maps en iOS, exige iOS 17 y su evento de cámara entrega solo centro y zoom, no el rectángulo visible que `trees_in_viewport()` necesita. Contexto, alternativas y consecuencias en [docs/adr/0001-libreria-de-mapas.md](docs/adr/0001-libreria-de-mapas.md).
- Marcadores como sprite PNG con resplandor pre-renderizado; `tracksViewChanges={false}` tras el primer render.
- Agrupamiento por nivel de zoom: círculos por municipio con conteo, luego clusters, luego marcadores individuales.
- Animación de pulso solo en el marcador seleccionado y en los árboles recién sembrados.
- Carga por viewport con retardo de 400 ms sobre el fin del desplazamiento.
- Buscador y filtros Municipio ▸ Vereda sobre el catálogo de texto, con encuadre por centroide y radio.
- Ficha flotante al pulsar un punto: especie, foto reciente, guardián, última actualización.

**Criterio de aceptación:** el mapa se desplaza con fluidez con 200 árboles de prueba en un dispositivo de gama media, y el filtro por vereda encuadra correctamente.

**Riesgo:** Google Maps no funciona en Expo Go sobre iOS. Se trabaja con *development build* desde el inicio, ya previsto en la Fase 0.

### Cierre de la fase

**Cerrada con la validación visual diferida.** El código está completo frente a los siete
entregables y lo que se puede comprobar sin dispositivo está comprobado: `typecheck`, `lint`
y `format` en verde, `expo-doctor` 21/21, Metro empaquetando Android, y contra la base local
la corrección del viewport, la exclusión de archivados, el acceso anónimo, el rechazo de
lectura del correo y el filtro por especie según identificador.

**Lo que nadie ha visto todavía es el mapa pintando.** En el equipo de desarrollo no hay
Android SDK, ni emulador, ni Gradle, ni API key de Google Maps, así que la aplicación nunca
se ha compilado ni arrancado. El criterio de aceptación de arriba **no está verificado**.

La validación se agrupa deliberadamente al final del proyecto, junto con la de las demás
fases, para hacerla una sola vez como prueba de regresión y automatizar lo que se pueda en
la Fase 8. Lo que hay que mirar, por orden de riesgo:

| # | Qué comprobar | Por qué es el riesgo que es | ¿Automatizable? |
|---|---|---|---|
| 1 | Que la app arranque con `react-native-maps` 1.27.2 sobre React Native 0.86 | Es la apuesta de la fase. Se verificó que el paquete trae codegen Fabric completo, pero nunca se compiló | Sí — basta que la *development build* levante en CI |
| 2 | Que los sprites midan 44 dp y se vean nítidos | La convención de densidades `@2x`/`@3x` ya provocó un fallo de empaquetado una vez | Sí — captura de pantalla comparada |
| 3 | El vuelo de apertura Huila → La Plata | Depende de `onMapReady`; en Android animar antes del *layout* no hace nada | Parcial — se observa el encuadre final |
| 4 | El latido del marcador seleccionado, y que al deseleccionar vuelva a mapa de bits | Es el único marcador que sigue cambios de vista | Difícil — inspección manual |
| 5 | Fluidez del paneo con 200 y con 1.000 árboles | El criterio de aceptación. El trabajo en JavaScript ya está medido y es despreciable (≤ 0,012 ms por viewport asentado); lo que falta es el coste nativo | Sí — perfilador de fotogramas |
| 6 | Los cinco estados en escala de grises, en el dispositivo | Ya verificado sobre los sprites generados; falta verlo sobre el mapa real | Sí — captura en escala de grises |

**Sin la API key de Google Maps el mapa sale gris en Android y nada de lo anterior se puede
juzgar.** Esa es la primera dependencia a resolver antes de la jornada de validación.

**Hueco conocido y menor:** la carga del mapa muestra una píldora «Cargando los árboles…» en
lugar de un esqueleto. La ficha del árbol sí lleva esqueleto.

---

## Fase 4 — Registro de árbol y bitácora · **Hito B**

**Duración:** 1,5 semanas · **Dependencias:** Fases 2 y 3 · **Diseño:** `ui_kits/mobile/TreeDetailScreen` y `TreeListScreen`

**Registro de árbol** — asistente de cuatro pasos con borrador guardado localmente:

1. Ubicación: mapa centrado en el GPS actual, pin arrastrable, opción de coordenadas manuales.
2. Especie: campo de texto libre **con autocompletado** por frecuencia; se guarda el texto original y la clave normalizada.
3. Datos de siembra: fecha, altura en cm, ramas visibles.
4. Fotografía y confirmación.

**Bitácora de crecimiento**

- La entrada de siembra es el **ciclo 1**; no hay registro separado.
- Captura con superposición fantasma de la foto anterior, para que la serie sea comparable.
- Campos por entrada: foto, altura, ramas visibles, estado de salud, notas.
- Si el estado es `muerto`: no pide medidas, pide causa y evidencia.
- Al guardar: se actualiza la fecha de última actualización, se recalcula el próximo recordatorio a dos meses desde esa foto, se resuelven los recordatorios abiertos y cambia el color del marcador.
- Compresión obligatoria a ~200 KB más miniatura de 300 px, **antes** de subir.
- Detalle del árbol con línea de tiempo, comparador antes/después y gráfica de altura.

**Criterio de aceptación:** un guardián siembra un árbol, aparece en el mapa, sube una segunda entrada y ve su línea de tiempo y su gráfica.

---

## Fase 5 — Notificaciones y recordatorios bimestrales

**Duración:** 1 semana · **Dependencias:** Fase 4 · **Diseño:** pantalla de actividad y ajustes de notificaciones

**Tareas**

- Registro del token de notificaciones por dispositivo; permiso solicitado **después** del primer árbol registrado, no en el onboarding.
- `pg_cron` diario a las 8:00 hora Colombia que busca árboles vencidos.
- Edge Function que agrupa por usuario (una sola notificación aunque tenga diez árboles vencidos), envía por Expo Push y deja registro.
- Escalonamiento: día 0, día +7, día +21 con copia al coordinador, día +30 marca el árbol como vencido.
- Enlace profundo `arbolapp://tree/{id}/log` que abre directamente la cámara.
- Notificación local de respaldo a 60 días, reprogramada en cada apertura.
- Pantalla de Actividad con el histórico y ajustes de notificaciones.

**Criterio de aceptación:** con fechas forzadas en base de datos, el ciclo completo de recordatorio llega al dispositivo, abre la cámara y se marca como resuelto al subir la foto.

**Riesgo:** es la funcionalidad más difícil de probar porque opera en meses. Cubrir con pruebas automatizadas el cálculo de fechas y la lógica de agrupación.

---

## Fase 6 — Panel de administración · **Hito C**

**Duración:** 1,5 semanas · **Dependencias:** Fases 4 y 5 · **Diseño:** `ui_kits/web/AdminScreens`

**Tareas**

- Acceso restringido por rol de coordinador.
- Gestión de usuarios: listado, búsqueda, activar y desactivar.
- Moderación posterior: revisar árboles y fotos, **archivar con motivo** en lugar de borrar; borrado físico reservado a contenido inapropiado.
- Reasignación de guardián y estado `unassigned`.
- **Sección de fusión de especies:** seleccionar variantes, elegir cuál nombre queda como oficial, reetiquetar los árboles afectados y dejar registro reversible. Vista de especies con una sola ocurrencia.
- Estadísticas: total sembrado, vivos, tasa de supervivencia, desglose por municipio, vereda y especie, y puntualidad de actualización.
- Exportación a CSV y Excel para el seguimiento del PRAE.

**Criterio de aceptación:** el coordinador fusiona `mandarina` en `mandarino`, archiva un árbol abandonado y exporta el reporte por vereda.

---

## Fase 7 — Mapa público web

**Duración:** 4 días · **Dependencias:** Fases 3 y 6 · **Diseño:** `ui_kits/web/PublicMap`

**Tareas**

- Mapa de solo lectura sin registro, con Google Maps JS API y el mismo estilo oscuro.
- Contadores en vivo y filtros por municipio y vereda.
- Ficha pública del árbol con su línea de tiempo.
- Página apta para incrustar en el sitio del colegio o de la alcaldía.
- Despliegue en Vercel con subdominio propio de la plataforma.

**Criterio de aceptación:** un visitante sin cuenta abre el enlace y navega el mapa desde un navegador de escritorio y uno móvil.

---

## Fase 8 — Endurecimiento

**Duración:** 1 semana · **Dependencias:** Fase 7 · **Diseño:** estados vacíos, de error y guía de accesibilidad

Lo que decide si la app sobrevive al uso real en veredas con mala señal.

**Tareas**

- Modo offline: cola persistente de registros y fotos, caché de la última zona, indicador de pendientes por sincronizar.
- Verificación anti-fraude: foto en vivo obligatoria al sembrar, coherencia entre GPS y coordenada declarada, alerta de duplicados a menos de 3 m, cola de revisión sin rechazo automático.
- Sentry en móvil y web.
- Alerta automática al 70% de la cuota de almacenamiento.
- Respaldo diario de base de datos y fotos.
- Pruebas de rendimiento del mapa con 1.000 árboles simulados.
- Revisión de accesibilidad y de textos en toda la aplicación.
- **Jornada de validación visual acumulada.** Las fases que se cerraron sin ejecutar la app en un dispositivo dejan aquí su lista de comprobación; la de la Fase 3 está en su propia sección de cierre. Se hace una sola vez, como prueba de regresión sobre todo lo construido, y lo que se pueda automatizar —arranque de la *development build* en CI, capturas comparadas, captura en escala de grises, perfilador de fotogramas— se automatiza en lugar de repetirse a mano en cada entrega.

**Criterio de aceptación:** se registra un árbol en modo avión y se sincroniza al recuperar señal, sin pérdida de datos, y ninguna comprobación diferida de las fases anteriores queda sin ejecutar.

---

## Fase 9 — Publicación · **Hito D**

**Duración:** 1 semana de trabajo, más la espera de revisión de las tiendas
**Dependencias:** Fase 8, cuenta Apple activa, titularidad de cuentas definida, textos legales redactados

**Tareas**

- Identidad visual definitiva: logo, ícono, pantalla de carga y sustitución de la paleta provisional.
- **Redacción de la política de privacidad y los términos**, reemplazando el contenido provisional.
- Capturas de pantalla, descripciones y clasificación por edad de ambas fichas de tienda.
- Compilación de producción con EAS y envío a Google Play y App Store.
- EAS Update configurado antes del primer despliegue a usuarios reales.
- Piloto con 10 a 15 guardianes antes de la apertura general.
- Guía breve de uso para los guardianes.

**Criterio de aceptación:** la app está disponible en ambas tiendas y el piloto completó un ciclo de siembra y actualización.

**Riesgo:** la revisión de App Store puede rechazar por política de privacidad incompleta o por permisos de ubicación mal justificados. Redactar con cuidado los textos de permiso antes de enviar.

---

## Ruta crítica y dependencias externas

| Necesidad | Fase que la requiere | Estado |
|---|---|---|
| API key de Google Maps | Fase 3 escrita sin ella; hace falta para la validación visual | Pendiente de entrega |
| Android SDK y un dispositivo o emulador | Validación visual de las Fases 3 a 5 | No instalados en el equipo de desarrollo |
| Cuenta Apple Developer | Fase 9 | En trámite |
| Titularidad de cuentas | Fase 9 | Pendiente de definir |
| Textos legales | Fase 9 | Pendiente de redactar |
| Identidad visual | Fase 9 | Pendiente de diseñar |
| Dominio propio | Opcional, mejora la Fase 7 | Omitido |

Ninguna de estas bloquea el arranque. Las tres últimas se necesitan solo en la fase final,
lo que da margen amplio para resolverlas mientras se construye.

## Sobre el package name

`co.edu.iesansebastian.arbolapp` **se puede cambiar libremente hasta la primera
publicación** en cualquiera de las dos tiendas. Después queda fijo de forma permanente:
cambiarlo obliga a crear una ficha nueva y los usuarios instalados no reciben la
actualización. Si se cambia antes de publicar, hay que ajustar `app.json`, regenerar
credenciales en EAS, volver a registrar la app en Firebase Cloud Messaging y actualizar
las restricciones de la API key de Google Maps — media hora de trabajo, sin consecuencias.

No hace falta ser dueño del dominio `iesansebastian.edu.co` para usarlo: las tiendas no
verifican la propiedad del dominio, es solo una convención de nombres.

## Qué queda fuera de este plan

Todo lo listado en [PROPUESTAS-DESARROLLO-FUTURO.md](PROPUESTAS-DESARROLLO-FUTURO.md):
gamificación, placas con código QR, reporte PRAE en PDF automatizado, alertas climáticas,
identificación de especies por imagen, geometría real de veredas y apertura a guardianes
menores de edad. Se retoman después del lanzamiento, con datos reales de uso para
priorizar.
