import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Coordenadas lat/lng
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Respuesta simplificada con la geometría de la ruta
 */
export interface RouteGeometry {
  coordinates: [number, number][]; // Array de [lng, lat] en formato Mapbox
  distance: number; // Distancia en metros
  duration: number; // Duración en segundos
}

/**
 * Servicio para obtener rutas usando Mapbox Directions API
 *
 * Este servicio se usa para obtener geometrías de rutas sin usar Google Directions API.
 * Mapbox retorna las coordenadas de la ruta que luego se dibujan como polyline en Google Maps.
 */
@Injectable({
  providedIn: 'root',
})
export class MapboxDirectionsService {
  private readonly http = inject(HttpClient);
  private readonly MAPBOX_TOKEN = environment.mapboxToken;
  private readonly MAPBOX_API_URL = 'https://api.mapbox.com/directions/v5/mapbox';

  /**
   * Obtiene la geometría de una ruta entre dos puntos
   *
   * @param origin Coordenadas de origen {lat, lng}
   * @param destination Coordenadas de destino {lat, lng}
   * @param profile Perfil de ruta: 'driving', 'walking', 'cycling' (default: 'driving')
   * @returns Observable con la geometría de la ruta o null si falla
   */
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
    profile: 'driving' | 'walking' | 'cycling' = 'driving'
  ): Observable<RouteGeometry | null> {
    // Mapbox usa formato [lng, lat], invertir coordenadas
    const originStr = `${origin.lng},${origin.lat}`;
    const destinationStr = `${destination.lng},${destination.lat}`;

    const url = `${this.MAPBOX_API_URL}/${profile}/${originStr};${destinationStr}`;
    const params = {
      access_token: this.MAPBOX_TOKEN,
      geometries: 'geojson', // Obtener geometría en formato GeoJSON
      overview: 'full', // Geometría completa (no simplificada)
    };

    return this.http.get<any>(url, { params }).pipe(
      map((response) => {
        if (response.routes && response.routes.length > 0) {
          const route = response.routes[0];
          return {
            coordinates: route.geometry.coordinates, // [lng, lat][]
            distance: route.distance,
            duration: route.duration,
          };
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error fetching Mapbox route:', error);
        return of(null);
      })
    );
  }

  /**
   * Convierte coordenadas de Mapbox [lng, lat] a formato Google Maps {lat, lng}
   */
  convertToGoogleMapsFormat(coordinates: [number, number][]): google.maps.LatLngLiteral[] {
    return coordinates.map(([lng, lat]) => ({ lat, lng }));
  }
}
