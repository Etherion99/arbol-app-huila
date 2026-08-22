import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { HealthStatus } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip-group';
import { ConnectionBanner } from '@/components/connection-banner';
import { Notice } from '@/components/ui/notice';
import { StepperField } from '@/components/ui/stepper-field';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, MIN_TOUCH_TARGET, colors, fontFace, spacing } from '@/constants/theme';
import { useAddLogEntry } from '@/features/growth-log/use-add-log-entry';
import { useUserLocation } from '@/features/map/use-user-location';
import { PhotoCapture } from '@/features/photos/components/photo-capture';
import type { PreparedPhoto } from '@/features/photos/photo-pipeline';
import { describeTreeError } from '@/features/trees/tree-errors';
import { useTreeDetail } from '@/features/trees/use-tree-detail';
import { useIsOnline } from '@/hooks/use-is-online';
import { formatCoordinates, formatDayAndMonth } from '@/lib/dates';

const HEALTH_OPTIONS = [
  { value: 'healthy' as const, label: texts.growthLog.health.healthy },
  { value: 'sick' as const, label: texts.growthLog.health.sick },
  { value: 'at_risk' as const, label: texts.growthLog.health.at_risk },
];

/**
 * A new cycle of the growth log, and the variant that reports a tree dead.
 *
 * The two are one screen because they are one decision: a guardian arrives at a
 * tree and reports what they find. Choosing "muerto" swaps the form rather than
 * navigating somewhere else -- measurements disappear, a cause appears -- which
 * matches what the database itself insists on: a living tree is measured, a dead
 * one is explained, and the check constraints will not accept either shape in
 * place of the other.
 */
export default function GrowthLogScreen() {
  const router = useRouter();
  const { treeId } = useLocalSearchParams<{ treeId: string }>();
  const isOnline = useIsOnline();
  const location = useUserLocation();
  const detail = useTreeDetail(treeId ?? null);
  const addEntry = useAddLogEntry();

  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('healthy');
  const [heightCm, setHeightCm] = useState('');
  const [visibleBranches, setVisibleBranches] = useState(1);
  const [notes, setNotes] = useState('');
  const [deadCause, setDeadCause] = useState<string | null>(null);
  const [hasTriedToSave, setHasTriedToSave] = useState(false);
  const [saved, setSaved] = useState<{ wasAlreadyRecorded: boolean } | null>(null);

  const card = detail.data?.card ?? null;
  const entries = useMemo(() => detail.data?.entries ?? [], [detail.data]);
  const isDead = healthStatus === 'dead';

  /**
   * The cycle this entry will claim.
   *
   * Null until the tree has actually been read, and that is not a nicety: the
   * object key is built from the cycle, so guessing 1 while the log was still
   * loading would write over the planting photograph of a tree that already has
   * several. Nothing may be saved until this is a real number.
   */
  const nextCycle = card === null ? null : (card.latestCycle ?? 0) + 1;

  /**
   * The previous cycle's photograph, which becomes the ghost in the viewfinder.
   * The newest entry that actually has one: a cycle whose upload never
   * completed must not blank the alignment aid for the next one.
   */
  const ghostUrl = useMemo(
    () => entries.find((entry) => entry.photoUrl !== null)?.photoUrl ?? null,
    [entries],
  );

  const heightNumber = Number.parseInt(heightCm, 10);

  // Worked out during render from the current values rather than mirrored into
  // state, which is what would turn every keystroke into a cascade of renders.
  const blocker = useMemo(() => {
    // Until the log has been read there is no cycle to claim, so there is
    // nothing safe to write yet.
    if (nextCycle === null) {
      return texts.treeDetail.loading;
    }
    if (photo === null) {
      return texts.photo.required;
    }
    if (isDead) {
      return deadCause === null ? texts.growthLog.deadCauseRequired : null;
    }
    return !Number.isFinite(heightNumber) || heightNumber < 1
      ? texts.planting.heightRequired
      : null;
  }, [deadCause, heightNumber, isDead, nextCycle, photo]);

  const save = useCallback(async () => {
    if (blocker !== null || photo === null || treeId === undefined || nextCycle === null) {
      setHasTriedToSave(true);
      return;
    }

    const result = await addEntry.mutateAsync({
      treeId,
      cycle: nextCycle,
      // Null only for a death report. The database enforces the same rule from
      // the other side, so the two cannot drift.
      heightCm: isDead ? null : heightNumber,
      visibleBranches: isDead ? null : visibleBranches,
      healthStatus,
      // A death has to carry a cause: `log_entries_cause_when_dead` refuses a
      // blank one, and the cause is a chip plus whatever else was written.
      notes: isDead
        ? [deadCause, notes.trim()].filter((part) => part !== null && part !== '').join('. ')
        : notes.trim() === ''
          ? null
          : notes.trim(),
      photo,
    });

    if (!result.isPhotoUploaded) {
      return;
    }

    setSaved({ wasAlreadyRecorded: result.wasAlreadyRecorded });
  }, [
    addEntry,
    blocker,
    deadCause,
    healthStatus,
    heightNumber,
    isDead,
    nextCycle,
    notes,
    photo,
    treeId,
    visibleBranches,
  ]);

  if (saved !== null) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.centred}>
          <AppText variant="title" style={styles.centredText}>
            {saved.wasAlreadyRecorded ? texts.growthLog.duplicateTitle : texts.growthLog.savedTitle}
          </AppText>
          {/* The due date is read live rather than snapshotted when the entry
              was saved. It is a generated column two months from the capture,
              and the mutation invalidated this query, so what renders here is
              the database's answer and not an arithmetic guess at it. */}
          <AppText variant="bodyMuted" style={styles.centredText}>
            {saved.wasAlreadyRecorded
              ? texts.growthLog.duplicateBody
              : card === null
                ? texts.growthLog.savedTitle
                : texts.growthLog.savedBody(formatDayAndMonth(card.nextReminderAt))}
          </AppText>
          <Button
            label={texts.planting.successOpenTree}
            onPress={() => router.replace({ pathname: '/tree/[id]', params: { id: treeId ?? '' } })}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ConnectionBanner />

      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={texts.common.cancel}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <AppText variant="subtitle" style={styles.closeGlyph}>
            ✕
          </AppText>
        </Pressable>

        <AppText variant="headerTitle" numberOfLines={1} style={styles.barTitle}>
          {isDead
            ? texts.growthLog.reportDead
            : nextCycle === null
              ? texts.growthLog.update
              : texts.growthLog.newEntryTitle(nextCycle)}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {isDead ? <Notice tone="error" message={texts.growthLog.deadWarning} /> : null}

          <PhotoCapture
            photo={photo}
            onCaptured={setPhoto}
            onRetake={() => setPhoto(null)}
            // The ghost is what turns a set of photographs into a growth series
            // rather than a collection of different angles. A death report is
            // evidence of a state, not a step in a series, so it has none.
            ghostUrl={isDead ? null : ghostUrl}
            fallbackLocation={location.coordinates}
            height={isDead ? 220 : 320}
          />

          {isDead ? (
            <AppText variant="caption" style={styles.centredText}>
              {texts.growthLog.deadPhotoTitle} · {texts.growthLog.deadPhotoHint}
            </AppText>
          ) : null}

          {!isDead ? (
            <View style={styles.measures}>
              <View style={styles.measure}>
                <TextField
                  label={texts.planting.heightLabel}
                  value={heightCm}
                  onChangeText={(next) => setHeightCm(next.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="118"
                  error={
                    hasTriedToSave && (!Number.isFinite(heightNumber) || heightNumber < 1)
                      ? texts.planting.heightRequired
                      : undefined
                  }
                />
              </View>
              <View style={styles.measure}>
                <StepperField
                  label={texts.planting.branchesLabel}
                  value={visibleBranches}
                  onChange={setVisibleBranches}
                  decreaseLabel={texts.planting.branchesDecrease}
                  increaseLabel={texts.planting.branchesIncrease}
                />
              </View>
            </View>
          ) : null}

          <ChipGroup
            label={texts.growthLog.healthLabel}
            options={HEALTH_OPTIONS}
            value={isDead ? null : healthStatus}
            onChange={setHealthStatus}
          />

          {isDead ? (
            <ChipGroup
              label={texts.growthLog.deadCauseLabel}
              options={texts.growthLog.deadCauses.map((cause) => ({ value: cause, label: cause }))}
              value={deadCause}
              onChange={setDeadCause}
              tone="danger"
              error={
                hasTriedToSave && deadCause === null ? texts.growthLog.deadCauseRequired : undefined
              }
            />
          ) : null}

          <TextField
            label={isDead ? texts.growthLog.deadStoryLabel : texts.growthLog.notesLabel}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder={
              isDead ? texts.growthLog.deadStoryPlaceholder : texts.growthLog.notesPlaceholder
            }
          />

          <AppText variant="caption" style={styles.capture}>
            {photo?.captureLocation == null
              ? texts.growthLog.captureLocationMissing
              : texts.growthLog.captureLocation(
                  formatCoordinates(photo.captureLocation.lat, photo.captureLocation.lng),
                )}
          </AppText>

          {isDead ? (
            <AppText variant="caption" style={styles.centredText}>
              {texts.growthLog.deadNoMeasures}
            </AppText>
          ) : null}

          {addEntry.data?.isPhotoUploaded === false ? (
            <Notice
              tone="warning"
              title={texts.photo.uploadFailedTitle}
              message={isOnline ? texts.photo.uploadFailedBody : texts.photo.uploadOffline}
              onRetry={() => void save()}
              retryLabel={texts.photo.uploadRetry}
            />
          ) : addEntry.isError ? (
            <Notice
              tone="error"
              title={texts.treeErrors.title}
              message={describeTreeError(addEntry.error, isOnline)}
              onRetry={() => void save()}
            />
          ) : null}

          {hasTriedToSave && blocker !== null ? <Notice tone="warning" message={blocker} /> : null}

          <View style={styles.actions}>
            <Button
              label={texts.common.cancel}
              onPress={() => router.back()}
              variant="secondary"
              style={styles.action}
            />
            <Button
              label={isDead ? texts.growthLog.deadSubmit : texts.growthLog.save}
              loadingLabel={texts.growthLog.saving}
              isLoading={addEntry.isPending}
              onPress={() => void save()}
              style={styles.submit}
            />
          </View>

          {/* The way into the death report, and the way back out of it. Kept at
              the bottom so it is never the first thing a hand lands on. */}
          <Button
            label={isDead ? texts.growthLog.health.healthy : texts.growthLog.reportDead}
            variant={isDead ? 'ghost' : 'danger'}
            onPress={() => {
              setHealthStatus(isDead ? 'healthy' : 'dead');
              setHasTriedToSave(false);
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  // The glyph keeps its drawn size and the target grows around it, then the
  // negative margin pulls that box back so the cross still starts on the
  // sixteen point gutter the rest of the form is set on. Same trade the
  // catalogue's header bar makes with its chevron, so the two bars line up.
  close: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    marginLeft: -spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: colors.textPrimary,
  },
  barTitle: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing[4],
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    gap: spacing[4],
  },
  measures: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  measure: {
    flex: 1,
  },
  capture: {
    fontFamily: fontFace.monoMedium,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  action: {
    flex: 1,
  },
  submit: {
    flex: 2,
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  centredText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
