/**
 * Modelos para el módulo de Liquidación Restaurante
 */

/**
 * Marca/Brand
 */
export interface Brand {
  idBrand: number;
  nameBrand: string;
  logoBrand: string;
  sortOrderBrand: number;
}

/**
 * Tienda/Restaurante
 */
export interface Store {
  restId: number;
  shortName: string;
}

/**
 * Tipo de reporte de liquidación
 */
export type ReportType = 'final' | 'manual';

/**
 * Formato de exportación
 */
export type ExportFormat = 'pdf' | 'excel';

/**
 * Request para generar reportes de liquidación por restaurante
 */
export interface SettlementsStoreRequest {
  fecha: string;           // Formato: YYYY-M-D (sin zero-padding)
  storeId: number;         // ID del restaurante
  storeName: string;       // Nombre corto del restaurante
  reportType: ReportType;  // Tipo de reporte (final o manual)
}
