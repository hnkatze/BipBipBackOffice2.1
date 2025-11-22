import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import {
  DriverPaymentsResponse,
  Country,
  City,
  Headquarter
} from '../models/driver-payments.model';

/**
 * Servicio para gestionar pagos a drivers
 *
 * Usa el patrón DataService para operaciones HTTP consistentes
 */
@Injectable({
  providedIn: 'root'
})
export class DriverPaymentsService {
  private readonly dataService = inject(DataService);

  /**
   * Obtiene la lista paginada de pagos a drivers
   * @param pageNumber Número de página (1-indexed)
   * @param pageSize Tamaño de página
   * @param startDate Fecha inicio (opcional, formato yyyy-MM-dd)
   * @param endDate Fecha fin (opcional, formato yyyy-MM-dd)
   */
  getPaymentsList(
    pageNumber: number,
    pageSize: number,
    startDate?: string,
    endDate?: string
  ): Observable<DriverPaymentsResponse> {
    const params: Record<string, string> = {
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString()
    };

    if (startDate) {
      params['startDate'] = startDate;
    }
    if (endDate) {
      params['endDate'] = endDate;
    }

    return this.dataService.get$<DriverPaymentsResponse>('PaymentDriver', params);
  }

  /**
   * Obtiene la lista de países
   */
  getCountries(): Observable<Country[]> {
    return this.dataService.get$<Country[]>('Location/CountryList');
  }

  /**
   * Obtiene la lista de ciudades de un país específico
   * @param countryId ID del país
   */
  getCitiesByCountry(countryId: number): Observable<City[]> {
    const params = { idCountry: countryId.toString() };
    return this.dataService.get$<City[]>('Location/CityCountry', params);
  }

  /**
   * Obtiene la lista de bases de operación (headquarters)
   */
  getHeadquarters(): Observable<Headquarter[]> {
    return this.dataService.get$<Headquarter[]>('Headquarter/summary');
  }

  /**
   * Genera reporte PDF General
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato: backoffice/reporteGeneral/{fechaInicio}/{fechaFin}/1
   * @returns Base64 string del PDF
   */
  generateGeneralPDFReport(fechaInicio: string, fechaFin: string): Observable<string> {
    const endpoint = `backoffice/reporteGeneral/${fechaInicio}/${fechaFin}/1`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel General
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato: backoffice/reporteGeneral/{fechaInicio}/{fechaFin}/2
   * @returns Base64 string del Excel
   */
  generateGeneralExcelReport(fechaInicio: string, fechaFin: string): Observable<string> {
    const endpoint = `backoffice/reporteGeneral/${fechaInicio}/${fechaFin}/2`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte PDF Detalle
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato: backoffice/reporteplanillaDetalle/{fechaInicio}/{fechaFin}/1
   * @returns Base64 string del PDF
   */
  generateDetailPDFReport(fechaInicio: string, fechaFin: string): Observable<string> {
    const endpoint = `backoffice/reporteplanillaDetalle/${fechaInicio}/${fechaFin}/1`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel Detalle
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato: backoffice/reporteplanillaDetalle/{fechaInicio}/{fechaFin}/2
   * @returns Base64 string del Excel
   */
  generateDetailExcelReport(fechaInicio: string, fechaFin: string): Observable<string> {
    const endpoint = `backoffice/reporteplanillaDetalle/${fechaInicio}/${fechaFin}/2`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte PDF por Base de Operaciones
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato: reporteria/planillaBaseO/{fechaInicio}/{fechaFin}/1
   * @returns Base64 string del PDF
   */
  generateBaseOpsPDFReport(fechaInicio: string, fechaFin: string): Observable<string> {
    const endpoint = `reporteria/planillaBaseO/${fechaInicio}/${fechaFin}/1`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel por Base de Operaciones
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato: reporteria/planillaBaseO/{fechaInicio}/{fechaFin}/2
   * @returns Base64 string del Excel
   */
  generateBaseOpsExcelReport(fechaInicio: string, fechaFin: string): Observable<string> {
    const endpoint = `reporteria/planillaBaseO/${fechaInicio}/${fechaFin}/2`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera archivo TXT en formato BAC (Banco de América Central)
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato: backoffice/CreatePRNFile/{fechaInicio}/{fechaFin}/3/5
   * @returns Base64 string del archivo TXT
   */
  generateBACFormat(fechaInicio: string, fechaFin: string): Observable<string> {
    const endpoint = `backoffice/CreatePRNFile/${fechaInicio}/${fechaFin}/3/5`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }
}
