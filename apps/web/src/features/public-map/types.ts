/**
 * Public map component types and interfaces.
 *
 * E1 and E3 share a single map component through this contract.
 * E1 (public map with tree card) uses it with the full layout.
 * E3 (embeddable variant) uses it inside an iframe without the app wrapper.
 */

/**
 * Tree tracking status colors (5 distinct colors, not 4).
 * - up_to_date: #008D46 (Verde Huilense)
 * - due_soon: #FFD700 (Amarillo)
 * - overdue: #F26522 (Naranja Plateño)
 * - dead: #E31B23 (Rojo)
 * - archived: #757575 (Gris)
 *
 * These are the values returned by the public.tree_tracking view,
 * not the tree.status field (which distinguishes alive vs at_risk vs dead vs replanted).
 */
export type TrackingStatus = 'up_to_date' | 'due_soon' | 'overdue' | 'dead' | 'archived';

/**
 * Minimal tree marker for map display.
 * Retrieved from trees_in_viewport() SQL function.
 */
export interface TreeMarker {
  id: string;
  lat: number;
  lng: number;
  status: TrackingStatus;
  species: string;
}

/**
 * Complete tree card data.
 * Retrieved from tree_card() SQL function on user tap/click.
 *
 * Note: photoUrl and thumbnailUrl are signed URLs ready to use.
 * They are generated server-side so the client never needs to sign URLs.
 * This simplifies the frontend and is appropriate for a public anonymous screen.
 */
export interface TreeCard {
  id: string;
  code: string;
  speciesId: string;
  species: string;
  speciesOriginal: string; // Guardian's original handwritten text, never modified
  trackingStatus: TrackingStatus; // How close to the next due date
  status: string; // Tree life cycle status (alive, at_risk, dead, replanted)
  plantedAt: string; // ISO date
  lastUpdatedAt: string; // ISO date, capture time of the newest log entry
  nextReminderAt: string; // ISO date
  location: {
    lat: number;
    lng: number;
    vereda: string | null;
    municipality: string | null;
  };
  cycle: number | null; // Latest cycle number, or null if no entries yet
  guardianId: string | null; // Null if unassigned
  guardianName: string | null; // short_display_name() from public_users, e.g. "Andrés C.", null if no guardian
  photoUrl: string | null; // Signed URL ready to embed in <img>, or null if no photo
  thumbnailUrl: string | null; // Signed URL of the 300px thumbnail
}

/**
 * Viewport bounds in geographic coordinates.
 */
export interface ViewportBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  zoom: number;
}

/**
 * Filter criteria for tree queries.
 */
export interface TreeFilters {
  species?: string[] | null;
  zones?: string[] | null;
}

/**
 * Public map component props.
 *
 * The map queries trees_in_viewport() whenever the viewport changes,
 * and calls tree_card() only when the user taps a marker.
 *
 * Embed mode (E3) disables certain UI elements (e.g., app chrome).
 */
export interface PublicMapProps {
  /**
   * Initial map center and zoom level.
   * If not provided, defaults to center of PRAE Huila region.
   */
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;

  /**
   * Applied to trees_in_viewport() on every viewport change.
   */
  filters?: TreeFilters;

  /**
   * Called whenever the viewport changes (pan, zoom).
   * E1 uses this to update URL params or analytics.
   * E3 can ignore it.
   */
  onViewportChange?: (viewport: ViewportBounds) => void;

  /**
   * Called when the user taps a marker.
   * The caller is responsible for fetching tree_card() and showing the detail.
   * Not passed as a prop because it's best to keep data fetching separate.
   */
  onMarkerClick?: (treeId: string) => void;

  /**
   * True for E3 (embeddable in iframe).
   * When true:
   * - Hides app chrome, breadcrumbs, sign-in prompts
   * - Uses default viewport always (ignore URL params)
   * - Marker clustering is always enabled
   */
  embedMode?: boolean;

  /**
   * Current tree markers (from trees_in_viewport query).
   * If null, the map is loading.
   * If empty array, no trees match the current filters and viewport.
   */
  trees?: TreeMarker[] | null;

  /**
   * True while trees_in_viewport is in flight.
   */
  isLoading?: boolean;

  /**
   * Query error message, shown to the user with a retry button.
   */
  error?: string | null;

  /**
   * Optional tree to highlight or bring into view.
   * E1 uses this when the user searched for a specific tree.
   */
  selectedTreeId?: string | null;

  /**
   * Callback to retry the last failed query.
   */
  onRetry?: () => void;
}
