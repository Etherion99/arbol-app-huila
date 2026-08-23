import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { spacing } from '@/constants/theme';
import { statusOf } from '@/features/sync/sync-queue-engine';
import { PendingSyncCard } from '@/features/sync/components/pending-sync-card';
import { useSyncQueueState } from '@/features/sync/sync-queue';
import { bySequence } from '@/features/sync/sync-queue-model';

/**
 * The «PENDIENTES DE ENVIAR» block of the canvas, and the «SINCRONIZADOS»
 * header that only means anything once it has something to be distinguished
 * from.
 *
 * It renders nothing at all when the queue is empty, which is the ordinary case
 * for a guardian with signal. The two section headers appear together or not at
 * all: labelling the tree list "sincronizados" on a phone with nothing waiting
 * would raise a question that has no reason to be in the guardian's head.
 *
 * Oldest first, matching the order the queue will actually send them in, so the
 * list reads as a line rather than as a pile.
 */
export type PendingSyncSectionProps = {
  /**
   * Whether there is a list of already synchronised trees underneath. The
   * second header is only printed when there is something for it to head: on a
   * phone whose very first planting has not gone up yet, «SINCRONIZADOS» over
   * an empty space is a question with no answer.
   */
  hasSynced: boolean;
};

export function PendingSyncSection({ hasSynced }: PendingSyncSectionProps) {
  const state = useSyncQueueState();
  const jobs = [...state.jobs].sort(bySequence);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AppText variant="overline">{texts.sync.pendingTitle}</AppText>

      {/* Information, not a failure: the queue keeps accepting work whatever it
          is already carrying, and this only tells the guardian that a trip
          within reach of signal is now worth making. */}
      {state.isOverAdvisoryLimit ? (
        <Notice tone="info" message={texts.sync.advisory(jobs.length)} />
      ) : null}

      {jobs.map((job) => (
        <PendingSyncCard key={job.id} job={job} status={statusOf(state, job)} />
      ))}

      {hasSynced ? (
        <AppText variant="overline" style={styles.synced}>
          {texts.sync.syncedTitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[3],
  },
  /** The canvas leaves a little more air above the second header than below it. */
  synced: {
    marginTop: spacing[1] + 2,
  },
});
