import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { texts } from '@/constants/texts';
import { colors, fontFace, fontSize, radii, spacing } from '@/constants/theme';
import type { SyncJobStatus } from '@/features/sync/sync-queue-engine';
import { syncQueue } from '@/features/sync/sync-queue';
import { MISSING_PHOTO, type SyncJob } from '@/features/sync/sync-queue-model';
import { describeTreeError } from '@/features/trees/tree-errors';
import { formatSavedAt } from '@/lib/dates';

export type PendingSyncCardProps = {
  job: SyncJob;
  status: SyncJobStatus;
};

/**
 * One piece of work still on the phone.
 *
 * The canvas draws it as a card with a dashed edge, and the dash is the whole
 * idea: this looks like every other card in the list and is visibly not settled
 * yet. A guardian scanning the screen should be able to tell at a glance which
 * of their morning's work the server has and which it does not, without reading
 * a word.
 *
 * What it must never do is look like a failure. Four of the five states here are
 * a queue working exactly as intended, and the wording keeps them apart from the
 * one that is not: «en cola», «enviando», «reintentando» and «en espera» are
 * conditions, and only «no se pudo enviar» is a problem — which is also the only
 * one that grows the two controls underneath.
 */
export function PendingSyncCard({ job, status }: PendingSyncCardProps) {
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  const title =
    job.kind === 'planting'
      ? texts.sync.plantingTitle(job.speciesRawText)
      : texts.sync.logEntryTitle(job.cycle, job.treeLabel);

  const when = formatSavedAt(job.createdAt);
  const kilobytes = Math.max(1, Math.round(job.photo.photoBytes / 1024));
  const saved =
    job.kind === 'planting'
      ? texts.sync.savedPlanting(when, kilobytes)
      : texts.sync.savedLogEntry(when, kilobytes);

  const isBlocked = status === 'blocked';
  const isPhotoGone = job.failure?.code === MISSING_PHOTO;

  return (
    <View
      style={[styles.card, isBlocked && styles.cardBlocked]}
      // Read as one item rather than as four loose fragments, and the state is
      // in the sentence rather than only in the pill beside it.
      accessible
      accessibilityLabel={`${title}. ${saved}. ${STATUS_LABEL[status]}`}
    >
      <View style={styles.row}>
        {/* Decorative: the title beside it already says whether this is a
            planting or a growth log entry. */}
        <View style={styles.well}>
          <Icon
            name={job.kind === 'planting' ? 'sprout' : 'camera'}
            size={22}
            color={colors.earthBrown}
          />
        </View>

        <View style={styles.body}>
          <AppText variant="label" numberOfLines={2}>
            {title}
          </AppText>
          <AppText style={styles.saved}>{saved}</AppText>
        </View>

        <View style={[styles.pill, PILL_SURFACE[status]]}>
          <AppText style={[styles.pillLabel, PILL_INK[status]]} numberOfLines={1}>
            {STATUS_LABEL[status]}
          </AppText>
        </View>
      </View>

      {/* Only a job that has genuinely stopped explains itself, and only it
          offers a way out. Printing a reason under a card that is simply
          waiting for signal would turn a working queue into a wall of
          apologies. */}
      {isBlocked ? (
        <View style={styles.failure}>
          {/* The refusal is named, not summarised. The app already owns a
              sentence per SQLSTATE -- «esa vereda no existe», «ese árbol no es
              tuyo» -- and a queued job keeps its code precisely so it can still
              reach them. `isOnline` is true because a job only reaches this
              state on an answer the server actually gave; the radio never
              blocks anything, it only delays it. */}
          <AppText variant="caption" style={styles.failureText}>
            {isPhotoGone
              ? texts.sync.blockedPhotoMissing
              : describeTreeError(
                  { code: job.failure?.code ?? undefined, message: job.failure?.message },
                  true,
                )}
          </AppText>

          <View style={styles.actions}>
            {/* Absent when the photograph is gone: there is nothing left to
                send, and a retry that cannot possibly work is a worse answer
                than not offering one. */}
            {isPhotoGone ? null : (
              <Button
                label={texts.sync.retryNow}
                variant="secondary"
                size="md"
                onPress={() => syncQueue.retryNow(job.id)}
                style={styles.action}
              />
            )}
            <Button
              label={texts.sync.discard}
              variant="ghost"
              size="md"
              onPress={() => setIsConfirmingDiscard(true)}
              style={styles.action}
            />
          </View>
        </View>
      ) : null}

      {/* Discarding is the one path that drops work nobody has a copy of, so it
          is the guardian's decision and it is confirmed. */}
      <Dialog
        isVisible={isConfirmingDiscard}
        title={texts.sync.discardTitle}
        onClose={() => setIsConfirmingDiscard(false)}
        footer={
          <>
            <Button
              label={texts.common.cancel}
              variant="secondary"
              onPress={() => setIsConfirmingDiscard(false)}
            />
            <Button
              label={texts.sync.discardConfirm}
              variant="dangerSolid"
              onPress={() => {
                setIsConfirmingDiscard(false);
                syncQueue.discard(job.id);
              }}
            />
          </>
        }
      >
        <AppText variant="body">{texts.sync.discardBody}</AppText>
      </Dialog>
    </View>
  );
}

const STATUS_LABEL: Record<SyncJobStatus, string> = {
  queued: texts.sync.statusQueued,
  sending: texts.sync.statusSending,
  retrying: texts.sync.statusRetrying,
  waiting: texts.sync.statusWaiting,
  blocked: texts.sync.statusBlocked,
};

const styles = StyleSheet.create({
  /**
   * The card of the canvas, with the edge it draws dashed rather than solid.
   *
   * The dash is the only thing separating this from a settled tree card, so it
   * carries meaning and owes 3:1 — which `borderStrong` `#B9D4C1` does not have
   * against the page at 1.52:1, the same trap `Tag` had to leave. The edge is
   * `textSecondary` `#4A5A50` at 7.04:1: neutral, so it borrows none of the
   * five tracking colours, and identical in weight to the edge `Tag` settled on.
   *
   * On Android a dashed border under a radius may be drawn solid, which is a
   * known limitation of the platform's own renderer. The degradation is benign
   * — a card with a plain edge — and the state is also carried by the pill and
   * by the section it sits under, neither of which depends on the stroke.
   */
  card: {
    gap: spacing[3],
    padding: spacing[3] + 2,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
    borderRadius: radii.lg,
  },
  /** A job that stopped keeps the dashed edge and takes the danger tone on it. */
  cardBlocked: {
    borderColor: colors.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  /**
   * The 56 point well. `surfaceOverlay` is white and the page is `#F4FDF4`, so
   * on a card the fill draws nothing at all and the shape is the ring, exactly
   * as the tree card's thumbnail well already does it. `earthBrown` reads
   * 5.78:1 on that white, well over the 3:1 a drawing owes.
   */
  well: {
    width: 56,
    height: 56,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
  },
  body: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  /**
   * Mono, because it is a time and a weight and that is the face the design
   * system keeps for measured things.
   *
   * The canvas sets it in `textMuted` `#757575`, which measures 4.61:1 on the
   * white of this card and 4.43:1 on the page. An eleven point line owes 4.5:1
   * and would therefore depend on which of the two grounds it landed on, so it
   * takes `textSecondary` at 7.04:1 instead — the same substitution the tree
   * card's own caption already makes.
   */
  saved: {
    fontFamily: fontFace.monoMedium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 5,
    color: colors.textSecondary,
  },
  pill: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: spacing[2] + 2,
    borderWidth: 1,
    borderRadius: radii.full,
  },
  pillLabel: {
    fontFamily: fontFace.bodyMedium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs + 4,
  },
  failure: {
    gap: spacing[2],
  },
  failureText: {
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  action: {
    flex: 1,
  },
});

/**
 * Fill and edge per state, on the same principle the `Badge` settled on: the
 * tone lives in the fill and the outline, never in the word.
 *
 * The four calm states borrow `stateDue`'s wash, which is the app's standing
 * colour for "owed but not wrong", with `earthBrown` carrying both the edge and
 * the ink — `stateDue` `#FFD700` itself is 1.35:1 on the page and would draw
 * neither. The one state that is a problem takes `danger`, which the archived
 * and dead badges already measure at 4.54:1 for an edge.
 */
const PILL_SURFACE = StyleSheet.create({
  queued: { backgroundColor: colors.stateDueSoft, borderColor: colors.earthBrown },
  waiting: { backgroundColor: colors.stateDueSoft, borderColor: colors.earthBrown },
  retrying: { backgroundColor: colors.stateDueSoft, borderColor: colors.earthBrown },
  sending: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  blocked: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
});

/**
 * `earthBrown` reads 5.36:1 over the yellow wash and is the ink the whole app
 * already pairs with it. The other two take `textPrimary`, which measures
 * 13:1 or better over any of these fills — `accent` over `accentSoft` is
 * 3.56:1 and cannot set an eleven point word.
 */
const PILL_INK = StyleSheet.create({
  queued: { color: colors.earthBrown },
  waiting: { color: colors.earthBrown },
  retrying: { color: colors.earthBrown },
  sending: { color: colors.textPrimary },
  blocked: { color: colors.textPrimary },
});
