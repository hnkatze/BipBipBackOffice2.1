/**
 * Modelos para el módulo de Liquidaciones Delivery
 */

/**
 * Ciudad
 */
export interface City {
  cityId: number;
  cityName: string;
}

/**
 * Driver/Repartidor
 */
export interface Driver {
  idDriver: number;
  codeDriver: string;
  fullNameDriver: string;
}

/**
 * Request para generar reportes de liquidaciones por delivery
 */
export interface SettlementsDeliveryRequest {
  fechaInicio: string;  // Formato: yyyy-MM-dd o dd-MM-yyyy según el reporte
  fechaFin: string;     // Formato: yyyy-MM-dd o dd-MM-yyyy según el reporte
  driverId: number;     // ID del driver
}
