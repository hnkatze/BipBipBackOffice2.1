/**
 * Modelos para el módulo de Pagos a Drivers
 */

/**
 * Datos de pago de driver en la tabla
 */
export interface DriverPayment {
  countryId: number;
  nameCountry: string;
  cityId: number;
  nameCity: string;
  driverId: number;
  driverName: string;
  driverCode: string;
  headquarterId: number;
  headquarterName: string;
  documentId: string;
  completedOrders: number;
  ownTips: number;           // Ganancias Propias
  ordersTips: number;        // Ganancias Comandas
  totalTips: number;         // Ganancias Totales
  payStatus?: string;        // Estado de pago (opcional)
}

/**
 * País
 */
export interface Country {
  countryId: number;
  nameCountry: string;
  flagImage?: string;
}

/**
 * Ciudad
 */
export interface City {
  cityId: number;
  nameCity: string;
  countryId: number;
}

/**
 * Base de Operación
 */
export interface Headquarter {
  headquarterId: number;
  nameHeadquarter: string;
  cityId?: number;
}

/**
 * Estado de Pago
 */
export interface PaymentStatus {
  statusId: number;
  statusName: string;
}

/**
 * Metadatos de paginación
 */
export interface PaginationMetadata {
  page: number;
  perPage: number;
  pageCount: number;
  totalCount: number;
}

/**
 * Response de la lista de pagos con metadatos
 */
export interface DriverPaymentsResponse {
  data: DriverPayment[];
  metadata: PaginationMetadata;
}

/**
 * Tipo de reporte
 */
export type ReportType = 'general' | 'detail' | 'baseOps' | 'bac';

/**
 * Formato de exportación
 */
export type ExportFormat = 'pdf' | 'excel' | 'txt';

/**
 * Request para consultar pagos
 */
export interface DriverPaymentsRequest {
  pageNumber: number;
  pageSize: number;
  startDate?: string;    // Formato: yyyy-MM-dd
  endDate?: string;      // Formato: yyyy-MM-dd
  countryIds?: number[];
  cityIds?: number[];
  headquarterIds?: number[];
}
