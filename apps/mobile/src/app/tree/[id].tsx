import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { Uuid } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { Notice } from '@/components/ui/notice';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { texts } from '@/constants/texts';
import {
  MAX_CONTENT_WIDTH,
  MIN_TOUCH_TARGET,
  colors,
  fontFace,
  radii,
  spacing,
} from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { lightMapStyle } from '@/features/map/map-style';
import { markerSprite } from '@/features/map/marker-sprites';
import { HeightChart } from '@/features/trees/components/height-chart';
import { PhotoComparator } from '@/features/trees/components/photo-comparator';
import { PhotoViewer } from '@/features/trees/components/photo-viewer';
import { useTreeDetail, type TimelineEntry } from '@/features/trees/use-tree-detail';
import { formatCoordinates, formatShortDate, formatYear } from '@/lib/dates';

/** How much paper the veil over the cover photograph ends up carrying. */
const COVER_VEIL_ALPHA = 0.92;

/**
 * Everything known about one tree.
 *
 * The four blocks below the cover are the phase's promise: a timeline of the
 * growth log, a before-and-after between any two entries, height against time,
 * and who looks after it. The guardian comes from `public_users` through
 * `tree_card()`, which is why only a short display name reaches this screen and
 * why the email is not merely hidden here but unreachable from here.
 */
export default function TreeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const detail = useTreeDetail(id ?? null);
  // Which entry the viewer is open on, held by id rather than by object: a
  // retry signs the photographs again and hands back new rows, and a captured
  // object would keep showing the expired link the retry was meant to replace.
  const [viewingId, setViewingId] = useState<Uuid | null>(null);

  const card = detail.data?.card ?? null;
  const entries = useMemo(() => detail.data?.entries ?? [], [detail.data]);
  const viewing = entries.find((entry) => entry.id === viewingId) ?? null;

  // Oldest first, and only the entries that were measured: a death report has a
  // null height by design and plotting it as zero would draw a cliff.
  const heightPoints = useMemo(
    () =>
      entries
        .filter((entry) => entry.heightCm !== null)
        .map((entry) => ({ capturedAt: entry.capturedAt, heightCm: entry.heightCm as number }))
        .reverse(),
    [entries],
  );

  const cover = entries.find((entry) => entry.photoUrl !== null) ?? null;
  const isMine = card !== null && session !== null && card.guardianId === session.user.id;

  if (detail.isPending) {
    return (
      <Frame onBack={() => router.back()}>
        <AppText variant="bodyMuted" accessibilityRole="progressbar" style={styles.centredText}>
          {texts.treeDetail.loading}
        </AppText>
      </Frame>
    );
  }

  if (detail.error !== null) {
    return (
      <Frame onBack={() => router.back()}>
        <Notice
          tone="error"
          title={texts.treeDetail.errorTitle}
          message={texts.treeDetail.errorBody}
          onRetry={() => void detail.refetch()}
        />
      </Frame>
    );
  }

  // Null rather than an error: the tree was archived by the coordination, which
  // is a normal outcome and not something a retry could change.
  if (card === null) {
    return (
      <Frame onBack={() => router.back()}>
        <Notice
          tone="info"
          title={texts.treeDetail.notFoundTitle}
          message={texts.treeDetail.notFoundBody}
        />
        <Button label={texts.common.back} onPress={() => router.back()} variant="secondary" />
      </Frame>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cover}>
          {cover?.photoUrl != null ? (
            <Image
              source={{ uri: cover.photoUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityLabel={texts.treeDetail.coverLabel(card.speciesRawText)}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.coverEmpty]}>
              <Icon name="sprout" size={64} color={colors.emerald400} />
              <AppText variant="caption" style={styles.noCover}>
                {texts.treeDetail.noCover}
              </AppText>
            </View>
          )}

          <CoverVeil treeId={card.treeId} />

          <SafeAreaView style={styles.coverBar} edges={['top']}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={texts.common.back}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Icon name="chevronLeft" size={22} color={colors.textPrimary} />
            </Pressable>
          </SafeAreaView>

          <View style={styles.coverCaption}>
            <View style={styles.coverText}>
              <AppText variant="title" numberOfLines={1}>
                {card.speciesRawText}
              </AppText>
              <AppText variant="overline" style={styles.coverMeta}>
                {texts.treeDetail.header(
                  card.latestCycle === null
                    ? texts.myTrees.noCycle
                    : texts.myTrees.cycle(card.latestCycle),
                  card.villageName ?? '—',
                  formatCoordinates(card.lat, card.lng),
                )}
              </AppText>
            </View>
            <Badge status={card.trackingStatus} />
          </View>
        </View>

        <View style={styles.body}>
          <AppText variant="data" style={styles.code}>
            {card.code}
          </AppText>

          {isMine && card.status !== 'dead' ? (
            <Button
              label={texts.growthLog.update}
              onPress={() =>
                router.push({ pathname: '/log/[treeId]', params: { treeId: card.treeId } })
              }
            />
          ) : null}

          <View style={styles.panels}>
            <View style={styles.panel}>
              <PhotoComparator entries={entries} height={140} />
            </View>
          </View>

          <Card padding={spacing[3]} style={styles.chartCard}>
            <AppText variant="overline">{texts.treeDetail.heightHeading}</AppText>
            <HeightChart points={heightPoints} />
          </Card>

          <AppText variant="overline">{texts.treeDetail.logHeading(entries.length)}</AppText>

          {entries.length === 0 ? (
            <AppText variant="bodyMuted">{texts.treeDetail.logEmpty}</AppText>
          ) : (
            entries.map((entry) => (
              <TimelineRow
                key={entry.id}
                entry={entry}
                onOpenPhoto={() => setViewingId(entry.id)}
              />
            ))
          )}

          <Card padding={spacing[3]} style={styles.guardianCard}>
            {card.guardianDisplayName === null ? (
              <AppText variant="caption" style={styles.guardianLine}>
                {texts.treeDetail.guardianUnknown}
              </AppText>
            ) : (
              <GuardianLine
                name={card.guardianDisplayName}
                since={card.guardianSince === null ? '—' : formatYear(card.guardianSince)}
              />
            )}

            <View style={styles.miniMap}>
              <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                customMapStyle={lightMapStyle}
                initialRegion={{
                  latitude: card.lat,
                  longitude: card.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                // A picture of where the tree is, not a map to be explored. The
                // real one is a tab away.
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
                accessibilityLabel={texts.treeDetail.miniMapLabel}
              >
                <Marker
                  coordinate={{ latitude: card.lat, longitude: card.lng }}
                  image={markerSprite(card.trackingStatus, false)}
                  tracksViewChanges={false}
                  anchor={{ x: 0.5, y: 0.5 }}
                />
              </MapView>
            </View>
          </Card>
        </View>
      </ScrollView>

      <ConnectionBanner />

      {/* Retrying mints the signed links again, which is the only thing that
          can fix a photograph that stopped loading part way through a visit. */}
      <PhotoViewer
        entry={viewing}
        code={card.code}
        onClose={() => setViewingId(null)}
        onRetry={() => void detail.refetch()}
      />
    </SafeAreaView>
  );
}

/**
 * Who looks after this tree, in the three tints the canvas gives the sentence:
 * the running text quiet, the name in full ink, the seniority coloured.
 *
 * The colour is not the one drawn. The canvas tints the seniority in the
 * Juventud en línea magenta, and that palette is an affiliation mark that is
 * not allowed into the interface, where it would compete with the five colours
 * of the map legend. `accentPressed` `#00753A` is the darkest step of Verde
 * Huilense and the only tint in the primary ramp that carries a caption on a
 * white card, at 5.82:1; the accent itself reads 4.29:1 and the secondary
 * orange 3.15:1, both under the bar for text this size.
 *
 * The three nodes are read out as one sentence, because a screen reader that
 * pauses at every change of colour turns a sentence into a list.
 */
function GuardianLine({ name, since }: { name: string; since: string }) {
  return (
    <AppText
      variant="caption"
      style={styles.guardianLine}
      accessibilityLabel={texts.treeDetail.guardianLine(name, since)}
    >
      {texts.treeDetail.guardianLineLead}
      <AppText variant="caption" style={styles.guardianName}>
        {name}
      </AppText>
      {texts.treeDetail.guardianLineJoin}
      <AppText variant="caption" style={styles.guardianSince}>
        {texts.treeDetail.guardianLineSince(since)}
      </AppText>
      {texts.treeDetail.guardianLineEnd}
    </AppText>
  );
}

/**
 * The wash the canvas lays over the foot of the cover.
 *
 * It runs the other way round from the one the dark theme had: the paper colour
 * rises out of the photograph instead of a shadow falling onto it, and the
 * caption is set in ordinary dark ink on top. Over the blackest photograph a
 * guardian could take, the title reads 14.01:1 and the mono line under it
 * 5.89:1; over the brightest, 16.78:1 and 7.06:1.
 *
 * The canvas holds the veil transparent for the first 35% and lets it climb to
 * the bottom edge. It reaches full strength earlier here, at 65%, so the whole
 * caption block stands on the finished wash rather than on the middle of the
 * ramp — a gradient measured at its foot says nothing about the ink 60 points
 * above it.
 *
 * A gradient needs SVG because the project has no gradient view, which is the
 * same reason and the same shape as the veil at the foot of the onboarding
 * block.
 */
function CoverVeil({ treeId }: { treeId: string }) {
  // Gradient ids are looked up by name at paint time, so two covers alive at
  // once during a push must not answer to the same one.
  const veilId = `tree-cover-veil-${treeId}`;

  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id={veilId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.35" stopColor={colors.surfacePage} stopOpacity={0} />
          <Stop offset="0.65" stopColor={colors.surfacePage} stopOpacity={COVER_VEIL_ALPHA} />
          <Stop offset="1" stopColor={colors.surfacePage} stopOpacity={COVER_VEIL_ALPHA} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${veilId})`} />
    </Svg>
  );
}

function TimelineRow({ entry, onOpenPhoto }: { entry: TimelineEntry; onOpenPhoto: () => void }) {
  const isPlanting = entry.cycle === 1;

  return (
    <Card
      padding={spacing[3]}
      onPress={entry.photoUrl === null ? undefined : onOpenPhoto}
      accessibilityLabel={texts.treeDetail.logOpenPhoto(entry.cycle)}
      style={styles.entry}
    >
      <View style={styles.entryThumb}>
        {entry.thumbnailUrl != null ? (
          <Image
            source={{ uri: entry.thumbnailUrl }}
            style={styles.entryThumbImage}
            contentFit="cover"
            accessibilityElementsHidden
          />
        ) : (
          // The canvas never leaves the slot blank: an entry with no picture
          // still shows what it would have held.
          <Icon name={isPlanting ? 'sprout' : 'camera'} color={colors.textMuted} />
        )}
      </View>

      <View style={styles.entryBody}>
        <View style={styles.entryHeading}>
          <AppText variant="label">
            {isPlanting ? texts.treeDetail.logPlanting : texts.treeDetail.logCycle(entry.cycle)}
          </AppText>
          <AppText variant="caption" style={entry.onTime ? styles.onTime : styles.late}>
            {entry.onTime ? texts.treeDetail.logOnTime : texts.treeDetail.logLate}
          </AppText>
        </View>

        <AppText variant="caption" style={styles.entryMeasures}>
          {entry.heightCm === null
            ? texts.treeDetail.logNoMeasures(formatShortDate(entry.capturedAt))
            : texts.treeDetail.logMeasures(
                formatShortDate(entry.capturedAt),
                entry.heightCm,
                entry.visibleBranches,
              )}
        </AppText>

        <AppText variant="caption">
          {texts.growthLog.health[entry.healthStatus]}
          {entry.notes === null ? '' : ` · «${entry.notes}»`}
        </AppText>
      </View>
    </Card>
  );
}

/** The plain frame the loading, error and archived states sit in. */
function Frame({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ConnectionBanner />
      <ScreenHeader title={texts.treeDetail.title} onBack={onBack} />
      <View style={styles.frameBody}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  scroll: {
    paddingBottom: spacing[6],
  },
  /**
   * The photographic well stays dark on purpose. Turning the whole app to
   * paper did not turn the pictures to paper: the canvas still draws this one
   * over a deep green, the same well the onboarding block keeps. What changed
   * is which end of the ramp answers to which name — `green700` was the deepest
   * green in the dark palette and is the palest wash in this one, so the name
   * survived the rebrand and the colour inverted underneath it. `green990` is
   * the token nearest the well the canvas draws, and a token is worth more here
   * than a transcribed hex.
   */
  cover: {
    position: 'relative',
    height: 230,
    backgroundColor: colors.green990,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  // On the dark well, not on the page: `emerald400` reads 5.87:1 there and the
  // caption 14.23:1.
  noCover: {
    color: colors.textInverse,
  },
  // The cycle, the vereda and the coordinates. Mono because the line ends in a
  // pair of coordinates, and the design system keeps every measured figure on
  // the mono face.
  coverMeta: {
    fontFamily: fontFace.monoMedium,
  },
  coverBar: {
    position: 'absolute',
    left: spacing[3],
    top: 0,
  },
  coverCaption: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  coverText: {
    flex: 1,
    gap: spacing[1],
  },
  /**
   * A control on top of a photograph, so it carries its own ground rather than
   * borrowing one: an opaque white disc, the way the map's controls stopped
   * relying on a wash once the ground under them turned pale. The canvas draws
   * it at 38 points and it is 44 here, which is the minimum side of anything
   * tapped standing up with one hand holding a branch.
   *
   * The outline is not the one drawn either. `borderStrong` reads 13.25:1
   * against a dark photograph and 1.58:1 against a bright one, so on a sky the
   * disc would have no edge at all; `slateGrey` reads 4.56:1 and 4.61:1 and is
   * the outline the catalogue already gives every field and select.
   */
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.slateGrey,
    borderRadius: radii.full,
  },
  backGlyph: {
    color: colors.textPrimary,
  },
  body: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: spacing[3],
    padding: spacing[4],
  },
  code: {
    color: colors.textSecondary,
  },
  /**
   * The canvas sets the comparator and the height panel side by side, half the
   * width each. They are stacked here because the comparator is not a picture:
   * it carries two step buttons and two entry pickers in a row, and four
   * controls of 44 points do not fit into the 147 points a half column leaves
   * once the card is padded. Half of them would have to shrink under the
   * minimum side of a tappable control, which is the one thing that cannot be
   * traded for fidelity on a screen used standing up in a grove.
   */
  panels: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  panel: {
    flex: 1,
  },
  chartCard: {
    gap: spacing[2],
  },
  entry: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  entryThumb: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
  },
  entryThumbImage: {
    width: '100%',
    height: '100%',
  },
  entryBody: {
    flex: 1,
    gap: spacing[1],
  },
  entryHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  entryMeasures: {
    fontFamily: fontFace.monoMedium,
    color: colors.textSecondary,
  },
  onTime: {
    fontFamily: fontFace.monoMedium,
    color: colors.textSecondary,
  },
  /**
   * The canvas draws no late entry, and the yellow the state uses elsewhere is
   * `#FFD700` at 1.40:1 on the card, which is nothing at all — yellow is a
   * fill, a dot or a rule in this palette and never a word. `earthBrown`
   * `#8B572A` reads 6.01:1 and is already the standing ink of the yellow state
   * across the app, which is how the badge sets «Por actualizar».
   */
  late: {
    fontFamily: fontFace.monoMedium,
    color: colors.earthBrown,
  },
  guardianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  guardianLine: {
    flex: 1,
  },
  guardianName: {
    fontFamily: fontFace.bodyMedium,
    color: colors.textPrimary,
  },
  guardianSince: {
    color: colors.accentPressed,
  },
  miniMap: {
    width: 96,
    height: 68,
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  frameBar: {
    padding: spacing[3],
  },
  frameBody: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[4],
  },
  centredText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
