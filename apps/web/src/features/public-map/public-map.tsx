'use client';

import { GoogleMap, OverlayView, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useRef } from 'react';

import { colorByTrackingStatus, colors } from '@arbolapp/core';
import { Button } from '@/components/ui/button';
import { texts } from '@/constants/texts';
import { lightMapStyle } from '@/features/map/map-style';
import type { PublicMapProps, ViewportBounds } from './types';

// Default center: La Plata, Huila, Colombia
const DEFAULT_CENTER = { lat: 2.4048, lng: -75.5015 };
const DEFAULT_ZOOM = 10;

interface MapMarker extends google.maps.Marker {
  treeId?: string;
}

/**
 * Public map component showing tree locations and status.
 *
 * Two screens share this component through a fixed contract:
 * - E1 (/map): Full layout with navigation, legend, filters
 * - E3 (/map/embed): Embeddable variant inside an iframe without chrome
 *
 * The map queries trees_in_viewport() on every pan/zoom, and tree_card()
 * only when a marker is tapped, so panning never pays for photographs or
 * guardian details nobody looked at.
 *
 * Without a Google Maps API key, the component explains what happened instead
 * of crashing.
 */
export function PublicMap({
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  onViewportChange,
  onMarkerClick,
  embedMode = false,
  trees = null,
  isLoading = false,
  error = null,
  selectedTreeId = null,
  onRetry,
}: PublicMapProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, MapMarker>>(new Map());

  /**
   * The marker listener is attached once per marker and lives as long as the
   * marker does, so it cannot close over the callback of the render that
   * created it -- E3 passes a plain function and its identity changes every
   * render, which would either strand the listener on a stale handler or, if
   * the callback went into the effect's dependencies, rebuild every marker on
   * every render. The ref is written on each render and read at click time.
   */
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  // Viewport management
  const handleBoundsChanged = useCallback(() => {
    if (!mapRef.current) return;

    const bounds = mapRef.current.getBounds();
    const zoom = mapRef.current.getZoom();

    if (!bounds || zoom === undefined) return;

    const viewport: ViewportBounds = {
      minLat: bounds.getSouthWest().lat(),
      maxLat: bounds.getNorthEast().lat(),
      minLng: bounds.getSouthWest().lng(),
      maxLng: bounds.getNorthEast().lng(),
      zoom,
    };

    onViewportChange?.(viewport);
  }, [onViewportChange]);

  // Render markers
  useEffect(() => {
    if (!mapRef.current || !trees) return;

    // Remove markers that are no longer in the data
    const currentIds = new Set(trees.map((t) => t.id));
    for (const [id, marker] of markersRef.current) {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }

    // Add or update markers
    for (const tree of trees) {
      // The state travels in the marker's own name. The fill alone cannot carry
      // it: `due_soon` is `#FFD700` and `up_to_date` is `#008D46`, and a reader
      // who does not separate those two has no other place to read the state.
      const label = texts.publicMap.markerLabel(
        tree.species,
        texts.publicMap.states[tree.status] ?? texts.publicMap.states.up_to_date,
      );

      if (!markersRef.current.has(tree.id)) {
        const marker = new google.maps.Marker({
          position: { lat: tree.lat, lng: tree.lng },
          map: mapRef.current,
          title: label,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: colorByTrackingStatus[tree.status] || colorByTrackingStatus.up_to_date,
            fillOpacity: 1,
            strokeColor: colors.onAccent,
            strokeWeight: 2,
          },
        });

        (marker as MapMarker).treeId = tree.id;
        marker.addListener('click', () => {
          onMarkerClickRef.current?.(tree.id);
        });

        markersRef.current.set(tree.id, marker);
      } else {
        // Update marker colour and name if the status changed
        const marker = markersRef.current.get(tree.id)!;
        marker.setTitle(label);
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: colorByTrackingStatus[tree.status] || colorByTrackingStatus.up_to_date,
          fillOpacity: 1,
          strokeColor: colors.onAccent,
          strokeWeight: 2,
        });
      }
    }
  }, [trees]);

  // Highlight selected tree
  useEffect(() => {
    if (!selectedTreeId || !mapRef.current) return;

    const marker = markersRef.current.get(selectedTreeId);
    if (!marker) return;

    // Pan to marker
    mapRef.current.panTo(marker.getPosition()!);

    // Zoom in if needed
    if (mapRef.current.getZoom()! < 15) {
      mapRef.current.setZoom(15);
    }
  }, [selectedTreeId]);

  // Map is not configured
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-page p-6"
        role="region"
        aria-label={texts.publicMap.regionUnavailable}
      >
        <div className="max-w-md space-y-4 text-center">
          <h2 className="font-heading text-xl font-bold text-text-primary">
            {texts.publicMap.mapKeyMissing}
          </h2>
          <p className="text-sm text-text-secondary">{texts.publicMap.mapKeyMissingDetail}</p>
        </div>
      </div>
    );
  }

  // Google Maps library failed to load
  if (loadError) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 bg-surface-page p-6"
        role="alert"
        aria-label={texts.publicMap.regionError}
      >
        <div className="max-w-md space-y-4 text-center">
          <h2 className="font-heading text-xl font-bold text-text-primary">
            {texts.publicMap.mapError}
          </h2>
          <p className="text-sm text-text-secondary">{texts.publicMap.mapErrorDetail}</p>
          {onRetry && (
            <Button className="mt-4" onClick={onRetry} aria-label={texts.publicMap.retryMap}>
              {texts.publicMap.retry}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Google Maps library loading
  if (!isLoaded) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center bg-surface-page"
        role="status"
        aria-label={texts.publicMap.regionLoading}
      >
        <p className="text-text-secondary">{texts.publicMap.loadingMap}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Error banner. The tone is carried by the fill and the border; the words
          stay in `text-primary`, which is the rule every soft fill in this
          palette obeys -- none of them can legibly carry its own colour. */}
      {error && (
        <div
          role="alert"
          className="absolute top-0 right-0 left-0 z-10 border-b border-danger bg-danger-soft p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-text-primary">{texts.publicMap.treesError}</p>
              <p className="mt-1 text-sm text-text-secondary">{error}</p>
            </div>
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                {texts.publicMap.retry}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div
          role="status"
          className="absolute top-4 left-4 z-10 rounded bg-surface-overlay px-4 py-2 shadow-card"
        >
          <p className="text-sm text-text-secondary">{texts.publicMap.loading}</p>
        </div>
      )}

      <GoogleMap
        ref={mapRef}
        center={initialCenter}
        zoom={initialZoom}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        options={{
          disableDefaultUI: embedMode,
          styles: lightMapStyle as google.maps.MapTypeStyle[],
          mapTypeControl: !embedMode,
          fullscreenControl: !embedMode,
          zoomControl: !embedMode,
          streetViewControl: false,
          rotateControl: false,
          scaleControl: true,
        }}
        onBoundsChanged={handleBoundsChanged}
      >
        {/* Empty state message centered on the map */}
        {!isLoading && !error && (!trees || trees.length === 0) && (
          <OverlayView position={initialCenter} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
            <div className="shadow-overlay -ml-32 max-w-xs rounded bg-surface-overlay p-6 text-center">
              <p className="text-sm text-text-secondary">{texts.publicMap.emptyMap}</p>
            </div>
          </OverlayView>
        )}
      </GoogleMap>
    </div>
  );
}
