import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { Notice } from '@/components/ui/notice';
import { Tabs } from '@/components/ui/tabs';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, colors, spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
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
 */
export default function MyTreesScreen() {
  const router = useRouter();
  const { session } = useSession();
  const isOnline = useIsOnline();
  const trees = useGuardianTrees();
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
        {trees.data !== undefined ? (
          <AppText variant="data" style={styles.summary}>
            {texts.myTrees.summary(all.length, pending.length)}
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

      {trees.isPending ? (
        <AppText variant="bodyMuted" accessibilityRole="progressbar" style={styles.centredText}>
          {texts.myTrees.loading}
        </AppText>
      ) : all.length === 0 && trees.error === null ? (
        <View style={styles.centred}>
          <AppText variant="title" style={styles.centredText}>
            {texts.myTrees.emptyTitle}
          </AppText>
          <AppText variant="bodyMuted" style={styles.centredText}>
            {texts.myTrees.emptyBody}
          </AppText>
          <Button label={texts.planting.startFirst} onPress={() => router.push('/plant')} />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(tree) => tree.treeId}
          contentContainerStyle={styles.list}
          refreshing={trees.isRefetching}
          onRefresh={() => void trees.refetch()}
          ListEmptyComponent={
            <AppText variant="bodyMuted" style={styles.centredText}>
              {texts.myTrees.emptyPending}
            </AppText>
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

      {all.length > 0 ? (
        <View style={styles.footer}>
          <Button label={texts.planting.start} onPress={() => router.push('/plant')} />
        </View>
      ) : null}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ConnectionBanner />
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
  centredText: {
    textAlign: 'center',
  },
});
