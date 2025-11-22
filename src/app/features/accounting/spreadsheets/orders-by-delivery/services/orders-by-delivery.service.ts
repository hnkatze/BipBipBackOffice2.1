import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import { City, Driver } from '../models/orders-by-delivery.model';

/**
 * Servicio para gestionar comandas por delivery
 *
 * Usa el patrón DataService para operaciones HTTP consistentes
 */
@Injectable({
  providedIn: 'root'
})
export class OrdersByDeliveryService {
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
   * Genera reporte PDF de comandas por delivery
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * @returns Base64 string del PDF
   */
  generatePDFReport(
    fechaInicio: string,
    fechaFin: string,
    driverId: number
  ): Observable<string> {
    // Formato del endpoint: backoffice/comandasxdriver/{fechaInicio}/{fechaFin}/{driverId}
    const endpoint = `backoffice/comandasxdriver/${fechaInicio}/${fechaFin}/${driverId}`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel de comandas por delivery
   * @returns Base64 string del Excel
   */
  generateExcelReport(
    fechaInicio: string,
    fechaFin: string,
    driverId: number
  ): Observable<string> {
    const params = {
      fechaInicio,
      fechaFin,
      driverId: driverId.toString()
    };
    return this.dataService.get$<string>('Reports/ComandasXDelivery', params);
  }
}
