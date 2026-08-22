import { ScreenTitle } from '@/components/ui/card';
import { NoDataSourceState } from '@/components/ui/states';

/**
 * A route that exists so the navigation is whole, but whose screen has not been
 * built yet.
 *
 * It says so plainly instead of showing an empty card that reads as "no hay
 * datos". Every one of these is replaced by its real screen; none is meant to
 * survive the wave.
 */
export function PendingScreen({ title, note }: { title: string; note: string }) {
  return (
    <>
      <ScreenTitle>{title}</ScreenTitle>
      <NoDataSourceState note={note} />
    </>
  );
}
