/**
 * Coordinates interface for latitude and longitude
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Route configuration for drawing a path between two points
 */
export interface RouteConfig {
  /** Starting point coordinates */
  sender: Coordinates;
  /** Destination point coordinates */
  receptor: Coordinates;
  /** Icon URLs for [sender marker, receptor marker] */
  iconUrls: string[];
}

/**
 * Configuration for drawing a radius circle on the map
 */
export interface MapRadius {
  /** Center point latitude */
  lat: number;
  /** Center point longitude */
  lng: number;
  /** Radius in meters */
  radius: number;
  /** Title/label for the radius circle */
  title: string;
}

/**
 * Map marker configuration
 */
export interface MapMarker {
  /** Marker latitude */
  lat: number;
  /** Marker longitude */
  lng: number;
  /** Icon URL or identifier */
  icon: string;
  /** Optional popup info in format: "Header|Subheader/Code" */
  info?: string;
}

/**
 * Simplified suggestion result for autocomplete
 */
export interface SuggestionResult {
  id: string;
  name: string;
  address: string;
  full_address: string;
  place_formatted: string;
}

/**
 * Mapbox Search API suggestions response
 */
export interface SuggestionsResponse {
  suggestions: Suggestion[];
  attribution: string;
  response_id: string;
}

/**
 * Individual suggestion from Mapbox Search API
 */
export interface Suggestion {
  name: string;
  mapbox_id: string;
  feature_type: string;
  address: string;
  full_address: string;
  place_formatted: string;
  context: SuggestionContext;
  language: string;
  maki: string;
  poi_category: string[];
  poi_category_ids: string[];
  external_ids: ExternalIds;
  metadata: Record<string, unknown>;
  distance: number;
}

/**
 * Context information for a suggestion
 */
export interface SuggestionContext {
  country: Country;
  postcode: NamedPlace;
  place: NamedPlace;
  address?: Address;
  street?: Street;
  neighborhood?: NamedPlace;
}

/**
 * Address information
 */
export interface Address {
  name: string;
  address_number: string;
  street_name: string;
}

/**
 * Country information
 */
export interface Country {
  name: string;
  country_code: string;
  country_code_alpha_3: string;
}

/**
 * Generic named place (neighborhood, postcode, place)
 */
export interface NamedPlace {
  id: string;
  name: string;
}

/**
 * Street information
 */
export interface Street {
  name: string;
}

/**
 * External IDs for a suggestion
 */
export interface ExternalIds {
  dataplor?: string;
}
