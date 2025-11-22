import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import { Brand, Store } from '../models/settlements-store.model';

/**
 * Servicio para gestionar liquidaciones por restaurante
 *
 * Usa el patrón DataService para operaciones HTTP consistentes
 */
@Injectable({
  providedIn: 'root'
})
export class SettlementsStoreService {
  private readonly dataService = inject(DataService);

  /**
   * Obtiene la lista de marcas disponibles ordenadas
   */
  getBrands(): Observable<Brand[]> {
    return this.dataService.get$<Brand[]>('Brand/BrandsListSorted');
  }

  /**
   * Obtiene la lista de tiendas/restaurantes de una marca específica
   * @param brandId ID de la marca
   */
  getStoresByBrand(brandId: number): Observable<Store[]> {
    const params = { brandId: brandId.toString() };
    return this.dataService.get$<Store[]>('Restaurant/shortNames', params);
  }

  /**
   * Genera reporte PDF de liquidación final
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: restaurante/liquidacionfinal/{fecha}/{storeName}/{storeId}
   * @param fecha Fecha en formato YYYY-M-D (sin zero-padding)
   * @param storeName Nombre corto del restaurante
   * @param storeId ID del restaurante
   * @returns Base64 string del PDF
   */
  generateFinalPDFReport(
    fecha: string,
    storeName: string,
    storeId: number
  ): Observable<string> {
    const endpoint = `restaurante/liquidacionfinal/${fecha}/${storeName}/${storeId}`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel de liquidación final
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: backoffice/reporteGeneral/{fecha}/{fecha}/2
   * @param fecha Fecha en formato YYYY-M-D
   * @returns Base64 string del Excel
   */
  generateFinalExcelReport(
    fecha: string,
    fecha2: string
  ): Observable<string> {
    const endpoint = `backoffice/reporteGeneral/${fecha}/${fecha2}/2`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte PDF de liquidación manual
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: restaurante/liquidacionfinalmanual/{fecha}/{storeName}/{storeId}
   * @param fecha Fecha en formato YYYY-M-D (sin zero-padding)
   * @param storeName Nombre corto del restaurante
   * @param storeId ID del restaurante
   * @returns Base64 string del PDF
   */
  generateManualPDFReport(
    fecha: string,
    storeName: string,
    storeId: number
  ): Observable<string> {
    const endpoint = `restaurante/liquidacionfinalmanual/${fecha}/${storeName}/${storeId}`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel de liquidación manual
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: backoffice/reporteplanillaDetalle/{fecha}/{fecha}/2
   * @param fecha Fecha en formato YYYY-M-D
   * @returns Base64 string del Excel
   */
  generateManualExcelReport(
    fecha: string,
    fecha2: string
  ): Observable<string> {
    const endpoint = `backoffice/reporteplanillaDetalle/${fecha}/${fecha2}/2`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }
}
