/**
 * Modelo del correlativo de planillas
 */
export interface Correlative {
  correlativoId: number;
}

/**
 * Respuesta del API al obtener el correlativo
 */
export interface CorrelativeResponse {
  correlativoId: number;
}

/**
 * Request para actualizar el correlativo
 */
export interface UpdateCorrelativeRequest {
  correlativo: number;
}
