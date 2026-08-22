import { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  CLUSTER_ZOOM,
  HUILA_FRAMING,
  LA_PLATA_FRAMING,
  framingForZone,
  regionToZoom,
  type MapRegion,
  type Uuid,
} from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ConnectionBanner } from '@/components/connection-banner';
import { Notice } from '@/components/ui/notice';
import { texts } from '@/constants/texts';
import { colors, radii, spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-provider';
import { useIsOnline } from '@/hooks/use-is-online';

import { ClusterBubble } from '@/features/map/components/cluster-bubble';
import { FilterChip } from '@/features/map/components/filter-chip';
import { GuestBar } from '@/features/map/components/guest-bar';
import { MapLegend } from '@/features/map/components/map-legend';
import { MapSearchBar } from '@/features/map/components/map-search-bar';
import { OptionSheet, type SheetOption } from '@/components/ui/option-sheet';
import { SearchSheet } from '@/features/map/components/search-sheet';
import { SelectedMarker } from '@/features/map/components/selected-marker';
import { TreeSummarySheet } from '@/features/map/components/tree-summary-sheet';
import { clusterMarkers } from '@/features/map/clustering';
import { mapMotion } from '@/features/map/map-motion';
import { lightMapStyle } from '@/features/map/map-style';
import { markerSprite } from '@/features/map/marker-sprites';
import { useDebouncedRegion } from '@/features/map/use-debounced-region';
import { useSpeciesCatalogue } from '@/features/map/use-species-catalogue';
import { useTreeCard } from '@/features/map/use-tree-card';
import type { TreeSearchResult } from '@/features/map/use-tree-search';
import { useTreesInViewport } from '@/features/map/use-trees-in-viewport';
import { useUserLocation } from '@/features/map/use-user-location';
import { useMunicipalityCounts } from '@/features/map/use-municipality-counts';
import { useZones, type ZoneOption } from '@/features/map/use-zones';

/** Which filter list is open, if any. */
type OpenSheet = 'search' | 'municipality' | 'village' | 'species' | null;

/**
 * The map, which is the entry screen and the centre of the application.
 *
 * Three rules shape everything below and none of them is negotiable:
 *
 * - The trees come from `trees_in_viewport`, never from the table. A guardian
 *   in a vereda pays for every row over a connection that barely holds.
 * - The tracking state is whatever the `tree_tracking` view says. It is never
 *   recomputed here: if the client's idea of "due soon" and the database's ever
 *   drifted apart, the map would quietly lie about which trees need visiting.
 * - A marker is a bitmap, and it stops tracking view changes after its first
 *   frame. Hundreds of marker views that re-rasterise on every frame of a pan
 *   is precisely what makes this screen unusable on the phones it is for.
 */
export default function MapScreen() {
  const router = useRouter();
  const { session } = useSession();
  const isOnline = useIsOnline();
  const mapRef = useRef<MapView | null>(null);

  // The region the camera is on right now, and the settled one the query uses.
  // They are two different things: the first changes on every frame of a pan,
  // the second only once the map has been still for 400 ms.
  const [region, setRegion] = useState<MapRegion>(HUILA_FRAMING);
  const settledRegion = useDebouncedRegion(region);

  const [municipalityId, setMunicipalityId] = useState<Uuid | null>(null);
  const [villageId, setVillageId] = useState<Uuid | null>(null);
  const [speciesId, setSpeciesId] = useState<Uuid | null>(null);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<Uuid | null>(null);
  // One channel for the things the map has to say that are not about loading
  // trees: a refused location, a fix that failed, a destination not built yet.
  const [notice, setNotice] = useState<{ title?: string; body: string } | null>(null);

  const zones = useZones();
  const species = useSpeciesCatalogue();
  const location = useUserLocation();

  // The narrowest zone chosen wins: a vereda already sits inside its
  // municipality, so sending both would be redundant.
  const zoneFilter = villageId ?? municipalityId;

  const filters = useMemo(
    () => ({
      speciesIds: speciesId === null ? null : [speciesId],
      zoneIds: zoneFilter === null ? null : [zoneFilter],
    }),
    [speciesId, zoneFilter],
  );

  // Far enough out that the department is on screen, and nothing is filtered:
  // the map answers with one counted circle per municipality and does not ask
  // for markers at all. With a filter set the totals would not honour it, so
  // the map falls back to grouping real markers.
  const hasFilter = speciesId !== null || zoneFilter !== null;
  const isDepartmentView =
    settledRegion !== null &&
    regionToZoom(settledRegion) < CLUSTER_ZOOM.municipalityClusters &&
    !hasFilter;

  const viewport = useTreesInViewport(isDepartmentView ? null : settledRegion, filters);
  const municipalities = useMunicipalityCounts(zones.data, isDepartmentView);
  const card = useTreeCard(selectedTreeId);

  // Derived during the render, which is the only correct place for it. An
  // effect mirroring this into state would repaint the whole map twice for
  // every pan.
  const marks = useMemo(
    () => clusterMarkers(viewport.trees, viewport.zoom),
    [viewport.trees, viewport.zoom],
  );

  const flyTo = useCallback((target: MapRegion, duration = mapMotion.zoneFlightMs) => {
    mapRef.current?.animateToRegion(target, duration);
  }, []);

  /**
   * The opening move: the department first, so the project is seen whole, then
   * in to the municipality where the trees are. It runs once the map says it is
   * ready rather than on mount, because animating a map that has not laid out
   * yet is a no-op on Android.
   */
  const handleMapReady = useCallback(() => {
    flyTo(LA_PLATA_FRAMING, mapMotion.openingFlightMs);
  }, [flyTo]);

  const handleLocationPress = useCallback(async () => {
    const position = await location.request();

    if (position === null) {
      setNotice(
        location.permission === 'denied'
          ? { title: texts.map.locationDeniedTitle, body: texts.map.locationDeniedBody }
          : { body: texts.map.locationUnavailable },
      );
      return;
    }

    setNotice(null);
    flyTo(
      {
        latitude: position.lat,
        longitude: position.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      mapMotion.zoneFlightMs,
    );
  }, [flyTo, location]);

  /** Framing a zone uses its centroid and suggested zoom: no outlines exist. */
  const frameZone = useCallback(
    (zoneId: Uuid | null, scope: 'municipality' | 'village') => {
      if (scope === 'municipality') {
        setMunicipalityId(zoneId);
        // The vereda belonged to the municipality that just changed, so keeping
        // it would filter to a zone the guardian can no longer see in the list.
        setVillageId(null);
      } else {
        setVillageId(zoneId);
      }

      setSelectedTreeId(null);
      setOpenSheet(null);

      if (zoneId === null) {
        // Clearing a filter pulls back out to the municipality the project
        // lives in, rather than leaving the camera inside a zone nobody chose.
        flyTo(LA_PLATA_FRAMING);
        return;
      }

      const all = [
        ...(zones.data?.municipalities ?? []),
        ...[...(zones.data?.villagesByMunicipality.values() ?? [])].flat(),
      ];
      const zone = all.find((candidate) => candidate.id === zoneId);

      // No outlines exist for a vereda, so the framing is the centroid and the
      // zoom the catalogue suggests. A zone the coordinator created without a
      // centroid still filters; it just cannot move the camera.
      if (zone !== undefined && zone.centroid !== null) {
        flyTo(framingForZone(zone.centroid, zone.suggestedZoom));
      }
    },
    [flyTo, zones.data],
  );

  /** A zone chosen in the search behaves exactly like choosing it in a filter. */
  const searchToZone = useCallback(
    (zone: ZoneOption) => {
      setOpenSheet(null);
      frameZone(zone.id, zone.type === 'municipality' ? 'municipality' : 'village');
    },
    [frameZone],
  );

  /**
   * A tree chosen in the search opens its card.
   *
   * It flies past the clustering threshold on purpose: landing on a zoom where
   * the tree is still folded into a group would answer the search with a bubble
   * instead of the tree that was asked for.
   */
  const searchToTree = useCallback(
    (tree: TreeSearchResult) => {
      setOpenSheet(null);
      const delta = 360 / 2 ** (CLUSTER_ZOOM.individualMarkers + 2);
      flyTo({
        latitude: tree.lat,
        longitude: tree.lng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      });
      setSelectedTreeId(tree.treeId);
    },
    [flyTo],
  );

  const municipalityOptions = useMemo<SheetOption[]>(
    () => (zones.data?.municipalities ?? []).map((zone) => ({ id: zone.id, label: zone.name })),
    [zones.data],
  );

  const villageOptions = useMemo<SheetOption[]>(() => {
    if (municipalityId === null) {
      return [...(zones.data?.villagesByMunicipality.values() ?? [])]
        .flat()
        .map((zone) => ({ id: zone.id, label: zone.name }));
    }
    return (zones.data?.villagesByMunicipality.get(municipalityId) ?? []).map((zone) => ({
      id: zone.id,
      label: zone.name,
    }));
  }, [municipalityId, zones.data]);

  const speciesOptions = useMemo<SheetOption[]>(
    () =>
      (species.data ?? []).map((option) => ({
        id: option.id,
        label: option.canonicalName,
        detail: texts.map.treeCount(option.treeCount),
      })),
    [species.data],
  );

  const selectedMunicipality = municipalityOptions.find((o) => o.id === municipalityId);
  const selectedVillage = villageOptions.find((o) => o.id === villageId);
  const selectedSpecies = speciesOptions.find((o) => o.id === speciesId);

  // The department view draws municipality circles, not markers, so an empty
  // viewport there means nothing and the notice would be a lie.
  const isEmpty =
    !isDepartmentView &&
    !viewport.isLoading &&
    viewport.error === null &&
    viewport.trees.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ConnectionBanner />

      <View style={styles.mapArea}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          // Google on both platforms, which is what lets one styler serve
          // Android and iPhone: the leaf paper the app is printed on is the
          // same ground on both, so a marker separates from it by the same
          // measured amount whichever phone a guardian is holding.
          provider={PROVIDER_GOOGLE}
          customMapStyle={lightMapStyle}
          initialRegion={HUILA_FRAMING}
          onMapReady={handleMapReady}
          onRegionChangeComplete={setRegion}
          showsUserLocation={location.permission === 'granted'}
          // The library's own button is not offered: it sits where the design
          // puts nothing, and the control in the search row already does it.
          showsMyLocationButton={false}
          showsPointsOfInterests={false}
          showsCompass={false}
          toolbarEnabled={false}
          onPress={() => setSelectedTreeId(null)}
        >
          {isDepartmentView
            ? (municipalities.data ?? []).map((municipality) => (
                <Marker
                  key={municipality.id}
                  coordinate={{ latitude: municipality.lat, longitude: municipality.lng }}
                  tracksViewChanges={false}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={() => frameZone(municipality.id, 'municipality')}
                  accessibilityLabel={texts.map.clusterLabel(municipality.count, municipality.name)}
                >
                  <ClusterBubble count={municipality.count} status={municipality.status} />
                </Marker>
              ))
            : marks.kind === 'trees'
              ? marks.trees.map((tree) => {
                  const isSelected = tree.treeId === selectedTreeId;

                  return (
                    <Marker
                      key={tree.treeId}
                      identifier={tree.treeId}
                      coordinate={{ latitude: tree.lat, longitude: tree.lng }}
                      // The whole performance story of this screen. Every marker
                      // but one is a finished bitmap, so after the first frame
                      // there is nothing left to observe -- without this, iOS
                      // re-rasterises every marker on every frame of a pan.
                      //
                      // The selected tree is the single exception, and it is
                      // affordable exactly because there is never more than one.
                      image={isSelected ? undefined : markerSprite(tree.trackingStatus, false)}
                      tracksViewChanges={isSelected}
                      anchor={{ x: 0.5, y: 0.5 }}
                      zIndex={isSelected ? 1 : 0}
                      onPress={() => setSelectedTreeId(tree.treeId)}
                      accessibilityLabel={texts.map.markerLabel(
                        tree.speciesName,
                        texts.map.legend[tree.trackingStatus],
                      )}
                    >
                      {isSelected ? <SelectedMarker status={tree.trackingStatus} /> : undefined}
                    </Marker>
                  );
                })
              : marks.clusters.map((cluster) => (
                  <Marker
                    key={cluster.id}
                    coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
                    // A group carries a count that changes, so it cannot be a
                    // pre-rendered bitmap. It tracks changes only until it has
                    // drawn once, which is what the boolean below means.
                    tracksViewChanges={false}
                    anchor={{ x: 0.5, y: 0.5 }}
                    onPress={() =>
                      flyTo(
                        {
                          latitude: cluster.lat,
                          longitude: cluster.lng,
                          latitudeDelta: region.latitudeDelta / 2.5,
                          longitudeDelta: region.longitudeDelta / 2.5,
                        },
                        mapMotion.clusterFlightMs,
                      )
                    }
                    accessibilityLabel={texts.map.clusterLabelPlain(cluster.count)}
                  >
                    <ClusterBubble count={cluster.count} status={cluster.dominantStatus} />
                  </Marker>
                ))}
        </MapView>

        {/* The scrim the design puts under the controls, so a pale tile cannot
            swallow the search pill. */}
        <View style={styles.topScrim} pointerEvents="none" />

        <View style={styles.controls} pointerEvents="box-none">
          <MapSearchBar
            query={selectedVillage?.label ?? selectedMunicipality?.label ?? null}
            onPress={() => setOpenSheet('search')}
            onLocationPress={() => void handleLocationPress()}
          />

          <View style={styles.chips}>
            <FilterChip
              label={selectedMunicipality?.label ?? texts.map.municipalityFilter}
              isActive={municipalityId !== null}
              onPress={() =>
                municipalityId === null
                  ? setOpenSheet('municipality')
                  : frameZone(null, 'municipality')
              }
              accessibilityLabel={
                municipalityId === null
                  ? texts.map.municipalityFilter
                  : texts.map.clearFilter(selectedMunicipality?.label ?? '')
              }
            />

            <FilterChip
              label={selectedVillage?.label ?? texts.map.villageFilter}
              isActive={villageId !== null}
              onPress={() =>
                villageId === null ? setOpenSheet('village') : frameZone(null, 'village')
              }
              accessibilityLabel={
                villageId === null
                  ? texts.map.villageFilter
                  : texts.map.clearFilter(selectedVillage?.label ?? '')
              }
            />

            <FilterChip
              label={selectedSpecies?.label ?? texts.map.speciesFilter}
              isActive={speciesId !== null}
              onPress={() => (speciesId === null ? setOpenSheet('species') : setSpeciesId(null))}
              accessibilityLabel={
                speciesId === null
                  ? texts.map.speciesFilter
                  : texts.map.clearFilter(selectedSpecies?.label ?? '')
              }
            />
          </View>
        </View>

        <View style={styles.legend} pointerEvents="none">
          <MapLegend />
        </View>

        {/* Only for a guardian: a visitor without an account has nothing to
            attach a tree to, and the guest bar already offers them the way in. */}
        {session !== null ? (
          <View style={styles.plantAction} pointerEvents="box-none">
            <Button
              label={texts.planting.start}
              onPress={() => router.push('/plant')}
              accessibilityHint={texts.planting.locationHeading}
            />
          </View>
        ) : null}

        <View style={styles.statusLayer} pointerEvents="box-none">
          {viewport.error !== null ? (
            <Notice
              tone="error"
              title={texts.map.errorTitle}
              message={texts.map.errorBody}
              onRetry={viewport.refetch}
            />
          ) : !isOnline && viewport.trees.length > 0 ? (
            <Notice tone="warning" message={texts.map.offlineCached} />
          ) : isEmpty ? (
            <Notice tone="info" title={texts.map.emptyTitle} message={texts.map.emptyBody} />
          ) : viewport.isLoading ? (
            <View style={styles.loading} accessibilityRole="progressbar">
              <AppText variant="caption" style={styles.loadingLabel}>
                {texts.map.loadingTrees}
              </AppText>
            </View>
          ) : null}

          {notice !== null ? (
            <Notice
              tone="info"
              title={notice.title}
              message={notice.body}
              onRetry={() => setNotice(null)}
              retryLabel={texts.common.close}
            />
          ) : null}
        </View>

        {selectedTreeId !== null ? (
          <TreeSummarySheet
            card={card.data ?? null}
            isLoading={card.isPending}
            error={card.error}
            onRetry={() => void card.refetch()}
            onClose={() => setSelectedTreeId(null)}
            onOpenDetail={() =>
              router.push({ pathname: '/tree/[id]', params: { id: selectedTreeId } })
            }
          />
        ) : null}
      </View>

      {session === null ? (
        <GuestBar
          onSignUp={() => router.push('/sign-up')}
          onSignIn={() => router.push('/sign-in')}
          onLegal={() => router.push('/legal')}
        />
      ) : null}

      <SearchSheet
        isVisible={openSheet === 'search'}
        catalogue={zones.data}
        onSelectZone={searchToZone}
        onSelectTree={searchToTree}
        onClose={() => setOpenSheet(null)}
      />

      <OptionSheet
        isVisible={openSheet === 'municipality'}
        title={texts.map.municipalityFilter}
        clearLabel={texts.map.allMunicipalities}
        options={municipalityOptions}
        selectedId={municipalityId}
        isLoading={zones.isPending}
        onSelect={(id) => frameZone(id, 'municipality')}
        onClose={() => setOpenSheet(null)}
      />

      <OptionSheet
        isVisible={openSheet === 'village'}
        title={texts.map.villageFilter}
        clearLabel={texts.map.allVillages}
        options={villageOptions}
        selectedId={villageId}
        isLoading={zones.isPending}
        onSelect={(id) => frameZone(id, 'village')}
        onClose={() => setOpenSheet(null)}
      />

      <OptionSheet
        isVisible={openSheet === 'species'}
        title={texts.map.speciesFilter}
        clearLabel={texts.map.allSpecies}
        options={speciesOptions}
        selectedId={speciesId}
        isLoading={species.isPending}
        onSelect={(id) => {
          setSpeciesId(id);
          setSelectedTreeId(null);
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
    // Shows through only until the tiles arrive, and it is the exact ground
    // the styler paints under them, so the wait is an empty sheet of the same
    // paper rather than a flash of a different colour.
    backgroundColor: colors.surfacePage,
  },
  /**
   * A veil of the page colour under the control band, so the two darkest things
   * the map style paints — the highway casing and the river — cannot swallow
   * the edge of a control sitting on them.
   *
   * The catalogue draws this as a gradient from the page colour at 92% down to
   * nothing. React Native paints no gradients without pulling in a library for
   * it, and one dependency is a poor trade for a band 130px tall, so this is
   * the flat approximation of that ramp and the alpha is where the whole of the
   * reasoning sits.
   *
   * A light veil helps the controls and costs the markers, because it lifts a
   * marker and the ground under it by the same amount and the gap between them
   * closes. Measured against the page ground: the accent ring on a control over
   * the highway casing goes from 2.71:1 to 2.96:1, while `up_to_date` falls
   * from 4.12:1 to 3.06:1. So 0.2 is a ceiling rather than a taste — it is the
   * most veil `up_to_date` can take and still clear the 3:1 a mark on a map
   * owes. `overdue` is the casualty, dropping from 3.03:1 to 2.48:1; it already
   * sat exactly on the limit before any veil, and no flat alpha above zero
   * leaves it there. That is the part of the gradient that cannot be
   * approximated, and it is owed back to the design.
   *
   * The colour is the token and the alpha is `opacity` rather than a mixed
   * `rgba()`: the view has no children, so the two render identically, and this
   * way there is no hand-copied hex to drift from `surfacePage`.
   *
   * What this scrim no longer does is protect the search pill. On a light map
   * a light veil cannot lift a white control off a white ground — the controls
   * carry that themselves now, with an opaque fill and a border at 3:1.
   */
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    backgroundColor: colors.surfacePage,
    opacity: 0.2,
  },
  controls: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[4],
    right: spacing[4],
    gap: spacing[3],
  },
  chips: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  legend: {
    position: 'absolute',
    left: spacing[4],
    // Android draws the Google attribution in this corner, so the legend is
    // lifted clear of it. On iOS the attribution is part of the tile itself.
    bottom: Platform.OS === 'android' ? spacing[8] : spacing[4],
  },
  // Opposite the legend, thumb side, clear of the same Android attribution.
  plantAction: {
    position: 'absolute',
    right: spacing[4],
    bottom: Platform.OS === 'android' ? spacing[8] : spacing[4],
  },
  statusLayer: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    // Clear of the legend in the corner and of the card when one is open.
    top: 132,
    gap: spacing[3],
  },
  /**
   * The pill that says the trees are on their way.
   *
   * The catalogue does not draw this state, so it borrows the vocabulary the
   * search row above it already settled: an opaque `surfaceRaised` lid rather
   * than a translucent one, because tiles sliding under a label read in direct
   * sun is worse than a corner of map hidden for a second.
   *
   * White on a leaf-white map separates by 1.04:1, so the border is the whole
   * of what draws the pill. It is the neutral grey and not `borderSubtle`,
   * which measures 1.19:1 against the ground and drew nothing at all: 4.43:1
   * on the map ground and 4.61:1 on the fill, clear of the 3:1 SC 1.4.11 asks.
   * Over the river the same edge falls to 1.41:1 — the one ground in the
   * styler that no grey survives, and the trade every floating control on this
   * map already takes.
   *
   * The label stays `textSecondary` and gains a ground it can be read on:
   * 7.32:1 on the fill, where the tone it had over the old dark chip was ink
   * on ink.
   */
  loading: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.slateGrey,
  },
  loadingLabel: {
    color: colors.textSecondary,
  },
});
