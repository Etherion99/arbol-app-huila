# ÁrbolApp Huila

Plataforma para geolocalizar, mapear y hacer seguimiento al crecimiento de árboles
frutales sembrados en el Huila, en el marco del proyecto ambiental PRAE
**"De la pantalla a la realidad"** de la Institución Educativa San Sebastián (La Plata).

Los usuarios se registran como **Guardianes de la Naturaleza**, siembran un árbol, lo
ubican en el mapa y actualizan su bitácora de crecimiento cada dos meses.

## Documentos del proyecto

- [plan.md](plan.md) — plan de trabajo por fases de la v1.
- [PROPUESTAS-DESARROLLO-FUTURO.md](PROPUESTAS-DESARROLLO-FUTURO.md) — decisiones confirmadas y roadmap posterior al lanzamiento.

## Estructura

```
apps/mobile     App del Guardián — Expo / React Native (Android + iOS)
apps/web        Panel de administración y mapa público — Next.js
packages/core   Tokens de diseño, tipos de dominio y lógica compartida
supabase/       Migraciones SQL y Edge Functions
```

## Requisitos

**Node `^20.19.4 || ^22.13.0 || ^24.3.0`.** Expo SDK 57 rechaza Node 18 y también
la 22.11 que hay instalada en este equipo: la mínima válida de la serie 22 es la 22.13.

En este equipo hay varias versiones instaladas con nvm. Para activar la 24:

```powershell
nvm use 24.14.1   # requiere terminal como administrador
```

**pnpm 11.** El gestor de paquetes del proyecto. Se activa con corepack, incluido en Node:

```powershell
corepack enable pnpm
```

Nunca uses `npm` ni `yarn` en este repositorio. Los paquetes del ecosistema Expo van con
`expo install`, que respeta la matriz de compatibilidad del SDK.

## Puesta en marcha

```bash
pnpm install                # instala todo el monorepo
cp .env.example .env        # y rellenar los valores
pnpm mobile                 # app móvil (Expo)
pnpm web                    # panel y mapa público (Next.js)
```

## Base de datos local

Requiere Docker en ejecución. Ver [supabase/README.md](supabase/README.md) para el
detalle del esquema, los usuarios de prueba y la convención de Storage.

```bash
pnpm db:start               # levanta Supabase local
pnpm db:reset               # migraciones desde cero + datos de prueba
pnpm db:stop
```

## Verificación

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test:species           # requiere el stack local levantado
pnpm test:rls               # requiere el stack local levantado
```

## Configuración de la aplicación

| Parámetro | Valor |
|---|---|
| Package name / Bundle ID | `co.edu.iesansebastian.arbolapp` |
| Esquema de enlaces profundos | `arbolapp://` |
| Región de Supabase | East US (North Virginia) |

El identificador puede cambiarse libremente **hasta la primera publicación** en tiendas.
Después queda fijo de forma permanente.

## Estado

Fases 0 y 1 completadas. Siguiente: Fase 2 — autenticación y perfil de Guardián.
