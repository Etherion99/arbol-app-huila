import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { Notice } from '@/components/ui/notice';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, MIN_TOUCH_TARGET, colors, radii, spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { darkMapStyle } from '@/features/map/map-style';
import { markerSprite } from '@/features/map/marker-sprites';
import { HeightChart } from '@/features/trees/components/height-chart';
import { PhotoComparator } from '@/features/trees/components/photo-comparator';
import { useTreeDetail, type TimelineEntry } from '@/features/trees/use-tree-detail';
import { formatCoordinates, formatShortDate, formatYear } from '@/lib/dates';

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
  const [viewing, setViewing] = useState<TimelineEntry | null>(null);

  const card = detail.data?.card ?? null;
  const entries = useMemo(() => detail.data?.entries ?? [], [detail.data]);

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
              <AppText variant="caption">{texts.treeDetail.noCover}</AppText>
            </View>
          )}

          <View style={styles.coverScrim} pointerEvents="none" />

          <SafeAreaView style={styles.coverBar} edges={['top']}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={texts.common.back}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <AppText variant="subtitle" style={styles.backGlyph}>
                ‹
              </AppText>
            </Pressable>
          </SafeAreaView>

          <View style={styles.coverCaption}>
            <View style={styles.coverText}>
              <AppText variant="title" numberOfLines={1}>
                {card.speciesRawText}
              </AppText>
              <AppText variant="overline">
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
              <TimelineRow key={entry.id} entry={entry} onOpenPhoto={() => setViewing(entry)} />
            ))
          )}

          <Card padding={spacing[3]} style={styles.guardianCard}>
            <AppText variant="caption" style={styles.guardianLine}>
              {card.guardianDisplayName === null
                ? texts.treeDetail.guardianUnknown
                : texts.treeDetail.guardianLine(
                    card.guardianDisplayName,
                    card.guardianSince === null ? '—' : formatYear(card.guardianSince),
                  )}
            </AppText>

            <View style={styles.miniMap}>
              <MapView
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                customMapStyle={darkMapStyle}
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

      <PhotoViewer entry={viewing} code={card.code} onClose={() => setViewing(null)} />
    </SafeAreaView>
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
        ) : null}
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

function PhotoViewer({
  entry,
  code,
  onClose,
}: {
  entry: TimelineEntry | null;
  code: string;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={entry !== null}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.viewer}>
        {entry?.photoUrl != null ? (
          <Image
            source={{ uri: entry.photoUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel={texts.treeDetail.viewerCaption(code, entry.cycle)}
          />
        ) : null}

        <SafeAreaView style={styles.viewerBar} edges={['top', 'right']}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={texts.treeDetail.viewerClose}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <AppText variant="subtitle" style={styles.backGlyph}>
              ✕
            </AppText>
          </Pressable>
        </SafeAreaView>

        {entry !== null ? (
          <SafeAreaView style={styles.viewerCaption} edges={['bottom']}>
            <AppText variant="label">{texts.treeDetail.viewerCaption(code, entry.cycle)}</AppText>
            <AppText variant="caption" style={styles.entryMeasures}>
              {entry.heightCm === null
                ? texts.treeDetail.logNoMeasures(formatShortDate(entry.capturedAt))
                : texts.treeDetail.logMeasures(
                    formatShortDate(entry.capturedAt),
                    entry.heightCm,
                    entry.visibleBranches,
                  )}
            </AppText>
          </SafeAreaView>
        ) : null}
      </View>
    </Modal>
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
  cover: {
    position: 'relative',
    height: 230,
    backgroundColor: colors.green700,
  },
  coverEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 14, 12, 0.45)',
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
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(21, 37, 31, 0.85)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
    fontFamily: 'IBMPlexMono_500Medium',
    color: colors.textSecondary,
  },
  onTime: {
    fontFamily: 'IBMPlexMono_500Medium',
    color: colors.textSecondary,
  },
  late: {
    fontFamily: 'IBMPlexMono_500Medium',
    color: colors.stateDue,
  },
  guardianCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  guardianLine: {
    flex: 1,
  },
  miniMap: {
    width: 96,
    height: 68,
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  viewer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerBar: {
    position: 'absolute',
    right: spacing[3],
    top: 0,
  },
  viewerCaption: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
    gap: spacing[1],
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
