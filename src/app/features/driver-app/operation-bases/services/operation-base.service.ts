import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import {
  OperationBase,
  OperationBaseListResponse,
  OperationBaseDetail,
  OperationBaseFilters,
  Country,
  City,
  Brand,
  RestaurantForBase,
  DriverUnassigned,
  EditOperationBaseRequest,
  BoxDetails,
} from '../models/operation-base.model';

/**
 * Service para gestionar bases de operaciones
 */
@Injectable({
  providedIn: 'root',
})
export class OperationBaseService {
  private readonly dataService = inject(DataService);

  // ============================================================================
  // OPERATION BASES - CRUD
  // ============================================================================

  /**
   * Obtener listado de bases SIN paginación (para el mapa)
   * @param filters Filtros opcionales (países, ciudades, marcas)
   * @param search Búsqueda por nombre o dirección
   */
  getOperationBases(
    filters?: OperationBaseFilters,
    search?: string
  ): Observable<OperationBase[]> {
    let queryParams = '';

    // Construir query params de filtros
    if (filters?.countryIds && filters.countryIds.length > 0) {
      filters.countryIds.forEach((countryId) => {
        queryParams += `Countries=${countryId}&`;
      });
    }

    if (filters?.cityIds && filters.cityIds.length > 0) {
      filters.cityIds.forEach((cityId) => {
        queryParams += `Cities=${cityId}&`;
      });
    }

    if (filters?.brandIds && filters.brandIds.length > 0) {
      filters.brandIds.forEach((brandId) => {
        queryParams += `Brands=${brandId}&`;
      });
    }

    if (search) {
      queryParams += `Filter=${encodeURIComponent(search)}&`;
    }

    // Remover el último '&'
    queryParams = queryParams.slice(0, -1);

    const url = queryParams
      ? `Headquarter/GetHeadquarters?${queryParams}`
      : 'Headquarter/GetHeadquarters';

    return this.dataService.get$<OperationBase[]>(url);
  }

  /**
   * Obtener listado de bases CON paginación (para la tabla)
   * @param page Número de página
   * @param pageSize Tamaño de página
   * @param filters Filtros opcionales
   * @param search Búsqueda por nombre o dirección
   */
  getOperationBasesPaginated(
    page: number,
    pageSize: number,
    filters?: OperationBaseFilters,
    search?: string
  ): Observable<OperationBaseListResponse> {
    let queryParams = `pageNumber=${page}&pageSize=${pageSize}&`;

    // Construir query params de filtros
    if (filters?.countryIds && filters.countryIds.length > 0) {
      filters.countryIds.forEach((countryId) => {
        queryParams += `Countries=${countryId}&`;
      });
    }

    if (filters?.cityIds && filters.cityIds.length > 0) {
      filters.cityIds.forEach((cityId) => {
        queryParams += `Cities=${cityId}&`;
      });
    }

    if (filters?.brandIds && filters.brandIds.length > 0) {
      filters.brandIds.forEach((brandId) => {
        queryParams += `Brands=${brandId}&`;
      });
    }

    if (search) {
      queryParams += `Filter=${encodeURIComponent(search)}&`;
    }

    // Remover el último '&'
    queryParams = queryParams.slice(0, -1);

    return this.dataService.get$<OperationBaseListResponse>(
      `Headquarter/HeadquarterList?${queryParams}`
    );
  }

  /**
   * Obtener detalles de una base de operaciones
   * @param id ID de la base
   */
  getOperationBaseDetail(id: number): Observable<OperationBaseDetail> {
    return this.dataService.get$<OperationBaseDetail>(
      `Headquarter/HeadquarterDetailList?CodHeadquarter=${id}`
    );
  }

  /**
   * Crear una nueva base de operaciones
   * @param data Datos de la base a crear
   */
  createOperationBase(data: BoxDetails): Observable<any> {
    return this.dataService.post$('Headquarter/CreateHeadquarter', data);
  }

  /**
   * Editar una base de operaciones existente
   * @param data Datos de la base a editar
   */
  editOperationBase(data: EditOperationBaseRequest): Observable<any> {
    return this.dataService.put$('Headquarter', data);
  }

  // ============================================================================
  // CATÁLOGOS
  // ============================================================================

  /**
   * Obtener lista de países
   */
  getCountries(): Observable<Country[]> {
    return this.dataService.get$<Country[]>('Location/CountryList');
  }

  /**
   * Obtener ciudades por país
   * @param countryId ID del país
   */
  getCitiesByCountry(countryId: number): Observable<City[]> {
    return this.dataService.get$<City[]>(
      `Location/CityCountry?idCountry=${countryId}`
    );
  }

  /**
   * Obtener lista de marcas/restaurantes
   */
  getBrands(): Observable<Brand[]> {
    return this.dataService.get$<Brand[]>('Brand/BrandList');
  }

  // ============================================================================
  // RESTAURANTES Y DRIVERS
  // ============================================================================

  /**
   * Obtener restaurantes sin asociar a una base (para crear nueva base)
   * @param cityId ID de la ciudad
   */
  getUnlinkedRestaurants(cityId: number): Observable<RestaurantForBase[]> {
    return this.dataService.get$<RestaurantForBase[]>(
      `Restaurant/UnlinkedRestaurants?cityCode=${cityId}`
    );
  }

  /**
   * Obtener drivers sin asociar a una base (para asignar a base)
   * @param cityId ID de la ciudad
   */
  getUnlinkedDrivers(cityId: number): Observable<DriverUnassigned[]> {
    return this.dataService.get$<DriverUnassigned[]>(
      `Driver/unlinkedDrivers?cityCode=${cityId}`
    );
  }
}
