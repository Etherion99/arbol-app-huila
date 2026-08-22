import { useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { LA_PLATA_FRAMING, type MapRegion } from '@arbolapp/core';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/ui/text-field';
import { texts } from '@/constants/texts';
import { colors, effects, fontFace, radii, spacing } from '@/constants/theme';
import { lightMapStyle } from '@/features/map/map-style';
import type { UserFix } from '@/features/map/use-user-location';
import { mapMotion } from '@/features/map/map-motion';
import { formatCoordinates } from '@/lib/dates';

/**
 * Anything worse than this and the pin is not where the tree is.
 *
 * Under a canopy a phone routinely reports tens of metres, which is the normal
 * case this project has to work in rather than an exception. So a poor fix never
 * blocks the step: it warns, and asks for the pin to be dragged.
 */
const POOR_ACCURACY_METRES = 20;

/** Roughly the bounding box of Huila, used only to catch a typed coordinate. */
const HUILA_BOUNDS = { minLat: 1.4, maxLat: 3.9, minLng: -76.7, maxLng: -74.4 };

export type StepLocationProps = {
  location: { lat: number; lng: number } | null;
  accuracyMetres: number | null;
  onChange: (location: { lat: number; lng: number }, accuracyMetres: number | null) => void;
  /** Asks the system for a precise fix. Returns null when refused or unavailable. */
  onRequestLocation: () => Promise<UserFix | null>;
  permission: 'unknown' | 'granted' | 'denied';
};

/**
 * Step one: where the tree stands.
 *
 * The GPS is offered, never imposed. It is refused often enough -- and fails
 * often enough under a canopy -- that typing the coordinate has to be a real
 * path rather than an apology, so both are first class here and the pin is
 * draggable whichever produced it.
 *
 * The map reuses the style and the framing of `features/map`: the same leaf
 * paper ground, so the pin reads as the same kind of object the map draws
 * everywhere else.
 */
export function StepLocation({
  location,
  accuracyMetres,
  onChange,
  onRequestLocation,
  permission,
}: StepLocationProps) {
  const mapRef = useRef<MapView | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [manualLat, setManualLat] = useState(() => location?.lat.toFixed(4) ?? '');
  const [manualLng, setManualLng] = useState(() => location?.lng.toFixed(4) ?? '');
  const [manualError, setManualError] = useState<string | undefined>(undefined);
  const [wasRefused, setWasRefused] = useState(false);

  const region: MapRegion =
    location === null
      ? LA_PLATA_FRAMING
      : {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.004,
          longitudeDelta: 0.004,
        };

  const requestFix = useCallback(async () => {
    const fix = await onRequestLocation();

    if (fix === null) {
      setWasRefused(true);
      return;
    }

    setWasRefused(false);
    onChange({ lat: fix.lat, lng: fix.lng }, fix.accuracyMetres);
    mapRef.current?.animateToRegion(
      { latitude: fix.lat, longitude: fix.lng, latitudeDelta: 0.004, longitudeDelta: 0.004 },
      mapMotion.zoneFlightMs,
    );
  }, [onChange, onRequestLocation]);

  const applyManual = useCallback(() => {
    const lat = Number.parseFloat(manualLat.replace(',', '.'));
    const lng = Number.parseFloat(manualLng.replace(',', '.'));

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < HUILA_BOUNDS.minLat ||
      lat > HUILA_BOUNDS.maxLat ||
      lng < HUILA_BOUNDS.minLng ||
      lng > HUILA_BOUNDS.maxLng
    ) {
      setManualError(texts.planting.manualOutOfRange);
      return;
    }

    setManualError(undefined);
    // A typed coordinate has no accuracy figure of its own, and inventing one
    // would be worse than admitting there is none.
    onChange({ lat, lng }, null);
    setIsManual(false);
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 },
      mapMotion.zoneFlightMs,
    );
  }, [manualLat, manualLng, onChange]);

  const isAccuracyPoor = accuracyMetres !== null && accuracyMetres > POOR_ACCURACY_METRES;

  return (
    <View style={styles.container}>
      <AppText variant="title">{texts.planting.locationHeading}</AppText>

      <View style={styles.mapFrame}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={lightMapStyle}
          initialRegion={region}
          showsUserLocation={permission === 'granted'}
          showsMyLocationButton={false}
          showsPointsOfInterests={false}
          showsCompass={false}
          toolbarEnabled={false}
          // Tapping the map is a second way to place the pin, for the guardian
          // who finds dragging fiddly with one hand full.
          onPress={(event) => {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            onChange({ lat: latitude, lng: longitude }, null);
          }}
        >
          {/* The radius the phone reported, drawn to scale, and only while it
              is wide enough to be worth arguing with. It is the same figure the
              warning below already gives in words, so it adds a picture and is
              never the only place the number appears — which is what lets it be
              a wash rather than an ink.

              Both values are `colors.warning` #FFD700 at the alphas the canvas
              draws the circle with, and the map is the one ground in the app
              whose colour is not the palette's to know, so they are written as
              alphas here for the same reason the chips above them are. */}
          {location !== null && isAccuracyPoor ? (
            <Circle
              center={{ latitude: location.lat, longitude: location.lng }}
              radius={accuracyMetres}
              fillColor="rgba(255, 215, 0, 0.16)"
              strokeColor="rgba(255, 215, 0, 0.55)"
              strokeWidth={1}
            />
          ) : null}

          {location !== null ? (
            <Marker
              coordinate={{ latitude: location.lat, longitude: location.lng }}
              draggable
              // The one marker on this screen, and it moves under a finger, so
              // it is the single case where tracking view changes is right.
              tracksViewChanges
              anchor={{ x: 0.5, y: 0.5 }}
              onDragEnd={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                // A dragged pin is placed by hand, so whatever the GPS thought
                // its accuracy was no longer describes it.
                onChange({ lat: latitude, lng: longitude }, null);
              }}
              accessibilityLabel={texts.planting.pinLabel}
            >
              <View style={styles.pinHalo}>
                <View style={styles.pin} />
              </View>
            </Marker>
          ) : null}
        </MapView>

        <View style={styles.hint} pointerEvents="none">
          <AppText variant="caption" style={styles.hintLabel}>
            {texts.planting.locationHint}
          </AppText>
        </View>

        <View style={styles.readout} pointerEvents="none">
          <AppText variant="caption" style={styles.readoutLabel}>
            {location === null
              ? texts.planting.locationNoFix
              : formatCoordinates(location.lat, location.lng)}
          </AppText>
          {accuracyMetres !== null ? (
            <>
              {/* The canvas joins the coordinate and its radius with a middle
                  dot rather than with whitespace, so the two read as one
                  reading and not as two chips that happen to touch. */}
              <AppText variant="caption" style={styles.readoutLabel} accessibilityElementsHidden>
                {texts.planting.locationReadoutSeparator}
              </AppText>
              <AppText
                variant="caption"
                style={isAccuracyPoor ? styles.accuracyPoor : styles.accuracyGood}
                accessibilityLabel={texts.planting.locationAccuracyLabel(accuracyMetres)}
              >
                {texts.planting.locationAccuracy(accuracyMetres)}
              </AppText>
            </>
          ) : null}
        </View>
      </View>

      {/* A weak fix is the normal case under a canopy, so it is a warning with
          an instruction attached, never a wall. One sentence and no heading,
          the way the canvas writes it: the figure and what to do about it are
          the whole message, and a title above them only repeats the first half. */}
      {isAccuracyPoor ? (
        <Notice tone="warning" message={texts.planting.locationPoorBody(accuracyMetres)} />
      ) : null}

      {wasRefused ? (
        <Notice
          tone="info"
          title={texts.planting.locationDeniedTitle}
          message={texts.planting.locationDeniedBody}
          onRetry={
            permission === 'denied' ? () => void Linking.openSettings() : () => void requestFix()
          }
          retryLabel={
            permission === 'denied'
              ? texts.planting.locationOpenSettings
              : texts.planting.locationAllow
          }
        />
      ) : null}

      <View style={styles.actions}>
        <Button
          label={texts.planting.locationUseGps}
          onPress={() => void requestFix()}
          variant="secondary"
          style={styles.action}
        />
        <Button
          label={isManual ? texts.planting.manualToggleClose : texts.planting.manualToggle}
          onPress={() => setIsManual((current) => !current)}
          variant="ghost"
          style={styles.action}
        />
      </View>

      {isManual ? (
        <View style={styles.manual}>
          <View style={styles.manualRow}>
            <View style={styles.manualField}>
              <TextField
                label={texts.planting.manualLatitude}
                value={manualLat}
                onChangeText={setManualLat}
                keyboardType="numbers-and-punctuation"
                inputMode="decimal"
                placeholder="2.3894"
              />
            </View>
            <View style={styles.manualField}>
              <TextField
                label={texts.planting.manualLongitude}
                value={manualLng}
                onChangeText={setManualLng}
                keyboardType="numbers-and-punctuation"
                inputMode="decimal"
                placeholder="-75.8919"
                error={manualError}
                hint={texts.planting.manualHint}
              />
            </View>
          </View>

          <Button label={texts.planting.manualApply} onPress={applyManual} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  // The ground under the tiles while they load. The canvas paints it as a
  // radial gradient from `surfaceRaised` to `borderSubtle`; a View takes one
  // flat colour, and the darker end is the one that keeps the frame reading as
  // a panel rather than as a hole in the page.
  mapFrame: {
    height: 330,
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.borderSubtle,
  },
  pinHalo: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 141, 70, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 141, 70, 0.25)',
  },
  pin: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.green990,
    boxShadow: effects.glowAccent,
  },
  // Both chips float over a light map now, so they are near-white glass rather
  // than the smoked panels the dark theme used. The alpha is the canvas's own:
  // enough of the ground shows through that the chip reads as laid on the map,
  // not cut out of it.
  hint: {
    position: 'absolute',
    right: spacing[3],
    top: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
  },
  hintLabel: {
    color: colors.textSecondary,
  },
  readout: {
    position: 'absolute',
    left: spacing[3],
    bottom: spacing[3],
    flexDirection: 'row',
    // No gap: the middle dot is what separates the coordinate from its radius,
    // and a gap on top of it would space the dot away from both.
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
  },
  readoutLabel: {
    fontFamily: fontFace.monoMedium,
    color: colors.textSecondary,
  },
  // The canvas sets the accuracy figure in `accent`, which reads 4.28:1 on this
  // near-white chip and is a 13px mono word. `textLink` is the same green two
  // steps darker and reaches 5.81:1, which is why the palette keeps it.
  accuracyGood: {
    fontFamily: fontFace.monoMedium,
    color: colors.textLink,
  },
  // A weak fix is the yellow warning of the canvas, and yellow ink is 1.40:1 on
  // this chip — invisible. `earthBrown` is the ink the design system already
  // pairs with that warning, at 5.99:1 here.
  accuracyPoor: {
    fontFamily: fontFace.monoMedium,
    color: colors.earthBrown,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  action: {
    flex: 1,
  },
  manual: {
    gap: spacing[3],
  },
  manualRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  manualField: {
    flex: 1,
  },
});
