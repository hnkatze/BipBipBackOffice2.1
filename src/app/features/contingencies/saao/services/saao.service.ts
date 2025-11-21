import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

import {
  SaaoOrder,
  SaaoFilters,
  SaaoOrdersResponse,
  SaaoStatsResponse,
  SaaoReportParams,
  CityOption,
  BrandOption,
  DriverOption,
  StoreOption,
  DriverStats,
  RestaurantStats,
  hasIncident,
  getTimingCategory,
  calculateOrderTimings,
  DriverStatus
} from '../models/saao.model';
import { environment } from '../../../../../environments/environment';

/**
 * Interface para el API de ciudades
 */
interface CityApiResponse {
  cityId: number;
  cityName: string;
}

/**
 * Interface para el API de marcas
 */
interface BrandApiResponse {
  idBrand: number;
  nameBrand: string;
  logoBrand: string;
  sortOrderBrand: number;
}

/**
 * Servicio para gestión de órdenes SAAO
 * Usa Signals para state management reactivo
 */
@Injectable({
  providedIn: 'root'
})
export class SaaoService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiURL + 'OrderTracking/saao/'; // Endpoint real del API
  private readonly locationApiUrl = environment.apiURL + 'Location/'; // Para ciudades
  private readonly brandApiUrl = environment.apiURL + 'Brand/'; // Para marcas
  private readonly driverApiUrl = environment.apiURL + 'Driver/'; // Para drivers
  private readonly storeApiUrl = environment.apiURL + 'Restaurant/'; // Para stores
  // State con Signals
  private ordersSignal = signal<SaaoOrder[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private filtersSignal = signal<SaaoFilters>({});
  private driverStatsSignal = signal<DriverStats[]>([]);
  private restaurantStatsSignal = signal<RestaurantStats[]>([]);

  // Public readonly signals
  readonly orders = this.ordersSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly filters = this.filtersSignal.asReadonly();
  readonly driverStats = this.driverStatsSignal.asReadonly();
  readonly restaurantStats = this.restaurantStatsSignal.asReadonly();

  // Computed signals
  readonly totalOrders = computed(() => this.ordersSignal().length);

  readonly ordersWithIncidents = computed(() =>
    this.ordersSignal().filter(order => hasIncident(order))
  );

  readonly totalIncidents = computed(() => this.ordersWithIncidents().length);

  readonly averageAssignmentTime = computed(() => {
    const orders = this.ordersSignal();
    if (orders.length === 0) return 0;

    const total = orders.reduce((sum, order) => sum + order.minutos, 0);
    return Math.round(total / orders.length);
  });

  readonly fastAssignments = computed(() =>
    this.ordersSignal().filter(order => getTimingCategory(order.minutos) === 'RAPIDA').length
  );

  readonly slowAssignments = computed(() =>
    this.ordersSignal().filter(order => getTimingCategory(order.minutos) === 'LENTA').length
  );

  readonly uniqueDrivers = computed(() => {
    const driverIds = new Set(this.ordersSignal().map(o => o.driverId));
    return driverIds.size;
  });

  readonly uniqueRestaurants = computed(() => {
    const restaurants = new Set(this.ordersSignal().map(o => o.storeShortName));
    return restaurants.size;
  });

  /**
   * Obtener reporte SAAO desde el API usando el endpoint real
   * GET /api/OrderTracking/saao/report
   *
   * @param params - Parámetros opcionales del reporte (cityId, deliveryDate, storeId, driverId, orderIds)
   * @returns Observable con las órdenes SAAO
   */
  getSaaoReport(params?: SaaoReportParams): Observable<SaaoOrder[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    let httpParams = new HttpParams();

    // Aplicar parámetros opcionales si existen
    if (params?.cityId !== undefined) {
      httpParams = httpParams.set('cityId', params.cityId.toString());
    }
    if (params?.dateFrom) {
      httpParams = httpParams.set('dateFrom', params.dateFrom);
    }
    if (params?.dateTo) {
      httpParams = httpParams.set('dateTo', params.dateTo);
    }
    if (params?.brandId !== undefined) {
      httpParams = httpParams.set('brandId', params.brandId.toString());
    }
    if (params?.storeId !== undefined) {
      httpParams = httpParams.set('storeId', params.storeId.toString());
    }
    if (params?.driverId !== undefined) {
      httpParams = httpParams.set('driverId', params.driverId.toString());
    }
    if (params?.orderIds && params.orderIds.length > 0) {
      // Para arrays, hay que agregar cada elemento por separado
      params.orderIds.forEach(orderId => {
        httpParams = httpParams.append('orderIds', orderId.toString());
      });
    }

    return this.http.get<SaaoOrder[]>(this.apiUrl + 'report', { params: httpParams }).pipe(
      tap(orders => {
        this.ordersSignal.set(orders);
        this.loadingSignal.set(false);
        this.calculateStats(orders);
      }),
      catchError(error => {
        console.error('❌ Error cargando reporte SAAO desde API:', error);
        this.errorSignal.set('Error al cargar el reporte SAAO. Por favor intenta nuevamente.');
        this.loadingSignal.set(false);
        return of([]);
      })
    );
  }

  /**
   * Obtener órdenes con filtros (DEPRECADO - usar getSaaoReport)
   * @deprecated Usar getSaaoReport para consultar el endpoint real del API
   */
  getOrders(filters?: SaaoFilters): Observable<SaaoOrder[]> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    if (filters) {
      this.filtersSignal.set(filters);
    }

    let params = new HttpParams();

    // Aplicar filtros si existen
    const currentFilters = filters || this.filtersSignal();
    if (currentFilters.fechaInicio) {
      params = params.set('fechaInicio', currentFilters.fechaInicio);
    }
    if (currentFilters.fechaFin) {
      params = params.set('fechaFin', currentFilters.fechaFin);
    }
    if (currentFilters.driverId) {
      params = params.set('driverId', currentFilters.driverId);
    }
    if (currentFilters.restaurante) {
      params = params.set('restaurante', currentFilters.restaurante);
    }
    if (currentFilters.conIncidentes !== undefined) {
      params = params.set('conIncidentes', String(currentFilters.conIncidentes));
    }
    if (currentFilters.minMinutos !== undefined) {
      params = params.set('minMinutos', String(currentFilters.minMinutos));
    }
    if (currentFilters.maxMinutos !== undefined) {
      params = params.set('maxMinutos', String(currentFilters.maxMinutos));
    }

    return this.http.get<SaaoOrder[]>(this.apiUrl + 'orders', { params }).pipe(
      tap(orders => {
        this.ordersSignal.set(orders);
        this.loadingSignal.set(false);
        this.calculateStats(orders);
      }),
      catchError(error => {
        console.error('❌ Error cargando órdenes SAAO:', error);
        this.errorSignal.set('Error al cargar las órdenes. Por favor intenta nuevamente.');
        this.loadingSignal.set(false);
        return of([]);
      })
    );
  }

  /**
   * Obtener estadísticas globales
   */
  getStats(filters?: SaaoFilters): Observable<SaaoStatsResponse> {
    this.loadingSignal.set(true);

    let params = new HttpParams();
    if (filters?.fechaInicio) params = params.set('fechaInicio', filters.fechaInicio);
    if (filters?.fechaFin) params = params.set('fechaFin', filters.fechaFin);

    return this.http.get<SaaoStatsResponse>(this.apiUrl + 'stats', { params }).pipe(
      tap(response => {
        if (response.success) {
          this.driverStatsSignal.set(response.drivers);
          this.restaurantStatsSignal.set(response.restaurants);
        }
        this.loadingSignal.set(false);
      }),
      catchError(error => {
        console.error('❌ Error cargando estadísticas:', error);
        this.errorSignal.set('Error al cargar estadísticas.');
        this.loadingSignal.set(false);
        return of({
          success: false,
          drivers: [],
          restaurants: [],
          totalOrdenes: 0,
          totalIncidentes: 0,
          promedioGlobalMinutos: 0
        });
      })
    );
  }

  /**
   * Calcular estadísticas localmente desde las órdenes cargadas
   */
  private calculateStats(orders: SaaoOrder[]): void {
    // Estadísticas por driver
    const driverMap = new Map<number, DriverStats>();

    orders.forEach(order => {
      if (!driverMap.has(order.driverId)) {
        driverMap.set(order.driverId, {
          driver_id: order.driverId,
          DriverId: order.driverCode,
          Nombre: order.driverNombre,
          totalOrdenes: 0,
          ordenesConIncidentes: 0,
          promedioMinutosAsignacion: 0,
          totalMinutosAsignacion: 0,
          ordenesRapidas: 0,
          ordenesLentas: 0
        });
      }

      const stats = driverMap.get(order.driverId)!;
      stats.totalOrdenes++;
      stats.totalMinutosAsignacion += order.minutos;

      if (hasIncident(order)) {
        stats.ordenesConIncidentes++;
      }

      const category = getTimingCategory(order.minutos);
      if (category === 'RAPIDA') {
        stats.ordenesRapidas++;
      } else {
        stats.ordenesLentas++;
      }
    });

    // Calcular promedios
    driverMap.forEach(stats => {
      stats.promedioMinutosAsignacion = Math.round(
        stats.totalMinutosAsignacion / stats.totalOrdenes
      );
    });

    this.driverStatsSignal.set(Array.from(driverMap.values()));

    // Estadísticas por restaurante
    const restaurantMap = new Map<string, RestaurantStats>();

    orders.forEach(order => {
      if (!restaurantMap.has(order.storeShortName)) {
        restaurantMap.set(order.storeShortName, {
          shortname: order.storeShortName,
          totalOrdenes: 0,
          ordenesConIncidentes: 0,
          promedioMinutosAsignacion: 0,
          driversUnicos: 0
        });
      }

      const stats = restaurantMap.get(order.storeShortName)!;
      stats.totalOrdenes++;

      if (hasIncident(order)) {
        stats.ordenesConIncidentes++;
      }
    });

    // Calcular drivers únicos y promedio de minutos por restaurante
    restaurantMap.forEach((stats, shortname) => {
      const restaurantOrders = orders.filter(o => o.storeShortName === shortname);
      const driverIds = new Set(restaurantOrders.map(o => o.driverId));
      stats.driversUnicos = driverIds.size;

      const totalMinutos = restaurantOrders.reduce((sum, o) => sum + o.minutos, 0);
      stats.promedioMinutosAsignacion = Math.round(totalMinutos / restaurantOrders.length);
    });

    this.restaurantStatsSignal.set(Array.from(restaurantMap.values()));
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.filtersSignal.set({});
  }

  /**
   * Actualizar filtros
   */
  updateFilters(filters: Partial<SaaoFilters>): void {
    this.filtersSignal.update(current => ({ ...current, ...filters }));
  }

  /**
   * Limpiar state
   */
  clear(): void {
    this.ordersSignal.set([]);
    this.driverStatsSignal.set([]);
    this.restaurantStatsSignal.set([]);
    this.errorSignal.set(null);
    this.filtersSignal.set({});
  }

  /**
   * Exportar datos
   */
  exportData(formato: 'excel' | 'csv' | 'pdf', orders: SaaoOrder[]): void {
    // Implementar lógica de exportación
    // TODO: Implementar exportación real
  }

  /**
   * Obtener lista de ciudades para el filtro
   * GET /api/Location/Cities
   */
  getCities(): Observable<CityOption[]> {
    return this.http.get<CityOption[]>(this.locationApiUrl + 'Cities').pipe(
      tap(cities => console.log('✅ Ciudades cargadas:', cities.length)),
      catchError(error => {
        console.error('❌ Error cargando ciudades:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener lista de marcas para el filtro
   * GET /api/Brand/BrandsListSorted
   */
  getBrands(): Observable<BrandOption[]> {
    return this.http.get<BrandOption[]>(this.brandApiUrl + 'BrandsListSorted').pipe(
      tap(brands => console.log('✅ Marcas cargadas:', brands.length)),
      catchError(error => {
        console.error('❌ Error cargando marcas:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener drivers por ciudad
   * GET /api/Driver/DriverByCity/summary?cityId={cityId}
   */
  getDriversByCity(cityId: number): Observable<DriverOption[]> {
    const params = new HttpParams().set('cityId', cityId.toString());
    return this.http.get<DriverOption[]>(this.driverApiUrl + 'DriverByCity/summary', { params }).pipe(
      tap(drivers => console.log(`✅ Drivers cargados para ciudad ${cityId}:`, drivers.length)),
      catchError(error => {
        console.error('❌ Error cargando drivers por ciudad:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener stores/restaurantes por ciudad
   * GET /api/Restaurant/UnlinkedRestaurants?cityId={cityId}
   * Nota: Ajustar el endpoint según el API real disponible
   */
  getStoresByCity(cityId: number): Observable<StoreOption[]> {
    const params = new HttpParams().set('cityCode', cityId.toString());
    return this.http.get<StoreOption[]>(this.storeApiUrl + 'UnlinkedRestaurants', { params }).pipe(
      tap(stores => console.log(`✅ Stores cargados para ciudad ${cityId}:`, stores.length)),
      catchError(error => {
        console.error('❌ Error cargando stores por ciudad:', error);
        return of([]);
      })
    );
  }



/**
 *  Obtener estado actual de un driver
 *
 * @param driverId
 * @returns
 */
getDriverStatus(driverId: number): Observable<DriverStatus | null> {
  return this.http.get<DriverStatus>(`${this.driverApiUrl}status/${driverId}`).pipe(
    catchError(error => {
      console.error('❌ Error cargando estado del driver:', error);
      return of(null);
    })
  );
}

/**
 * Obtener cantidad de drivers activos para un restaurante específico
 * GET Driver/activeByStore/{storeId}
 *
 * @param storeId ID del restaurante
 * @returns Observable con el número de drivers activos
 */
getActiveDriversByStore(storeId: number): Observable<{ activeDrivers: number }> {
  return this.http.get<{ activeDrivers: number }>(`${this.driverApiUrl}activeByStore/${storeId}`).pipe(
    catchError(error => {
      console.error('❌ Error obteniendo drivers activos por restaurante:', error);
      return of({ activeDrivers: 0 });
    })
  );
}

/**
 * Obtener coordenadas de una orden específica
 * GET OrderTracking/orders/coordinates?orderId={orderId}
 *
 * @param orderId ID de la orden
 * @returns Observable con las coordenadas de la orden
 */
getOrderCoordinates(orderId: number): Observable<{ lat: number; lng: number } | null> {
  const orderTrackingUrl = environment.apiURL + 'OrderTracking/orders/';
  return this.http.get<{ lat: number; lng: number }>(`${orderTrackingUrl}coordinates`, {
    params: { orderId: orderId.toString() }
  }).pipe(
    catchError(error => {
      console.error('❌ Error obteniendo coordenadas de la orden:', error);
      return of(null);
    })
  );
}

}
