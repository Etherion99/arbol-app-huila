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
    <div className="bg-white rounded-lg shadow-md p-4 max-w-xs">
      <h3 className="text-sm font-semibold text-textPrimary mb-3">{texts.publicMap.legendTitle}</h3>

      <div className="space-y-2">
        {states.map((status) => (
          <div key={status} className="flex items-center gap-3">
            {/* Color dot */}
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white"
              style={{ backgroundColor: colorByTrackingStatus[status] }}
              aria-hidden="true"
            />

            {/* Status label */}
            <span className="text-sm text-textSecondary">{texts.publicMap.states[status]}</span>
          </div>
        ))}
      </div>

      {/* Accessibility label */}
      <span className="sr-only">{texts.publicMap.legend}</span>
    </div>
  );
}
