/**
 * Promotional Discount Models
 *
 * Modelos para descuentos promocionales automáticos
 * aplicados globalmente según criterios (marcas, canales, ciudades)
 */

import { Metadata } from './shared.model';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipos de descuento promocional
 */
export enum DiscountType {
  DeliveryCost = 'DeliveryCost',           // Costo de Entrega
  FixedDiscount = 'FixedDiscount',         // Descuento Fijo
  PercentageDiscount = 'PercentageDiscount' // Descuento Porcentual
}

/**
 * Opciones para el selector de tipo de descuento
 */
export interface DiscountTypeOption {
  value: DiscountType;
  label: string;
  icon: string;
}

export const DISCOUNT_TYPE_OPTIONS: DiscountTypeOption[] = [
  {
    value: DiscountType.DeliveryCost,
    label: 'Costo de Entrega',
    icon: 'pi pi-truck'
  },
  {
    value: DiscountType.FixedDiscount,
    label: 'Descuento Fijo',
    icon: 'pi pi-dollar'
  },
  {
    value: DiscountType.PercentageDiscount,
    label: 'Descuento Porcentual',
    icon: 'pi pi-percentage'
  }
];

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Promotional Discount - Modelo completo
 */
export interface PromotionalDiscount {
  id: number;
  discountType: DiscountType;
  discountValue: number;      // Para FixedDiscount y PercentageDiscount
  deliveryCost: number;        // Para DeliveryCost
  isActive: boolean;
  startDate: string;           // ISO date string
  endDate: string;             // ISO date string
  createdAt: string;           // ISO date string
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
}

/**
 * Promotional Discount Response - De la API
 */
export interface PromotionalDiscountResponse {
  id: number;
  discountType: DiscountType;
  discountValue: number;
  deliveryCost: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
}

/**
 * Create Promotional Discount - DTO para crear
 */
export interface CreatePromotionalDiscount {
  type: number; // Promotion type identifier (5 = Promotional Discount)
  discountType: DiscountType;
  discountValue: number;
  deliveryCost: number;
  startDate: string;
  endDate: string;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
  isActive: boolean;
}

/**
 * Update Promotional Discount - DTO para actualizar
 */
export interface UpdatePromotionalDiscount {
  type: number; // Promotion type identifier (5 = Promotional Discount)
  discountType: DiscountType;
  discountValue: number;
  deliveryCost: number;
  startDate: string;
  endDate: string;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
  isActive: boolean;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Respuesta paginada
 */
export interface PromotionalDiscountPaginatedResponse {
  data: PromotionalDiscountResponse[];
  metadata: Metadata;
}
