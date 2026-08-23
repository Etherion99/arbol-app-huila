// The colour pairs the application actually renders, and the sizes it renders
// them at.
//
// ## Why this file exists
//
// `check-contrast.mjs` used to measure every token against the four surfaces
// and stop there. That answers "could this token ever carry text" and it is
// worth knowing, but it is not the question a screen fails on. It passed green
// for weeks while `_layout.tsx` painted its only useful line in `warning`
// `#FFD700` on the page -- **1.35:1**, invisible -- because `warning` was
// correctly documented as a token that may not carry text, and nothing looked
// at whether anything did.
//
// So this is the other half: what is on top of what, where, and how big. A pair
// listed here is measured and has to clear AA for the size it is set at. A
// foreground token used in the code and *not* listed here is a failure too --
// see `SCANNED` below -- because an unmeasured pair is exactly how the last one
// got through.
//
// ## What a `background` is
//
// Either one token, or a stack painted back to front: `['stateDueSoft',
// 'surfacePage']` is the translucent amber composited over the page. The last
// entry has to be opaque, because something has to be underneath. A literal
// `rgba(...)` is allowed where a component writes one, since a scrim over a
// photograph is not a design token and pretending it were would be worse.
//
// `PHOTO_SCRIM` is the one named ground that is not a colour: a photograph
// under the app's standard dark wash. A photograph has no measurable colour, so
// it is modelled as the wash over **white** -- the brightest picture anybody
// could take, and therefore the worst case for pale ink. Ink that clears the
// threshold there clears it over every photograph.
//
// ## Sizes
//
// `small` is anything under the large-text threshold and owes 4.5:1. `large` is
// `fontSize.xl` regular or `fontSize.lg` bold and owes 3:1. `graphic` is an
// icon, a dot, a rule or a control border and owes 3:1 under SC 1.4.11.

/**
 * Every pair, grouped by the file that paints it.
 *
 * The file path is not decoration. The scan below reads these files, works out
 * which colour tokens each one uses as a foreground, and fails when one is not
 * covered here -- so a pair cannot be quietly deleted from the table while the
 * code keeps painting it, and a component that starts using a new colour cannot
 * ship without somebody measuring it.
 */
export const PAIRS = [
  // -------------------------------------------------------------------------
  // Mobile · the offline queue, which is what this phase added
  // -------------------------------------------------------------------------
  {
    file: 'apps/mobile/src/components/connection-banner.tsx',
    pairs: [
      ['textPrimary', ['stateDueSoft', 'surfacePage'], 'small', 'the strip sentence, 13pt'],
      [
        'textPrimary',
        ['dangerSoft', 'surfacePage'],
        'small',
        'the same sentence once a write has failed',
      ],
      [
        'earthBrown',
        ['stateDueSoft', 'surfacePage'],
        'graphic',
        'the wifi-off glyph while waiting',
      ],
      ['danger', ['dangerSoft', 'surfacePage'], 'graphic', 'the same glyph once something failed'],
      ['textLink', ['stateDueSoft', 'surfacePage'], 'small', 'the «Ver» link, 13pt'],
      ['textSecondary', ['stateDueSoft', 'surfacePage'], 'small', 'the quiet second line'],
    ],
  },
  {
    file: 'apps/mobile/src/features/sync/components/pending-sync-card.tsx',
    pairs: [
      ['textPrimary', 'surfaceCard', 'small', 'the title of a queued write'],
      ['textSecondary', 'surfaceCard', 'small', 'the mono line, 12pt — the canvas sets it muted'],
      [
        'earthBrown',
        ['stateDueSoft', 'surfaceCard'],
        'small',
        'the «En cola» and «Reintentando» pill labels',
      ],
      ['textPrimary', ['accentSoft', 'surfaceCard'], 'small', 'the «Enviando» pill label'],
      [
        'textPrimary',
        ['dangerSoft', 'surfaceCard'],
        'small',
        'the «No se puede enviar» pill label',
      ],
      ['earthBrown', 'surfaceCard', 'graphic', 'the amber pill edge'],
      ['accent', 'surfaceCard', 'graphic', 'the pill edge while a write is going up'],
      ['danger', 'surfaceCard', 'graphic', 'the edge of a write a retry cannot help'],
      [
        'textSecondary',
        'surfacePage',
        'decoration',
        'the dashed card edge — the pill and the sentence say «en cola» in words',
      ],
      [
        'borderSubtle',
        'surfaceCard',
        'decoration',
        'the well edge — it outlines a picture, nothing more',
      ],
    ],
  },
  {
    file: 'apps/mobile/src/features/trees/components/tree-list-card.tsx',
    pairs: [
      ['emerald700', 'surfaceOverlay', 'graphic', 'the sprout standing in for a thumbnail'],
      ['textSecondary', 'surfaceCard', 'small', 'the due line of a calm state, 13pt'],
      ['textPrimary', 'surfaceCard', 'small', 'the due line of an overdue tree, 13pt medium'],
      ['earthBrown', 'surfaceCard', 'small', 'the «PENDIENTE DE ENVIAR» fragment, 12pt'],
      [
        'borderSubtle',
        'surfaceCard',
        'decoration',
        'the thumbnail well edge — it outlines a picture, nothing more',
      ],
    ],
  },
  {
    file: 'apps/mobile/src/app/(app)/trees.tsx',
    pairs: [
      ['textSecondary', 'surfacePage', 'small', 'the count line, 13pt mono'],
      ['earthBrown', 'surfacePage', 'small', 'the «2 por actualizar» fragment, 13pt'],
      ['emerald600', 'surfaceCard', 'graphic', 'the sprout in the empty-state medallion'],
      [
        'borderSubtle',
        'surfacePage',
        'decoration',
        'the medallion ring — the empty state is a title and a sentence',
      ],
      ['onAccent', 'accent', 'large', 'the «Sembrar» button label, in the button scale'],
    ],
  },
  {
    file: 'apps/mobile/src/features/planting/components/planting-success.tsx',
    pairs: [
      ['accent', ['accentSoft', 'surfacePage'], 'graphic', 'the sprout in the success medallion'],
      ['textLink', 'surfacePage', 'small', 'the tree code, 17pt mono'],
      ['accent', 'surfaceRaised', 'graphic', 'the bell beside the notification prompt'],
      [
        'borderSubtle',
        'surfaceRaised',
        'decoration',
        'the shelf seam — the panel is a change of ground, not a control',
      ],
    ],
  },
  // -------------------------------------------------------------------------
  // Mobile · the two pairs the accessibility audit already had to fix
  // -------------------------------------------------------------------------
  {
    file: 'apps/mobile/src/app/_layout.tsx',
    pairs: [
      [
        'danger',
        'surfacePage',
        'small',
        'the list of missing env vars — this line was `warning` at 1.35:1',
      ],
    ],
  },
  {
    file: 'apps/mobile/src/components/ui/badge.tsx',
    pairs: [
      ['textPrimary', ['stateOkSoft', 'surfacePage'], 'small', 'the «Al día» label'],
      ['earthBrown', ['stateDueSoft', 'surfacePage'], 'small', 'the «Por actualizar» label'],
      ['textPrimary', ['stateOverdueSoft', 'surfacePage'], 'small', 'the «Vencido» label'],
      ['textPrimary', ['stateDeadSoft', 'surfacePage'], 'small', 'the «Muerto» label'],
      ['textSecondary', ['stateArchivedSoft', 'surfacePage'], 'small', 'the «Archivado» label'],
      ['textPrimary', ['accent2Soft', 'surfacePage'], 'small', 'the «Guardiana desde» label'],
      ['stateOk', 'surfacePage', 'graphic', 'the up-to-date outline and dot'],
      ['earthBrown', 'surfacePage', 'graphic', 'the due-soon outline'],
      ['stateOverdue', 'surfacePage', 'graphic', 'the overdue outline and dot'],
      ['stateDead', 'surfacePage', 'graphic', 'the dead outline and dot'],
      ['stateArchived', 'surfacePage', 'graphic', 'the archived outline and dot'],
      ['accent2', 'surfacePage', 'graphic', 'the brand outline and dot'],
      ['stateDue', ['stateDueSoft', 'surfacePage'], 'exempt', 'the yellow dot — see EXEMPT below'],
    ],
  },
  // -------------------------------------------------------------------------
  // Web · the registration review queue this phase added
  // -------------------------------------------------------------------------
  {
    file: 'apps/web/src/features/moderation/components/registration-review-card.tsx',
    pairs: [
      ['textPrimary', 'surfaceCard', 'small', 'the species heading'],
      ['earthBrown', 'surfaceCard', 'small', 'the reason line, 11px mono'],
      ['textSecondary', 'surfaceCard', 'small', 'the code, the guardian and the place'],
      ['textLink', 'surfaceCard', 'small', 'the links to the tree and to its neighbour'],
      ['textLinkHover', 'surfaceCard', 'large', 'those links, hovered'],
      ['danger', 'surfaceCard', 'small', 'the failure sentence, 12px'],
      ['surfaceRaised', 'surfaceCard', 'exempt', 'the well behind a missing photograph'],
    ],
  },
  // -------------------------------------------------------------------------
  // Mobile · the inks that need a ground, wherever the scan finds one
  // -------------------------------------------------------------------------
  {
    file: 'apps/mobile/src/app/(app)/profile.tsx',
    pairs: [
      ['accent', 'surfaceCard', 'large', 'the avatar initials, 34pt bold'],
      ['accent', 'surfaceCard', 'large', 'the emphasised figure, 26pt bold'],
    ],
  },
  {
    file: 'apps/mobile/src/app/(auth)/sign-in.tsx',
    pairs: [['accent', 'surfacePage', 'large', 'the «ÁrbolApp» wordmark, 26pt display']],
  },
  {
    file: 'apps/mobile/src/components/ui/notice.tsx',
    pairs: [['accent', ['accentSoft', 'surfacePage'], 'graphic', 'the success glyph']],
  },
  {
    file: 'apps/mobile/src/components/ui/checkbox-field.tsx',
    pairs: [['onAccent', 'accentPressed', 'graphic', 'the tick, on the darker pressed green']],
  },
  {
    file: 'apps/mobile/src/app/tree/[id].tsx',
    pairs: [
      ['textInverse', 'green990', 'small', 'the «sin fotografía» caption on the dark cover well'],
    ],
  },
  {
    file: 'apps/mobile/src/components/onboarding-step.tsx',
    pairs: [
      [
        'textInverse',
        'PHOTO_SCRIM',
        'small',
        'the photograph caption, on the gradient the block lays over it',
      ],
    ],
  },
  {
    file: 'apps/mobile/src/features/photos/components/photo-capture.tsx',
    pairs: [
      ['textInverse', 'rgba(26, 26, 26, 0.85)', 'small', 'the «cámara en vivo» label on the scrim'],
    ],
  },
  {
    file: 'apps/mobile/src/features/trees/components/photo-viewer.tsx',
    pairs: [['textInverse', 'PHOTO_SCRIM', 'small', 'the measurements over the darkened photo']],
  },
  {
    file: 'apps/mobile/src/features/trees/components/photo-comparator.tsx',
    pairs: [
      ['onAccent', 'accent', 'large', 'the selected cycle label, in the button scale'],
      ['accent', 'surfacePage', 'large', 'the ‹ › nudge glyphs, 26pt'],
    ],
  },
  // -------------------------------------------------------------------------
  // Web · the four pairs this phase measured and had to move
  // -------------------------------------------------------------------------
  {
    file: 'apps/web/src/components/panel/sidebar.tsx',
    pairs: [
      ['textLink', ['accentSoft', 'surfacePage'], 'small', 'the active nav label, 14px semibold'],
      ['textLink', 'surfaceOverlay', 'small', 'the avatar initials, 12px bold'],
      ['accent', 'surfaceRaised', 'large', 'the «ÁrbolApp» wordmark, 16px extrabold'],
      ['accent2', 'surfaceRaised', 'large', 'the «Huila» half of the same wordmark'],
    ],
  },
  {
    file: 'apps/web/src/features/trees/components/reassign-panel.tsx',
    pairs: [['textLink', 'surfaceOverlay', 'small', 'the guardian avatar initials, 12px bold']],
  },
  {
    file: 'apps/web/src/features/users/components/user-directory-table.tsx',
    pairs: [['textLink', 'surfaceCard', 'small', 'the up-to-date figure, 14px mono']],
  },
  {
    file: 'apps/web/src/components/ui/notice.tsx',
    pairs: [['textSecondary', ['infoSoft', 'surfacePage'], 'graphic', 'the info glyph, 17px']],
  },
  {
    file: 'apps/web/src/components/ui/button.tsx',
    pairs: [
      ['onAccent', 'accent', 'large', 'the primary label, in the button scale'],
      [
        'onAccent',
        'stateArchived',
        'small',
        'the archive label, 15px — it used to be leaf white at 4.43:1',
      ],
    ],
  },
  {
    file: 'apps/web/src/components/ui/stat-card.tsx',
    pairs: [['accent', 'surfaceCard', 'large', 'the emphasised figure, 34px extrabold']],
  },
  {
    file: 'apps/web/src/app/sign-in/page.tsx',
    pairs: [
      ['accent', 'surfacePage', 'large', 'the «ÁrbolApp» wordmark, 19px extrabold'],
      ['accent2', 'surfacePage', 'large', 'the «Huila» half of the same wordmark'],
      ['brandMagenta', 'surfacePage', 'exempt', 'the affiliation microlabel, 11px — PD-10'],
    ],
  },
  {
    file: 'apps/web/src/features/moderation/components/flagged-tree-card.tsx',
    pairs: [
      ['textPrimary', 'surfaceCard', 'small', 'the species heading'],
      ['earthBrown', 'surfaceCard', 'small', 'the overdue reason, 11px mono'],
      ['textSecondary', 'surfaceCard', 'small', 'the guardian line'],
      ['textLink', 'surfaceCard', 'small', 'the «Ver el árbol» link'],
      ['textLinkHover', 'surfaceCard', 'large', 'that link, hovered'],
      ['accent', 'surfaceRaised', 'graphic', 'the tree glyph standing in for a photograph'],
      [
        'textMuted',
        'surfaceCard',
        'exempt',
        'the tree code, 11px — the canvas sets it muted at 4.61:1',
      ],
    ],
  },
];

/**
 * Foreground tokens that are allowed to appear in a scanned file without
 * clearing their threshold, each with the reason.
 *
 * There are three of them and every one is a decision that was escalated rather
 * than a number that was waved through. Nothing lands here without a sentence
 * saying who owns it.
 */
export const EXEMPT = {
  stateDue:
    'The «Por actualizar» dot. #FFD700 is 1.25:1 on the badge fill and it is not text and ' +
    'not a boundary: the label beside it says the state in words and in ink. The yellow is ' +
    'the legend colour of the state and the design system owns it — PD-09.',
  textMuted:
    'The 11px tree code on the moderation card. #757575 is 4.61:1 on white, seven hundredths ' +
    'under AA, and the canvas sets it there. Repeated information: the card names the tree ' +
    'above it. Registered as a known deviation rather than nudged.',
  surfaceRaised:
    'A ground, not ink. It is only in this list because a fill also lands in the scan when a ' +
    'component paints one surface on another.',
};

/**
 * The files the scan reads, and how a foreground token is spelled in each.
 *
 * The scan is what stops the table above from going stale. It cannot see every
 * colour -- a token reached through a lookup, as `Badge` does with its tone
 * table, is invisible to a regular expression -- so it is deliberately a
 * coverage floor rather than a proof: everything it *can* see has to be
 * measured, and the components that hide their colours behind a table say so in
 * their own entry above.
 */
export const SCANNED = [
  {
    root: 'apps/mobile/src',
    // `color: colors.textLink`, `tintColor: colors.accent`.
    foreground: /(?:^|[^a-zA-Z])(?:color|tintColor)\s*:\s*colors\.([A-Za-z0-9]+)/g,
  },
  {
    root: 'apps/web/src',
    // `text-earth-brown`. Tailwind, so the token arrives in kebab case.
    foreground: /(?:^|["'\s`])text-((?:[a-z0-9]+-)*[a-z0-9]+)(?=["'\s`]|$)/g,
  },
];

// ## Why the scan reads ink and not borders
//
// It used to read `borderColor` too, and the result was two hundred findings
// dominated by `borderSubtle` on a card edge -- a hairline that carries nothing,
// outlines no control, and would read the same if it were not there. Failing on
// those would have meant declaring a hundred rows of `decoration` to buy a
// checker nobody trusted, which is how a verifier turns into a formality.
//
// So the scan judges ink, which is where a contrast failure means somebody
// cannot read a word. Borders still appear in `PAIRS` wherever a component
// makes one meaningful -- the amber edge of the connection strip, the danger
// edge of a blocked write, the badge outlines that carry a tree's state after
// its label was made neutral -- and those rows are measured at the 3:1 SC
// 1.4.11 asks. What is not measured is a seam, and that is a decision rather
// than an oversight.

/**
 * Files the scan does not read, and why.
 *
 * There is exactly one, and it is not an exception to the rule so much as a
 * place the rule does not apply: a Google Maps style array is a list of
 * `{ elementType, stylers: [{ color }] }`, so it uses the same `color:` key the
 * scan looks for while painting water, roads and park fill rather than ink.
 * Nothing in it is text and nothing in it lands on a surface this script knows.
 *
 * The map's own legibility is a different problem with its own answer: the
 * markers are measured by `pnpm sprites`, which draws them from the same
 * tokens, and the greyscale check of the five states is part of the device
 * validation rather than of a contrast table.
 */
export const SKIPPED = {
  'apps/mobile/src/features/map/map-style.ts':
    'A Google Maps style array. Its `color:` keys paint the map, not text.',
};
