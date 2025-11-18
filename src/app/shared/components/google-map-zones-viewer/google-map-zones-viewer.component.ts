import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  input,
  output,
  signal,
  effect,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';

/**
 * Interface for coverage zones to display
 */
export interface MapZone {
  id: number;
  name: string;
  lat: number;
  lon: number;
  radius: number; // in meters
  color?: string;
}

/**
 * Interface for restaurant marker
 */
export interface RestaurantMapMarker {
  lat: number;
  lon: number;
  title: string;
  icon?: string;
}

/**
 * GoogleMapZonesViewerComponent
 *
 * Visualiza múltiples zonas de cobertura en Google Maps (solo lectura)
 *
 * Features:
 * - Muestra múltiples círculos de cobertura
 * - Marcador del restaurante
 * - Click en zona para seleccionar/editar
 * - Colores personalizables por zona
 * - NO permite edición (solo visualización)
 */
@Component({
  selector: 'app-google-map-zones-viewer',
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './google-map-zones-viewer.component.html',
  styleUrl: './google-map-zones-viewer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleMapZonesViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild(GoogleMap) googleMap!: GoogleMap;

  // Inputs
  readonly zones = input<MapZone[]>([]);
  readonly restaurantMarker = input<RestaurantMapMarker | null>(null);
  readonly centerCoords = input<{ lat: number; lon: number }>({ lat: 14.065070, lon: -87.192136 });
  readonly initialZoom = input<number>(13);

  // Outputs
  readonly onZoneClick = output<number>(); // Emits zone ID

  // State
  readonly isLoading = signal<boolean>(true);

  // Map options
  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'BIPBIP_MAP',
    zoom: 13,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    disableDefaultUI: false,
  };

  // Circle options generator
  getCircleOptions(zone: MapZone): google.maps.CircleOptions {
    const color = zone.color || '#fb0021';
    return {
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.2,
      draggable: false,
      editable: false,
      clickable: true,
    };
  }

  // Restaurant marker
  private restaurantMarkerElement?: google.maps.marker.AdvancedMarkerElement;

  // Circle instances with click listeners
  private circles: Map<number, google.maps.Circle> = new Map();

  constructor() {
    // Effect: Update map when zones change
    effect(() => {
      const zones = this.zones();
      if (this.googleMap?.googleMap) {
        this.updateCircleClickListeners();
      }
    });

    // Effect: Update restaurant marker when it changes
    effect(() => {
      const marker = this.restaurantMarker();
      if (marker && this.googleMap?.googleMap) {
        this.updateRestaurantMarker(marker);
      }
    });

    // Effect: Update center when coords change
    effect(() => {
      const coords = this.centerCoords();
      if (this.googleMap?.googleMap) {
        this.googleMap.googleMap.setCenter({ lat: coords.lat, lng: coords.lon });
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  /**
   * Initialize map
   */
  private initializeMap(): void {
    if (!this.googleMap?.googleMap) {
      this.isLoading.set(false);
      return;
    }

    const coords = this.centerCoords();
    const zoom = this.initialZoom();

    this.googleMap.googleMap.setCenter({ lat: coords.lat, lng: coords.lon });
    this.googleMap.googleMap.setZoom(zoom);

    // Add restaurant marker if provided
    const marker = this.restaurantMarker();
    if (marker) {
      this.createRestaurantMarker(marker);
    }

    // Setup click listeners for circles
    setTimeout(() => {
      this.updateCircleClickListeners();
    }, 200);

    this.isLoading.set(false);
  }

  /**
   * Create restaurant marker
   */
  private createRestaurantMarker(marker: RestaurantMapMarker): void {
    if (!this.googleMap?.googleMap) return;

    const markerElement = document.createElement('div');
    markerElement.style.width = '40px';
    markerElement.style.height = '40px';
    markerElement.style.borderRadius = '50%';
    markerElement.style.backgroundColor = '#fb0021';
    markerElement.style.border = '3px solid white';
    markerElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    markerElement.style.display = 'flex';
    markerElement.style.alignItems = 'center';
    markerElement.style.justifyContent = 'center';
    markerElement.style.color = 'white';
    markerElement.style.fontWeight = 'bold';
    markerElement.innerHTML = 'R';

    this.restaurantMarkerElement = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: marker.lat, lng: marker.lon },
      map: this.googleMap.googleMap,
      content: markerElement,
      title: marker.title
    });
  }

  /**
   * Update restaurant marker position
   */
  private updateRestaurantMarker(marker: RestaurantMapMarker): void {
    if (this.restaurantMarkerElement) {
      this.restaurantMarkerElement.position = { lat: marker.lat, lng: marker.lon };
    } else {
      this.createRestaurantMarker(marker);
    }
  }

  /**
   * Update circle click listeners
   * This is called after Angular renders the circles
   */
  private updateCircleClickListeners(): void {
    if (!this.googleMap?.googleMap) return;

    // Clear existing listeners
    this.clearCircleListeners();

    // Get all circle elements from the DOM
    const mapElement = this.googleMap.googleMap.getDiv();
    const circleElements = mapElement.querySelectorAll('[role="button"]');

    // We need to match circles with zones by index
    const zones = this.zones();

    // Wait a bit for Google Maps to fully render the circles
    setTimeout(() => {
      zones.forEach((zone, index) => {
        // Find the corresponding circle instance from Google Maps
        // This is tricky because we need to access the internal circle instances
        const circleOverlays = (this.googleMap!.googleMap as any).overlayMapTypes;

        // Alternative: Add click listeners to the map and check if click is within circle
        this.setupZoneClickDetection(zone);
      });
    }, 100);
  }

  /**
   * Setup zone click detection using map click event
   */
  private setupZoneClickDetection(zone: MapZone): void {
    if (!this.googleMap?.googleMap) return;

    // Store a reference to check clicks
    if (!this.circles.has(zone.id)) {
      const circle = new google.maps.Circle({
        center: { lat: zone.lat, lng: zone.lon },
        radius: zone.radius,
        map: null, // Don't render, just use for click detection
      });

      circle.addListener('click', () => {
        this.onZoneClick.emit(zone.id);
      });

      this.circles.set(zone.id, circle);
    }
  }

  /**
   * Handle circle click from template
   */
  handleCircleClick(zone: MapZone): void {
    this.onZoneClick.emit(zone.id);
  }

  /**
   * Clear circle listeners
   */
  private clearCircleListeners(): void {
    this.circles.forEach((circle) => {
      google.maps.event.clearInstanceListeners(circle);
      circle.setMap(null);
    });
    this.circles.clear();
  }

  /**
   * Cleanup on destroy
   */
  private cleanup(): void {
    this.clearCircleListeners();
    if (this.restaurantMarkerElement) {
      this.restaurantMarkerElement.map = null;
    }
    this.restaurantMarkerElement = undefined;
  }
}
