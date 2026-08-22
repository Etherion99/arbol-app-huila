import { useMemo, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/app-text';
import { OptionSheet, type SheetOption } from '@/components/ui/option-sheet';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, fontFace, radii, spacing } from '@/constants/theme';
import type { TimelineEntry } from '@/features/trees/use-tree-detail';
import { formatDayAndMonth } from '@/lib/dates';

export type PhotoComparatorProps = {
  /** Newest cycle first, as the timeline holds them. */
  entries: TimelineEntry[];
  height?: number;
};

/**
 * Two entries of the growth log, one drawn over the other, split by a handle.
 *
 * Any two, not just the first and the last: a guardian comparing the two cycles
 * either side of a dry spell learns something that the whole span would average
 * away. So both ends are pickable and the default is simply the widest pair.
 *
 * The divider is draggable, and it is also two buttons. A pan gesture on a
 * photograph is unreachable with a screen reader and awkward with one hand full,
 * and this is the only way to see the comparison at all.
 */
export function PhotoComparator({ entries, height = 200 }: PhotoComparatorProps) {
  const withPhotos = useMemo(() => entries.filter((entry) => entry.photoUrl !== null), [entries]);

  const [beforeCycle, setBeforeCycle] = useState<number | null>(null);
  const [afterCycle, setAfterCycle] = useState<number | null>(null);
  const [openPicker, setOpenPicker] = useState<'before' | 'after' | null>(null);
  const [ratio, setRatio] = useState(0.5);
  const [width, setWidth] = useState(0);

  // The widest pair available, unless the guardian has chosen otherwise. Derived
  // rather than seeded into state by an effect, so a newly uploaded photograph
  // widens the default without a stale selection surviving underneath it.
  const oldest = withPhotos[withPhotos.length - 1];
  const newest = withPhotos[0];
  const before = withPhotos.find((entry) => entry.cycle === beforeCycle) ?? oldest;
  const after = withPhotos.find((entry) => entry.cycle === afterCycle) ?? newest;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (event) => {
          if (width === 0) {
            return;
          }
          const next = event.nativeEvent.locationX / width;
          setRatio(Math.min(1, Math.max(0, next)));
        },
      }),
    [width],
  );

  if (withPhotos.length < 2) {
    return (
      <View style={styles.card}>
        <AppText variant="overline">{texts.treeDetail.compareHeading}</AppText>
        <AppText variant="caption">{texts.treeDetail.compareEmpty}</AppText>
      </View>
    );
  }

  const options: SheetOption[] = withPhotos.map((entry) => ({
    id: String(entry.cycle),
    label: texts.treeDetail.logCycle(entry.cycle),
    detail: formatDayAndMonth(entry.capturedAt),
  }));

  const nudge = (delta: number) => setRatio((current) => Math.min(1, Math.max(0, current + delta)));

  return (
    <View style={styles.card}>
      <AppText variant="overline">{texts.treeDetail.compareHeading}</AppText>

      <View
        style={[styles.stage, { height }]}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        {...responder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={texts.treeDetail.compareSlider}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={({ nativeEvent }) => {
          nudge(nativeEvent.actionName === 'increment' ? 0.1 : -0.1);
        }}
      >
        {/* The later photograph is the ground; the earlier one is clipped over
            it, so dragging left reveals the past. */}
        <Image
          source={{ uri: after.photoUrl ?? '' }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />

        <View style={[styles.beforeClip, { width: `${ratio * 100}%` }]}>
          <View style={{ width, height }}>
            <Image
              source={{ uri: before.photoUrl ?? '' }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          </View>
        </View>

        <View style={[styles.divider, { left: `${ratio * 100}%` }]} pointerEvents="none">
          <View style={styles.handle} />
        </View>

        <AppText variant="caption" style={styles.beforeLabel}>
          {formatDayAndMonth(before.capturedAt)}
        </AppText>
        <AppText variant="caption" style={styles.afterLabel}>
          {formatDayAndMonth(after.capturedAt)}
        </AppText>
      </View>

      <View style={styles.controls}>
        <Pressable
          onPress={() => nudge(-0.15)}
          accessibilityRole="button"
          accessibilityLabel={texts.treeDetail.compareLess}
          style={({ pressed }) => [styles.nudge, pressed && styles.pressed]}
        >
          <AppText variant="body" style={styles.nudgeGlyph}>
            ◀
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setOpenPicker('before')}
          accessibilityRole="button"
          accessibilityLabel={`${texts.treeDetail.comparePickBefore}: ${texts.treeDetail.logCycle(before.cycle)}`}
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
        >
          <AppText variant="caption" style={styles.pickerLabel} numberOfLines={1}>
            {texts.treeDetail.logCycle(before.cycle)}
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => setOpenPicker('after')}
          accessibilityRole="button"
          accessibilityLabel={`${texts.treeDetail.comparePickAfter}: ${texts.treeDetail.logCycle(after.cycle)}`}
          style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
        >
          <AppText variant="caption" style={styles.pickerLabel} numberOfLines={1}>
            {texts.treeDetail.logCycle(after.cycle)}
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => nudge(0.15)}
          accessibilityRole="button"
          accessibilityLabel={texts.treeDetail.compareMore}
          style={({ pressed }) => [styles.nudge, pressed && styles.pressed]}
        >
          <AppText variant="body" style={styles.nudgeGlyph}>
            ▶
          </AppText>
        </Pressable>
      </View>

      <OptionSheet
        isVisible={openPicker !== null}
        title={
          openPicker === 'before'
            ? texts.treeDetail.comparePickBefore
            : texts.treeDetail.comparePickAfter
        }
        clearLabel={texts.common.close}
        options={options}
        selectedId={String(openPicker === 'before' ? before.cycle : after.cycle)}
        onSelect={(id) => {
          if (id !== null) {
            const cycle = Number(id);
            if (openPicker === 'before') {
              setBeforeCycle(cycle);
            } else {
              setAfterCycle(cycle);
            }
          }
          setOpenPicker(null);
        }}
        onClose={() => setOpenPicker(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
  },
  stage: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceOverlay,
  },
  beforeClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  beforeLabel: {
    position: 'absolute',
    left: spacing[2],
    bottom: spacing[1],
    fontFamily: fontFace.monoMedium,
    color: colors.textPrimary,
  },
  afterLabel: {
    position: 'absolute',
    right: spacing[2],
    bottom: spacing[1],
    fontFamily: fontFace.monoMedium,
    color: colors.textPrimary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  nudge: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeGlyph: {
    color: colors.accent,
  },
  picker: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
  },
  pickerLabel: {
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
