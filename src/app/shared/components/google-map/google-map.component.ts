import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  input,
  output,
  signal,
  effect,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { GoogleMap } from '@angular/google-maps';
import { catchError, debounceTime, map, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Coordinates,
  RouteConfig,
  MapRadius,
  MapMarker as CustomMapMarker,
} from '../map/map.types';
import { PlacePrediction, GoogleMapMarker, MapCenter, MapRoute } from './google-map.types';
import { MapboxDirectionsService } from '../../services/mapbox-directions.service';

/**
 * Standalone Google Maps component
 *
 * Features:
 * - Interactive map with custom marker icon
 * - Multiple markers support with custom icons
 * - Place search with autocomplete (Google Places API)
 * - Click to select coordinates
 * - Device geolocation
 * - Responsive sizing (takes 100% width and height of container)
 *
 * @example
 * Single marker mode:
 * ```html
 * <div style="height: 500px;">
 *   <app-google-map
 *     [showSearch]="true"
 *     [initialCoordinates]="coords"
 *     [markerIconUrl]="logoUrl"
 *     (coordinatesSelected)="handleCoordinates($event)"
 *   />
 * </div>
 * ```
 *
 * Multiple markers mode:
 * ```html
 * <div style="height: 500px;">
 *   <app-google-map
 *     [markers]="markersArray"
 *     (markerClick)="handleMarkerClick($event)"
 *   />
 * </div>
 * ```
 */
@Component({
  selector: 'app-google-map',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    GoogleMap,
  ],
  templateUrl: './google-map.component.html',
  styleUrls: ['./google-map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleMapComponent implements AfterViewInit, OnDestroy {
  // Dependencies
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mapboxDirections = inject(MapboxDirectionsService);

  @ViewChild(GoogleMap) googleMap!: GoogleMap;

  // Inputs
  readonly showSearch = input<boolean>(false);
  readonly initialCoordinates = input<Coordinates>(); // Para mostrar marcador cuando se edita
  readonly markerIconUrl = input<string>(); // URL de la imagen para el marcador custom
  readonly markers = input<GoogleMapMarker[]>([]); // Array de marcadores para vista de múltiples marcadores
  readonly centerOn = input<MapCenter | null>(); // Coordenadas para centrar/panear el mapa programáticamente
  readonly route = input<MapRoute | null>(); // Ruta para dibujar polyline entre 2 puntos

  // Outputs
  readonly coordinatesSelected = output<Coordinates>();
  readonly markerClick = output<string>(); // Emite el ID del marcador clickeado

  // Signals
  readonly predictions = signal<PlacePrediction[]>([]);
  readonly showPredictions = signal<boolean>(false);
  readonly searchMarkerPosition = signal<Coordinates | null>(null);
  readonly mapInitialized = signal<boolean>(false); // Track if map is fully initialized

  // Advanced Markers
  private advancedMarker?: google.maps.marker.AdvancedMarkerElement; // Marcador único (modo búsqueda)
  private advancedMarkers = new Map<string, google.maps.marker.AdvancedMarkerElement>(); // Múltiples marcadores

  // Polyline
  private polyline?: google.maps.Polyline; // Polyline para ruta

  // Google Maps configuration
  readonly mapOptions: google.maps.MapOptions = {
    center: { lat: 14.065070, lng: -87.192136 }, // Tegucigalpa default
    zoom: 14,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: false,
    disableDefaultUI: true,
    mapId: 'BIPBIP_MAP', // Required for AdvancedMarkerElement
  };

  // Services
  private geocoder?: google.maps.Geocoder;

  // Form
  readonly form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      search: [''],
    });

    // Effect to handle initial coordinates (when editing)
    effect(() => {
      const coords = this.initialCoordinates();
      if (coords && this.googleMap?.googleMap) {
        this.searchMarkerPosition.set(coords);
        this.googleMap.googleMap.panTo(coords);
        this.googleMap.googleMap.setZoom(16);
        this.updateAdvancedMarker(coords);
      }
    });

    // Effect to update marker when position or icon changes
    effect(() => {
      const position = this.searchMarkerPosition();
      if (position) {
        this.updateAdvancedMarker(position);
      }
    });

    // Effect to update multiple markers when markers input changes
    effect(() => {
      const markersData = this.markers();
      const initialized = this.mapInitialized();
      if (markersData && markersData.length > 0 && initialized && this.googleMap?.googleMap) {
        this.updateMultipleMarkers(markersData);
      }
    });

    // Effect to pan/zoom map when centerOn input changes
    effect(() => {
      const center = this.centerOn();
      const initialized = this.mapInitialized();
      if (center && initialized && this.googleMap?.googleMap) {
        this.googleMap.googleMap.panTo({ lat: center.lat, lng: center.lng });
        if (center.zoom !== undefined) {
          this.googleMap.googleMap.setZoom(center.zoom);
        }
      }
    });

    // Effect to draw/update route polyline when route input changes
    effect(() => {
      const routeData = this.route();
      const initialized = this.mapInitialized();
      if (routeData && initialized && this.googleMap?.googleMap) {
        this.drawRoute(routeData);
      } else if (!routeData && this.polyline) {
        // Clear polyline if route is null
        this.polyline.setMap(null);
        this.polyline = undefined;
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialize services
    if (this.googleMap?.googleMap) {
      this.geocoder = new google.maps.Geocoder();

      // Mark map as initialized after a small delay to ensure it's fully ready
      setTimeout(() => {
        this.mapInitialized.set(true);
      }, 100);
    }

    // Handle search input changes
    this.form
      .get('search')
      ?.valueChanges.pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(async (query) => {
        if (query) {
          await this.getPlacePredictions(query);
        } else {
          this.predictions.set([]);
        }
      });

    // Center on device location if search is enabled and no initial coordinates
    if (this.showSearch() && !this.initialCoordinates()) {
      this.centerMapOnDeviceLocation();
    }
  }

  ngOnDestroy(): void {
    // Cleanup markers
    this.clearMultipleMarkers();
    if (this.advancedMarker) {
      this.advancedMarker.map = null;
    }
    // Cleanup polyline
    if (this.polyline) {
      this.polyline.setMap(null);
    }
  }

  /**
   * Handle map click to select coordinates
   */
  onMapClick(event: google.maps.MapMouseEvent): void {
    if (this.showSearch() && event.latLng) {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      this.searchMarkerPosition.set({ lat, lng });
      this.coordinatesSelected.emit({ lat, lng });
    }
  }

  /**
   * Handle place selection from predictions
   */
  async handleSelectPrediction(prediction: PlacePrediction): Promise<void> {
    // Close predictions dropdown
    this.showPredictions.set(false);

    try {
      // Use Places API to get place details instead of Geocoder
      const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const place = new Place({
        id: prediction.place_id,
      });

      // Fetch the location field
      await place.fetchFields({ fields: ['location'] });

      if (place.location) {
        const lat = place.location.lat();
        const lng = place.location.lng();

        this.searchMarkerPosition.set({ lat, lng });
        this.coordinatesSelected.emit({ lat, lng });

        if (this.googleMap?.googleMap) {
          this.googleMap.googleMap.panTo({ lat, lng });
          this.googleMap.googleMap.setZoom(16);
        }

        // Clear search input after successful selection
        this.form.get('search')?.setValue('', { emitEvent: false });
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  }

  /**
   * Handle blur event on search input
   */
  onBlur(): void {
    setTimeout(() => this.showPredictions.set(false), 200);
  }

  /**
   * Get place predictions from Google Places API (New)
   */
  private async getPlacePredictions(query: string): Promise<void> {
    if (!query || query.length < 2) {
      this.predictions.set([]);
      return;
    }

    try {
      const request: google.maps.places.AutocompleteRequest = {
        input: query,
        includedPrimaryTypes: ['restaurant', 'street_address', 'establishment', 'point_of_interest'],
      };

      // Add location bias if map is available
      if (this.googleMap?.googleMap) {
        const center = this.googleMap.googleMap.getCenter();
        if (center) {
          request.locationBias = center;
        }
      }

      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      if (suggestions && suggestions.length > 0) {
        // Convert new API format to our PlacePrediction interface
        const convertedPredictions: PlacePrediction[] = suggestions.map(suggestion => {
          const placePrediction = suggestion.placePrediction;
          return {
            description: placePrediction?.text?.text || '',
            place_id: placePrediction?.placeId || '',
            structured_formatting: {
              main_text: placePrediction?.mainText?.text || '',
              secondary_text: placePrediction?.secondaryText?.text || '',
            },
          };
        });

        this.predictions.set(convertedPredictions);
        this.showPredictions.set(true);
      } else {
        this.predictions.set([]);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      this.predictions.set([]);
    }
  }

  /**
   * Center map on device's current location
   */
  private centerMapOnDeviceLocation(): void {
    if (navigator.geolocation && this.googleMap?.googleMap) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.googleMap.googleMap?.setCenter(pos);
          this.googleMap.googleMap?.setZoom(13);
        },
        (error) => {
          console.error('Error obteniendo la ubicación del dispositivo:', error);
        }
      );
    }
  }

  /**
   * Update or create Advanced Marker
   */
  private updateAdvancedMarker(coords: Coordinates): void {
    if (!this.googleMap?.googleMap) return;

    // Remove existing marker
    if (this.advancedMarker) {
      this.advancedMarker.map = null;
    }

    const customIcon = this.markerIconUrl();
    let markerContent: HTMLElement;

    if (customIcon) {
      // Create custom image marker
      const img = document.createElement('img');
      img.src = customIcon;
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.objectFit = 'contain';
      markerContent = img;
    } else {
      // Create default circular marker
      const pin = document.createElement('div');
      pin.style.width = '20px';
      pin.style.height = '20px';
      pin.style.borderRadius = '50%';
      pin.style.backgroundColor = '#fb0021';
      pin.style.border = '2px solid #ffffff';
      pin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      markerContent = pin;
    }

    // Create advanced marker
    this.advancedMarker = new google.maps.marker.AdvancedMarkerElement({
      map: this.googleMap.googleMap,
      position: { lat: coords.lat, lng: coords.lng },
      content: markerContent,
    });
  }

  /**
   * Update multiple markers on the map
   */
  private updateMultipleMarkers(markersData: GoogleMapMarker[]): void {
    if (!this.googleMap?.googleMap) return;

    // Clear existing markers
    this.clearMultipleMarkers();

    // Create new markers
    markersData.forEach((markerData) => {
      const markerContent = this.createMarkerContent(
        markerData.icon,
        markerData.title,
        markerData.badgeValue
      );

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.googleMap.googleMap,
        position: { lat: markerData.lat, lng: markerData.lng },
        content: markerContent,
        title: markerData.title,
      });

      // Add click listener
      marker.addListener('click', () => {
        this.markerClick.emit(markerData.id);
      });

      this.advancedMarkers.set(markerData.id, marker);
    });

    // Adjust map bounds to show all markers
    this.fitBoundsToMarkers(markersData);
  }

  /**
   * Clear all multiple markers from the map
   */
  private clearMultipleMarkers(): void {
    this.advancedMarkers.forEach((marker) => {
      marker.map = null;
    });
    this.advancedMarkers.clear();
  }

  /**
   * Create marker content element
   */
  private createMarkerContent(iconUrl: string, title?: string, badgeValue?: number): HTMLElement {
    const container = document.createElement('div');
    container.style.cursor = 'pointer';
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.gap = '4px';

    // Pin/pointer container (teardrop shape)
    const pin = document.createElement('div');
    pin.style.position = 'relative';
    pin.style.width = '48px';
    pin.style.height = '48px';
    pin.style.backgroundColor = '#ffffff';
    pin.style.borderRadius = '50% 50% 50% 0';
    pin.style.transform = 'rotate(-45deg)';
    pin.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    pin.style.display = 'flex';
    pin.style.alignItems = 'center';
    pin.style.justifyContent = 'center';
    pin.style.border = '3px solid #e74c3c'; // Red border for the pin

    // Logo container (circular, inside the pin)
    const logoContainer = document.createElement('div');
    logoContainer.style.width = '36px';
    logoContainer.style.height = '36px';
    logoContainer.style.borderRadius = '50%';
    logoContainer.style.overflow = 'hidden';
    logoContainer.style.transform = 'rotate(45deg)'; // Counter-rotate to keep logo upright
    logoContainer.style.display = 'flex';
    logoContainer.style.alignItems = 'center';
    logoContainer.style.justifyContent = 'center';
    logoContainer.style.backgroundColor = '#ffffff';

    // Logo image
    const img = document.createElement('img');
    img.src = iconUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.alt = title || 'Marker';

    logoContainer.appendChild(img);
    pin.appendChild(logoContainer);
    container.appendChild(pin);

    // Badge con pedidos por hora (si existe)
    if (badgeValue !== undefined) {
      const badge = document.createElement('div');
      badge.style.backgroundColor = '#e74c3c';
      badge.style.color = '#ffffff';
      badge.style.padding = '4px 8px';
      badge.style.borderRadius = '12px';
      badge.style.fontSize = '12px';
      badge.style.fontWeight = '600';
      badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      badge.style.whiteSpace = 'nowrap';
      badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      badge.textContent = `+${badgeValue}`;

      container.appendChild(badge);
    }

    return container;
  }

  /**
   * Fit map bounds to show all markers, then center on first marker
   */
  private fitBoundsToMarkers(markersData: GoogleMapMarker[]): void {
    if (!this.googleMap?.googleMap || markersData.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markersData.forEach((marker) => {
      bounds.extend({ lat: marker.lat, lng: marker.lng });
    });

    this.googleMap.googleMap.fitBounds(bounds);

    // Add some padding and center on first marker
    if (markersData.length === 1) {
      // If only one marker, set a reasonable zoom level
      this.googleMap.googleMap.setZoom(14);
    } else if (markersData.length > 1) {
      // After fitting bounds, pan to first marker to ensure it's in view
      setTimeout(() => {
        if (this.googleMap?.googleMap) {
          const firstMarker = markersData[0];
          this.googleMap.googleMap.panTo({ lat: firstMarker.lat, lng: firstMarker.lng });
        }
      }, 500); // Small delay to allow fitBounds to complete
    }
  }

  /**
   * Draw or update route polyline between origin and destination using Mapbox Directions API
   */
  private drawRoute(routeData: MapRoute): void {
    if (!this.googleMap?.googleMap) return;

    // Clear existing polyline
    if (this.polyline) {
      this.polyline.setMap(null);
      this.polyline = undefined;
    }

    // Request route from Mapbox Directions API
    this.mapboxDirections
      .getRoute(routeData.origin, routeData.destination, 'driving')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (routeGeometry) => {
          if (routeGeometry && this.googleMap?.googleMap) {
            // Convert Mapbox coordinates to Google Maps format
            const path = this.mapboxDirections.convertToGoogleMapsFormat(
              routeGeometry.coordinates
            );

            // Create polyline with the route geometry
            this.polyline = new google.maps.Polyline({
              path: path,
              geodesic: true,
              strokeColor: routeData.strokeColor || '#e74c3c',
              strokeOpacity: routeData.strokeOpacity || 0.8,
              strokeWeight: routeData.strokeWeight || 4,
              map: this.googleMap.googleMap,
            });

            // Fit bounds to show the entire route
            const bounds = new google.maps.LatLngBounds();
            path.forEach((coord) => bounds.extend(coord));
            this.googleMap.googleMap.fitBounds(bounds, 80);
          } else {
            // Fallback: draw straight line if Mapbox fails
            this.drawStraightLine(routeData);
          }
        },
        error: (error) => {
          console.error('Error fetching Mapbox route:', error);
          // Fallback: draw straight line if request fails
          this.drawStraightLine(routeData);
        },
      });
  }

  /**
   * Fallback method to draw straight line if Mapbox API fails
   */
  private drawStraightLine(routeData: MapRoute): void {
    if (!this.googleMap?.googleMap) return;

    // Clear existing polyline
    if (this.polyline) {
      this.polyline.setMap(null);
    }

    // Create straight polyline
    const path = [
      { lat: routeData.origin.lat, lng: routeData.origin.lng },
      { lat: routeData.destination.lat, lng: routeData.destination.lng },
    ];

    this.polyline = new google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: routeData.strokeColor || '#e74c3c',
      strokeOpacity: routeData.strokeOpacity || 0.8,
      strokeWeight: routeData.strokeWeight || 4,
      map: this.googleMap.googleMap,
    });

    // Fit bounds to show both markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(routeData.origin);
    bounds.extend(routeData.destination);
    this.googleMap.googleMap.fitBounds(bounds, 80);
  }

  /**
   * Get search marker options (deprecated - keeping for compatibility)
   */
  get searchMarkerOptions(): google.maps.MarkerOptions {
    const customIcon = this.markerIconUrl();

    if (customIcon) {
      return {
        icon: {
          url: customIcon,
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 40),
        },
      };
    }

    return {
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#fb0021',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    };
  }
}
