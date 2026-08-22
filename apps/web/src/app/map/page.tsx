'use client';

import { useState, useCallback, useMemo } from 'react';

import { PublicMap, TreeFilters, ViewportBounds } from '@/features/public-map';
import { useTreesInViewport } from '@/lib/queries/use-trees-in-viewport';
import { useTreeCard } from '@/lib/queries/use-tree-card';
import { texts } from '@/constants/texts';
import { TreeCardModal } from './tree-card-modal';
import { MapLegend } from './map-legend';
import { MapFilters } from './map-filters';

/**
 * E1: Public map with tree card
 *
 * A full-screen map showing tree locations and status, visible without
 * authentication. Clicking a marker shows the tree's details in a modal.
 *
 * The map queries trees_in_viewport() on every pan/zoom, and tree_card()
 * only when a marker is tapped, so panning never pays for photographs or
 * guardian details nobody looked at.
 */
export default function PublicMapPage() {
  const [viewport, setViewport] = useState<ViewportBounds | null>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TreeFilters>({});
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch trees for current viewport
  const treesQuery = useTreesInViewport({
    viewport,
    filters,
  });

  // Fetch tree card details when a tree is selected
  const treeCardQuery = useTreeCard(selectedTreeId);

  // Handle viewport changes from the map
  const handleViewportChange = useCallback((newViewport: ViewportBounds) => {
    setViewport(newViewport);
  }, []);

  // Handle marker clicks
  const handleMarkerClick = useCallback((treeId: string) => {
    setSelectedTreeId(treeId);
  }, []);

  // Retry query on error
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    treesQuery.refetch().finally(() => {
      setIsRetrying(false);
    });
  }, [treesQuery]);

  // Close tree card modal
  const handleCloseCard = useCallback(() => {
    setSelectedTreeId(null);
  }, []);

  // Update filters
  const handleFiltersChange = useCallback((newFilters: TreeFilters) => {
    setFilters(newFilters);
  }, []);

  // Memoize error message
  const errorMessage = useMemo(() => {
    if (treesQuery.isError) {
      const error = treesQuery.error;
      if (error instanceof Error) {
        return error.message;
      }
      return texts.states.loadFailedBody;
    }
    return null;
  }, [treesQuery.isError, treesQuery.error]);

  return (
    <div className="flex h-screen bg-surfacePage">
      {/* Map area */}
      <div className="flex-1 relative">
        <PublicMap
          initialZoom={10}
          filters={filters}
          onViewportChange={handleViewportChange}
          onMarkerClick={handleMarkerClick}
          trees={treesQuery.data}
          isLoading={treesQuery.isLoading || isRetrying}
          error={errorMessage}
          selectedTreeId={selectedTreeId}
          onRetry={handleRetry}
        />

        {/* Legend overlay */}
        <div className="absolute bottom-6 left-6 z-10">
          <MapLegend />
        </div>

        {/* Filters overlay */}
        <div className="absolute top-6 right-6 z-10">
          <MapFilters onFiltersChange={handleFiltersChange} currentFilters={filters} />
        </div>
      </div>

      {/* Tree card modal */}
      {selectedTreeId && (
        <TreeCardModal
          treeId={selectedTreeId}
          isLoading={treeCardQuery.isLoading}
          treeCard={treeCardQuery.data || null}
          error={
            treeCardQuery.isError
              ? treeCardQuery.error instanceof Error
                ? treeCardQuery.error.message
                : texts.states.loadFailedBody
              : null
          }
          onClose={handleCloseCard}
          onRetry={() => treeCardQuery.refetch()}
        />
      )}
    </div>
  );
}
