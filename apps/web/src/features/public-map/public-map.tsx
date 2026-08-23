'use client';

import { GoogleMap, OverlayView, useJsApiLoader } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { colorByTrackingStatus } from '@arbolapp/core';
import { lightMapStyle } from '@/features/map/map-style';
import type { PublicMapProps, TrackingStatus, ViewportBounds } from './types';

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
  filters,
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
      if (!markersRef.current.has(tree.id)) {
        const marker = new google.maps.Marker({
          position: { lat: tree.lat, lng: tree.lng },
          map: mapRef.current,
          title: tree.species,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: colorByTrackingStatus[tree.status] || colorByTrackingStatus.up_to_date,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        (marker as MapMarker).treeId = tree.id;
        marker.addListener('click', () => {
          onMarkerClick?.(tree.id);
        });

        markersRef.current.set(tree.id, marker);
      } else {
        // Update marker color if status changed
        const marker = markersRef.current.get(tree.id)!;
        marker.setIcon({
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: colorByTrackingStatus[tree.status] || colorByTrackingStatus.up_to_date,
          fillOpacity: 1,
          strokeColor: '#ffffff',
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
        className="flex flex-col items-center justify-center w-full h-full bg-surfacePage p-6 gap-4"
        role="region"
        aria-label="Mapa no disponible"
      >
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold text-textPrimary">
            Clave de Google Maps no configurada
          </h2>
          <p className="text-sm text-textSecondary">
            El mapa público no se puede mostrar sin una clave válida. Los filtros y la información
            del árbol están listos para usarse.
          </p>
        </div>
      </div>
    );
  }

  // Google Maps library failed to load
  if (loadError) {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full bg-surfacePage p-6 gap-4"
        role="region"
        aria-label="Error al cargar el mapa"
      >
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-bold text-textPrimary">No se pudo cargar el mapa</h2>
          <p className="text-sm text-textSecondary">Revisa tu conexión e inténtalo de nuevo.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-6 py-2 bg-primary text-white rounded font-medium hover:bg-primary-dark"
              aria-label="Reintentar cargar el mapa"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Google Maps library loading
  if (!isLoaded) {
    return (
      <div
        className="flex flex-col items-center justify-center w-full h-full bg-surfacePage"
        role="status"
        aria-label="Cargando mapa"
      >
        <p className="text-textSecondary">Cargando mapa…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Error banner */}
      {error && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-50 border-b border-red-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-red-900">No se pudo cargar los árboles</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-sm font-medium text-red-700 hover:text-red-800 border border-red-200 rounded hover:bg-red-100"
                aria-label="Reintentar"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-4 z-10 bg-white rounded shadow-sm px-4 py-2">
          <p className="text-sm text-textSecondary">Cargando árboles…</p>
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
            <div className="bg-white rounded shadow-lg p-6 max-w-xs text-center -ml-32">
              <p className="text-sm text-textSecondary">No hay árboles en esta zona</p>
            </div>
          </OverlayView>
        )}
      </GoogleMap>
    </div>
  );
}
