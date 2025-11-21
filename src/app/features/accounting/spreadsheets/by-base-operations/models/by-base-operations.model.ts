/**
 * Modelos para el módulo de Planilla por Base de Operaciones
 */

/**
 * Sede/Base de operaciones
 */
export interface Headquarter {
  codHeadquarter: number;
  headquarterName: string;
}

/**
 * Request para generar reportes de planilla por base de operaciones
 */
export interface ByBaseOperationsRequest {
  fechaInicio: string;  // Formato: yyyy-MM-dd
  fechaFin: string;     // Formato: yyyy-MM-dd
  codHeadquarter: number;
}

/**
 * Response para el reporte en base64
 */
export interface ReportResponse {
  base64: string;
  fileName?: string;
}
