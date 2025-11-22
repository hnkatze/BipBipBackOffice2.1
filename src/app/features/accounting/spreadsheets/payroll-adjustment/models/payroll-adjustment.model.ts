/**
 * Modelos para el módulo de Ajuste de Planilla (Payroll Adjustment)
 */

/**
 * Driver resumido (para selector)
 */
export interface DriverSummary {
  idDriver: number;
  codeDriver: string;
  fullNameDriver: string;
}

/**
 * Comanda/Orden de pago a driver
 */
export interface PayrollCommand {
  orderId: string | number;
  deliveryId: string | number;
  driverCode: string;
  driverName: string;
  customerName: string;
  comandaValue: number;
}

/**
 * Ajuste de ingreso/deducción de driver
 */
export interface DriverAdjustment {
  id: number | null; // null = temporal/pendiente
  adjustmentAmount: number; // Positivo = ingreso, negativo = deducción
  adjustmentReason: string;
  adjustmentDateFrom: Date | string;
  adjustmentDateTo: Date | string;
}

/**
 * Metadatos de paginación
 */
export interface PaginationMetadata {
  totalCount: number;
  page: number; // 1-based desde el backend
  limit: number;
}

/**
 * Response paginada de comandas
 */
export interface PayrollCommandsResponse {
  data: PayrollCommand[];
  metadata: PaginationMetadata;
}

/**
 * Response paginada de ajustes de driver
 */
export interface DriverAdjustmentsResponse {
  data: DriverAdjustment[];
  metadata: PaginationMetadata;
}

/**
 * Request para crear/actualizar ajuste de driver
 */
export interface DriverAdjustmentRequest {
  driverId: number;
  adjustmentAmount: number;
  adjustmentReason: string;
  adjustmentDateFrom: string; // ISO string
  adjustmentDateTo: string; // ISO string
}

/**
 * Tipo de ajuste (para UI)
 */
export type AdjustmentType = 'income' | 'deduction';

/**
 * Datos del formulario de ajuste
 */
export interface AdjustmentFormData {
  adjustmentType: AdjustmentType;
  adjustmentAmount: number;
  adjustmentReason: string;
  dateRange: [Date, Date];
}

/**
 * Request para ajustar valor de comanda
 */
export interface CommandValueAdjustmentRequest {
  orderId: string | number;
  newValue: number;
  reason: string;
}
