import Link from 'next/link';

import { CardHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { texts } from '@/constants/texts';
import { formatCount } from '@/features/statistics/format';
import type { SpeciesCount } from '@/features/statistics/queries';
import { routes } from '@/lib/routes';

/** How many species the card lists before handing off to the species screen. */
const LISTED = 5;

/**
 * The most planted species, counted over the normalized key.
 *
 * The footer link is what makes the truncation honest: the card shows five, and
 * says out loud how many there are in total so nobody reads the list as the
 * whole catalogue.
 */
export function SpeciesList({
  counts,
  /** Warns that this block ignores the municipality filter, when one is set. */
  wholeProjectNote = false,
}: {
  counts: readonly SpeciesCount[];
  wholeProjectNote?: boolean;
}) {
  const listed = counts.slice(0, LISTED);

  return (
    <>
      <CardHeading>{texts.dashboard.bySpecies}</CardHeading>

      {listed.length === 0 ? (
        <EmptyState className="flex-1 justify-center" body={texts.dashboard.speciesEmpty} />
      ) : (
        <>
          <ul className="flex flex-col">
            {listed.map((entry) => (
              <li
                key={entry.speciesId}
                className="flex items-center justify-between gap-3 border-b border-border-subtle py-2 font-sans text-[13px] last:border-b-0"
              >
                <span className="truncate text-text-primary">{entry.speciesName}</span>
                <span className="shrink-0 font-mono text-text-secondary">
                  {formatCount(entry.plantedTotal)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex-1" />

          {wholeProjectNote ? (
            <p className="font-sans text-xs text-text-muted">
              {texts.dashboard.speciesWholeProject}
            </p>
          ) : null}

          <Link
            href={routes.species}
            className="inline-flex min-h-hit items-center gap-1 rounded-md font-sans text-[13px] text-text-link transition-colors hover:text-text-link-hover focus-visible:ring-3 focus-visible:ring-border-focus/50 focus-visible:outline-none"
          >
            {texts.dashboard.allSpecies(counts.length)}
            <span aria-hidden="true">→</span>
          </Link>
        </>
      )}
    </>
  );
}
