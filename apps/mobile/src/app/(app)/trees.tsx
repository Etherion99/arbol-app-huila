import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { ScreenState } from '@/components/ui/screen-state';
import { Tabs } from '@/components/ui/tabs';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, colors, radii, spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { PendingSyncSection } from '@/features/sync/components/pending-sync-section';
import { useSyncQueueState } from '@/features/sync/sync-queue';
import { TreeListCard } from '@/features/trees/components/tree-list-card';
import { useGuardianTrees } from '@/features/trees/use-guardian-trees';
import { useIsOnline } from '@/hooks/use-is-online';

type Filter = 'pending' | 'all';

/**
 * The guardian's own trees, ordered by what needs a photograph first.
 *
 * The tab exists because the map answers "where are the trees" and this answers
 * "what do I have to do", which is a different question and the one a guardian
 * opens the app for. The pending filter is the default for the same reason.
 *
 * It is also where the offline queue becomes visible, which the canvas draws as
 * a «PENDIENTES DE ENVIAR» block above a «SINCRONIZADOS» one. That is the right
 * place for it and not a separate screen: the question a guardian is asking is
 * "what happened to my morning's work", and splitting the answer across two
 * screens by which side of the wire it happens to be on is answering a question
 * about plumbing instead.
 */
export default function MyTreesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const isOnline = useIsOnline();
  const trees = useGuardianTrees();
  const queue = useSyncQueueState();
  const [filter, setFilter] = useState<Filter>('pending');

  const all = useMemo(() => trees.data ?? [], [trees.data]);

  // Derived during render from the list itself. An effect mirroring this into
  // state would repaint the whole list on every fetch.
  const pending = useMemo(
    () =>
      all.filter((tree) => tree.trackingStatus === 'due_soon' || tree.trackingStatus === 'overdue'),
    [all],
  );

  const shown = filter === 'pending' ? pending : all;

  /**
   * Whether this phone is still carrying work.
   *
   * It changes what "no trees" means. A guardian whose first planting is sitting
   * in the queue has an empty `guardian_trees()` and has very much sown a tree,
   * so the empty state -- "todavía no has sembrado ningún árbol" -- would be
   * flatly untrue at the one moment it would hurt most.
   */
  const hasQueued = queue.jobs.length > 0;

  // The canvas draws the load failure as a whole screen, but only when there is
  // nothing to fall back on. With trees already cached the list stays up and the
  // failure stays a strip over it: in a vereda the last known list is worth more
  // than a full screen apologising for a refetch that failed.
  if (trees.error !== null && all.length === 0 && !hasQueued) {
    return (
      <ScreenState
        icon="wifiOff"
        title={texts.myTrees.errorTitle}
        message={texts.myTrees.errorBody}
        action={{ label: texts.common.retry, onPress: () => void trees.refetch() }}
      />
    );
  }

  if (session === null) {
    return (
      <Frame>
        <View style={styles.centred}>
          <AppText variant="title" style={styles.centredText}>
            {texts.myTrees.signedOutTitle}
          </AppText>
          <AppText variant="bodyMuted" style={styles.centredText}>
            {texts.myTrees.signedOutBody}
          </AppText>
          <Button label={texts.map.guestSignIn} onPress={() => router.push('/sign-in')} />
        </View>
      </Frame>
    );
  }

  return (
    <Frame>
      <View style={styles.header}>
        <AppText variant="display">{texts.myTrees.title}</AppText>
        {all.length > 0 ? (
          <AppText variant="data" style={styles.summary}>
            {texts.myTrees.summaryCount(all.length)}
            {texts.myTrees.summarySeparator}
            {/* Without signal the list is whatever the phone last managed to
                fetch, so a count of what is "por actualizar" would be asserting
                something the app cannot currently know. The canvas says «vistos
                sin conexión» instead, which is the honest claim. */}
            {!isOnline ? (
              texts.myTrees.summaryOffline
            ) : pending.length === 0 ? (
              texts.myTrees.summaryAllUpToDate
            ) : (
              <AppText variant="data" style={styles.summaryPending}>
                {texts.myTrees.summaryPending(pending.length)}
              </AppText>
            )}
          </AppText>
        ) : null}
      </View>

      {all.length > 0 ? (
        <Tabs
          tabs={[
            { id: 'pending', label: texts.myTrees.tabPending(pending.length) },
            { id: 'all', label: texts.myTrees.tabAll(all.length) },
          ]}
          selectedId={filter}
          onSelect={(id) => setFilter(id as Filter)}
          accessibilityLabel={texts.myTrees.title}
        />
      ) : null}

      {trees.error !== null ? (
        <Notice
          tone="error"
          title={texts.myTrees.errorTitle}
          message={texts.myTrees.errorBody}
          onRetry={() => void trees.refetch()}
        />
      ) : !isOnline && all.length > 0 ? (
        <Notice tone="warning" message={texts.myTrees.offlineCached} />
      ) : null}

      {/* `paused` is a query that has never run because the radio is down, and
          it is not the same as one that is loading. Left as "cargando" it would
          spin forever on a phone in a vereda and hide the very block that has
          something to show there: the work waiting in the queue. */}
      {trees.isPending && trees.fetchStatus !== 'paused' ? (
        <AppText variant="bodyMuted" accessibilityRole="progressbar" style={styles.centredText}>
          {texts.myTrees.loading}
        </AppText>
      ) : all.length === 0 && trees.error === null && !hasQueued ? (
        <View style={styles.empty}>
          <View style={styles.medallion}>
            <Icon name="sprout" size={42} color={colors.emerald600} />
          </View>
          <AppText variant="title" style={styles.centredText}>
            {texts.myTrees.emptyTitle}
          </AppText>
          <AppText variant="bodyMuted" style={styles.centredText}>
            {texts.myTrees.emptyBody}
          </AppText>
          <Button
            label={texts.planting.startFirst}
            onPress={() => router.push('/plant')}
            icon={<Icon name="sprout" size={17} color={colors.onAccent} />}
          />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(tree) => tree.treeId}
          contentContainerStyle={styles.list}
          refreshing={trees.isRefetching}
          onRefresh={() => void trees.refetch()}
          // Above the list rather than beside it, so it scrolls with the trees
          // exactly as the canvas draws it, and so the two section headers sit
          // in the same column as the cards they label.
          ListHeaderComponent={<PendingSyncSection hasSynced={shown.length > 0} />}
          ListEmptyComponent={
            // Nothing is said when the server list is empty and the queue is
            // not: the pending cards above are the content, and a line about
            // having no trees would contradict them.
            all.length === 0 ? null : (
              <AppText variant="bodyMuted" style={styles.centredText}>
                {texts.myTrees.emptyPending}
              </AppText>
            )
          }
          renderItem={({ item }) => (
            <TreeListCard
              tree={item}
              onOpen={() => router.push({ pathname: '/tree/[id]', params: { id: item.treeId } })}
              onUpdate={() =>
                router.push({ pathname: '/log/[treeId]', params: { treeId: item.treeId } })
              }
            />
          )}
        />
      )}

      {all.length > 0 || hasQueued ? (
        <View style={styles.footer}>
          <Button label={texts.planting.start} onPress={() => router.push('/plant')} />
        </View>
      ) : null}
    </Frame>
  );
}

/**
 * The strip is told it is on the screen that already lists the queue, so it
 * keeps its sentence and drops the «Ver» link that would offer to bring the
 * guardian here.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ConnectionBanner isShowingPending />
      <View style={styles.column}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  header: {
    gap: spacing[1],
  },
  summary: {
    color: colors.textSecondary,
  },
  /**
   * The one tinted fragment of the header. `earthBrown` `#8B572A` reads 5.78:1
   * on the page, and it is already the ink the badge gives the yellow state, so
   * "por actualizar" says the same thing in both places. The yellow itself is
   * 1.35:1 and could not set a word here.
   */
  summaryPending: {
    color: colors.earthBrown,
  },
  list: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  footer: {
    paddingBottom: spacing[3],
  },
  centred: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[4],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
  },
  /**
   * The round well the canvas puts the sprout in. On leaf paper a white disc is
   * 1.04:1 against the page, so the shape is carried by the `borderSubtle` ring
   * exactly as a card is. `emerald600` `#00753A` draws the sprout at 5.82:1 on
   * that white, well over the 3:1 an icon owes.
   */
  medallion: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
  },
  centredText: {
    textAlign: 'center',
  },
});
