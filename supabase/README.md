# Supabase — ÁrbolApp Huila

Backend de la plataforma: Postgres con PostGIS, autenticación, almacenamiento de
fotografías, políticas RLS, Edge Functions y el cron de recordatorios bimestrales.

## Estado

**Proyecto aún no creado.** La Fase 0 deja la estructura y las variables de entorno
listas; el proyecto real se crea al iniciar la Fase 1.

## Al crear el proyecto

1. Región **East US (North Virginia)** — la de menor latencia hacia Colombia.
2. Guardar la URL y las claves en `.env` a partir de `.env.example`.
3. Habilitar las extensiones `postgis`, `pg_cron` y `pg_net`.
4. Definir la titularidad de la cuenta antes de cargar datos reales (pendiente).

## Estructura

- `migrations/` — migraciones SQL versionadas. El esquema completo llega en la Fase 1.
- `functions/` — Edge Functions en Deno: envío de notificaciones push y generación de reportes.

## Convención transversal

Toda consulta pública filtra `archivado_at IS NULL`. El sistema **no borra registros**:
archiva con borrado lógico, conservando la bitácora y el histórico. El borrado físico
queda reservado a contenido inapropiado y a solicitudes de supresión de datos personales.
