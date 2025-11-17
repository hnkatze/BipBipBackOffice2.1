import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
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
import * as mapboxgl from 'mapbox-gl';
import { circle as turfCircle } from '@turf/turf';
import { catchError, map, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Coordinates,
  RouteConfig,
  MapRadius,
  MapMarker,
  SuggestionResult,
  SuggestionsResponse,
} from './map.types';

/**
 * Standalone map component using Mapbox GL JS
 *
 * Features:
 * - Interactive map with custom markers
 * - Place search with autocomplete
 * - Route drawing between points
 * - Radius/circles visualization
 * - Click to select coordinates
 * - Device geolocation
 *
 * @example
 * ```html
 * <app-map
 *   [showSearch]="true"
 *   (coordinatesSelected)="handleCoordinates($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-map',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  // Dependencies
  private readonly elementRef = inject(ElementRef);
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  readonly routeConfig = input<RouteConfig>();
  readonly mapRadiusArray = input<MapRadius[]>();
  readonly mapMarkers = input<MapMarker[]>();
  readonly showSearch = input<boolean>(false);
  readonly focusCoordinates = input<Coordinates>();

  // Outputs
  readonly coordinatesSelected = output<Coordinates>();

  // Signals
  readonly datasSuggestions = signal<SuggestionResult[]>([]);
  readonly showSuggestions = signal<boolean>(false);

  // Map instance and related properties
  private map!: mapboxgl.Map;
  private readonly mapStyle = 'mapbox://styles/mapbox/streets-v12';
  private center: [number, number] = [0, 0];
  private markers: mapboxgl.Marker[] = [];
  private searchMarker?: mapboxgl.Marker;
  private readonly sessionToken = '87a4cf67-7b81-4b0e-a2cd-4ad5b223e9b0';

  // Form
  readonly form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      search: [''],
    });

    // Effect to handle route config changes
    effect(() => {
      const config = this.routeConfig();
      if (config && this.map) {
        this.center = this.getMidpoint(config.sender, config.receptor);
        this.initializeMap();
      }
    });

    // Effect to handle map radius changes
    effect(() => {
      const radiusArray = this.mapRadiusArray();
      if (radiusArray && this.map) {
        this.removeAllRadiusLayersAndSources();
        this.handleMapRadius();
      }
    });

    // Effect to handle map markers changes
    effect(() => {
      const markers = this.mapMarkers();
      const config = this.routeConfig();

      if (markers && this.map && !config) {
        this.removeAllMarkers();
        this.handleMapMarkers();

        if (markers.length) {
          const target: [number, number] =
            markers.length === 1
              ? [markers[0].lng, markers[0].lat]
              : this.getMarkersMidpoint(markers);
          this.map.flyTo({ center: target });
        }
      }
    });

    // Effect to handle focus coordinates
    effect(() => {
      const coords = this.focusCoordinates();
      if (coords) {
        this.flyToCoordinates(coords);
      }
    });
  }

  ngAfterViewInit(): void {
    // Calculate initial center
    const config = this.routeConfig();
    const markers = this.mapMarkers();

    if (config) {
      const midpoint = this.getMidpoint(config.sender, config.receptor);
      if (!isNaN(midpoint[0]) && !isNaN(midpoint[1])) {
        this.center = midpoint;
      }
    } else if (markers?.length) {
      const markersMidpoint = this.getMarkersMidpoint(markers);
      if (!isNaN(markersMidpoint[0]) && !isNaN(markersMidpoint[1])) {
        this.center = markersMidpoint;
      }
    }

    this.initializeMap();

    // Handle search input changes
    this.form
      .get('search')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async () => {
        const suggestions = await this.getSuggestions();
        this.datasSuggestions.set(suggestions);
      });

    // Center on device location if search is enabled
    if (this.showSearch()) {
      this.centerMapOnDeviceLocation();
    }
  }

  ngOnDestroy(): void {
    if (!this.map) return;

    // Remove markers
    this.markers.forEach((marker) => marker.remove());

    // Remove route layer and source
    if (this.map.getLayer('route')) {
      this.map.removeLayer('route');
    }
    if (this.map.getSource('route')) {
      this.map.removeSource('route');
    }

    // Remove radius layers and sources
    const radiusArray = this.mapRadiusArray();
    if (radiusArray) {
      radiusArray.forEach((_, index) => {
        const fillId = `radious-fill-${index}`;
        const lineId = `radious-line-${index}`;
        const labelId = `radious-label-${index}`;
        const sourceId = `radious-${index}`;

        if (this.map.getLayer(fillId)) this.map.removeLayer(fillId);
        if (this.map.getLayer(lineId)) this.map.removeLayer(lineId);
        if (this.map.getLayer(labelId)) this.map.removeLayer(labelId);
        if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
      });
    }

    // Remove search marker
    if (this.searchMarker) {
      this.searchMarker.remove();
      this.searchMarker = undefined;
    }

    // Destroy map
    this.map.remove();
  }

  /**
   * Fly to specific coordinates with zoom
   */
  flyToCoordinates(coords: Coordinates): void {
    if (this.map) {
      const { lat, lng } = coords;
      this.map.flyTo({ center: [lng, lat], zoom: 16 });
    }
  }

  /**
   * Handle suggestion selection from autocomplete
   */
  handleSelectSuggestion(selected: SuggestionResult): void {
    this.form.get('search')?.setValue(selected.full_address);
    this.showSuggestions.set(false);
    this.getCoordinates(selected.id);
  }

  /**
   * Handle blur event on search input
   */
  onBlur(): void {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  /**
   * Get coordinates for a selected place by ID
   */
  private getCoordinates(id: string): void {
    const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${id}?access_token=${environment.mapboxToken}&session_token=${this.sessionToken}`;

    this.http
      .get<any>(url)
      .pipe(
        map((response) => {
          const lat = response.features[0].geometry.coordinates[1];
          const lng = response.features[0].geometry.coordinates[0];

          // Center map and zoom
          if (this.map) {
            this.map.flyTo({ center: [lng, lat], zoom: 16 });
          }

          // Add marker
          const marker = new mapboxgl.Marker({
            anchor: 'center',
            color: '#fb0021',
            scale: 1.5,
          })
            .setLngLat([lng, lat])
            .addTo(this.map);

          this.markers.push(marker);

          // Emit coordinates
          const coords = { lat, lng };
          this.coordinatesSelected.emit(coords);

          return coords;
        }),
        catchError((error) => {
          console.error('Error fetching coordinates:', error);
          return throwError(() => new Error('Error fetching coordinates'));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  /**
   * Get place suggestions from Mapbox Search API
   */
  private async getSuggestions(): Promise<SuggestionResult[]> {
    try {
      const query = this.form.get('search')?.value;
      if (!query) return [];

      const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${query}&session_token=${this.sessionToken}&access_token=${environment.mapboxToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error fetching suggestions');
      }

      const data: SuggestionsResponse = await response.json();
      return this.mapSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }

  /**
   * Map full suggestions response to simplified format
   */
  private mapSuggestions(response: SuggestionsResponse): SuggestionResult[] {
    return response.suggestions.map((s) => ({
      id: s.mapbox_id,
      name: s.name,
      address: s.address,
      full_address: s.full_address,
      place_formatted: s.place_formatted,
    }));
  }

  /**
   * Calculate midpoint between two coordinates
   */
  private getMidpoint(coord1: Coordinates, coord2: Coordinates): [number, number] {
    const isValidCoord = (c: Coordinates) =>
      !isNaN(c.lat) &&
      !isNaN(c.lng) &&
      typeof c.lat === 'number' &&
      typeof c.lng === 'number';

    if (!isValidCoord(coord1) || !isValidCoord(coord2)) {
      return [0, 0];
    }

    const midLat = (coord1.lat + coord2.lat) / 2;
    const midLng = (coord1.lng + coord2.lng) / 2;

    return [midLng, midLat];
  }

  /**
   * Calculate midpoint of multiple markers
   */
  private getMarkersMidpoint(markers: MapMarker[]): [number, number] {
    const sum = markers.reduce(
      (acc, m) => {
        acc.lat += m.lat;
        acc.lng += m.lng;
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return [sum.lng / markers.length, sum.lat / markers.length];
  }

  /**
   * Center map on device's current location
   */
  private centerMapOnDeviceLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.map.setCenter([longitude, latitude]);
          this.map.setZoom(10);
        },
        (error) => {
          console.error('Error obteniendo la ubicación del dispositivo:', error);
        }
      );
    } else {
      console.error('La geolocalización no está soportada por este navegador.');
    }
  }

  /**
   * Initialize Mapbox map instance
   */
  private initializeMap(): void {
    const safeCenter = [
      isNaN(this.center[0]) ? 0 : this.center[0],
      isNaN(this.center[1]) ? 0 : this.center[1],
    ] as [number, number];

    this.map = new mapboxgl.Map({
      container: this.elementRef.nativeElement.querySelector('#map'),
      style: this.mapStyle,
      center: safeCenter,
      zoom: 14,
      accessToken: environment.mapboxToken,
    });

    this.map.on('load', () => {
      this.handleRouteConfig();
      this.handleMapRadius();
      this.handleMapMarkers();
    });

    this.map.on('click', (e) => {
      this.closeAllPopups();

      if (this.showSearch()) {
        const { lng, lat } = e.lngLat;

        // Remove previous search marker
        if (this.searchMarker) {
          this.searchMarker.remove();
        }

        // Create new marker
        this.searchMarker = new mapboxgl.Marker({
          color: '#fb0021',
          scale: 1.5,
        })
          .setLngLat([lng, lat])
          .addTo(this.map);

        // Emit coordinates
        this.coordinatesSelected.emit({ lat, lng });
      }
    });
  }

  /**
   * Get route from Mapbox Directions API
   */
  private async getRoute(coordinates: [number, number][]): Promise<[number, number][]> {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.join(';')}?geometries=geojson&access_token=${environment.mapboxToken}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.routes[0].geometry.coordinates;
    } catch (error) {
      console.error('Error fetching route:', error);
      return coordinates;
    }
  }

  /**
   * Draw route on map if routeConfig is provided
   */
  private async handleRouteConfig(): Promise<void> {
    const config = this.routeConfig();
    if (!config) return;

    // Get route coordinates
    const coordinates = await this.getRoute([
      [config.sender.lng, config.sender.lat],
      [config.receptor.lng, config.receptor.lat],
    ]);

    // Remove existing route layer
    if (this.map.getSource('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
    }

    // Add route source
    this.map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
      },
    });

    // Add route layer
    this.map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#000000',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    // Add markers for sender and receptor
    this.addSimpleMarker(config.sender, config.iconUrls[0]);
    this.addSimpleMarker(config.receptor, config.iconUrls[1]);
  }

  /**
   * Add simple marker without popup
   */
  private addSimpleMarker(coords: Coordinates, iconUrl: string): void {
    const el = document.createElement('img');
    el.src = iconUrl;
    el.className = 'marker';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.cursor = 'pointer';

    const marker = new mapboxgl.Marker(el)
      .setLngLat([coords.lng, coords.lat])
      .addTo(this.map);

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = marker.getPopup()?.isOpen() ?? false;
      this.closeAllPopups();
      if (!isOpen) marker.togglePopup();
    });

    this.markers.push(marker);
  }

  /**
   * Draw radius circles on map
   */
  private handleMapRadius(): void {
    const radiusArray = this.mapRadiusArray();
    if (!radiusArray) return;

    if (!this.map || !this.map.isStyleLoaded()) {
      console.log('⚠️ MAP - Style not ready for radius drawing, waiting...');
      if (this.map) {
        this.map.once('styledata', () => {
          this.handleMapRadius();
        });
      }
      return;
    }

    radiusArray.forEach((radius, index) => {
      const sourceId = `radious-${index}`;
      const fillId = `radious-fill-${index}`;
      const lineId = `radious-line-${index}`;

      // Create circle GeoJSON
      const circleFeature = turfCircle(
        [radius.lng, radius.lat],
        radius.radius,
        { steps: 64, units: 'meters' }
      );

      // Add source
      this.map.addSource(sourceId, { type: 'geojson', data: circleFeature });

      // Add fill layer
      this.map.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': '#fb0021',
          'fill-opacity': 0.15,
        },
      });

      // Add line layer
      this.map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#fb0021',
          'line-width': 2,
          'line-opacity': 0.3,
        },
      });

      // Add label
      const radiusText =
        radius.radius > 999
          ? `${radius.title}\n${(radius.radius / 1000).toFixed(1)} km`
          : `${radius.title}\n${radius.radius} m`;

      this.map.addLayer({
        id: `radious-label-${index}`,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': radiusText,
          'text-size': 16,
          'text-offset': [0, -1.5],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#1f1f1f',
          'text-halo-width': 1.5,
          'text-halo-blur': 0.5,
        },
      });
    });
  }

  /**
   * Draw markers on map
   */
  private handleMapMarkers(): void {
    const markers = this.mapMarkers();
    if (!markers) return;

    markers.forEach((marker) => {
      this.addMarker(
        { lat: marker.lat, lng: marker.lng },
        marker.icon,
        marker.info
      );
    });
  }

  /**
   * Add marker with optional popup
   */
  private addMarker(coords: Coordinates, iconUrl: string, info?: string): void {
    const el = document.createElement('img');
    el.src = iconUrl;
    el.className = 'marker';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.border = '2px solid white';
    el.style.borderRadius = '50%';
    el.style.cursor = 'pointer';

    if (info) {
      const [header, subheader] = info.split('|');
      const [title, code] = subheader.split('/');

      const popupContent = `
        <style>
          .popup-container {
            display: flex;
            flex-direction: column;
            position: relative;
            font-family: 'Arial', sans-serif;
            font-weight: 400;
            min-width: 200px;
          }

          .popup-image-wrapper {
            position: relative;
            height: 120px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #fb0021, #ff4d4d, #ff8080, #ff4d4d, #fb0021);
            background-size: 200% 100%;
            animation: wavebg 8s linear infinite;
            border-radius: 10px;
          }

          @keyframes wavebg {
            0% { background-position: 0% 0%; }
            25% { background-position: 50% 100%; }
            50% { background-position: 100% 50%; }
            75% { background-position: 50% 0%; }
            100% { background-position: 0% 0%; }
          }

          .popup-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            background: white;
            z-index: 1;
          }

          .popup-decoration {
            position: absolute;
            width: 150%;
            height: 80px;
            background: rgba(255, 255, 255, 0.1);
            transform: rotate(-4deg) translateY(40px);
          }

          .popup-body {
            padding: 20px;
            text-align: center;
          }

          .popup-header {
            margin-bottom: 15px;
            border-bottom: 2px solid #fb0021;
            padding-bottom: 15px;
          }

          .popup-name {
            color: #fb0021;
            margin: 0 0 8px 0;
            font-size: 1.4em;
            font-weight: 700;
          }

          .popup-title {
            color: #333;
            font-size: 1.1em;
            font-weight: 600;
            letter-spacing: 1px;
          }

          .popup-code {
            color: #666;
            font-size: 0.9em;
            margin-top: 4px;
          }
        </style>
        <div class="popup-container">
          <div class="popup-image-wrapper">
            <img src="${iconUrl}" class="popup-avatar" alt="Location">
            <div class="popup-decoration"></div>
          </div>
          <div class="popup-body">
            <div class="popup-header">
              <h3 class="popup-name">${header.trim()}</h3>
              <div class="popup-title">${title.trim()}</div>
              <div class="popup-code">${code.trim()}</div>
            </div>
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        anchor: 'bottom',
        className: 'animated-popup',
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(this.map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = marker.getPopup()?.isOpen() ?? false;
        this.closeAllPopups();
        if (!isOpen) {
          marker.togglePopup();
        }
      });

      this.markers.push(marker);
    } else {
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([coords.lng, coords.lat])
        .addTo(this.map);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = marker.getPopup()?.isOpen() ?? false;
        this.closeAllPopups();
        if (!isOpen) {
          marker.togglePopup();
        }
      });

      this.markers.push(marker);
    }
  }

  /**
   * Close all open popups
   */
  private closeAllPopups(): void {
    this.markers.forEach((marker) => marker.getPopup()?.remove());
  }

  /**
   * Remove all radius layers and sources
   */
  private removeAllRadiusLayersAndSources(): void {
    if (!this.map) return;

    try {
      if (!this.map.isStyleLoaded()) {
        console.log('⚠️ MAP - Style not loaded, deferring radius cleanup');
        this.map.once('styledata', () => {
          this.removeAllRadiusLayersAndSources();
        });
        return;
      }

      const style = this.map.getStyle();
      if (style && style.layers) {
        style.layers.forEach((layer) => {
          if (layer.id.startsWith('radious-')) {
            if (this.map.getLayer(layer.id)) {
              this.map.removeLayer(layer.id);
            }
          }
        });
      }

      if (style && style.sources) {
        Object.keys(style.sources).forEach((sourceId) => {
          if (sourceId.startsWith('radious-')) {
            if (this.map.getSource(sourceId)) {
              this.map.removeSource(sourceId);
            }
          }
        });
      }
    } catch (error) {
      console.error('❌ MAP - Error removing radius layers:', error);
      if (this.map && !this.map.isStyleLoaded()) {
        this.map.once('styledata', () => {
          this.removeAllRadiusLayersAndSources();
        });
      }
    }
  }

  /**
   * Remove all markers from map
   */
  private removeAllMarkers(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  }
}
