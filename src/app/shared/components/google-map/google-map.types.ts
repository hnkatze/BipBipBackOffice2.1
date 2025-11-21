/**
 * Types specific to Google Map component
 *
 * Note: Common types (Coordinates, RouteConfig, MapRadius, MapMarker)
 * are imported from ../map/map.types.ts for API compatibility
 */

/**
 * Google Places Autocomplete Prediction
 */
export interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

/**
 * Map marker for multiple markers display
 */
export interface GoogleMapMarker {
  /** Unique identifier for the marker */
  id: string;
  /** Marker latitude */
  lat: number;
  /** Marker longitude */
  lng: number;
  /** Icon URL for the marker */
  icon: string;
  /** Optional title/label for the marker */
  title?: string;
  /** Optional info for tooltip */
  info?: string;
  /** Optional badge value (e.g., orders per hour) */
  badgeValue?: number;
}

/**
 * Map center configuration for programmatic pan/zoom
 */
export interface MapCenter {
  /** Latitude */
  lat: number;
  /** Longitude */
  lng: number;
  /** Optional zoom level (default: keeps current zoom) */
  zoom?: number;
}

/**
 * Polyline route configuration
 */
export interface MapRoute {
  /** Origin coordinates */
  origin: { lat: number; lng: number };
  /** Destination coordinates */
  destination: { lat: number; lng: number };
  /** Polyline stroke color (default: #e74c3c) */
  strokeColor?: string;
  /** Polyline stroke weight (default: 4) */
  strokeWeight?: number;
  /** Polyline stroke opacity (default: 0.8) */
  strokeOpacity?: number;
}
