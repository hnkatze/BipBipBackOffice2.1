import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataService } from '@core/services/data.service';
import type {
  Restaurant,
  RestaurantListResponse,
  StatusFilter,
  RestaurantFilters,
  Country,
  City,
  RestaurantDetails,
  CreateRestaurantRequest,
  UpdateRestaurantRequest,
  Brand
} from '../models/restaurant.model';
import type {
  Scale,
  CreateScaleRequest,
  UpdateScaleRequest
} from '../models/scale.model';
import type {
  RESTSchedule,
  UpdateSchedule
} from '../models/schedule.model';
import type {
  RestaurantConfig,
  CreateConfigRequest,
  UpdateConfigRequest
} from '../models/restaurant-config.model';
import type {
  CreateCoverageZoneRequest,
  UpdateCoverageZoneRequest
} from '../models/coverage-zone.model';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private readonly dataService = inject(DataService);

  // Signals for state management
  readonly restaurants = signal<Restaurant[]>([]);
  readonly totalRecords = signal<number>(0);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly isLoading = signal<boolean>(false);
  readonly statusFilters = signal<StatusFilter[]>([
    { idStatus: -1, label: 'Todos', filter: null, qty: 0 },
    { idStatus: 1, label: 'Activos', filter: 'true', qty: 0 },
    { idStatus: 0, label: 'Inactivos', filter: 'false', qty: 0 }
  ]);

  // Reference data
  readonly countries = signal<Country[]>([]);
  readonly cities = signal<City[]>([]);
  readonly brands = signal<Brand[]>([]);

  // Restaurant detail
  readonly restaurantDetail = signal<RestaurantDetails | null>(null);
  readonly isLoadingDetail = signal<boolean>(false);

  // Scales
  readonly scales = signal<Scale[]>([]);
  readonly isLoadingScales = signal<boolean>(false);

  // Schedules
  readonly schedules = signal<RESTSchedule[]>([]);
  readonly isLoadingSchedules = signal<boolean>(false);

  // Configurations
  readonly restaurantConfig = signal<RestaurantConfig | null>(null);
  readonly isLoadingConfig = signal<boolean>(false);

  /**
   * Get restaurants list with pagination and filters
   */
  getRestaurants(filters: RestaurantFilters): Observable<RestaurantListResponse> {
    this.isLoading.set(true);

    // Build query params
    const params: string[] = [];

    // Required parameters
    params.push(`pageNumber=${filters.page + 1}`); // API uses 1-based pagination
    params.push(`pageSize=${filters.pageSize}`);

    // Optional: StatusActive (only send if true)
    if (filters.statusActive === true) {
      params.push(`StatusActive=true`);
    }

    // Optional: StatusInactive (only send if true)
    if (filters.statusInactive === true) {
      params.push(`StatusInactive=true`);
    }

    // Optional: Countries array
    if (filters.countries && filters.countries.length > 0) {
      filters.countries.forEach(countryId => {
        params.push(`Countries=${countryId}`);
      });
    }

    // Optional: Cities array
    if (filters.cities && filters.cities.length > 0) {
      filters.cities.forEach(cityId => {
        params.push(`Cities=${cityId}`);
      });
    }

    // Optional: CustomParameter (search)
    if (filters.search && filters.search.trim()) {
      params.push(`CustomParameter=${encodeURIComponent(filters.search.trim())}`);
    }

    const url = `Restaurant/RestaurantsList?${params.join('&')}`;

    return this.dataService.get$<RestaurantListResponse>(url).pipe(
      tap({
        next: (response) => {
          this.restaurants.set(response.records);
          this.totalRecords.set(response.metadata.totalCount);
          this.currentPage.set(filters.page);

          // Update status filter counters
          this.updateStatusFilterCounters(response.metadata);

          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      })
    );
  }

  /**
   * Update status filter counters from metadata
   */
  private updateStatusFilterCounters(metadata: any): void {
    const filters = this.statusFilters();
    const updatedFilters = filters.map(filter => {
      if (filter.idStatus === -1) {
        return { ...filter, qty: metadata.totalCount };
      } else if (filter.idStatus === 1) {
        return { ...filter, qty: metadata.totalActive };
      } else {
        return { ...filter, qty: metadata.totalInactive };
      }
    });
    this.statusFilters.set(updatedFilters);
  }

  /**
   * Get list of countries
   */
  getCountries(): Observable<Country[]> {
    return this.dataService.get$<Country[]>('Location/CountryList').pipe(
      tap(countries => {
        this.countries.set(countries);
      })
    );
  }

  /**
   * Get list of all cities (lighter endpoint)
   */
  getCitiesList(): Observable<City[]> {
    return this.dataService.get$<City[]>('Location/CityList').pipe(
      tap(cities => {
        this.cities.set(cities);
      })
    );
  }

  /**
   * Reset filters to default state
   */
  resetFilters(): void {
    this.currentPage.set(0);
  }

  /**
   * Get restaurant detail by ID
   */
  getRestaurantDetail(id: number): Observable<RestaurantDetails> {
    this.isLoadingDetail.set(true);
    return this.dataService.get$<RestaurantDetails>(`Restaurant/RestaurantDetail?restId=${id}`).pipe(
      tap({
        next: (detail) => {
          this.restaurantDetail.set(detail);
          this.isLoadingDetail.set(false);
        },
        error: () => {
          this.isLoadingDetail.set(false);
        }
      })
    );
  }

  /**
   * Create a new restaurant
   */
  createRestaurant(data: CreateRestaurantRequest): Observable<any> {
    return this.dataService.post$('Restaurant/CreateRestaurant', data);
  }

  /**
   * Update an existing restaurant
   */
  updateRestaurant(id: number, data: UpdateRestaurantRequest): Observable<any> {
    return this.dataService.put$(`Restaurant/UpdateRestaurant`, { ...data, restId: id });
  }

  /**
   * Get list of brands
   */
  getBrands(): Observable<Brand[]> {
    return this.dataService.get$<Brand[]>('Brand/BrandList').pipe(
      tap(brands => {
        this.brands.set(brands);
      })
    );
  }

  /**
   * Get scales list for a restaurant
   */
  getScales(restId: number): Observable<Scale[]> {
    this.isLoadingScales.set(true);
    return this.dataService.get$<Scale[]>(`Restaurant/scales?idStore=${restId}`).pipe(
      tap({
        next: (scales) => {
          this.scales.set(scales);
          this.isLoadingScales.set(false);
        },
        error: () => {
          this.isLoadingScales.set(false);
        }
      })
    );
  }

  /**
   * Create a new scale
   */
  createScale(restId: number, data: CreateScaleRequest): Observable<Scale> {
    return this.dataService.post$<Scale>(`Restaurant/scales?idStore=${restId}`, data);
  }

  /**
   * Update an existing scale
   */
  updateScale(data: UpdateScaleRequest): Observable<Scale> {
    return this.dataService.put$<Scale>('Restaurant/scales', data);
  }

  /**
   * Delete a scale
   */
  deleteScale(restId: number, scaleId: number): Observable<any> {
    return this.dataService.delete$(`Restaurant/scales?idStore=${restId}&idScale=${scaleId}`);
  }

  /**
   * Update restaurant schedules
   * Updates operating hours for specified channels
   */
  updateSchedule(restId: number, data: UpdateSchedule[]): Observable<any> {
    return this.dataService.put$(`Restaurant/EditScheduleStore?IdStore=${restId}`, data);
  }

  /**
   * Get restaurant configurations
   */
  getRestaurantConfigs(restId: number): Observable<RestaurantConfig> {
    this.isLoadingConfig.set(true);
    return this.dataService.get$<RestaurantConfig>(`Restaurant/${restId}/configs`).pipe(
      tap({
        next: (config) => {
          this.restaurantConfig.set(config);
          this.isLoadingConfig.set(false);
        },
        error: () => {
          this.isLoadingConfig.set(false);
        }
      })
    );
  }

  /**
   * Create restaurant configurations
   */
  createRestaurantConfigs(restId: number, data: CreateConfigRequest): Observable<RestaurantConfig> {
    return this.dataService.post$<RestaurantConfig>(`Restaurant/${restId}/configs`, data).pipe(
      tap({
        next: (config) => {
          this.restaurantConfig.set(config);
        }
      })
    );
  }

  /**
   * Update restaurant configurations
   */
  updateRestaurantConfigs(restId: number, data: UpdateConfigRequest): Observable<RestaurantConfig> {
    return this.dataService.put$<RestaurantConfig>(`Restaurant/${restId}/configs`, data).pipe(
      tap({
        next: (config) => {
          this.restaurantConfig.set(config);
        }
      })
    );
  }

  /**
   * Create a new coverage zone
   */
  createCoverageZone(restId: number, data: CreateCoverageZoneRequest): Observable<any> {
    return this.dataService.post$(`Restaurant/CreateCoverageZone?IdStore=${restId}`, data);
  }

  /**
   * Update an existing coverage zone
   */
  updateCoverageZone(zoneId: number, restId: number, data: UpdateCoverageZoneRequest): Observable<any> {
    return this.dataService.put$(`Restaurant/UpdateCoverageZone?Id=${zoneId}&IdStore=${restId}`, data);
  }

  /**
   * Delete a coverage zone
   */
  deleteCoverageZone(zoneId: number): Observable<any> {
    return this.dataService.delete$(`Restaurant/DeleteCoverageZone?Id=${zoneId}`);
  }

  /**
   * Toggle delivery status (publish)
   * Controls if the restaurant can receive delivery orders
   */
  toggleDeliveryStatus(storeId: number): Observable<any> {
    return this.dataService.put$(`Restaurant/toggle-delivery-status?storeId=${storeId}`, {});
  }

  /**
   * Toggle store status (active)
   * Controls if the restaurant can receive delivery + takeaway orders
   */
  toggleStoreStatus(storeId: number): Observable<any> {
    return this.dataService.put$(`Restaurant/toggle-store-status?storeId=${storeId}`, {});
  }
}
