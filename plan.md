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
| Identidad visual | Paleta provisional; diseño definitivo posterior |
| Política de privacidad | Pantalla y ruta reservadas, contenido pendiente |

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

**Duración:** 4 días · **Dependencias:** Fase 1

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

**Duración:** 1,5 semanas · **Dependencias:** Fase 1, y la API key de Maps para probar en dispositivo

El corazón de la aplicación y la pantalla de entrada.

**Tareas**

- Librería de mapas: **decisión pendiente al iniciar la fase.** `react-native-maps` 1.29 da Google Maps en Android y iOS con el mismo estilo oscuro personalizado, que es lo que pide el diseño de "puntos de luz"; pero su compatibilidad con React Native 0.86 hay que verificarla. `expo-maps` 57.0.2 es de primera parte y encaja perfecto con el SDK, pero usa **Apple Maps en iOS**, donde el estilo JSON de Google no aplica y el mapa se vería distinto en iPhone. Evaluar ambas con un prototipo antes de comprometerse.
- Marcadores como sprite PNG con resplandor pre-renderizado; `tracksViewChanges={false}` tras el primer render.
- Agrupamiento por nivel de zoom: círculos por municipio con conteo, luego clusters, luego marcadores individuales.
- Animación de pulso solo en el marcador seleccionado y en los árboles recién sembrados.
- Carga por viewport con retardo de 400 ms sobre el fin del desplazamiento.
- Buscador y filtros Municipio ▸ Vereda sobre el catálogo de texto, con encuadre por centroide y radio.
- Ficha flotante al pulsar un punto: especie, foto reciente, guardián, última actualización.

**Criterio de aceptación:** el mapa se desplaza con fluidez con 200 árboles de prueba en un dispositivo de gama media, y el filtro por vereda encuadra correctamente.

**Riesgo:** Google Maps no funciona en Expo Go sobre iOS. Se trabaja con *development build* desde el inicio, ya previsto en la Fase 0.

---

## Fase 4 — Registro de árbol y bitácora · **Hito B**

**Duración:** 1,5 semanas · **Dependencias:** Fases 2 y 3

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

**Duración:** 1 semana · **Dependencias:** Fase 4

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

**Duración:** 1,5 semanas · **Dependencias:** Fases 4 y 5

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

**Duración:** 4 días · **Dependencias:** Fases 3 y 6

**Tareas**

- Mapa de solo lectura sin registro, con Google Maps JS API y el mismo estilo oscuro.
- Contadores en vivo y filtros por municipio y vereda.
- Ficha pública del árbol con su línea de tiempo.
- Página apta para incrustar en el sitio del colegio o de la alcaldía.
- Despliegue en Vercel con subdominio propio de la plataforma.

**Criterio de aceptación:** un visitante sin cuenta abre el enlace y navega el mapa desde un navegador de escritorio y uno móvil.

---

## Fase 8 — Endurecimiento

**Duración:** 1 semana · **Dependencias:** Fase 7

Lo que decide si la app sobrevive al uso real en veredas con mala señal.

**Tareas**

- Modo offline: cola persistente de registros y fotos, caché de la última zona, indicador de pendientes por sincronizar.
- Verificación anti-fraude: foto en vivo obligatoria al sembrar, coherencia entre GPS y coordenada declarada, alerta de duplicados a menos de 3 m, cola de revisión sin rechazo automático.
- Sentry en móvil y web.
- Alerta automática al 70% de la cuota de almacenamiento.
- Respaldo diario de base de datos y fotos.
- Pruebas de rendimiento del mapa con 1.000 árboles simulados.
- Revisión de accesibilidad y de textos en toda la aplicación.

**Criterio de aceptación:** se registra un árbol en modo avión y se sincroniza al recuperar señal, sin pérdida de datos.

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
| API key de Google Maps | Fase 3, para probar en dispositivo | Pendiente de entrega |
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
