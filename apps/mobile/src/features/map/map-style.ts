import { colors } from '@/constants/theme';

/**
 * Leaf paper, as Google Maps understands it.
 *
 * The map is the same sheet the rest of the app is printed on: the ground is
 * `surfacePage`, so the tiles and the screen around them read as one surface
 * and a white panel floating over the map still has an edge. Every colour comes
 * from the token ramp in packages/core, because a tile set with its own idea of
 * what green means would put the markers in competition with the landscape and
 * the legend would stop reading.
 *
 * Points of interest stay switched off rather than dimmed, and so do transit,
 * road shields, land parcels and local road labels. That is the one part of
 * this file the light rework did not revisit, because the reasoning never
 * depended on the palette: a restaurant pin next to a tree marker is a second
 * dot that means nothing here. The map answers one question — which tree is
 * where — and anything that does not help answer it is noise a guardian has to
 * look past while standing in direct sun.
 *
 * ## Why the ground is not the canvas gradient
 *
 * The v2 canvas paints the map ground as a radial gradient from `surfaceRaised`
 * to `borderSubtle`. Google Maps has no gradients: a styler is one flat colour
 * per feature. So the gradient has to collapse to a single tone, and which tone
 * is an accessibility question rather than a taste one — the greener and darker
 * the ground, the less a green `stateOk` marker separates from it.
 *
 * Measured with the WCAG relative-luminance formula, the same maths as
 * `scripts/check-contrast.mjs`, against the 3:1 that SC 1.4.11 asks of a
 * graphical object:
 *
 * | ground                  | stateOk | stateDue | stateOverdue | stateDead | stateArchived |
 * |-------------------------|---------|----------|--------------|-----------|---------------|
 * | `surfaceRaised` #FFFFFF |  4.29   |   1.40   |     3.15     |   4.72    |     4.61      |
 * | `surfacePage`  #F4FDF4  |  4.12   |   1.35   |     3.03     |   4.54    |     4.43      |
 * | `borderSubtle` #DCEBDF  |  3.47   |   1.13   |     2.55     |   3.82    |     3.73      |
 *
 * The dark end of the gradient fails: `stateOverdue` reads 2.55:1 on
 * `borderSubtle`. Walking back towards the white end, 3:1 is lost about a fifth
 * of the way along, and `surfacePage` sits exactly at that limit. So the ground
 * is `surfacePage` — the light end of the gradient rather than its average,
 * because a marker nobody can pick out is worse than a ground a shade plainer
 * than the drawing. That is a level 1 deviation under `PLAN-FIDELIDAD-UI.md`:
 * applied here, reasoned here, and owed back to the canvas.
 *
 * Every fill a marker can land on is held at `surfacePage` or lighter for the
 * same reason, which is why built-up land is white rather than washed green.
 * `poi.park` is the single fill that keeps the gradient's green: park polygons
 * are an urban feature and the trees this app tracks stand in fincas and
 * schoolyards, so a marker rarely sits on one.
 *
 * `stateDue` #FFD700 measures 1.35:1 here and no ground in this palette rescues
 * it — the yellow is lighter than any surface a light theme can offer. It is
 * not worked around from this file, because a state colour belongs to the
 * design system and inventing a sixth green would break the legend.
 *
 * ## Labels are ink on paper now
 *
 * The fill is dark and the halo is light, which is the reverse of what this
 * file used to do. A stroke exists to lift a label off whatever it crosses, so
 * on a light map it has to be lighter than the ground: the `green990` halo this
 * file carried would ring every place name in black, which is the tell of a
 * dark style migrated without being re-read.
 */
export const lightMapStyle = [
  { elementType: 'geometry', stylers: [{ color: colors.surfacePage }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.surfaceRaised }] },

  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: colors.borderStrong }],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [{ visibility: 'off' }],
  },
  // The name of the vereda or the municipio is how a guardian orients, so it
  // takes the full ink rather than the receding one every other label gets.
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.textPrimary }],
  },

  // The countryside is the ground itself, and the built-up patches are a step
  // lighter. That inverts the depth the dark map had, where land was lighter
  // than the page: on paper a settlement reads as a clearing, not as a stain.
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: colors.surfacePage }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry',
    stylers: [{ color: colors.surfaceRaised }],
  },

  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: colors.borderSubtle }, { visibility: 'on' }],
  },

  // White roads on leaf paper, with the highways a step down instead of a step
  // up: on a light ground a road is read by being paler than the land around
  // it, and the only band that has to carry across a zoomed-out view is the
  // highway.
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.surfaceRaised }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: colors.borderStrong }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },

  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // The Magdalena and its tributaries in the brand's own river blue. It is the
  // one saturated fill on the map, and it cannot be mistaken for a marker
  // because no tree state is blue.
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.riverBlue }] },
  // Dark ink on the blue, at 5.34:1. The muted grey this used to carry measures
  // 1.41:1 there and would leave every river name unreadable.
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: colors.textPrimary }],
  },
];
