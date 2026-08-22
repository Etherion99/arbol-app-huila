import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { Icon } from '@/components/ui/icon';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { MAX_CONTENT_WIDTH, colors, radii, spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import {
  PendingActivityRow,
  ResolvedActivityRow,
} from '@/features/activity/components/activity-row';
import {
  useActivityFeed,
  type PendingActivity,
  type ResolvedActivity,
} from '@/features/activity/use-activity-feed';
import { useIsOnline } from '@/hooks/use-is-online';

/**
 * One row of either section, or the line a section shows when it has none.
 *
 * The two sections hold different shapes and the empty line is neither, so the
 * list is typed as a union and narrowed at the point of drawing rather than
 * being flattened into a lowest common row.
 */
type ActivityListItem =
  | { kind: 'pending'; pending: PendingActivity }
  | { kind: 'resolved'; resolved: ResolvedActivity }
  | { kind: 'empty'; message: string };

/**
 * What the guardian owes, and what they have already closed.
 *
 * The tab answers a question neither of its neighbours does. "Mis árboles" is
 * organised by tree and "Actividad" by moment: the same overdue avocado appears
 * in both, but here it sits next to everything else that happened this season,
 * which is what makes a missed cycle visible as a pattern rather than as one
 * card among seven.
 *
 * ## The notification box is telling the truth
 *
 * Nothing in the app registers a push token or sends a notification yet -- the
 * delivery engine is a later piece of work, and `expo-notifications` is not
 * even a dependency. So the box is not reporting a permission it read from the
 * system; notifications really are off, for everybody, and it says so. Its
 * action goes to the profile, where the notification settings live, rather than
 * flipping a switch that would silently do nothing.
 */
export default function ActivityScreen() {
  const router = useRouter();
  const { session } = useSession();
  const isOnline = useIsOnline();
  const feed = useActivityFeed();

  // Both sections are derived straight from the feed during render. Mirroring
  // them into state would repaint the whole list on every refetch.
  const sections = useMemo(
    () => [
      {
        title: texts.activity.pendingSection,
        data:
          feed.pending.length > 0
            ? feed.pending.map(
                (pending): ActivityListItem => ({ kind: 'pending' as const, pending }),
              )
            : [{ kind: 'empty' as const, message: texts.activity.emptyPending }],
      },
      {
        title: texts.activity.previousSection,
        data: feed.isHistoryPending
          ? [{ kind: 'empty' as const, message: texts.common.loading }]
          : feed.resolved.length > 0
            ? feed.resolved.map(
                (resolved): ActivityListItem => ({ kind: 'resolved' as const, resolved }),
              )
            : [{ kind: 'empty' as const, message: texts.activity.emptyPrevious }],
      },
    ],
    [feed.pending, feed.resolved, feed.isHistoryPending],
  );

  if (session === null) {
    return (
      <Frame>
        <View style={styles.centred}>
          <AppText variant="title" style={styles.centredText}>
            {texts.activity.signedOutTitle}
          </AppText>
          <AppText variant="bodyMuted" style={styles.centredText}>
            {texts.activity.signedOutBody}
          </AppText>
          <Button label={texts.map.guestSignIn} onPress={() => router.push('/sign-in')} />
        </View>
      </Frame>
    );
  }

  return (
    <Frame>
      <View style={styles.header}>
        <AppText variant="display">{texts.activity.title}</AppText>
      </View>

      <Notice
        tone="warning"
        title={texts.activity.notificationsOffTitle}
        message={texts.activity.notificationsOffBody}
        onRetry={() => router.push('/profile')}
        retryLabel={texts.activity.notificationsOffAction}
      />

      {feed.error !== null ? (
        <Notice
          tone="error"
          title={texts.activity.errorTitle}
          message={texts.activity.errorBody}
          onRetry={feed.refetch}
        />
      ) : feed.historyError !== null ? (
        // The pending list survived; only the closed cycles are missing. Said
        // out loud rather than shown as an empty section, which would read as
        // "you have never closed one".
        <Notice
          tone="error"
          title={texts.activity.historyErrorTitle}
          message={texts.activity.historyErrorBody}
          onRetry={feed.refetch}
        />
      ) : !isOnline && feed.hasTrees ? (
        <Notice tone="warning" message={texts.activity.offlineCached} />
      ) : null}

      {feed.isPending ? (
        <AppText variant="bodyMuted" accessibilityRole="progressbar" style={styles.centredText}>
          {texts.activity.loading}
        </AppText>
      ) : !feed.hasTrees && feed.error === null ? (
        <View style={styles.empty}>
          <View style={styles.medallion}>
            <Icon name="clock" size={42} color={colors.emerald600} />
          </View>
          <AppText variant="title" style={styles.centredText}>
            {texts.activity.emptyTitle}
          </AppText>
          <AppText variant="bodyMuted" style={styles.centredText}>
            {texts.activity.emptyBody}
          </AppText>
          <Button label={texts.planting.startFirst} onPress={() => router.push('/plant')} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyOf}
          contentContainerStyle={styles.list}
          refreshing={feed.isRefetching}
          onRefresh={feed.refetch}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <AppText variant="overline" style={styles.sectionHeader}>
              {section.title}
            </AppText>
          )}
          renderItem={({ item }) => {
            if (item.kind === 'pending') {
              return (
                <PendingActivityRow
                  item={item.pending}
                  onOpen={() =>
                    router.push({
                      pathname: '/log/[treeId]',
                      params: { treeId: item.pending.treeId },
                    })
                  }
                />
              );
            }

            if (item.kind === 'resolved') {
              return <ResolvedActivityRow item={item.resolved} />;
            }

            return (
              <AppText variant="bodyMuted" style={styles.sectionEmpty}>
                {item.message}
              </AppText>
            );
          }}
        />
      )}
    </Frame>
  );
}

function keyOf(item: ActivityListItem): string {
  if (item.kind === 'pending') {
    return `pending-${item.pending.treeId}`;
  }
  if (item.kind === 'resolved') {
    return `resolved-${item.resolved.entryId}`;
  }
  return `empty-${item.message}`;
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
  list: {
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  /**
   * The canvas sets these headers in the mono face. They take `overline`
   * instead, which is the catalogue's section header everywhere else in the
   * app -- the same decision the tree card already made for its vereda line, so
   * the two lists do not label their rows in two different voices.
   */
  sectionHeader: {
    marginTop: spacing[2],
  },
  sectionEmpty: {
    paddingVertical: spacing[2],
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
   * The same well the tree list draws its sprout in. `emerald600` `#00753A`
   * reads 5.82:1 on the white disc, far over the 3:1 an icon owes, and the
   * shape is carried by the `borderSubtle` ring because white on leaf paper is
   * only 1.04:1 apart.
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
