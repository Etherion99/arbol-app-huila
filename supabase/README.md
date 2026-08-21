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
pnpm test:species   # la clave normalizada de SQL coincide con la de packages/core
pnpm test:rls       # las políticas RLS, ejercitadas con dos guardianes y un coordinador
pnpm test:merge     # la fusión de especies y su reversión, de extremo a extremo
```

`pnpm test:rls` archiva un árbol como parte de la prueba. Ejecuta `pnpm db:reset`
después si necesitas los datos de prueba intactos.

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
- `functions/` — Edge Functions en Deno. Llegan con el motor de notificaciones.

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
