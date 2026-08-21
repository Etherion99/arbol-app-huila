# ÁrbolApp Huila — Propuestas de desarrollo futuro

> Documento vivo. Última revisión: **20 de agosto de 2026**.
> Recoge funcionalidades **fuera del alcance de la v1** especificada, ordenadas por
> horizonte temporal. No es un compromiso de entrega: es el mapa de hacia dónde
> puede crecer la plataforma una vez esté en producción.

**Leyenda de esfuerzo:** ⚙️ bajo (≤1 semana) · ⚙️⚙️ medio (2–4 semanas) · ⚙️⚙️⚙️ alto (>1 mes)
**Leyenda de impacto:** 🔥 alto · 🔸 medio · ▫️ exploratorio

## Decisiones confirmadas para la v1

Respondidas por el equipo del proyecto el 20 de agosto de 2026. Condicionan lo que sigue.

| Tema | Decisión | Efecto en el roadmap |
|---|---|---|
| Edad de los Guardianes | ✅ **Confirmado: solo mayores de edad.** El perfil son egresados, representantes de estudiantes y docentes; no estudiantes activos menores | §2.8 se mantiene como propuesta futura. Es la ampliación natural si más adelante se abre a estudiantes de bachillerato |
| Autenticación | Correo obligatorio. Todos los estudiantes de la I.E. San Sebastián tienen correo institucional | Registro estándar correo + contraseña con verificación |
| Propiedad del árbol | Un árbol = un guardián. Un guardián puede tener 30 árboles o más | Sin guardianía compartida ni cuentas de curso |
| Datos de siembra | Fecha de siembra, especie, altura y número de ramas visibles | Campos cuantitativos desde la v1; recomendado repetirlos en cada bitácora (§0.4) |
| Moderación | Posterior, con libre remoción por parte del coordinador | El árbol aparece en el mapa al instante (ver matiz en §0.2) |
| Coordenadas | Exactas y públicas, sin difuminado | Simplifica §2.2 y §2.4. Revisar si en el futuro se admiten menores (§2.8) |
| Escala esperada | ≥300 árboles nuevos por año; >1.000 en 2–3 años | El almacenamiento supera el plan gratuito en el año 2 (ver Deuda técnica) |
| Alcance de la web | Panel de administración **y** mapa público | §2.2 asciende a la v1 |
| Catálogo de especies | Sin catálogo cerrado: texto libre, con conteo automático por especie | Requiere normalización para que la estadística sirva (§0.5) |
| Android mínimo | **Android 8.0 (API 26)** | Deja fuera solo equipos anteriores a 2017 |
| Cuenta Apple Developer | Aún no se tiene; se adquirirá antes de publicar | No bloquea el desarrollo, sí la distribución en iOS |
| Shapefiles de veredas | **No disponibles**; la v1 no los usa ni los asume | La vereda se maneja como catálogo sin geometría (§2.9) |
| Google Cloud | Cuenta lista; **API key pendiente de entrega** | Desarrollo con clave propia restringida hasta recibirla |
| Continuidad e infraestructura | Plataforma abierta indefinidamente. **Año 1 en planes gratuitos**; a partir del año 2 habrá financiación para un plan mayor | Diseñar la v1 para caber en 1 GB durante el primer año (ver Deuda técnica) |

---

## 0. Vacíos de la v1 que recomiendo cerrar antes de lanzar

Esto **no** es roadmap futuro: son huecos de la especificación actual que, si no se
resuelven, degradan la credibilidad del proyecto desde el primer mes.

### 0.1 Ciclo de vida completo del árbol 🔥 ⚙️

La especificación asume que todo árbol sembrado sigue vivo. En siembras escolares la
mortalidad del primer año está entre 20% y 40% (sequía, ganado, quema, falta de riego).

Sin un estado de "muerto", pasan tres cosas malas:

1. El guardián recibe cada 2 meses un recordatorio de fotografiar un árbol que ya no existe, y abandona la app.
2. El contador global de "árboles sembrados" deja de significar "árboles vivos", y es un dato que nadie puede sostener ante la Secretaría de Ambiente o en la sustentación del PRAE.
3. Se pierde la métrica más valiosa del proyecto: **la tasa de supervivencia**.

**Propuesta:** campo `status` en el árbol con valores `vivo` · `en_riesgo` · `muerto`
· `replantado`. El guardián puede reportar la muerte con foto y causa; el docente la
valida. Un árbol `replanted` conserva el punto en el mapa y encadena la bitácora
anterior, de modo que la historia del sitio no se pierde. Los indicadores del panel
pasan a mostrar *sembrados / vivos / tasa de supervivencia*, que es el trío que
realmente cuenta la historia del proyecto.

### 0.2 Baja o transferencia de guardián 🔸 ⚙️

Los guardianes se retiran, se mudan o dejan de participar al terminar el ciclo del
proyecto. Hoy el árbol quedaría huérfano y sin recordatorios para siempre. Se necesita
reasignación por parte del coordinador y un estado `unassigned` visible en el panel
para reclutar reemplazo.

**Decisión confirmada — archivado con borrado lógico (*soft delete*):** el coordinador
no borra registros, los archiva. El árbol sale del mapa activo y deja de generar
recordatorios, pero conserva su bitácora completa, sigue contando en el histórico y puede
reasignarse a un guardián nuevo. Se implementa con `archived_at`, `archived_by` y
`archive_reason`, filtrando por `archived_at IS NULL` en todas las consultas públicas.
El borrado físico queda reservado para contenido inapropiado y para solicitudes de
supresión de datos personales, que la Ley 1581 obliga a atender.

### 0.3 Política de privacidad y consentimiento 🔥 ⚙️

Requisito de tienda, no opcional, incluso siendo todos los Guardianes mayores de edad:
la app recolecta datos personales, fotografías y geolocalización, y eso exige política de
tratamiento publicada y aceptación explícita conforme a la Ley 1581 de 2012.

Como la v1 es solo para mayores de edad, el registro debe **declararlo de forma expresa**
(casilla de confirmación de mayoría de edad en el alta) y los términos deben prohibir el
uso por menores. Sin esa declaración, admitir menores más adelante obliga a re-consentir
a toda la base de usuarios existente. Ver §2.8.

### 0.4 Medición cuantitativa en cada entrada de bitácora ✅ *confirmado para la v1*

La v1 captura altura y número de ramas visibles **en la siembra y en cada actualización
bimestral**. Aprobado el 20 de agosto de 2026 junto con el resto de campos de la bitácora
(estado de salud, notas, coordenada de captura, número de ciclo y puntualidad).

Es una casilla más para el usuario y a cambio produce la curva de crecimiento real en
centímetros por especie, por vereda y por año — el dato que sustenta un informe PRAE ante
la Secretaría de Ambiente, frente a una galería de fotos que solo sugiere el crecimiento.
Como efecto secundario, vuelve prescindible la medición con realidad aumentada de §3.2.

### 0.5 Normalización de especies escritas en texto libre ✅ *confirmado para la v1*

La v1 no tiene catálogo cerrado: el guardián escribe la especie, y la app debe contabilizar
cuántos mandarinos, limones o mangos hay. El riesgo es que el texto libre genere
`mandarino`, `Mandarina`, `mandarinos`, `MANDARINO` y `mandarino injerto` como cinco
especies distintas, y el conteo deje de servir para cualquier informe.

**Propuesta que conserva la libertad de escritura:**

- Campo abierto con **autocompletado** que sugiere lo ya escrito por otros guardianes, ordenado por frecuencia. La mayoría elige la sugerencia y converge sola.
- **Clave normalizada** interna para agrupar (minúsculas, sin tildes, singular), separada del texto que el usuario escribió, que se conserva tal cual.
- Sección de **fusión de especies** en el panel web de administración: el coordinador selecciona dos o más variantes (`mandarino` y `mandarina`), **elige cuál nombre queda como oficial** y la fusión reetiqueta todos los árboles afectados. Queda registro de la operación por si hay que revertirla.
- Vista de "especies con una sola ocurrencia" para detectar errores de digitación antes de que ensucien la estadística.
- Los árboles conservan el texto original escrito por su guardián en un campo aparte, de modo que una fusión nunca destruye el dato de origen.

---

## Horizonte 1 — Primeros 3 meses tras el lanzamiento

Consolidar adopción y confiabilidad del dato. Nada aquí es vistoso; todo aquí decide si
el proyecto sobrevive al primer semestre.

### 1.1 Verificación anti-fraude de registros 🔥 ⚙️⚙️

Sin esto, cualquiera registra 50 árboles desde el sofá de su casa y los reportes PRAE
dejan de ser defendibles.

- **Foto en vivo obligatoria**: cámara dentro de la app, sin acceso a galería, en el registro inicial.
- **Coherencia GPS**: comparar la coordenada declarada contra la ubicación real del dispositivo al momento de la captura; marcar como sospechoso si difieren más de ~150 m.
- **Metadatos EXIF**: conservar fecha/hora y coordenadas de la foto original antes de comprimir.
- **Detección de duplicados**: alertar cuando dos árboles se registran a menos de 3 m de distancia.
- **Cola de revisión** en el panel del docente con los registros marcados, nunca rechazo automático (el GPS falla legítimamente bajo dosel arbóreo).

### 1.2 Modo offline y sincronización diferida 🔥 ⚙️⚙️

Las veredas de La Plata tienen cobertura intermitente. El GPS funciona sin datos, así que
se puede sembrar y registrar sin señal si la app encola las operaciones.

- Cola persistente de registros y fotos pendientes de subir.
- Caché del mapa y de los árboles de la última zona consultada.
- Indicador visible de "N registros pendientes de sincronizar".
- Resolución de conflictos por marca de tiempo del dispositivo.

### 1.3 Guía de cuidado por especie 🔸 ⚙️

Contenido, no ingeniería. Cada especie del catálogo con: marco de siembra, riego según
época, plagas comunes en el Huila, cuándo esperar la primera cosecha. Convierte la app de
"registro" en "acompañamiento", que es lo que sostiene el uso entre recordatorio y
recordatorio.

### 1.4 Certificado digital de Guardián 🔸 ⚙️

PDF descargable con nombre, institución, árboles a cargo, meses de seguimiento y tasa de
supervivencia. Sirve como constancia de servicio social y es el mejor motivador de bajo
costo que existe para este público.

### 1.5 Observabilidad y respaldo ▫️ ⚙️

Sentry para errores en producción, respaldo automático diario de base de datos y de las
fotos a almacenamiento externo, y alerta cuando el almacenamiento supere el 80% del plan
contratado. Aburrido y no negociable.

---

## Horizonte 2 — Meses 3 a 9

Ampliar alcance más allá del aula: comunidad, institucionalidad y calidad del dato.

### 2.1 Gamificación y dinámica entre instituciones 🔥 ⚙️⚙️

El recordatorio cada 2 meses es un intervalo largo; sin un motivo intermedio para abrir
la app, la retención cae.

- **Insignias**: primer árbol, primer año completo, 6 bitácoras consecutivas, árbol en producción.
- **Niveles de guardián**: Semilla → Brote → Árbol → Bosque, según constancia (no según cantidad, para no premiar el registro masivo sin seguimiento).
- **Tabla comparativa entre colegios y veredas**, por tasa de supervivencia y puntualidad de actualización — nunca por número bruto de siembras.
- **Retos de temporada**: jornada de siembra por el Día del Árbol, semana de actualización masiva.

### 2.2 Mapa público web embebible 🔥 ⚙️⚙️

Vista de solo lectura, sin registro, con los árboles aprobados y contadores en vivo.
Publicable en `iframe` dentro del sitio del colegio o de la Alcaldía de La Plata. Es la
pieza que convierte el proyecto en algo mostrable a prensa, concejo municipal y
convocatorias de financiación. Requiere decidir el difuminado de coordenadas para
visitantes anónimos.

### 2.3 Placas físicas con código QR 🔸 ⚙️

Cada árbol lleva una placa impresa con QR que abre su ficha pública. Conecta el mundo
físico con la app —literalmente "de la pantalla a la realidad"— y permite que un vecino
que pasa por el sitio conozca la historia del árbol y su guardián.

### 2.4 Exportación a formatos SIG y datos abiertos 🔸 ⚙️

GeoJSON, KML (para Google Earth) y Shapefile. Habilita que la Secretaría de Ambiente o la
CAM incorporen la capa en sus propios sistemas, y que estudiantes de universidades del
Huila usen el dataset en trabajos de grado. Publicar bajo licencia abierta con las
coordenadas difuminadas.

### 2.5 Reporte PRAE automatizado 🔸 ⚙️⚙️

Generador de PDF con la plantilla oficial del PRAE: portada, resumen de indicadores,
mapa renderizado, galería de evidencias fotográficas por vereda y anexo de datos. Hoy ese
informe se arma a mano cada semestre; automatizarlo ahorra días de trabajo docente y
estandariza la evidencia.

### 2.6 Alertas climáticas contextuales 🔸 ⚙️⚙️

Integración con datos del IDEAM o una API meteorológica: aviso de temporada seca
prolongada en el municipio con recomendación de riego, o alerta de heladas para especies
sensibles. Convierte la notificación de "recordatorio administrativo" en "ayuda real",
que es lo que la gente no silencia.

### 2.7 Panel multi-institución y multi-municipio ⚙️⚙️⚙️ 🔸

Preparar el modelo para que otros colegios del Huila se sumen sin mezclar datos: jerarquía
de organizaciones, roles por nivel (docente de institución, coordinador municipal,
observador departamental) y permisos derivados. Conviene diseñar el esquema con esto en
mente **desde la v1** aunque la funcionalidad llegue después; migrar a multi-tenant con
datos en producción es caro.

### 2.8 Soporte para Guardianes menores de edad 🔥 ⚙️⚙️⚙️

**La v1 admite únicamente mayores de edad.** Abrir la plataforma a estudiantes de colegio
—el público natural de un PRAE— es probablemente la ampliación de mayor valor del
proyecto, y también la más costosa, porque no es una funcionalidad sino un régimen legal
distinto.

Lo que implica:

- **Consentimiento verificable del acudiente**, registrado, fechado y auditable, antes de que el menor pueda registrar un árbol. No basta una casilla: la Ley 1581 de 2012 y las políticas de Apple y Google exigen un mecanismo de verificación real.
- **Reclasificación en tiendas.** La ficha pasa a declararse dirigida a menores, lo que activa el programa *Families* de Google Play y las reglas *Kids Category* de Apple: prohibición de publicidad conductual, restricciones de analítica y revisión más estricta.
- **Minimización de datos.** Para cuentas de menores conviene no exponer nombre completo ni foto de perfil en el mapa público, y difuminar coordenadas de forma más agresiva.
- **Cuentas gestionadas por la institución.** El docente crea y administra las cuentas del curso, en vez de un registro abierto.
- **Módulos sociales cerrados por defecto** para menores (ver §3.7).
- **Re-consentimiento de la base existente** si el cambio de términos altera el tratamiento de datos.

**Recomendación:** aunque la funcionalidad llegue después, dejar preparado desde ahora el
campo de rol/edad, la declaración de mayoría de edad en el registro y la separación entre
"perfil público" y "datos personales". Añadir menores sobre un modelo que nunca los previó
suele costar más que rehacer el registro entero.

### 2.9 Geometría real de municipios y veredas 🔸 ⚙️⚙️

**La v1 no usa shapefiles.** La vereda es un catálogo de texto asociado al municipio: el
usuario la selecciona a mano y el árbol guarda su coordenada GPS, sin polígonos.

Limitaciones que acepta la v1:

- El filtro por vereda es una consulta por atributo, no espacial: si el usuario elige mal la vereda, el dato queda mal clasificado y nadie lo detecta.
- El zoom automático al seleccionar una zona se resuelve con centroide aproximado y radio fijo, no ajustándose al contorno real.
- No hay asignación automática de vereda a partir del GPS, ni validación de que el árbol esté realmente dentro de la vereda declarada.
- No se pueden calcular estadísticas por área ni densidad de siembra por hectárea.

Cuando se consigan los datos (MGN del DANE para municipios; Alcaldía de La Plata, UMATA o
IGAC para límites veredales), la mejora consiste en cargar los polígonos a PostGIS,
indexarlos y activar tres cosas: relleno automático de municipio y vereda por
`ST_Contains` sobre la coordenada capturada, filtros espaciales reales, y encuadre exacto
del mapa al contorno de la zona. **El modelo de datos de la v1 debe reservar desde ya la
columna de geometría** para que esto sea una migración de datos y no un rediseño.

Alternativa provisional si los polígonos tardan: dibujar a mano los contornos aproximados
de las veredas activas del proyecto con una herramienta de mapeo, en una sesión con
alguien que conozca el territorio. Precisión baja, pero desbloquea la funcionalidad.

---

## Horizonte 3 — Visión a 12+ meses

Alto valor, alta incertidumbre. Cada punto merece validación antes de comprometer
desarrollo.

### 3.1 Identificación de especie y diagnóstico por foto (IA) ▫️ ⚙️⚙️

Modelo de visión que sugiere la especie a partir de la fotografía y detecta signos de
plaga, clorosis o estrés hídrico. Reduce errores de catalogación y da valor inmediato al
acto de subir la foto. Empezar con un servicio existente antes de considerar modelo
propio; validar precisión con especies del Huila, que suelen estar sub-representadas en
los datasets genéricos.

### 3.2 Medición de altura con realidad aumentada ▫️ ⚙️⚙️

ARCore / ARKit para estimar la altura apuntando el teléfono al árbol. Convierte la
"bitácora de crecimiento" en una serie de datos cuantitativa y no solo fotográfica, lo
que habilita gráficas de crecimiento reales por especie y por vereda. Precisión limitada
en campo abierto; requiere prueba antes de invertir.

### 3.3 Estimación de impacto ambiental ▫️ ⚙️⚙️

Cálculo de CO₂ capturado, oxígeno producido y agua infiltrada, según especie, edad y
altura. **Advertencia:** debe usar factores de conversión citables y publicar la
metodología. Una cifra inventada de captura de carbono desacredita todo el proyecto ante
cualquier revisor técnico; mejor no tener el dato que tenerlo mal.

### 3.4 Registro de cosecha y seguridad alimentaria ▫️ ⚙️⚙️

Cuando los frutales entren en producción (3–5 años según especie), registrar kilos
cosechados y destino (consumo familiar, restaurante escolar, venta). Cierra el círculo del
proyecto y produce el indicador que más interesa a entidades de cooperación:
alimentos producidos por la comunidad.

### 3.5 Apadrinamiento y financiación ▫️ ⚙️⚙️⚙️

Permitir que empresas o particulares apadrinen árboles o siembras, con seguimiento
fotográfico del árbol apadrinado. Es una vía de sostenibilidad económica para el
proyecto, pero implica pagos, facturación y responsabilidades legales — evaluar solo con
respaldo institucional formal.

### 3.6 Accesibilidad lingüística y cultural ▫️ ⚙️⚙️

La Plata y su entorno tienen población indígena Nasa. Interfaz con lectura fácil,
navegación por íconos para usuarios con baja alfabetización digital, y evaluación de
soporte parcial en Nasa Yuwe. Requiere acompañamiento de la comunidad, no traducción
automática.

### 3.7 Red social de guardianes ▫️ ⚙️⚙️

Comentarios y reacciones entre guardianes, seguimiento de árboles ajenos, mapa de "árboles
cerca de mí". **Precaución:** con la base de la v1 (solo mayores de edad) el riesgo es manejable, pero
si se implementa §2.8 este módulo pasa a ser un frente de moderación permanente con
obligaciones legales adicionales. No abrirlo sin capacidad real de moderar.

---

## Deuda técnica a vigilar

| Tema | Riesgo si se posterga | Cuándo atacarlo |
|---|---|---|
| Almacenamiento de fotos | Año 1 cabe en el plan gratuito de 1 GB **solo si se comprime desde el inicio**: 300 árboles × 6 fotos/año a 200 KB ≈ 0,36 GB. Sin compresión (fotos de 3–5 MB) el límite se alcanza en el primer semestre | **Antes del lanzamiento**: compresión obligatoria a ~200 KB con miniatura de 300 px, y alerta automática al 70% de cuota. Migración a plan pago o a Cloudflare R2 prevista para el año 2, cuando haya financiación |
| Pruebas automatizadas | Cada cambio en el motor de recordatorios se vuelve una apuesta | Cubrir con tests el cálculo de fechas y la lógica de envío desde el día uno |
| CI/CD y actualizaciones OTA | Corregir un bug en campo exige esperar revisión de tienda | Configurar EAS Update antes del primer despliegue a usuarios reales |
| Migración a multi-tenant | Reestructurar permisos con datos en producción | Diseñar el esquema previendo organizaciones desde la v1 |
| Versionado de la API | Usuarios con app vieja que dejan de poder sincronizar | Antes de la primera actualización mayor |
| Continuidad del proyecto | La app muere cuando se gradúa quien la mantiene | Documentar despliegue y traspaso de credenciales desde el inicio |

---

## Criterios para priorizar

Ante cualquier propuesta nueva, en este orden:

1. **¿Protege la integridad del dato?** Un registro falso o un árbol muerto contado como vivo destruye el valor del proyecto entero. Va primero.
2. **¿Reduce el abandono?** El ciclo de 2 meses es largo; todo lo que dé una razón para volver antes vale más que una funcionalidad nueva.
3. **¿Es sostenible sin el equipo actual?** Si requiere mantenimiento experto continuo, probablemente no sobreviva al proyecto escolar.
4. **¿Es demostrable ante un tercero?** Alcaldía, CAM, prensa o convocatorias. Lo que se puede mostrar es lo que consigue apoyo para continuar.
