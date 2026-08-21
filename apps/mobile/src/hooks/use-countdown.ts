import { useEffect, useState } from 'react';

/**
 * Seconds left until `deadline`, recomputed once a second.
 *
 * The clock is an external system, so the effect here is a subscription with
 * its own teardown and nothing else. The number on screen is derived during
 * render from the deadline and the current instant, not stored and advanced by
 * hand, so a render triggered by anything else still shows the right value.
 */
export function useSecondsRemaining(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) {
      return;
    }

    const interval = setInterval(() => {
      const instant = Date.now();
      setNow(instant);
      // Nothing left to count: the timer stops itself rather than waking the
      // component once a second for the rest of the session.
      if (instant >= deadline) {
        clearInterval(interval);
      }
    }, 1_000);

    return () => clearInterval(interval);
  }, [deadline]);

  if (deadline === null) {
    return 0;
  }

  return Math.max(0, Math.ceil((deadline - now) / 1_000));
}
