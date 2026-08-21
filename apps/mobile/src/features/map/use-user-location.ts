import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

/**
 * A fix, with how much the device trusts it.
 *
 * The radius matters to the planting wizard and not to the map: under a canopy
 * a phone routinely reports tens of metres, and a pin dropped on a reading like
 * that is not where the tree is. The wizard shows the figure and asks for the
 * pin to be adjusted; the map has no use for it and ignores it.
 */
export type UserFix = {
  lat: number;
  lng: number;
  /** Radius of the 68% confidence circle, in metres. Null when unreported. */
  accuracyMetres: number | null;
};

export type UserLocationState = {
  permission: LocationPermission;
  coordinates: { lat: number; lng: number } | null;
  /**
   * Asks for the permission, or reads the position once it is already held.
   *
   * `precise` buys a tighter fix at the cost of keeping the GPS radio awake
   * longer. The map does not need it -- it only has to know which vereda the
   * guardian is in -- but placing a tree does.
   */
  request: (precise?: boolean) => Promise<UserFix | null>;
};

/**
 * The guardian's own position, offered and never demanded.
 *
 * The map is fully usable without it: a visitor exploring the project has no
 * reason to hand over their location, and a guardian who said no once must not
 * be asked again every time the screen mounts. So nothing is requested on
 * mount -- only the current permission is read -- and the dialog appears when
 * the location button is pressed.
 */
export function useUserLocation(): UserLocationState {
  const [permission, setPermission] = useState<LocationPermission>('unknown');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  // Reading the permission the system already holds is a query against an
  // external system, not derived state, and it must not prompt.
  useEffect(() => {
    let isMounted = true;

    void Location.getForegroundPermissionsAsync().then((status) => {
      if (!isMounted) {
        return;
      }
      setPermission(status.granted ? 'granted' : status.canAskAgain ? 'unknown' : 'denied');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const request = useCallback(async (precise = false) => {
    const status = await Location.requestForegroundPermissionsAsync();

    if (!status.granted) {
      setPermission('denied');
      return null;
    }

    setPermission('granted');

    try {
      // Balanced accuracy rather than the best available by default: the map
      // only needs to know which vereda the guardian is standing in, and the
      // high accuracy mode keeps the GPS radio awake far longer than that is
      // worth. Placing a tree is the case that does justify the cost.
      const position = await Location.getCurrentPositionAsync({
        accuracy: precise ? Location.Accuracy.High : Location.Accuracy.Balanced,
      });

      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyMetres: position.coords.accuracy,
      };
      setCoordinates({ lat: next.lat, lng: next.lng });
      return next;
    } catch {
      // The permission is granted but the fix failed -- indoors, or the radio
      // is off. The caller shows the notice; the map stays where it is.
      return null;
    }
  }, []);

  return { permission, coordinates, request };
}
