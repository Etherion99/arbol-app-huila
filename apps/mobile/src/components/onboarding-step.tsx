import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { StatusDot } from '@/components/ui/status-dot';
import { texts } from '@/constants/texts';
import { colors, effects, radii, spacing } from '@/constants/theme';
import { completeOnboarding } from '@/features/onboarding/onboarding-store';

const TOTAL_STEPS = texts.onboarding.steps.length;

/** Side of the stand-in mark drawn in the middle of a photographic block. */
const STAND_IN_ICON_SIZE = 96;

/** Ink and strength of the veil that darkens the foot of the block. */
const VEIL_ALPHA = 0.6;

/** Side of one cell of the map grid, in points. */
const GRID_CELL = 44;

/** How far the grid is let through, so it reads as a map and not as paper. */
const GRID_OPACITY = 0.5;

type PhotoGround = {
  /** The lit part of the ground, where the eye lands. */
  centre: string;
  /** The deep edge the block falls off to. */
  edge: string;
  /** Where the light falls, as a fraction of the block. */
  x: string;
  y: string;
};

/**
 * What fills the top block of each step.
 *
 * Two of them are the frame a field photograph goes into: a dark ground, a
 * stand-in mark and the caption. The picture itself is content the PRAE has to
 * supply, so dropping in the file is all that is left. The third step is about
 * the public map, so the block *is* the map and there is no photograph and no
 * caption to write.
 *
 * The two grounds are the only literal hexes in the app and they are
 * deliberate. The 2026 palette is light throughout and keeps no dark surface
 * token, yet the canvas holds a dark well here on purpose: a photograph needs a
 * ground that does not compete with it, and leaf-white paper behind a picture
 * reads as a missing image.
 */
const ILLUSTRATIONS = [
  {
    kind: 'photo',
    icon: 'sprout',
    caption: texts.onboarding.photoCaptions[0],
    ground: { centre: '#1B2E27', edge: '#0B1512', x: '40%', y: '30%' },
  },
  {
    kind: 'photo',
    icon: 'camera',
    caption: texts.onboarding.photoCaptions[1],
    ground: { centre: '#254036', edge: '#0B1512', x: '60%', y: '30%' },
  },
  { kind: 'map' },
] as const;

/**
 * The trees the canvas scatters over that map, placed as a fraction of the
 * block so the arrangement survives any screen. Four are up to date and one is
 * waiting for its photo, which is the picture of a vereda that is being kept
 * rather than one that is perfect.
 */
const MAP_PINS = [
  { left: '24%', top: '32%', status: 'up_to_date', size: 12, isSelected: false },
  { left: '56%', top: '22%', status: 'up_to_date', size: 12, isSelected: false },
  { left: '70%', top: '48%', status: 'due_soon', size: 12, isSelected: false },
  { left: '38%', top: '56%', status: 'up_to_date', size: 18, isSelected: true },
  { left: '16%', top: '66%', status: 'up_to_date', size: 12, isSelected: false },
] as const;

export type OnboardingStepProps = {
  /** One based, so it reads the way the label on screen does. */
  step: number;
  /** Where "Siguiente" goes. The last step has no next screen. */
  nextHref?: '/onboarding/prae' | '/onboarding/guardian';
};

/**
 * The three intro screens differ only in their copy, in what fills the block
 * across the top and in where the primary button leads, so they share one
 * component and the wording stays in the texts file where it can be reviewed
 * as a whole.
 */
export function OnboardingStep({ step, nextHref }: OnboardingStepProps) {
  const router = useRouter();
  const content = texts.onboarding.steps[step - 1];
  const illustration = ILLUSTRATIONS[step - 1];
  const isLastStep = nextHref === undefined;

  async function leaveOnboarding(destination: '/sign-up' | '/map' | '/sign-in') {
    await completeOnboarding();
    router.replace(destination);
  }

  if (content === undefined || illustration === undefined) {
    return null;
  }

  return (
    <Screen hasConnectionBanner={false}>
      <View style={styles.block}>
        {illustration.kind === 'photo' ? (
          <PhotoBlock
            step={step}
            icon={illustration.icon}
            caption={illustration.caption}
            ground={illustration.ground}
          />
        ) : (
          <MapBlock step={step} />
        )}
      </View>

      <View style={styles.body}>
        <AppText variant="display">{content.title}</AppText>
        <AppText variant="bodyMuted">{content.body}</AppText>
      </View>

      <View
        style={styles.dots}
        accessibilityRole="progressbar"
        accessibilityLabel={texts.a11y.onboardingProgress(step, TOTAL_STEPS)}
      >
        {texts.onboarding.steps.map((dotStep, index) => (
          <View key={dotStep.title} style={[styles.dot, index === step - 1 && styles.dotActive]} />
        ))}
      </View>

      {/* Two actions, as the canvas draws: get on with it, or go look without
          an account. The last step swaps «Siguiente» for «Empezar» and nothing
          else — a third button here competed with both. The canvas sets the
          second one as a plain link rather than a button, which is what the
          ghost variant is: link ink, no fill and no border, over a target that
          still reaches the 44 points a thumb needs. */}
      <View style={styles.actions}>
        {isLastStep ? (
          <Button label={texts.onboarding.start} onPress={() => void leaveOnboarding('/sign-up')} />
        ) : (
          <Button label={texts.onboarding.next} onPress={() => router.push(nextHref)} />
        )}

        <Button
          label={texts.onboarding.exploreAsGuest}
          onPress={() => void leaveOnboarding('/map')}
          variant="ghost"
        />
      </View>
    </Screen>
  );
}

/**
 * The frame a field photograph goes into, and what stands there until the file
 * exists: the ground it will sit on, a mark naming what the picture is of, and
 * the caption.
 */
function PhotoBlock({
  step,
  icon,
  caption,
  ground,
}: {
  step: number;
  icon: IconName;
  caption: string;
  ground: PhotoGround;
}) {
  // Gradient ids are looked up by name at paint time, so two blocks alive at
  // once during a push must not answer to the same one.
  const groundId = `onboarding-ground-${step}`;

  return (
    <>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id={groundId} cx={ground.x} cy={ground.y} rx="80%" ry="80%">
            <Stop offset="0" stopColor={ground.centre} />
            <Stop offset="1" stopColor={ground.edge} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${groundId})`} />
      </Svg>

      {/* Pale green on a ground this dark, which is the one place emerald300
          can be used: it measures 6.64:1 at the lightest point of either
          ground, against the 1.63:1 it would carry on paper. */}
      <View style={styles.blockCentre}>
        <Icon name={icon} size={STAND_IN_ICON_SIZE} color={colors.emerald300} />
      </View>

      <BottomVeil step={step} />

      <AppText variant="overline" style={styles.caption}>
        {caption}
      </AppText>
    </>
  );
}

/**
 * The public map, drawn rather than photographed: this step is about the map
 * itself, so a picture of one would be a picture of the app.
 */
function MapBlock({ step }: { step: number }) {
  const groundId = `onboarding-map-ground-${step}`;
  const gridId = `onboarding-map-grid-${step}`;

  return (
    <>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id={groundId} cx="35%" cy="30%" rx="80%" ry="80%">
            <Stop offset="0" stopColor={colors.surfaceRaised} />
            <Stop offset="1" stopColor={colors.borderSubtle} />
          </RadialGradient>
          <Pattern id={gridId} width={GRID_CELL} height={GRID_CELL} patternUnits="userSpaceOnUse">
            <Path
              d={`M${GRID_CELL} 0H0V${GRID_CELL}`}
              stroke={colors.borderStrong}
              strokeWidth={1}
              fill="none"
            />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${groundId})`} />
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill={`url(#${gridId})`}
          opacity={GRID_OPACITY}
        />
      </Svg>

      {MAP_PINS.map((pin) => (
        <StatusDot
          key={`${pin.left}-${pin.top}`}
          status={pin.status}
          size={pin.size}
          isSelected={pin.isSelected}
          style={{ position: 'absolute', left: pin.left, top: pin.top }}
        />
      ))}

      <BottomVeil step={step} />
    </>
  );
}

/**
 * The wash the canvas lays over the foot of the block. On a photograph it is
 * what lets the caption be read whatever the picture underneath turns out to
 * be, which is a promise a placeholder cannot keep on its own.
 */
function BottomVeil({ step }: { step: number }) {
  const veilId = `onboarding-veil-${step}`;

  return (
    <Svg style={styles.veil} width="100%" height="100%">
      <Defs>
        <LinearGradient id={veilId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.ink} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.ink} stopOpacity={VEIL_ALPHA} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${veilId})`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  block: {
    // 460 of the 844 the canvas draws, kept as a ratio so it holds on a phone
    // that is not the one the artboard was drawn at. The screen already spends
    // its top inset on the status bar and 24 on its own padding, which is what
    // the negative margins above give back.
    height: '55%',
    marginHorizontal: -spacing[6],
    marginTop: -spacing[6],
    overflow: 'hidden',
  },
  blockCentre: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  veil: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // 180 of the 460 the block is tall.
    height: '39%',
  },
  caption: {
    position: 'absolute',
    left: spacing[4],
    bottom: spacing[3],
    // Inverse ink, because this label sits on the ground of the photograph and
    // not on the page: it measures 17.2:1 there, where the textSecondary it
    // used to carry over a green800 block reached 2.90:1 and failed AA.
    color: colors.textInverse,
  },
  body: {
    flex: 1,
    // The canvas opens the text 28 under the block and lets it sit at the top,
    // with the dots and the buttons pushed to the foot. The screen's own 16 of
    // column gap covers the rest of that opening.
    paddingTop: spacing[3],
    gap: spacing[4],
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    // borderStrong and not borderSubtle: a step you are not on still has to be
    // visible, and #DCEBDF measures 1.19:1 on the page against #B9D4C1's 1.52.
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    backgroundColor: colors.accent,
    // The bloom the canvas puts on the step you are on. The fill itself carries
    // 4.12:1 against the page, so which step is current is read from the dot
    // and not from the 2.71:1 between the two dots.
    boxShadow: effects.glowAccent,
  },
  actions: {
    gap: spacing[2],
  },
});
