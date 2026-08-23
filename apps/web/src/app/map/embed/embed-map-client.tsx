'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import { PublicMap, ViewportBounds, TreeMarker } from '@/features/public-map';
import { TreeDetailModal } from './tree-detail-modal';
import styles from './embed-map.module.css';

const DEFAULT_CENTER = { lat: 2.0, lng: -76.0 };
const DEFAULT_ZOOM = 10;

/**
 * Client component for the embeddable map.
 * Handles viewport changes, fetches trees, and displays the tree detail modal.
 */
export function EmbedMapClient() {
  const [viewport, setViewport] = useState<ViewportBounds>({
    minLat: DEFAULT_CENTER.lat - 1,
    maxLat: DEFAULT_CENTER.lat + 1,
    minLng: DEFAULT_CENTER.lng - 1,
    maxLng: DEFAULT_CENTER.lng + 1,
    zoom: DEFAULT_ZOOM,
  });

  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  );

  const {
    data: trees,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trees_in_viewport', viewport],
    queryFn: async () => {
      try {
        const { data, error: err } = await supabase.rpc('trees_in_viewport', {
          min_lng: viewport.minLng,
          min_lat: viewport.minLat,
          max_lng: viewport.maxLng,
          max_lat: viewport.maxLat,
          zoom: viewport.zoom,
          species_filter: null,
          zone_filter: null,
        });

        if (err) throw new Error(err.message);
        return data as TreeMarker[] | null;
      } catch (err) {
        console.error('Failed to fetch trees:', err);
        throw err;
      }
    },
    staleTime: 30 * 1000,
    retry: 1,
  });

  const { data: selectedTree, isLoading: treeDetailLoading } = useQuery({
    queryKey: ['tree_card', selectedTreeId],
    queryFn: async () => {
      if (!selectedTreeId) return null;

      try {
        const { data, error: err } = await supabase.rpc('tree_card', {
          tree_id: selectedTreeId,
        });

        if (err) throw new Error(err.message);
        return data;
      } catch (err) {
        console.error('Failed to fetch tree detail:', err);
        return null;
      }
    },
    enabled: !!selectedTreeId,
  });

  const handleViewportChange = (newViewport: ViewportBounds) => {
    setViewport(newViewport);
  };

  const handleMarkerClick = (treeId: string) => {
    setSelectedTreeId(treeId);
  };

  const handleCloseModal = () => {
    setSelectedTreeId(null);
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <div className={styles.embed}>
      <PublicMap
        embedMode={true}
        initialCenter={DEFAULT_CENTER}
        initialZoom={DEFAULT_ZOOM}
        trees={trees}
        isLoading={isLoading}
        error={error ? (error instanceof Error ? error.message : 'Error desconocido') : null}
        onViewportChange={handleViewportChange}
        onMarkerClick={handleMarkerClick}
        onRetry={handleRetry}
      />

      {selectedTreeId && (
        <TreeDetailModal
          tree={selectedTree}
          isLoading={treeDetailLoading}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
