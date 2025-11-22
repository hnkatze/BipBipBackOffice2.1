import { Injectable, inject, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { TransactionReportParams } from '../models/transaction-report.model';
import { exportExcelXLSX } from '@features/reports/utils/report-export.utils';
import { DataService } from '@core/services/data.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionReportsService {
  private readonly dataService = inject(DataService);

  // Señales para estados
  private downloadingSignal = signal(false);
  readonly downloading = this.downloadingSignal.asReadonly();

  downloadExcel(params: TransactionReportParams): Observable<void> {
    this.downloadingSignal.set(true);

    console.log('📊 [Transaction Reports] Descargando reporte con fechas:', params);

    // Llamar endpoint usando DataService (fechas en formato YYYY-MM-DD)
    return this.dataService.get$<string>(
      'Reports/Reports/Weekly/Excel',
      {
        fechaInicio: params.fechaInicio,
        fechaFinal: params.fechaFinal
      }
    ).pipe(
      tap(base64Response => {
        // Limpiar base64
        let cleanedBase64 = base64Response.trim();

        // Si viene como JSON string, parsear
        if (cleanedBase64.startsWith('"') && cleanedBase64.endsWith('"')) {
          cleanedBase64 = JSON.parse(cleanedBase64);
        }

        // Remover espacios y saltos de línea
        cleanedBase64 = cleanedBase64.replace(/[\r\n\s]+/g, '');

        // Generar nombre de archivo con fechas
        const fechaInicioSimple = params.fechaInicio.split('T')[0];
        const fechaFinalSimple = params.fechaFinal.split('T')[0];
        const fileName = `Reportes_Transacciones_${fechaInicioSimple}_${fechaFinalSimple}`;

        // Usar utilidad compartida para descargar
        exportExcelXLSX(cleanedBase64, fileName);

        console.log('✅ [Transaction Reports] Reporte descargado exitosamente');
      }),
      map(() => undefined), // Retornar void
      catchError(error => this.handleError(error)),
      finalize(() => this.downloadingSignal.set(false))
    );
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Ha ocurrido un error al descargar el reporte';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 400:
          errorMessage = 'Parámetros inválidos. Verifica las fechas seleccionadas.';
          break;
        case 401:
          errorMessage = 'No estás autorizado para descargar este reporte.';
          break;
        case 404:
          errorMessage = 'No se encontró el reporte solicitado.';
          break;
        case 500:
          errorMessage = 'Error del servidor. Intenta nuevamente más tarde.';
          break;
        default:
          errorMessage = error.error?.message || 'Error desconocido al descargar el reporte.';
      }
    }

    console.error('❌ [Transaction Reports] Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
