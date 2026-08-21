import { useEffect, useState } from 'react';

/**
 * A value as it settles, rather than every value it passed through.
 *
 * Typing and panning are both streams of intermediate states, and acting on
 * each one spends a rural connection on answers that are stale before they
 * arrive. This is a timer over an external signal, not state derived from a
 * prop, which is why it is an effect: "has stopped changing" cannot be computed
 * during a render.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
