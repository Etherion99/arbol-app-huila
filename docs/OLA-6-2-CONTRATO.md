# Ola 6.2 · Contrato del componente de mapa público

## Estructura

Dos pantallas comparten un único componente de mapa a través de un contrato fijo:

- **E1** (`/map`): Mapa público con ficha del árbol (full layout con navegación, leyenda, filtros).
- **E3** (`/map/embed`): Variante incrustable en `iframe` sin chrome de la app.

## Contrato del componente `PublicMap`

### Props (desde `apps/web/src/features/public-map/types.ts`)

```typescript
interface PublicMapProps {
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  filters?: TreeFilters;
  onViewportChange?: (viewport: ViewportBounds) => void;
  onMarkerClick?: (treeId: string) => void;
  embedMode?: boolean;
  trees?: TreeMarker[] | null;
  isLoading?: boolean;
  error?: string | null;
  selectedTreeId?: string | null;
  onRetry?: () => void;
}
```

### Cómo funciona

1. **Mapeo de árbol → marcador**: El componente recibe `trees` (array de `TreeMarker`).
   Cada marcador muestra solo: `id`, `lat`, `lng`, `status`, `species`.

2. **Consultas SQL**:
   - **`trees_in_viewport(min_lng, min_lat, max_lng, max_lat, zoom, species_filter, zone_filter)`**:
     Se dispara en cada cambio de viewport (pan, zoom).
     Devuelve **solo un punto**: id, coordenadas, estado, especie.
     Limita por zoom: 250 puntos < 11, 750 < 15, 1000 arriba.
   - **`tree_card(tree_id)`**:
     Se dispara **solo al tocar un marcador**.
     Devuelve: código, especie, texto original, estado, fechas, vereda, municipio, ciclo,
     nombre del guardián (acortado, sin correo), rutas de foto y miniatura.

3. **Separación clara**:
   - E1 (pantalla completa) y E3 (embed) ambas usan el mismo `PublicMap`.
   - **Nunca amplifiques `trees_in_viewport`** para traer la ficha.
   - Un pan/zoom no paga fotogr que nadie miró.

### Filtros

`filters.species` y `filters.zones` se pasan a `trees_in_viewport()` en SQL.
La UI puede mostrar estos filtros como checkboxes, dropdowns, etc.
No está especificado aquí cómo se renderizan; cada pantalla decide su UX.

### Estados de árbol (5 colores distintos)

| Status | Color | Hex |
|---|---|---|
| `updated` | Verde Huilense | `#008D46` |
| `due_soon` | Amarillo | `#FFD700` |
| `overdue` | Naranja Plateño | `#F26522` |
| `dead` | Rojo | `#E31B23` |
| `archived` | Gris | `#757575` |

**Importante**: `due_soon` y `overdue` **NO comparten color**. Son dos estados visibles
e independientes en el mapa.

### Modo embed (`embedMode: true`)

E3 establece `embedMode: true`. El componente debe:
- No renderizar chrome de la app (barra de navegación, breadcrumbs, etc.).
- Usar el viewport por defecto siempre (ignorar URL params si existen).
- Mantener clustering de marcadores siempre activado.

### Degradación sin clave de Maps

**En esta máquina no hay clave de Google Maps.**

- La pantalla **debe explicar qué pasó** cuando la clave falta (error claro, no pantalla gris).
- Todo lo demás (ficha, leyenda, filtros) **se construye para poder mirarse sin el mapa**,
  así verificas que la UI funciona incluso cuando el mapa no carga.

### Seguridad: sin correos de guardianes

- El cliente usa la **clave anónima de Supabase** (ya en `env.supabaseAnonKey`).
- La tabla `public_users` **no expone el correo** (ya resuelto en SQL, política RLS).
- La función `short_display_name()` acorta el nombre del guardián a "Andrés C." en `tree_card()`.
- **Ningún correo sale a ningún sitio.** Si ves uno, es bug de SQL, no de la UI.

## Reparto de trabajo

### Agente A: Componente `PublicMap` + Pantalla E1

1. Implementa el componente `PublicMap` respetando el contrato.
2. Construye E1 (`/map`) con:
   - Mapa (con degradación sin clave)
   - Leyenda de colores
   - Filtros (especie, zona)
   - Ficha del árbol (modal o panel lateral)
3. Los textos de UI van a `apps/web/src/constants/texts.ts`.
4. Maneja errores de red y ofrece reintento.

### Agente B: Pantalla E3 + Prueba de iframe

1. Construye E3 (`/map/embed`) componiendo `PublicMap` con el props `embedMode: true`.
2. Sin chrome, sin navegación, sin leyenda si es posible (E1 decide eso).
3. Verifica que **carga dentro de un `iframe`**.
4. Respeta el contrato; no bifurques el mapa ni lo reimplementes.

## Librería de mapas: Google Maps JS

**Recomendación**: Google Maps JS (`@react-google-maps/api`).

**Motivos**:
1. El móvil usa `lightMapStyle` (array de estilos) que viene de `apps/mobile/src/features/map/map-style.ts`.
2. Google Maps JS reutiliza exactamente ese formato, así el mapa público y el móvil se ven igual.
3. Una alternativa sin clave obliga a reescribir el estilo entero (riesgo de divergencia).

**Instalación**:
```bash
pnpm add @react-google-maps/api 2.20.3 --filter @arbolapp/web
pnpm add -D @types/google.maps 3.55.11 --filter @arbolapp/web
```

(Versiones fijas, como exige `.npmrc`.)

**Clave**: En `.env.example` documéntalo (no la guardes en el código):
```
# apps/web/.env.example
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

## URLs de las pantallas

- **E1**: `/map` (pública, sin auth)
- **E3**: `/map/embed` (pública, sin auth, diseñada para `<iframe>`)

Agrégalas a `apps/web/src/lib/routes.ts` si quieres, pero no es obligatorio
si las pantallas no las referencian.

## Antes de commitear

1. ✅ Types válidos en TypeScript.
2. ✅ `trees_in_viewport` y `tree_card` se llaman correctamente (pregunta al SQL guy si dudas).
3. ✅ Sin correos de guardianes en las respuestas.
4. ✅ Los 5 colores de estado se distinguen en la UI.
5. ✅ Error de red visible, con reintento.
6. ✅ Sin clave de Maps → mensaje claro, no crash.
7. ✅ `pnpm typecheck && pnpm lint && pnpm format:check` verdes.
8. ✅ Commits pequeños, formato `feat(public-map)` o similar.
9. ✅ **Sin `Co-Authored-By` de IA ni mención de Claude.** El commit es del usuario.

## Detalles de seguridad y RLS

La base **ya tiene todo resuelto**:
- `anon` tiene `select` sobre `trees`, `log_entries`, `species`, `zones`, `tree_tracking`, `public_users`.
- `public_users` filtra el correo en SQL (política RLS).
- Fotos en storage están accesibles con RLS `public` solo si no están archivadas.

Si algo no se consulta, **sospecha de la política RLS, no del código**.
Una migración no es trabajo de esta ola: maqueta con estados de carga y vacío, y anótalo.

---

**Fecha de fijación del contrato**: 2026-08-22
