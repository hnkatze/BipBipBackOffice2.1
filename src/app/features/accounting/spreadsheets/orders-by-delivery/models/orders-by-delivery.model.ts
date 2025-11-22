/**
 * Modelos para el módulo de Comandas por Delivery
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
 * Request para generar reportes de comandas por delivery
 */
export interface OrdersByDeliveryRequest {
  fechaInicio: string;  // Formato: yyyy-MM-dd
  fechaFin: string;     // Formato: yyyy-MM-dd
  cityId: number;       // ID de la ciudad
}
