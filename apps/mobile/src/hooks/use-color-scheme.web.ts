import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const suscribirseSinCambios = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 *
 * Detecta la hidratación con useSyncExternalStore —instantánea `false` en el
 * servidor y `true` en el cliente— en lugar de un setState dentro de un efecto,
 * que provoca un render en cascada y es lo que marca react-hooks.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    suscribirseSinCambios,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
