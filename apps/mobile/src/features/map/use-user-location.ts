import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

export type UserLocationState = {
  permission: LocationPermission;
  coordinates: { lat: number; lng: number } | null;
  /** Asks for the permission, or reads the position once it is already held. */
  request: () => Promise<{ lat: number; lng: number } | null>;
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

  const request = useCallback(async () => {
    const status = await Location.requestForegroundPermissionsAsync();

    if (!status.granted) {
      setPermission('denied');
      return null;
    }

    setPermission('granted');

    try {
      // Balanced accuracy rather than the best available: the map only needs to
      // know which vereda the guardian is standing in, and the high accuracy
      // mode keeps the GPS radio awake for far longer than that is worth.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoordinates(next);
      return next;
    } catch {
      // The permission is granted but the fix failed -- indoors, or the radio
      // is off. The caller shows the notice; the map stays where it is.
      return null;
    }
  }, []);

  return { permission, coordinates, request };
}
