'use client';

import { useState } from 'react';
import { texts } from '@/constants/texts';
import type { TreeFilters } from '@/features/public-map';

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

  const hasFilters = (currentFilters.species?.length ?? 0) > 0 || (currentFilters.zones?.length ?? 0) > 0;

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Filter toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          hasFilters
            ? 'bg-primary text-white hover:bg-primary-dark'
            : 'bg-white text-textPrimary border border-borderSubtle hover:border-borderStrong'
        }`}
        aria-label={texts.publicMap.filterSpecies}
        aria-pressed={isOpen}
      >
        {hasFilters ? 'Filtros activos' : 'Filtros'}
      </button>

      {/* Filter panel */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-md p-4 max-w-sm w-screen md:w-xs">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-textPrimary mb-2">
                {texts.publicMap.filterSpecies}
              </h3>
              <p className="text-xs text-textSecondary">
                Las especies se cargarán desde la base de datos.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-textPrimary mb-2">
                {texts.publicMap.filterZone}
              </h3>
              <p className="text-xs text-textSecondary">
                Las zonas se cargarán desde la base de datos.
              </p>
            </div>

            {/* Clear filters button */}
            {hasFilters && (
              <button
                onClick={handleClearFilters}
                className="w-full px-3 py-2 text-sm text-primary hover:bg-primary-soft rounded border border-primary"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
