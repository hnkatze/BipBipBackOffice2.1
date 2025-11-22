import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataService } from '../../../../../core/services/data.service';
import {
  DriverSummary,
  PayrollCommandsResponse,
  DriverAdjustmentsResponse,
  DriverAdjustmentRequest
} from '../models/payroll-adjustment.model';

/**
 * Servicio para gestionar ajustes de planilla
 */
@Injectable({
  providedIn: 'root'
})
export class PayrollAdjustmentService {
  private dataService = inject(DataService);

  /**
   * Obtiene la lista de drivers de una ciudad
   * @param cityId ID de la ciudad
   * @returns Lista de drivers resumidos
   */
  getDriversByCity(cityId: number): Observable<DriverSummary[]> {
    const params = { cityId: cityId.toString() };
    return this.dataService.get$<DriverSummary[]>('Driver/DriverByCity/summary', params);
  }

  /**
   * Obtiene la lista de comandas (órdenes de pago) con filtros y paginación
   * @param pageNumber Número de página (1-based para backend)
   * @param pageSize Tamaño de página
   * @param driverCode Código del driver (opcional)
   * @param startDate Fecha inicio ISO string (opcional)
   * @param endDate Fecha fin ISO string (opcional)
   * @param filter Búsqueda general (opcional)
   * @returns Response paginada con comandas
   */
  getPayrollCommands(
    pageNumber: number,
    pageSize: number,
    driverCode?: string,
    startDate?: string,
    endDate?: string,
    filter?: string
  ): Observable<PayrollCommandsResponse> {
    const params: any = {
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString()
    };

    if (driverCode) params.driverCode = driverCode;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (filter) params.filter = filter;

    return this.dataService.get$<PayrollCommandsResponse>('Driver/commands', params);
  }

  /**
   * Obtiene los ajustes de un driver con paginación
   * @param driverId ID del driver
   * @param pageNumber Número de página (1-based)
   * @param pageSize Tamaño de página
   * @returns Response paginada con ajustes
   */
  getDriverAdjustments(
    driverId: number,
    pageNumber: number,
    pageSize: number
  ): Observable<DriverAdjustmentsResponse> {
    const params = {
      pageNumber: pageNumber.toString(),
      pageSize: pageSize.toString()
    };

    return this.dataService.get$<DriverAdjustmentsResponse>(
      `Driver/${driverId}/payroll-adjustments`,
      params
    );
  }

  /**
   * Crea un nuevo ajuste de driver
   * @param data Datos del ajuste
   * @returns Ajuste creado
   */
  createDriverAdjustment(data: DriverAdjustmentRequest): Observable<any> {
    return this.dataService.post$('Driver/payroll-adjustments', data);
  }

  /**
   * Actualiza un ajuste existente
   * @param adjustmentId ID del ajuste
   * @param data Datos actualizados
   * @returns Ajuste actualizado
   */
  updateDriverAdjustment(
    adjustmentId: number,
    data: DriverAdjustmentRequest
  ): Observable<any> {
    return this.dataService.put$(`Driver/payroll-adjustments/${adjustmentId}`, data);
  }

  /**
   * Elimina un ajuste
   * @param adjustmentId ID del ajuste
   * @returns Observable del resultado
   */
  deleteDriverAdjustment(adjustmentId: number): Observable<any> {
    return this.dataService.delete$(`Driver/payroll-adjustments/${adjustmentId}`);
  }

  /**
   * Ajusta el valor de una comanda/orden
   * @param deliveryId ID del delivery
   * @param newValue Nuevo valor de la comanda
   * @param reason Motivo del ajuste
   * @returns Observable del resultado
   */
  adjustCommandValue(deliveryId: string | number, newValue: number, reason: string): Observable<any> {
    const body = {
      deliveryId,
      newValue,
      reason
    };
    return this.dataService.post$('Driver/paying', body);
  }
}
