import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import { Brand, Store } from '../models/food-deliveries.model';

/**
 * Servicio para gestionar alimentación de deliveries
 *
 * Usa el patrón DataService para operaciones HTTP consistentes
 */
@Injectable({
  providedIn: 'root'
})
export class FoodDeliveriesService {
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
   * Genera reporte PDF de alimentación de deliveries
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: backoffice/reportealimentacion/{fechaInicio}/{fechaFin}/1
   * El parámetro 1 indica formato PDF
   * @param fechaInicio Fecha inicio en formato yyyy-MM-dd
   * @param fechaFin Fecha fin en formato yyyy-MM-dd
   * @returns Base64 string del PDF
   */
  generatePDFReport(
    fechaInicio: string,
    fechaFin: string
  ): Observable<string> {
    const endpoint = `backoffice/reportealimentacion/${fechaInicio}/${fechaFin}/1`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }

  /**
   * Genera reporte Excel de alimentación de deliveries
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   * Formato endpoint: backoffice/reportealimentacion/{fechaInicio}/{fechaFin}/2
   * El parámetro 2 indica formato Excel
   * @param fechaInicio Fecha inicio en formato yyyy-MM-dd
   * @param fechaFin Fecha fin en formato yyyy-MM-dd
   * @returns Base64 string del Excel
   */
  generateExcelReport(
    fechaInicio: string,
    fechaFin: string
  ): Observable<string> {
    const endpoint = `backoffice/reportealimentacion/${fechaInicio}/${fechaFin}/2`;
    return this.dataService.get$<string>(endpoint, undefined, 'apiURLReports');
  }
}
