import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { MIN_TOUCH_TARGET, colors, effects, fontSize, radii, spacing } from '@/constants/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTreeSearch, type TreeSearchResult } from '@/features/map/use-tree-search';
import type { ZoneCatalogue, ZoneOption } from '@/features/map/use-zones';

/** How long after the last keystroke the tree lookup is sent. */
const TYPING_DEBOUNCE_MS = 300;

export type SearchSheetProps = {
  isVisible: boolean;
  catalogue: ZoneCatalogue | undefined;
  onSelectZone: (zone: ZoneOption) => void;
  onSelectTree: (tree: TreeSearchResult) => void;
  onClose: () => void;
};

/** Everything the list can hold, so one FlatList renders both kinds of hit. */
type SearchRow =
  | { kind: 'heading'; id: string; label: string }
  | { kind: 'zone'; id: string; zone: ZoneOption }
  | { kind: 'tree'; id: string; tree: TreeSearchResult };

/**
 * Matches a zone name the way a person types it: ignoring case and accents.
 *
 * Somebody looking for "El Madroñal" will type "madronal" as often as not, and
 * a search that misses because of a tilde is a search that looks broken.
 */
function foldForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * The search behind the pill at the top of the map.
 *
 * It answers the two questions the placeholder promises: where is a vereda, and
 * where is this tree. Zones are matched in memory because the whole catalogue is
 * a handful of rows already loaded for the filters; trees go to the server,
 * debounced, because there is no upper bound on how many there will be.
 *
 * It is a full sheet rather than an inline field on purpose: typing over a map
 * puts the keyboard exactly on top of the thing being searched for.
 */
export function SearchSheet({
  isVisible,
  catalogue,
  onSelectZone,
  onSelectTree,
  onClose,
}: SearchSheetProps) {
  const [query, setQuery] = useState('');
  const settledQuery = useDebouncedValue(query, TYPING_DEBOUNCE_MS);
  const treeSearch = useTreeSearch(settledQuery);

  const folded = foldForSearch(query);

  // Derived during the render. Mirroring this into state through an effect
  // would repaint the list twice for every keystroke.
  const zoneMatches =
    folded.length === 0 || catalogue === undefined
      ? []
      : [
          ...catalogue.municipalities,
          ...[...catalogue.villagesByMunicipality.values()].flat(),
        ].filter((zone) => foldForSearch(zone.name).includes(folded));

  const treeMatches = treeSearch.data ?? [];

  const rows: SearchRow[] = [];

  if (zoneMatches.length > 0) {
    rows.push({ kind: 'heading', id: 'zones', label: texts.map.searchZonesHeading });
    for (const zone of zoneMatches) {
      rows.push({ kind: 'zone', id: `zone-${zone.id}`, zone });
    }
  }

  if (treeMatches.length > 0) {
    rows.push({ kind: 'heading', id: 'trees', label: texts.map.searchTreesHeading });
    for (const tree of treeMatches) {
      rows.push({ kind: 'tree', id: `tree-${tree.treeId}`, tree });
    }
  }

  const hasTyped = query.trim() !== '';
  const isSearching = treeSearch.isFetching;
  const isEmpty = hasTyped && !isSearching && rows.length === 0;

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={close}
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={texts.map.searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel={texts.map.searchLabel}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
          />
          <Button
            label={texts.common.cancel}
            onPress={close}
            variant="ghost"
            accessibilityLabel={texts.common.cancel}
          />
        </View>

        {treeSearch.error !== null ? (
          <View style={styles.status}>
            <Notice
              tone="error"
              title={texts.map.errorTitle}
              message={texts.map.errorBody}
              onRetry={() => void treeSearch.refetch()}
            />
          </View>
        ) : null}

        {!hasTyped ? (
          <AppText variant="bodyMuted" style={styles.status}>
            {texts.map.searchHint}
          </AppText>
        ) : isEmpty ? (
          <AppText variant="bodyMuted" style={styles.status}>
            {texts.map.searchNoResults(query.trim())}
          </AppText>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => row.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (item.kind === 'heading') {
                return (
                  <AppText variant="caption" style={styles.heading}>
                    {item.label}
                  </AppText>
                );
              }

              if (item.kind === 'zone') {
                const canFrame = item.zone.centroid !== null;
                return (
                  <Row
                    title={item.zone.name}
                    detail={
                      item.zone.type === 'municipality'
                        ? texts.map.municipalityFilter
                        : texts.map.villageFilter
                    }
                    // A zone the coordinator created without a centroid cannot
                    // move the camera, so it is shown as unavailable rather
                    // than offered as a result that does nothing.
                    isDisabled={!canFrame}
                    onPress={() => {
                      setQuery('');
                      onSelectZone(item.zone);
                    }}
                  />
                );
              }

              return (
                <Row
                  title={item.tree.code}
                  detail={item.tree.speciesName}
                  onPress={() => {
                    setQuery('');
                    onSelectTree(item.tree);
                  }}
                />
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function Row({
  title,
  detail,
  onPress,
  isDisabled = false,
}: {
  title: string;
  detail: string;
  onPress: () => void;
  isDisabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.row,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <AppText variant="body" style={styles.rowTitle} numberOfLines={1}>
        {title}
      </AppText>
      <AppText variant="caption" style={styles.rowDetail} numberOfLines={1}>
        {detail}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingLeft: spacing[4],
    paddingRight: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.full,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    boxShadow: effects.shadowCard,
  },
  status: {
    padding: spacing[5],
  },
  heading: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[1],
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: fontSize.xs * 0.08,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: MIN_TOUCH_TARGET,
    gap: spacing[1],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowTitle: {
    color: colors.textPrimary,
  },
  rowDetail: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
