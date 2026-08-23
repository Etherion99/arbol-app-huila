'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import type { TreeFilters } from '@/features/public-map';

/** Ties the toggle to the panel it opens, for a reader that cannot see them adjacent. */
const PANEL_ID = 'map-filters-panel';

interface MapFiltersProps {
  currentFilters: TreeFilters;
  onFiltersChange: (filters: TreeFilters) => void;
}

/**
 * Filter controls for species and zones.
 *
 * Currently a stub that allows opening a filter UI. The actual species and zones
 * lists would be fetched from the database and rendered as checkboxes or
 * multiselect dropdowns. This structure is ready for expansion.
 */
export function MapFilters({ currentFilters, onFiltersChange }: MapFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasFilters =
    (currentFilters.species?.length ?? 0) > 0 || (currentFilters.zones?.length ?? 0) > 0;

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Filter toggle button. No `aria-label`: the visible words are the name,
          and overriding them with "Filtrar por especie" would leave a voice
          user asking for a control nobody can see. */}
      <Button
        variant={hasFilters ? 'primary' : 'secondary'}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={PANEL_ID}
      >
        {hasFilters ? texts.publicMap.filtersActive : texts.publicMap.filters}
      </Button>

      {/* Filter panel */}
      {isOpen && (
        <div
          id={PANEL_ID}
          className="shadow-card w-screen max-w-sm rounded-lg border border-border-subtle bg-surface-overlay p-4 md:w-xs"
        >
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-subheading text-sm font-semibold text-text-primary">
                {texts.publicMap.filterSpecies}
              </h3>
              <p className="text-xs text-text-secondary">{texts.publicMap.filterSpeciesPending}</p>
            </div>

            <div>
              <h3 className="mb-2 font-subheading text-sm font-semibold text-text-primary">
                {texts.publicMap.filterZone}
              </h3>
              <p className="text-xs text-text-secondary">{texts.publicMap.filterZonePending}</p>
            </div>

            {/* Clear filters button */}
            {hasFilters && (
              <Button variant="secondary" block onClick={handleClearFilters}>
                {texts.publicMap.clearFilters}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
