import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import { Headquarter } from '../models/by-base-operations.model';

/**
 * Servicio para gestionar planillas por base de operaciones
 *
 * Usa el patrón DataService para operaciones HTTP consistentes
 */
@Injectable({
  providedIn: 'root'
})
export class ByBaseOperationsService {
  private readonly dataService = inject(DataService);

  /**
   * Obtiene la lista de sedes/bases de operaciones
   */
  getHeadquarters(): Observable<Headquarter[]> {
    return this.dataService.get$<Headquarter[]>('Headquarter/summary');
  }

  /**
   * Genera reporte PDF de planilla por base de operaciones
   * @returns Base64 string del PDF
   */
  generatePDFReport(
    fechaInicio: string,
    fechaFin: string,
    codHeadquarter: number
  ): Observable<string> {
    const params = {
      fechaInicio,
      fechaFin,
      codheadquarter: codHeadquarter.toString()
    };
    return this.dataService.get$<string>('Reports/PlanillaBaseOperacionPDF', params);
  }

  /**
   * Genera reporte Excel de planilla por base de operaciones
   * @returns Base64 string del Excel
   */
  generateExcelReport(
    fechaInicio: string,
    fechaFin: string,
    codHeadquarter: number
  ): Observable<string> {
    const params = {
      fechaInicio,
      fechaFin,
      codheadquarter: codHeadquarter.toString()
    };
    return this.dataService.get$<string>('Reports/PlanillaBaseOperacion', params);
  }
}
