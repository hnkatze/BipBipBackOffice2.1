import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import { City, Driver } from '../models/settlements-delivery.model';

/**
 * Servicio para gestionar liquidaciones por delivery
 *
 * Usa el patrón DataService para operaciones HTTP consistentes
 */
@Injectable({
  providedIn: 'root'
})
export class SettlementsDeliveryService {
  private readonly dataService = inject(DataService);

  /**
   * Obtiene la lista de ciudades disponibles
   */
  getCities(): Observable<City[]> {
    return this.dataService.get$<City[]>('Location/Cities');
  }

  /**
   * Obtiene la lista de drivers/repartidores de una ciudad específica
   * @param cityId ID de la ciudad
   */
  getDriversByCity(cityId: number): Observable<Driver[]> {
    const params = { cityId: cityId.toString() };
    return this.dataService.get$<Driver[]>('Driver/DriverByCity/summary', params);
  }

  /**
   * Genera reporte PDF de liquidaciones por delivery
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: backoffice/reporteliquidacionesxdriver/{fechaInicio}/{fechaFin}/{driverId}/1
   * @returns Base64 string del PDF
   */
  generatePDFReport(
    fechaInicio: string,
    fechaFin: string,
    driverId: number
  ): Observable<string> {
    const endpoint = `backoffice/reporteliquidacionesxdriver/${fechaInicio}/${fechaFin}/${driverId}/1`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel de liquidaciones por delivery
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: backoffice/reporteliquidacionesxdriver/{fechaInicio}/{fechaFin}/{driverId}/2
   * @returns Base64 string del Excel
   */
  generateExcelReport(
    fechaInicio: string,
    fechaFin: string,
    driverId: number
  ): Observable<string> {
    const endpoint = `backoffice/reporteliquidacionesxdriver/${fechaInicio}/${fechaFin}/${driverId}/2`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }
}
