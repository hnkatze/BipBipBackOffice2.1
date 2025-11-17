/**
 * Promo Code Models
 *
 * Modelos para códigos promocionales que los usuarios
 * pueden ingresar para obtener descuentos
 */

import { Metadata } from './shared.model';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipos de descuento para códigos promocionales
 */
export enum PromoCodeDiscountType {
  Percentage = 'Percentage',           // Descuento Porcentual
  FixedAmount = 'FixedAmount',         // Monto Fijo
  FreeShipping = 'FreeShipping'        // Envío Gratis
}

/**
 * Opciones para el selector de tipo de descuento
 */
export interface PromoCodeDiscountTypeOption {
  value: PromoCodeDiscountType;
  label: string;
  icon: string;
}

export const PROMO_CODE_DISCOUNT_TYPE_OPTIONS: PromoCodeDiscountTypeOption[] = [
  {
    value: PromoCodeDiscountType.Percentage,
    label: 'Descuento Porcentual',
    icon: 'pi pi-percentage'
  },
  {
    value: PromoCodeDiscountType.FixedAmount,
    label: 'Monto Fijo',
    icon: 'pi pi-dollar'
  },
  {
    value: PromoCodeDiscountType.FreeShipping,
    label: 'Envío Gratis',
    icon: 'pi pi-truck'
  }
];

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Promo Code - Modelo completo
 */
export interface PromoCode {
  id: number;
  code: string;                        // Código único (ej: "VERANO2025")
  description: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;               // Valor del descuento
  maxUses: number | null;              // Máximo número de usos (null = ilimitado)
  currentUses: number;                 // Usos actuales
  minPurchaseAmount: number | null;    // Monto mínimo de compra
  startDate: string;                   // ISO date string
  endDate: string;                     // ISO date string
  isActive: boolean;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
}

/**
 * Promo Code Response - De la API
 */
export interface PromoCodeResponse {
  id: number;
  code: string;
  description: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  minPurchaseAmount: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
}

/**
 * Create Promo Code - DTO para crear
 */
export interface CreatePromoCode {
  code: string;
  description: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  maxUses: number | null;
  minPurchaseAmount: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
}

/**
 * Update Promo Code - DTO para actualizar
 */
export interface UpdatePromoCode {
  code: string;
  description: string;
  discountType: PromoCodeDiscountType;
  discountValue: number;
  maxUses: number | null;
  minPurchaseAmount: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Respuesta paginada
 */
export interface PromoCodePaginatedResponse {
  data: PromoCodeResponse[];
  metadata: Metadata;
}
