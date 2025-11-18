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
import { PlacePrediction } from './google-map.types';

/**
 * Standalone Google Maps component
 *
 * Features:
 * - Interactive map with custom marker icon
 * - Place search with autocomplete (Google Places API)
 * - Click to select coordinates
 * - Device geolocation
 * - Responsive sizing (takes 100% width and height of container)
 *
 * @example
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

  @ViewChild(GoogleMap) googleMap!: GoogleMap;

  // Inputs
  readonly showSearch = input<boolean>(false);
  readonly initialCoordinates = input<Coordinates>(); // Para mostrar marcador cuando se edita
  readonly markerIconUrl = input<string>(); // URL de la imagen para el marcador custom

  // Outputs
  readonly coordinatesSelected = output<Coordinates>();

  // Signals
  readonly predictions = signal<PlacePrediction[]>([]);
  readonly showPredictions = signal<boolean>(false);
  readonly searchMarkerPosition = signal<Coordinates | null>(null);

  // Advanced Marker
  private advancedMarker?: google.maps.marker.AdvancedMarkerElement;

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
  }

  ngAfterViewInit(): void {
    // Initialize services
    if (this.googleMap?.googleMap) {
      this.geocoder = new google.maps.Geocoder();
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
    // Cleanup handled by Angular
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
