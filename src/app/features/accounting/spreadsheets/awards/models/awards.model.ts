/**
 * Modelos para el módulo de Premiaciones (Awards)
 */

/**
 * Parámetros para generar el reporte de premiaciones
 */
export interface AwardsReportParams {
  fechaInicio: string; // ISO string
  fechaFinal: string; // ISO string
  marcas: number[]; // Array de IDs de marcas
  ciudades: number[]; // Array de IDs de ciudades
  top?: number; // Límite de registros (opcional)
}

/**
 * Datos del formulario de filtros
 */
export interface AwardsFormData {
  dateRange: [Date, Date];
  brandIds: number[];
  cityIds: number[];
  recordLimit?: number;
}
