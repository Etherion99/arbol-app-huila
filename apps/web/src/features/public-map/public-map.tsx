'use client';

import { useEffect, useRef } from 'react';
import { colors } from '@arbolapp/core';
import { lightMapStyle } from '@/lib/map-style';
import { TreeMarker, PublicMapProps } from './types';
import styles from './public-map.module.css';

const DEFAULT_CENTER = { lat: 2.0, lng: -76.0 };
const DEFAULT_ZOOM = 10;

const STATUS_COLORS: Record<TreeMarker['status'], string> = {
  updated: colors.stateOk,
  due_soon: colors.stateDue,
  overdue: colors.stateOverdue,
  dead: colors.stateDead,
  archived: colors.stateArchived,
};

/**
 * Public map component shared between E1 (full screen) and E3 (iframe embed).
 *
 * When `embedMode` is true:
 * - No app chrome, breadcrumbs, or sign-in prompts
 * - Uses default viewport (ignores URL params)
 * - Marker clustering always enabled
 * - Degrades gracefully without Google Maps API key
 */
export function PublicMap({
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  onViewportChange,
  onMarkerClick,
  embedMode = false,
  trees,
  isLoading,
  error,
  onRetry,
}: PublicMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Load Google Maps API dynamically
  useEffect(() => {
    if (!apiKey || scriptRef.current) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Map will be created in next effect
    };
    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [apiKey]);

  // Create map when API is loaded
  useEffect(() => {
    if (!mapContainerRef.current || !window.google) return;

    if (!mapRef.current) {
      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        zoom: initialZoom,
        center: initialCenter,
        styles: lightMapStyle as google.maps.MapTypeStyle[],
        disableDefaultUI: true,
        zoomControl: !embedMode,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: !embedMode,
        keyboardShortcuts: false,
      });

      if (onViewportChange && mapRef.current) {
        mapRef.current.addListener('bounds_changed', () => {
          if (!mapRef.current) return;
          const bounds = mapRef.current.getBounds();
          if (bounds) {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            onViewportChange({
              maxLat: ne.lat(),
              minLat: sw.lat(),
              minLng: sw.lng(),
              maxLng: ne.lng(),
              zoom: mapRef.current.getZoom() || initialZoom,
            });
          }
        });
      }
    }
  }, [embedMode, initialCenter, initialZoom, onViewportChange]);

  // Update markers when trees change
  useEffect(() => {
    if (!mapRef.current || !window.google || !trees) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    trees.forEach((tree) => {
      const marker = new google.maps.Marker({
        position: { lat: tree.lat, lng: tree.lng },
        map: mapRef.current,
        title: tree.species,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: STATUS_COLORS[tree.status],
          fillOpacity: 1,
          strokeColor: colors.surfaceRaised,
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(tree.id);
        }
      });

      markersRef.current.set(tree.id, marker);
    });
  }, [trees, onMarkerClick]);

  // Show degraded state if no API key
  if (!apiKey) {
    return (
      <div className={styles.container}>
        <div className={styles.degradedState}>
          <h2 className={styles.degradedTitle}>Mapa no disponible</h2>
          <p className={styles.degradedBody}>
            El mapa público está configurándose. Puedes ver los árboles en la lista a continuación.
          </p>
          {error && (
            <div className={styles.errorMessage}>
              <p>{error}</p>
              {onRetry && (
                <button className={styles.retryButton} onClick={onRetry}>
                  Reintentar
                </button>
              )}
            </div>
          )}
          {!embedMode && trees && trees.length > 0 && (
            <div className={styles.treesList}>
              <h3>Árboles registrados</h3>
              <ul>
                {trees.map((tree) => (
                  <li
                    key={tree.id}
                    onClick={() => {
                      if (onMarkerClick) onMarkerClick(tree.id);
                    }}
                  >
                    <span className={styles.speciesLabel}>{tree.species}</span>
                    <span className={styles.coordinatesLabel}>
                      {tree.lat.toFixed(4)}, {tree.lng.toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!window.google) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <p>Cargando mapa…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div ref={mapContainerRef} className={styles.mapContainer} />

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <p>Actualizando árboles…</p>
        </div>
      )}

      {error && !isLoading && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorMessage}>
            <p>{error}</p>
            {onRetry && (
              <button className={styles.retryButton} onClick={onRetry}>
                Reintentar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
