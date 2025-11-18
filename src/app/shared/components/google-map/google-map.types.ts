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
