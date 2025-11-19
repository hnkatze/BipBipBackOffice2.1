// Map component (Mapbox)
export { MapComponent } from './map/map.component';
export type {
  Coordinates,
  RouteConfig,
  MapRadius,
  MapMarker,
} from './map/map.types';

// Google Map component
export { GoogleMapComponent } from './google-map/google-map.component';
// Google Map uses the same types from map.types.ts for compatibility

// Google Map Zone Editor component
export { GoogleMapZoneEditorComponent } from './google-map-zone-editor/google-map-zone-editor.component';
export type { ZoneEditorData } from './google-map-zone-editor/google-map-zone-editor.component';

// Google Map Zones Viewer component
export { GoogleMapZonesViewerComponent } from './google-map-zones-viewer/google-map-zones-viewer.component';
export type { MapZone, RestaurantMapMarker } from './google-map-zones-viewer/google-map-zones-viewer.component';

// Google Map Polygon Editor component
export { GoogleMapPolygonEditorComponent } from './google-map-polygon-editor/google-map-polygon-editor.component';
export type { PolygonCoordinate, PolygonData } from './google-map-polygon-editor/google-map-polygon-editor.component';
