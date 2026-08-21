import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectionBanner } from '@/components/connection-banner';
import { MAX_CONTENT_WIDTH, colors, spacing } from '@/constants/theme';

export type ScreenProps = {
  children: ReactNode;
  /**
   * The modal bar, when the screen has one. It sits outside the scroll area so
   * the way back stays reachable however far down the guardian has read.
   */
  header?: ReactNode;
  /** Scrolls the content. Off for screens that own their own scrolling. */
  isScrollable?: boolean;
  /** Hides the offline strip on screens where nothing is sent anyway. */
  hasConnectionBanner?: boolean;
};

/**
 * The frame every screen sits in: safe areas, a column that stops growing on a
 * tablet, and the offline warning above everything else.
 *
 * The warning is placed here rather than per screen so it appears before the
 * guardian has filled a form and pressed a button that could not have worked.
 */
export function Screen({
  children,
  header,
  isScrollable = true,
  hasConnectionBanner = true,
}: ScreenProps) {
  const content = <View style={styles.column}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {hasConnectionBanner ? <ConnectionBanner /> : null}
      {header}

      <KeyboardAvoidingView
        style={styles.filler}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isScrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {content}
          </ScrollView>
        ) : (
          <View style={styles.staticContent}>{content}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  filler: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: spacing[6],
  },
  staticContent: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[6],
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    gap: spacing[4],
  },
});
