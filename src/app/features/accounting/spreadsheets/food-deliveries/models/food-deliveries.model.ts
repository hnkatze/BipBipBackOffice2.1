/**
 * Modelos para el módulo de Alimentación Deliveries
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
 * Request para generar reportes de alimentación por delivery
 */
export interface FoodDeliveriesRequest {
  fechaInicio: string;   // Formato: yyyy-MM-dd
  fechaFin: string;      // Formato: yyyy-MM-dd
  storeId: number;       // ID del restaurante
  storeName: string;     // Nombre corto del restaurante (solo para PDF)
}
