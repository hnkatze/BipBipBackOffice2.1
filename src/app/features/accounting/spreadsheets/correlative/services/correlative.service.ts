import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '@core/services/data.service';
import { CorrelativeResponse, UpdateCorrelativeRequest } from '../models/correlative.model';

/**
 * Servicio para gestionar el correlativo de planillas
 *
 * Usa el patrón DataService para operaciones HTTP consistentes
 */
@Injectable({
  providedIn: 'root'
})
export class CorrelativeService {
  private readonly dataService = inject(DataService);

  /**
   * Obtiene el correlativo actual
   */
  getCorrelative(): Observable<CorrelativeResponse> {
    return this.dataService.get$<CorrelativeResponse>('Reports/ObtenerCorrelativo');
  }

  /**
   * Actualiza el correlativo
   */
  updateCorrelative(correlativo: number): Observable<any> {
    const body: UpdateCorrelativeRequest = { correlativo };
    return this.dataService.put$('Reports/ActualizarCorrelativo', body);
  }
}
