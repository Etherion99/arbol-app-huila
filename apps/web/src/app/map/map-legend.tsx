'use client';

import { colorByTrackingStatus } from '@arbolapp/core';
import { texts } from '@/constants/texts';
import type { TrackingStatus } from '@/features/public-map';

/**
 * Legend showing the five tree states and their colors.
 *
 * Five distinct colors, never collapsed: the map legend is unreadable
 * if two states share a colour.
 */
export function MapLegend() {
  const states: TrackingStatus[] = ['up_to_date', 'due_soon', 'overdue', 'dead', 'archived'];

  return (
    <section
      aria-label={texts.publicMap.legend}
      className="shadow-card max-w-xs rounded-lg border border-border-subtle bg-surface-overlay p-4"
    >
      <h3 className="mb-3 font-subheading text-sm font-semibold text-text-primary">
        {texts.publicMap.legendTitle}
      </h3>

      <ul className="space-y-2">
        {states.map((status) => (
          <li key={status} className="flex items-center gap-3">
            {/* The dot decorates; the word beside it is what states the state. */}
            <span
              className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-surface-overlay"
              style={{ backgroundColor: colorByTrackingStatus[status] }}
              aria-hidden="true"
            />

            <span className="text-sm text-text-secondary">{texts.publicMap.states[status]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
