# Supabase — ÁrbolApp Huila

Backend de la plataforma: Postgres con PostGIS, autenticación, almacenamiento de
fotografías, políticas RLS, Edge Functions y el cron de recordatorios bimestrales.

## Estado

**El proyecto en la nube aún no existe.** Todo el esquema se desarrolla y se verifica
contra Supabase local, que corre en Docker con la CLI instalada como dependencia del
repositorio. Cuando se cree el proyecto remoto, las migraciones de `migrations/` se
aplican tal cual con `supabase db push`.

## Puesta en marcha

Requiere Docker en ejecución.

```bash
pnpm db:start    # levanta el stack local (la primera vez descarga ~9 GB de imágenes)
pnpm db:reset    # recrea la base, aplica las migraciones desde cero y carga el seed
pnpm db:stop     # apaga el stack
pnpm db:diff     # genera una migración a partir de cambios hechos a mano
```

Verificaciones que dependen del stack local:

```bash
pnpm test:species     # la clave normalizada de SQL coincide con la de packages/core
pnpm test:rls         # las políticas RLS, ejercitadas con dos guardianes y un coordinador
pnpm test:merge       # la fusión de especies y su reversión, de extremo a extremo
pnpm test:reminders   # el motor de recordatorios completo, con las fechas forzadas
pnpm test:integrity   # las marcas de registro y la cola de revisión del coordinador
pnpm test:map         # el mapa con 1.000 árboles simulados
```

`pnpm test:reminders` **hace su propio `db:reset`** antes de empezar. Fuerza fechas de
vencimiento y desactiva dispositivos, así que partir siempre del seed es lo que lo hace
reproducible. Tarda alrededor de un minuto.

`pnpm test:rls` archiva un árbol como parte de la prueba. Ejecuta `pnpm db:reset`
después si necesitas los datos de prueba intactos.

`pnpm test:integrity` siembra tres árboles y deja dos marcas de registro; `pnpm test:map`
planta hasta mil árboles con prefijo `SIM-`. Los dos avisan al terminar de que conviene un
`pnpm db:reset`. Ninguno borra nada por su cuenta: en este proyecto el borrado lo pide una
persona.

### Puertos

El proyecto usa el rango **55320–55329** en vez del 54320–54329 por defecto. En el equipo
de desarrollo, Windows tiene reservado el rango 54282–54481 para puertos dinámicos de
Hyper-V, y Docker no puede publicar nada dentro de él. Los puertos están declarados en
`config.toml`; si en otra máquina el rango por defecto está libre, cambiarlos de vuelta
no rompe nada.

| Servicio | URL |
|---|---|
| API (PostgREST, Auth, Storage) | http://127.0.0.1:55321 |
| Base de datos | postgresql://postgres:postgres@127.0.0.1:55322/postgres |
| Studio | http://127.0.0.1:55323 |
| Correo de prueba (Mailpit) | http://127.0.0.1:55324 |

## Estructura

- `migrations/` — migraciones SQL versionadas, una por bloque temático.
- `seed.sql` — datos de prueba: La Plata con 10 veredas, 200 árboles y su bitácora.
- `functions/` — Edge Functions en Deno. Hoy solo `reminder-sweep`.

### Migraciones

| Archivo | Contenido |
|---|---|
| `…_extensions_and_enums.sql` | PostGIS, `pg_cron`, `pg_net`, los tipos enumerados y `normalize_species()` |
| `…_identity_and_catalogs.sql` | `users`, `zones`, `species` y `species_merges` |
| `…_trees_and_growth_log.sql` | `trees`, `log_entries`, sus índices, sus disparadores y la vista `tree_tracking` |
| `…_notification_support.sql` | `devices` y `reminders` |
| `…_row_level_security.sql` | RLS en todas las tablas, permisos por columna y las vistas públicas de perfil |
| `…_storage.sql` | El bucket de fotografías y sus políticas |
| `…_access_functions.sql` | `trees_in_viewport()` y las vistas de estadística |
| `…_tree_card.sql` | `tree_card()` y `short_display_name()`, lo que muestra la ficha flotante del mapa |
| `…_reminder_engine.sql` | `notification_preferences`, `register_device()`, `due_reminders()`, `reminder_feed()` y el cron diario |
| `…_registration_integrity.sql` | `trees.client_request_id`, `registration_flags`, `flag_registration()`, la cola de revisión y el `register_tree()` idempotente |
| `…_storage_quota_and_backups.sql` | `storage_usage()`, `system_alerts`, `check_storage_quota()` con su cron, `backup_runs` y `backup_health()` |

## Datos de prueba

El seed crea un coordinador y seis guardianes. **Todos entran con la contraseña
`arbolapp2026`.**

| Correo | Rol |
|---|---|
| `coordinacion@iesansebastian.edu.co` | Coordinador |
| `andres.cabrera@iesansebastian.edu.co` | Guardián |
| `yulieth.perdomo@iesansebastian.edu.co` | Guardián |
| `jhon.munoz@iesansebastian.edu.co` | Guardián |
| `diana.losada@iesansebastian.edu.co` | Guardián |
| `wilmer.trujillo@iesansebastian.edu.co` | Guardián |
| `luz.chavarro@iesansebastian.edu.co` | Guardián |

Las fechas del seed son relativas a `now()`, así que un reset siempre produce árboles al
día, por vencer y vencidos, sin importar cuándo se ejecute.

## Motor de recordatorios

Tres piezas y una sola fuente de verdad para las fechas.

```
pg_cron  0 13 * * *  ──▶  run_reminder_sweep()  ──pg_net──▶  reminder-sweep (Deno)
                                                                    │
                                    due_reminders() ◀───────────────┤
                                    devices        ◀───────────────┤
                                    Expo Push API  ◀───────────────┤
                                    reminders      ◀───────────────┘
```

**La cadencia y la zona horaria viven solo en `next_reminder_after()`.** Es la función
inmutable que genera `trees.next_reminder_at`, y todo lo demás lee esa columna en vez de
volver a escribir «2 meses» o «America/Bogota». La única excepción declarada es la hora del
cron: `pg_cron` programa en UTC y no acepta zona, así que las 08:00 de Colombia se escriben
como `0 13 * * *`. El nombre de la zona **no** se repite ahí; `packages/core` guarda
`REMINDER_TIME_ZONE` y `REMINDER_DISPATCH_HOUR`, y `pnpm test:reminders` comprueba que el
cron programado coincide con esa hora en esa zona. Es el mismo arreglo que ya sostiene
`normalize_species()` frente a `normalizeSpecies()`.

**La idempotencia es el índice único de `reminders` sobre `(tree_id, cycle, kind)`**, no un
mecanismo aparte. `due_reminders()` descarta lo que ya tiene fila, y la función inserta con
`resolution=ignore-duplicates`. Dos ejecuciones seguidas del cron no duplican nada, y eso se
demuestra en `pnpm test:reminders` en vez de argumentarse.

**El orden es enviar y después registrar.** La tabla dice de sí misma que una fila existe
solo porque se envió, y `sent_at` no admite nulos por eso. Un guardián al que no se pudo
alcanzar —sin dispositivo, o con todos sus tokens muertos— no deja fila y vuelve a
intentarse mañana. Reservar primero cerraría esa ventana y abriría otra peor, donde un
envío fallido queda anotado como entregado y el guardián nunca se entera.

### Escalonamiento

| Día | `reminder_kind` | Qué pasa |
|---|---|---|
| 0 | `cycle` | El aviso bimestral. El mensaje lo fija el producto. |
| +7 | `follow_up_7d` | Primera insistencia. |
| +21 | `follow_up_21d` | Segunda insistencia **con copia al coordinador**. |
| +30 | `overdue` | El árbol queda marcado como vencido. |

Los desfases están en `public.reminder_offset_days()` y su espejo `REMINDER_OFFSET_DAYS` de
`packages/core`, que a su vez se construye desde `REMINDER_FOLLOW_UP_DAYS` y
`DAYS_UNTIL_OVERDUE`. `pnpm test:reminders` compara los cuatro peldaños.

> **Sobre «día +30 marca el árbol como vencido».** La vista `tree_tracking` ya devuelve
> `overdue` desde el día 0, que es cuando `next_reminder_at` queda atrás. El peldaño de +30
> **no** vuelve a marcar nada: escribir un segundo estado de vencimiento sería una segunda
> fuente de verdad sobre lo mismo, y el mapa, la lista y la leyenda dejarían de coincidir.
> Lo que el peldaño añade es la fila `overdue` en `reminders` —el último aviso de la
> escalada— y con ella el registro de que el ciclo se dio por perdido.

La copia al coordinador **no** deja fila propia en `reminders`: la tabla está indexada por
`(tree_id, cycle, kind)` y la fila del guardián ya ocupa ese hueco. No es una carencia, es lo
que hace idempotente el peldaño entero — una vez existe esa fila, ni el aviso ni su copia
vuelven a salir.

### Preferencia por guardián

`notification_preferences`, una fila por guardián, **no** dos columnas en `users`. El
privilegio de lectura sobre `users` se concede columna por columna y también a `anon`
—así es como el correo queda fuera de alcance—, de modo que meter ahí una preferencia
obligaría a elegir entre entregársela a `anon` o partir ese grant en dos audiencias, y a
partir de entonces cada columna nueva tendría que recordar de qué lado cae. Una tabla propia
nace inalcanzable para `anon`, igual que `devices` y `reminders`, y su política es una
comprobación de fila.

Tampoco va en `devices`: apagar los recordatorios significa «dejen de escribirme», no
«dejen de escribirme en la tableta». Si un dispositivo concreto puede recibir o no es
`devices.is_active`, que es un hecho de entrega y no una decisión.

**La fila ausente es una respuesta.** Significa los valores por omisión, y el barrido la lee
así con un `coalesce`, de modo que nadie tuvo que rellenarse hacia atrás.

### Un teléfono que cambia de manos

`register_device()` es `security definer` por un solo caso: el token pertenece a la
instalación, no a la cuenta. Cuando un segundo guardián entra en el mismo teléfono, Expo
entrega la misma cadena, la fila ya existe a nombre de otro, y `devices_own_all` no deja ni
actualizarla ni insertar por encima. El conflicto **mueve** la fila en vez de rechazarla, así
que el dueño anterior deja de recibir en ese aparato en el mismo instante — y sigue
recibiendo en cualquier otro que hubiera registrado, porque esos son filas suyas.

### Configuración del despacho

La URL y la clave salen de **Vault**, no del archivo de migración: una migración versionada
no puede llevar una clave de servicio, y el stack local y el proyecto en la nube no comparten
nombre de host. Vault y no un ajuste de base de datos porque `alter database … set` sobre un
parámetro propio exige superusuario, y `postgres` no lo es en Supabase — ni local ni en la
nube.

```sql
select vault.create_secret(
  'https://<ref>.supabase.co/functions/v1/reminder-sweep',
  'reminder_sweep_url',
  'Endpoint of the reminder sweep Edge Function');

select vault.create_secret(
  '<service role key>',
  'reminder_sweep_key',
  'Service role key the reminder sweep carries');
```

Sin esos dos secretos el cron no falla ruidosamente: `run_reminder_sweep()` emite un
`warning` y devuelve `null`, porque una entrada de cron en rojo cada mañana no diría nada
que ese aviso no diga. En local los crea `pnpm test:reminders` leyendo `supabase status`,
que es también la razón por la que la clave no está en ningún archivo del repositorio.

### Los envíos de prueba nunca salen de la máquina

`[edge_runtime.secrets]` de `config.toml` apunta `EXPO_PUSH_API_URL` a
`host.docker.internal:55328`. Ese archivo configura **solo el stack local** —el proyecto en
la nube toma sus secretos del panel—, así que apuntarlo a un stub no es un atajo de pruebas:
es el ajuste correcto para un equipo que no debe hacer sonar el teléfono de nadie.
`pnpm test:reminders` levanta ese stub y responde con los tickets que Expo habría devuelto,
que es la única forma de comprobar la agrupación y el retiro de tokens muertos sin tener un
teléfono delante.

## Integridad del registro

Tres señales, y **ninguna rechaza nada**. Bajo dosel el GPS de un teléfono se va más de
cien metros sin culpa de nadie, y dos árboles jóvenes en el lindero de un lote sí pueden
estar a tres metros. Un rechazo automático convertiría cada uno de esos casos en un
guardián honesto al que una máquina llama mentiroso, y un guardián al que llaman mentiroso
no vuelve. Lo que produce una señal es una **marca**, y toda marca la juzga una persona.

| Señal | Cuándo | Qué suele significar de verdad |
|---|---|---|
| `gps_mismatch` | la foto se tomó a más de **150 m** del punto declarado | dosel, ladera, cielo tapado |
| `duplicate_location` | hay otro árbol vivo a menos de **3 m** | siembra densa, o el mismo formulario enviado dos veces |
| `missing_capture_location` | la foto no traía coordenada | teléfono viejo, permiso denegado, arranque en frío |

La tercera existe para que las otras dos signifiquen algo: sin ella, la forma de pasar todas
las comprobaciones sería apagar la ubicación antes de abrir la cámara.

Los dos umbrales viven en `registration_flag_thresholds()` y su espejo
`GPS_COHERENCE_METRES` / `DUPLICATE_RADIUS_METRES` de `packages/core`. `pnpm test:offline`
compara los dos lados, igual que `normalize_species()` frente a `normalizeSpecies()`.

**Un guardián no puede leer `registration_flags`.** Se le dice una vez, en la pantalla donde
acaba de registrar, con las palabras que elige la aplicación. Un canal permanente de «estás
marcado» sobre su propio árbol convierte una revisión en una acusación, y además le daría a
quien quisiera burlar las comprobaciones una forma de probarlas hasta pasarlas.

**Confirmar una marca no archiva el árbol.** Son dos decisiones distintas y una pantalla no
debe tomar la segunda en silencio: archivar exige un motivo escrito que el guardián lee.

## Escrituras idempotentes desde el teléfono

La cola de sincronización offline reintenta, así que toda escritura tiene que poder llegar
dos veces sin producir dos cosas. Las dos que hay lo consiguen de forma distinta, porque
tienen claves distintas:

- **Una entrada de bitácora** es única sobre `(tree_id, cycle)`. Un reintento que choca con
  ese índice es una escritura cuyo primer intento llegó y cuya respuesta se perdió: es un
  éxito con una subida pendiente, no un error, y nunca se le muestra al guardián como tal.
- **Una siembra no tiene clave natural.** Dos árboles plantados uno al lado del otro en el
  mismo minuto son idénticos en todas las columnas, así que nada en la fila podría
  distinguir un duplicado de un segundo árbol real. Por eso el teléfono acuña un
  `client_request_id` **antes del primer intento**, y `register_tree()` devuelve el árbol
  que ese identificador ya creó en vez de crear otro. El índice es único por guardián, no
  globalmente: el identificador sale de un teléfono y la base no tiene motivo para suponer
  que dos teléfonos nunca coinciden.

## Cuota de almacenamiento y respaldos

El plan gratuito da **1 GB para todo el año** y el proyecto suma unas 1.800 fotografías
anuales a ~200 KB más miniatura. Cabe, con margen; el modo de fallo no es «nos quedamos sin
espacio» sino «nadie se dio cuenta de que íbamos a quedarnos».

`check_storage_quota()` corre a diario a las 08:30 de Colombia —`30 13 * * *` en UTC, la
misma excepción declarada que el barrido de recordatorios— y levanta una fila de
`system_alerts` la primera vez que el uso cruza el **70 %**, y otra al 85 y al 95. El índice
único sobre `(kind, threshold_percent)` es lo que hace que un cron diario durante un año
produzca una fila y no trescientas sesenta y cinco. El tablero muestra además el porcentaje
en todo momento, porque una alerta se ve una vez y un medidor se mira cada semana.

**La alerta es una fila y no un correo.** Este proyecto no tiene servicio de correo propio y
el del plan gratuito es para autenticación; una fila que el panel lee y que el cron no puede
duplicar es algo que el coordinador ve en la pantalla que ya abre.

### El respaldo vive fuera de Supabase

Un respaldo que vive en la misma cuenta que respalda no es un respaldo.
`.github/workflows/backup.yml` corre en GitHub a las 03:00 de Colombia, vuelca el esquema y
los datos, sincroniza las fotografías a un bucket ajeno al proyecto y anota la ejecución en
`backup_runs`. Esa anotación es lo que hace visible un respaldo que dejó de correr:
`backup_health()` lo da por vencido a las 36 horas, que son dos ejecuciones perdidas y no
una que llegó tarde.

**No se ha ejecutado nunca**, porque el proyecto en la nube no existe todavía. El flujo está
apagado tras la variable de repositorio `BACKUP_ENABLED` y escrito ya para que el día que se
cree el proyecto el respaldo empiece ese mismo día. Lo que hace falta para encenderlo está
en la cabecera del propio archivo.

## Convención de nombres en Storage

El bucket `growth-log-photos` es **privado**. Uno público entregaría una URL sin
autenticar para cada objeto y no habría forma de dejar de servir las fotos de un árbol
archivado; privado más una política de lectura da el mismo acceso abierto a lo visible y
ninguno a lo que no lo está.

```
<tree_id>/<cycle>/photo.jpg       fotografía comprimida, ~200 KB
<tree_id>/<cycle>/thumbnail.jpg   miniatura de 300 px
```

El identificador del árbol va primero porque es lo que permite que una política de
Storage decida la propiedad a partir del nombre del objeto. Los mismos nombres se
construyen desde el código con `growthLogPhotoPath()` y `growthLogThumbnailPath()` de
`packages/core`.

## Convenciones transversales

- Toda consulta pública filtra `archived_at IS NULL`. El sistema **no borra registros**:
  archiva con borrado lógico, conservando la bitácora y el histórico. El borrado físico
  queda reservado a contenido inapropiado y a solicitudes de supresión de datos
  personales.
- **Ningún endpoint público expone el correo del guardián.** No es solo una política de
  fila: `anon` y `authenticated` no tienen privilegio sobre la columna `users.email`, así
  que no se alcanza ni con una consulta escrita a mano. El perfil público se lee de la
  vista `public_users`, y el coordinador accede a los correos por `user_directory`.
- Las especies nunca se cuentan sobre el texto crudo, siempre sobre `normalized_key`. El
  texto que escribió el guardián se conserva intacto en `trees.species_raw_text`.
- Toda tabla nueva nace con políticas RLS. Una tabla sin políticas no se da por terminada.

## Especies: nada se corrige al escribir

`normalize_species()` unifica solo lo que es inequívocamente la misma palabra escrita con
descuido: mayúsculas, tildes y espacios sobrantes. **No toca los plurales.** Recortar la
`s` final no distingue un plural de una palabra que termina en `s`, y produce claves que
no corresponden a ningún nombre real (`hass` → `has`, `limones` → `limone`).

Por eso `mandarino`, `mandarinos` y `Mandarina` conviven como tres especies distintas
hasta que alguien decida que son la misma. La convergencia ocurre en dos momentos, ninguno
de ellos restrictivo:

1. **Al escribir** — `species_suggestions(texto)` ofrece lo que ya existe, ordenado por
   número de árboles. La mayoría elige una sugerencia y el catálogo converge solo.
2. **Después** — el coordinador fusiona desde el panel con `merge_species()`.

```sql
-- 18 mandarinos + 12 MANDARINOS + 6 Mandarina = 36 árboles,
-- y el coordinador decide que todos se llamen otra cosa.
select public.merge_species(
  array[<id de mandarinos>, <id de mandarina>],
  <id de mandarino>,
  'Árboles de mandarina'
);
```

El nombre que sobrevive es texto libre y **no tiene que ser ninguno de los fusionados**.
Cada fusión queda registrada en `species_merges` con la lista exacta de árboles que movió,
y `revert_species_merge()` la deshace devolviendo esos mismos árboles y el nombre anterior.
Las especies fusionadas no se borran: quedan archivadas apuntando a su destino, para que
los enlaces viejos sigan resolviendo.

`trees.species_raw_text` nunca cambia, ni siquiera en una fusión.

## Zonas: todo es corregible

Los nombres de las 12 veredas del seed son reales, tomados del componente rural del Plan
Básico de Ordenamiento Territorial de La Plata, donde figuran bajo el corregimiento de
Belén. **Los centroides son aproximados**: no existen datos oficiales de contornos ni de
puntos centrales, así que son posiciones verosímiles dentro del municipio, suficientes
para encuadrar el mapa y repartir los datos de prueba.

El coordinador puede editar nombre, slug, centroide y zoom de cualquier zona desde el
panel, y crear las que falten, sin necesidad de una migración. Cuando aparezcan los
contornos oficiales, cargarlos en `zones.geometry` es una carga de datos y no un rediseño.

**Nota sobre la jerarquía real:** La Plata tiene seis corregimientos —Belén, Gallego,
Monserrate, San Andrés, San Vicente y Villa Losada— y las veredas cuelgan de ellos. El
esquema modela tres niveles (departamento ▸ municipio ▸ vereda), así que las veredas
cuelgan directamente del municipio y el corregimiento no se representa. Añadirlo después
es agregar un valor al enum `zone_type` y un caso al disparador de jerarquía; no obliga a
mover datos.
