/**
 * How many records the guardian has saved on the phone that have not reached
 * the server yet.
 *
 * There is no offline write queue in the app yet, so today the answer is always
 * none and the connection strip says only that the signal is gone. This is the
 * single seam the strip reads: when the queue exists, this function is the only
 * one that changes, and every screen showing the strip starts counting at once.
 *
 * It is a hook rather than a plain function on purpose. The queue will live in
 * device storage and change while a screen is mounted, so the count has to be
 * something a screen can subscribe to, and callers written against a hook do
 * not have to be rewritten the day it starts moving.
 */
export function usePendingSyncCount(): number {
  return 0;
}
