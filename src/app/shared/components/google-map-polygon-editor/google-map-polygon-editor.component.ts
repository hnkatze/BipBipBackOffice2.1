import {
  Component,
  effect,
  input,
  output,
  signal,
  viewChild,
  ChangeDetectionStrategy,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GoogleMap, MapMarker } from '@angular/google-maps';

export interface PolygonCoordinate {
  lat: number;
  lon: number;
}

export interface PolygonData {
  coordinates: PolygonCoordinate[];
  area?: number; // km²
}

@Component({
  selector: 'app-google-map-polygon-editor',
  imports: [GoogleMap, MapMarker],
  templateUrl: './google-map-polygon-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleMapPolygonEditorComponent {
  private platformId = inject(PLATFORM_ID);

  // Inputs
  restaurantCoords = input.required<{ lat: number; lon: number }>();
  existingPolygon = input<PolygonData | null>(null);
  minVertices = input<number>(3);
  maxVertices = input<number>(100);

  // Outputs
  onPolygonChange = output<PolygonData>();

  // ViewChild
  map = viewChild.required<GoogleMap>('map');

  // Signals
  mapCenter = signal<google.maps.LatLngLiteral>({ lat: 0, lng: 0 });
  mapZoom = signal<number>(15);
  polygonPath = signal<google.maps.LatLngLiteral[]>([]);
  isDrawing = signal<boolean>(false);
  vertexCount = signal<number>(0);
  polygonArea = signal<number>(0);

  // Google Maps objects
  private drawingManager: google.maps.drawing.DrawingManager | null = null;
  private currentPolygon: google.maps.Polygon | null = null;
  private isUpdatingFromInput = false;
  private isUpdatingFromMap = false;

  mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    center: { lat: 14.0818, lng: -87.2068 }, // Tegucigalpa por defecto
    zoom: 15,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: false,
  };

  polygonOptions: google.maps.PolygonOptions = {
    strokeColor: '#fb0021',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#fb0021',
    fillOpacity: 0.2,
    editable: true,
    draggable: false,
  };

  restaurantMarkerOptions: google.maps.MarkerOptions = {
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#fb0021',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
    title: 'Restaurante',
  };

  constructor() {
    // Effect para centrar el mapa en el restaurante
    effect(() => {
      const coords = this.restaurantCoords();
      this.mapCenter.set({ lat: coords.lat, lng: coords.lon });
    });

    // Effect para cargar polígono existente
    effect(() => {
      const polygon = this.existingPolygon();
      if (polygon && !this.isUpdatingFromMap) {
        this.loadExistingPolygon(polygon);
      }
    });
  }

  onMapReady(map: google.maps.Map): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initializeDrawingManager(map);
  }

  private initializeDrawingManager(map: google.maps.Map): void {
    this.drawingManager = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      polygonOptions: this.polygonOptions,
    });

    this.drawingManager.setMap(map);

    // Listener para cuando se completa el dibujo de un polígono
    google.maps.event.addListener(
      this.drawingManager,
      'polygoncomplete',
      (polygon: google.maps.Polygon) => {
        this.handlePolygonComplete(polygon);
      }
    );
  }

  startDrawing(): void {
    if (!this.drawingManager) return;

    // Limpiar polígono existente si hay uno
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
      this.currentPolygon = null;
    }

    this.isDrawing.set(true);
    this.drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
  }

  stopDrawing(): void {
    if (!this.drawingManager) return;

    this.isDrawing.set(false);
    this.drawingManager.setDrawingMode(null);
  }

  clearPolygon(): void {
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
      this.currentPolygon = null;
    }

    this.polygonPath.set([]);
    this.vertexCount.set(0);
    this.polygonArea.set(0);
    this.stopDrawing();
  }

  private handlePolygonComplete(polygon: google.maps.Polygon): void {
    this.stopDrawing();

    // Remover el polígono anterior si existe
    if (this.currentPolygon) {
      this.currentPolygon.setMap(null);
    }

    this.currentPolygon = polygon;

    // Obtener el path del polígono
    const path = polygon.getPath();
    this.updatePolygonData(path);

    // Listeners para cuando se edita el polígono
    google.maps.event.addListener(path, 'set_at', () => {
      this.updatePolygonData(path);
    });

    google.maps.event.addListener(path, 'insert_at', () => {
      this.updatePolygonData(path);
    });

    google.maps.event.addListener(path, 'remove_at', () => {
      this.updatePolygonData(path);
    });
  }

  private updatePolygonData(path: google.maps.MVCArray<google.maps.LatLng>): void {
    if (this.isUpdatingFromInput) return;

    this.isUpdatingFromMap = true;

    const coordinates: google.maps.LatLngLiteral[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push({ lat: point.lat(), lng: point.lng() });
    }

    this.polygonPath.set(coordinates);
    this.vertexCount.set(coordinates.length);

    // Calcular área
    const area = this.calculatePolygonArea(coordinates);
    this.polygonArea.set(area);

    // Emitir cambios
    const polygonData: PolygonData = {
      coordinates: coordinates.map(c => ({ lat: c.lat, lon: c.lng })),
      area,
    };

    this.onPolygonChange.emit(polygonData);

    this.isUpdatingFromMap = false;
  }

  private loadExistingPolygon(polygonData: PolygonData): void {
    if (!this.map()?.googleMap || polygonData.coordinates.length < 3) return;

    this.isUpdatingFromInput = true;

    // Limpiar polígono existente
    this.clearPolygon();

    // Convertir coordenadas
    const path: google.maps.LatLngLiteral[] = polygonData.coordinates.map(c => ({
      lat: c.lat,
      lng: c.lon,
    }));

    // Crear nuevo polígono
    this.currentPolygon = new google.maps.Polygon({
      ...this.polygonOptions,
      paths: path,
      map: this.map().googleMap,
    });

    // Actualizar signals
    this.polygonPath.set(path);
    this.vertexCount.set(path.length);
    this.polygonArea.set(polygonData.area || this.calculatePolygonArea(path));

    // Agregar listeners
    const polygonPath = this.currentPolygon.getPath();
    google.maps.event.addListener(polygonPath, 'set_at', () => {
      this.updatePolygonData(polygonPath);
    });

    google.maps.event.addListener(polygonPath, 'insert_at', () => {
      this.updatePolygonData(polygonPath);
    });

    google.maps.event.addListener(polygonPath, 'remove_at', () => {
      this.updatePolygonData(polygonPath);
    });

    this.isUpdatingFromInput = false;
  }

  private calculatePolygonArea(path: google.maps.LatLngLiteral[]): number {
    if (path.length < 3) return 0;

    // Convertir a LatLng array
    const latLngPath = path.map(p => new google.maps.LatLng(p.lat, p.lng));

    // Calcular área en metros cuadrados
    const areaMeters = google.maps.geometry.spherical.computeArea(latLngPath);

    // Convertir a kilómetros cuadrados
    const areaKm = areaMeters / 1_000_000;

    return Math.round(areaKm * 100) / 100; // Redondear a 2 decimales
  }

  getRestaurantMarkerPosition(): google.maps.LatLngLiteral {
    const coords = this.restaurantCoords();
    return { lat: coords.lat, lng: coords.lon };
  }
}
