import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../../../../../core/services/data.service';
import { AwardsReportParams } from '../models/awards.model';

/**
 * Servicio para gestionar reportes de premiaciones
 */
@Injectable({
  providedIn: 'root'
})
export class AwardsService {
  private dataService = inject(DataService);

  /**
   * Genera el reporte de premiaciones en formato Excel
   * NOTA: Este endpoint usa apiURLReports (servidor de reportes separado)
   *
   * @param params Parámetros del reporte
   * @returns Base64 string del archivo Excel
   */
  generateAwardsReport(params: AwardsReportParams): Observable<string> {
    // Construir query params
    const queryParams: any = {
      fechaInicio: params.fechaInicio,
      fechaFinal: params.fechaFinal
    };

    // Agregar top si existe
    if (params.top) {
      queryParams.top = params.top.toString();
    }

    // Agregar marcas como parámetros múltiples (marcas=1&marcas=2&marcas=3)
    params.marcas.forEach(marcaId => {
      if (!queryParams.marcas) {
        queryParams.marcas = [];
      }
      queryParams.marcas.push(marcaId.toString());
    });

    // Agregar ciudades como parámetros múltiples (ciudades=1&ciudades=2)
    params.ciudades.forEach(cityId => {
      if (!queryParams.ciudades) {
        queryParams.ciudades = [];
      }
      queryParams.ciudades.push(cityId.toString());
    });

    return this.dataService.get$<string>('Reports/Awards/Excel', queryParams);
  }
}
