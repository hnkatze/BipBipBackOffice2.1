import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '@core/services/data.service';
import {
  RegisteredDriverListItem,
  RegisteredDriverListItemResponse,
  RegisteredDriverListResponse,
  RegisteredDriverMetadata,
  RegisteredDriverFilters,
  RegisteredDriverDetail,
  UpdateDriverRequest,
  PenalizeDriverRequest,
  AddCouponRequest,
  PenaltyReason
} from '../models/registered-driver.model';
import {
  Headquarter,
  Bank,
  BloodType,
  PaymentMethodCatalog,
  Country,
  City
} from '../models/driver-catalogs.model';

/**
 * Servicio para gestión de drivers registrados
 *
 * Features:
 * - ✅ Lista paginada con filtros avanzados
 * - ✅ Detalle completo del driver
 * - ✅ Actualizar driver
 * - ✅ Activar/Inactivar driver
 * - ✅ Eliminar driver
 * - ✅ Búsqueda con filtros
 */
@Injectable({
  providedIn: 'root'
})
export class RegisteredDriverService {
  private readonly dataService = inject(DataService);

  /**
   * Obtener lista de drivers con paginación y filtros
   *
   * @param page - Número de página (base 1)
   * @param pageSize - Cantidad de items por página
   * @param filters - Filtros opcionales (status, search, dates, countries, cities)
   * @returns Observable con data y metadata
   */
  getDriversList(
    page: number,
    pageSize: number,
    filters?: RegisteredDriverFilters
  ): Observable<{ data: RegisteredDriverListItem[]; metadata: RegisteredDriverMetadata }> {
    let params: Record<string, string | number> = {
      pageNumber: page,
      pageSize: pageSize
    };

    // Agregar filtro por status si existe
    if (filters?.status) {
      params['status'] = filters.status;
    }

    // Agregar filtro de búsqueda si existe
    if (filters?.search && filters.search.trim()) {
      params['filter'] = filters.search.trim();
    }

    // Agregar filtro de fechas si existe
    if (filters?.dateFrom) {
      params['from'] = filters.dateFrom;
    }
    if (filters?.dateTo) {
      params['to'] = filters.dateTo;
    }

    // Construir query params para arrays (countries y cities)
    let url = 'Driver/DriverRegisteredList';
    const queryParams: string[] = [];

    Object.keys(params).forEach(key => {
      queryParams.push(`${key}=${params[key]}`);
    });

    if (filters?.countries && filters.countries.length > 0) {
      filters.countries.forEach(countryId => {
        queryParams.push(`Countries=${countryId}`);
      });
    }

    if (filters?.cities && filters.cities.length > 0) {
      filters.cities.forEach(cityId => {
        queryParams.push(`Cities=${cityId}`);
      });
    }

    const fullUrl = `${url}?${queryParams.join('&')}`;

    return this.dataService
      .get$<RegisteredDriverListResponse>(fullUrl, {})
      .pipe(
        map(response => ({
          data: response.records.map(item => this.mapListItem(item)),
          metadata: response.metadata
        }))
      );
  }

  // ============================================================================
  // PRIVATE MAPPERS
  // ============================================================================

  /**
   * Mapear item de lista desde el backend
   */
  private mapListItem(item: RegisteredDriverListItemResponse): RegisteredDriverListItem {
    return {
      id: item.driverId,
      driverCode: item.driverCode,
      name: item.driverFullName,
      status: item.driverStatus,
      cityId: item.idCity,
      cityName: item.cityName,
      countryId: item.idCountry,
      countryName: item.countryName,
      email: item.driverEmail,
      phone: item.driverPhone,
      dateRegis: item.driverCreatedAt,
      baseAsign: item.assignedHeadquarters,
      isPenalized: item.isPenalized ?? false
    };
  }

  /**
   * Obtener detalle completo de un driver por ID
   *
   * @param id - ID del driver
   * @returns Observable con el detalle
   */
  getDriverDetail(id: number): Observable<RegisteredDriverDetail> {
    return this.dataService.get$<RegisteredDriverDetail>('Driver/DriverById', {
      IdDriver: id
    });
  }

  /**
   * Actualizar información de un driver
   *
   * @param id - ID del driver
   * @param data - Datos a actualizar
   * @returns Observable void
   */
  updateDriver(id: number, data: UpdateDriverRequest): Observable<void> {
    return this.dataService.patch$<void>(`Driver/${id}`, data);
  }

  /**
   * Cambiar status de un driver (Activar/Inactivar)
   *
   * @param id - ID del driver
   * @param status - Nuevo status (true = activo, false = inactivo)
   * @returns Observable void
   */
  updateDriverStatus(id: number, status: boolean): Observable<void> {
    return this.dataService.put$<void>('Driver/status', {}, {
      driverId: id,
      status: status
    });
  }

  /**
   * Eliminar un driver
   *
   * @param id - ID del driver
   * @returns Observable void
   */
  deleteDriver(id: number): Observable<void> {
    return this.dataService.delete$<void>('Driver', {
      driverId: id
    });
  }

  /**
   * Recordar documentos al driver
   *
   * @param id - ID del driver
   * @returns Observable void
   */
  remindDocuments(id: number): Observable<void> {
    return this.dataService.get$<void>(`Driver/${id}/remind/documents`);
  }

  // ============================================================================
  // PENALTIES & COUPONS
  // ============================================================================

  /**
   * Penalizar un driver
   *
   * @param data - Datos de la penalización
   * @returns Observable void
   */
  penalizeDriver(data: PenalizeDriverRequest): Observable<void> {
    return this.dataService.post$<void>('Driver/penalize', {
      driverId: data.driverId,
      reasonId: data.reasonId,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate
    });
  }

  /**
   * Despenalizar un driver
   *
   * @param id - ID del driver
   * @returns Observable void
   */
  despenalizeDriver(id: number): Observable<void> {
    return this.dataService.delete$<void>('Driver/unpenalize', {
      driverId: id
    });
  }

  /**
   * Agregar cupones a un driver
   *
   * @param data - Datos del cupón
   * @returns Observable void
   */
  addCoupon(data: AddCouponRequest): Observable<void> {
    return this.dataService.post$<void>('Driver/coupon', {
      driverId: data.driverId,
      reason: data.reason,
      quantity: data.quantity
    });
  }

  /**
   * Obtener motivos de penalización (catálogo)
   *
   * @returns Observable con lista de motivos
   */
  getPenaltyReasons(): Observable<PenaltyReason[]> {
    return this.dataService.get$<PenaltyReason[]>('Driver/penalty-reasons');
  }

  // ============================================================================
  // CATALOGS
  // ============================================================================

  /**
   * Obtener lista de sedes/headquarters
   *
   * @returns Observable con lista de sedes
   */
  getHeadquarters(): Observable<Headquarter[]> {
    return this.dataService.get$<Headquarter[]>('Headquarter');
  }

  /**
   * Obtener lista de bancos
   *
   * @returns Observable con lista de bancos
   */
  getBanks(): Observable<Bank[]> {
    return this.dataService.get$<Bank[]>('Bank');
  }

  /**
   * Obtener tipos de sangre
   *
   * @returns Observable con lista de tipos de sangre
   */
  getBloodTypes(): Observable<BloodType[]> {
    return this.dataService.get$<BloodType[]>('BloodType');
  }

  /**
   * Obtener métodos de pago disponibles
   *
   * @returns Observable con lista de métodos de pago
   */
  getPaymentMethods(): Observable<PaymentMethodCatalog[]> {
    return this.dataService.get$<PaymentMethodCatalog[]>('PaymentMethod');
  }

  /**
   * Obtener lista de países
   *
   * @returns Observable con lista de países
   */
  getCountries(): Observable<Country[]> {
    return this.dataService.get$<Country[]>('Country');
  }

  /**
   * Obtener ciudades por país
   *
   * @param countryId - ID del país
   * @returns Observable con lista de ciudades
   */
  getCitiesByCountry(countryId: number): Observable<City[]> {
    return this.dataService.get$<City[]>('City/by-country', {
      countryId: countryId
    });
  }
}
