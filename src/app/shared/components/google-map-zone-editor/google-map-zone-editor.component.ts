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
import { GoogleMap, GoogleMapsModule, MapCircle } from '@angular/google-maps';

/**
 * Interface for zone data
 */
export interface ZoneEditorData {
  lat: number;
  lon: number;
  radius: number; // in meters
}

/**
 * GoogleMapZoneEditorComponent
 *
 * Editor interactivo de zona de cobertura usando @angular/google-maps
 *
 * Features:
 * - Círculo arrastrable
 * - 4 marcadores de resize en puntos cardinales (N, S, E, W)
 * - Two-way binding: mapa ↔ inputs
 * - Emite cambios en tiempo real
 * - Geometría esférica precisa
 */
@Component({
  selector: 'app-google-map-zone-editor',
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './google-map-zone-editor.component.html',
  styleUrl: './google-map-zone-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoogleMapZoneEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild(GoogleMap) googleMap!: GoogleMap;
  @ViewChild(MapCircle) mapCircle?: MapCircle;

  // Inputs
  readonly restaurantCoords = input.required<{ lat: number; lon: number }>();
  readonly zoneData = input<ZoneEditorData | null>(null);
  readonly minRadius = input<number>(100); // meters
  readonly maxRadius = input<number>(50000); // meters

  // Outputs
  readonly onZoneChange = output<ZoneEditorData>();

  // State
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string>('');

  // Map options
  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'BIPBIP_MAP',
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    disableDefaultUI: false,
  };

  // Circle state
  readonly circleCenter = signal<google.maps.LatLngLiteral | null>(null);
  readonly circleRadius = signal<number>(500);

  // Circle options
  readonly circleOptions: google.maps.CircleOptions = {
    strokeColor: '#fb0021',
    strokeOpacity: 0.5,
    strokeWeight: 2,
    fillColor: '#fb0021',
    fillOpacity: 0.15,
    draggable: true,
    editable: false,
  };

  // Restaurant marker
  private restaurantMarker?: google.maps.marker.AdvancedMarkerElement;

  // Resize markers
  private resizeMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

  // Circle instance
  private circle: google.maps.Circle | null = null;

  // Prevent circular updates
  private isUpdatingFromInput = false;
  private isUpdatingFromMap = false;

  constructor() {
    // Effect: React to zone data changes from parent (form)
    effect(() => {
      const data = this.zoneData();
      if (data && this.googleMap?.googleMap && !this.isUpdatingFromMap) {
        this.isUpdatingFromInput = true;
        this.updateMapFromData(data);
        this.isUpdatingFromInput = false;
      }
    });

    // Effect: Update map center when restaurant coords change
    effect(() => {
      const coords = this.restaurantCoords();
      if (this.googleMap?.googleMap) {
        this.googleMap.googleMap.setCenter({ lat: coords.lat, lng: coords.lon });
        this.updateRestaurantMarker(coords);
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
   * Initialize map and markers
   */
  private initializeMap(): void {
    if (!this.googleMap?.googleMap) {
      this.errorMessage.set('Error al cargar Google Maps');
      this.isLoading.set(false);
      return;
    }

    try {
      const coords = this.restaurantCoords();
      this.googleMap.googleMap.setCenter({ lat: coords.lat, lng: coords.lon });

      // Add restaurant marker
      this.createRestaurantMarker(coords);

      // If zone data exists, render it
      const data = this.zoneData();
      if (data) {
        this.circleCenter.set({ lat: data.lat, lng: data.lon });
        this.circleRadius.set(data.radius);
        setTimeout(() => this.createResizeMarkers(), 100);
      } else {
        // Add click listener to create zone
        this.googleMap.googleMap.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng && !this.circleCenter()) {
            const newZone: ZoneEditorData = {
              lat: event.latLng.lat(),
              lon: event.latLng.lng(),
              radius: 500
            };
            this.circleCenter.set({ lat: newZone.lat, lng: newZone.lon });
            this.circleRadius.set(newZone.radius);
            setTimeout(() => {
              this.createResizeMarkers();
              this.emitZoneChange(newZone);
            }, 100);
          }
        });
      }

      this.isLoading.set(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      this.errorMessage.set('Error al inicializar el mapa');
      this.isLoading.set(false);
    }
  }

  /**
   * Create restaurant marker
   */
  private createRestaurantMarker(coords: { lat: number; lon: number }): void {
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

    this.restaurantMarker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: coords.lat, lng: coords.lon },
      map: this.googleMap.googleMap,
      content: markerElement,
      title: 'Restaurante'
    });
  }

  /**
   * Update restaurant marker position
   */
  private updateRestaurantMarker(coords: { lat: number; lon: number }): void {
    if (this.restaurantMarker) {
      this.restaurantMarker.position = { lat: coords.lat, lng: coords.lon };
    }
  }

  /**
   * Handle circle center change (drag)
   */
  onCircleCenterChanged(event: google.maps.MapMouseEvent): void {
    if (this.isUpdatingFromInput || !event.latLng) return;

    this.isUpdatingFromMap = true;
    const newLat = event.latLng.lat();
    const newLng = event.latLng.lng();

    this.circleCenter.set({ lat: newLat, lng: newLng });
    this.updateResizeMarkersPositions();

    this.emitZoneChange({
      lat: newLat,
      lon: newLng,
      radius: this.circleRadius()
    });
    this.isUpdatingFromMap = false;
  }

  /**
   * Handle circle drag end
   */
  onCircleDragEnd(): void {
    if (this.isUpdatingFromInput || !this.mapCircle) return;

    const circle = this.mapCircle.circle;
    if (!circle) return;

    this.circle = circle;
    const center = circle.getCenter();
    if (!center) return;

    this.isUpdatingFromMap = true;
    const newLat = center.lat();
    const newLng = center.lng();

    this.circleCenter.set({ lat: newLat, lng: newLng });
    this.updateResizeMarkersPositions();

    this.emitZoneChange({
      lat: newLat,
      lon: newLng,
      radius: this.circleRadius()
    });
    this.isUpdatingFromMap = false;
  }

  /**
   * Create 4 resize markers at cardinal directions
   */
  private createResizeMarkers(): void {
    if (!this.circleCenter() || !this.googleMap?.googleMap) return;

    // Clear existing markers
    this.clearResizeMarkers();

    const center = this.circleCenter()!;
    const radius = this.circleRadius();

    const directions = [
      { bearing: 0, label: 'N' },    // North
      { bearing: 90, label: 'E' },   // East
      { bearing: 180, label: 'S' },  // South
      { bearing: 270, label: 'W' }   // West
    ];

    directions.forEach((dir) => {
      const position = this.calculateMarkerPosition(
        center,
        radius,
        dir.bearing
      );

      const markerElement = document.createElement('div');
      markerElement.style.width = '20px';
      markerElement.style.height = '20px';
      markerElement.style.borderRadius = '50%';
      markerElement.style.backgroundColor = '#ffffff';
      markerElement.style.border = '2px solid #fb0021';
      markerElement.style.cursor = 'grab';
      markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map: this.googleMap!.googleMap!,
        content: markerElement,
        title: `Resize ${dir.label}`,
        gmpDraggable: true
      });

      // Add drag listener
      marker.addListener('drag', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          this.handleResizeDrag(event.latLng);
        }
      });

      this.resizeMarkers.push(marker);
    });
  }

  /**
   * Calculate position for resize marker based on bearing
   */
  private calculateMarkerPosition(
    center: google.maps.LatLngLiteral,
    radius: number,
    bearing: number
  ): google.maps.LatLngLiteral {
    const earthRadius = 6371000; // meters
    const radLat = (center.lat * Math.PI) / 180;
    const radLng = (center.lng * Math.PI) / 180;
    const radBearing = (bearing * Math.PI) / 180;

    const newLatRad = Math.asin(
      Math.sin(radLat) * Math.cos(radius / earthRadius) +
        Math.cos(radLat) * Math.sin(radius / earthRadius) * Math.cos(radBearing)
    );

    const newLngRad =
      radLng +
      Math.atan2(
        Math.sin(radBearing) * Math.sin(radius / earthRadius) * Math.cos(radLat),
        Math.cos(radius / earthRadius) - Math.sin(radLat) * Math.sin(newLatRad)
      );

    return {
      lat: (newLatRad * 180) / Math.PI,
      lng: (newLngRad * 180) / Math.PI
    };
  }

  /**
   * Handle resize marker drag
   */
  private handleResizeDrag(newPosition: google.maps.LatLng): void {
    if (this.isUpdatingFromInput || !this.circleCenter()) return;

    const center = this.circleCenter()!;

    // Calculate new radius using geometry library
    const centerLatLng = new google.maps.LatLng(center.lat, center.lng);
    const newRadius = google.maps.geometry.spherical.computeDistanceBetween(
      centerLatLng,
      newPosition
    );

    // Validate radius
    const min = this.minRadius();
    const max = this.maxRadius();

    if (newRadius >= min && newRadius <= max) {
      this.isUpdatingFromMap = true;
      this.circleRadius.set(newRadius);
      this.updateResizeMarkersPositions();

      this.emitZoneChange({
        lat: center.lat,
        lon: center.lng,
        radius: newRadius
      });
      this.isUpdatingFromMap = false;
    }
  }

  /**
   * Update resize markers positions
   */
  private updateResizeMarkersPositions(): void {
    if (!this.circleCenter()) return;

    const center = this.circleCenter()!;
    const radius = this.circleRadius();
    const bearings = [0, 90, 180, 270];

    this.resizeMarkers.forEach((marker, index) => {
      const newPosition = this.calculateMarkerPosition(center, radius, bearings[index]);
      marker.position = newPosition;
    });
  }

  /**
   * Update map from input data (form changes)
   */
  private updateMapFromData(data: ZoneEditorData): void {
    this.circleCenter.set({ lat: data.lat, lng: data.lon });
    this.circleRadius.set(data.radius);

    if (this.resizeMarkers.length === 0) {
      setTimeout(() => this.createResizeMarkers(), 100);
    } else {
      this.updateResizeMarkersPositions();
    }

    // Pan to zone
    if (this.googleMap?.googleMap) {
      this.googleMap.googleMap.panTo({ lat: data.lat, lng: data.lon });
    }
  }

  /**
   * Emit zone change event
   */
  private emitZoneChange(data: ZoneEditorData): void {
    this.onZoneChange.emit(data);
  }

  /**
   * Clear resize markers
   */
  private clearResizeMarkers(): void {
    this.resizeMarkers.forEach((marker) => {
      marker.map = null;
    });
    this.resizeMarkers = [];
  }

  /**
   * Cleanup on destroy
   */
  private cleanup(): void {
    this.clearResizeMarkers();
    if (this.restaurantMarker) {
      this.restaurantMarker.map = null;
    }
    this.restaurantMarker = undefined;
    this.circle = null;
  }
}
