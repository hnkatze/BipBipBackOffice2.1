/**
 * Promo Code Models
 *
 * Modelos para códigos promocionales
 * (cupones de descuento, envío gratis, productos gratis)
 */

import { Metadata } from './shared.model';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipos de código promocional (según API old)
 */
export enum PromoCodeType {
  Percentage = 1,      // Porcentaje de descuento
  FixedDiscount = 2,   // Descuento fijo
  FreeShipping = 3,    // Envío gratis
  Product = 4          // Producto gratis
}

/**
 * Opciones para el selector de tipo de código promocional
 */
export interface PromoCodeTypeOption {
  value: PromoCodeType;
  label: string;
  icon: string;
}

export const PROMO_CODE_TYPE_OPTIONS: PromoCodeTypeOption[] = [
  {
    value: PromoCodeType.Percentage,
    label: 'Porcentaje de Descuento',
    icon: 'pi pi-percentage'
  },
  {
    value: PromoCodeType.FixedDiscount,
    label: 'Descuento Fijo',
    icon: 'pi pi-dollar'
  },
  {
    value: PromoCodeType.FreeShipping,
    label: 'Envío Gratis',
    icon: 'pi pi-truck'
  },
  {
    value: PromoCodeType.Product,
    label: 'Producto Gratis',
    icon: 'pi pi-gift'
  }
];

// ============================================================================
// ITEM MODELS (Para productos gratis)
// ============================================================================

/**
 * Modificador de un producto (personalización)
 */
export interface PromoCodeModifier {
  modifierId: string;      // ID del modificador
  modifierName?: string;   // Nombre del modificador (para display)
  quantity: number;        // Cantidad del modificador
}

/**
 * Item (producto) en un código promocional
 */
export interface PromoCodeItem {
  brandId: number;               // ID de la marca
  brandName?: string;            // Nombre de la marca (para display)
  productId: string;             // ID del producto
  productName?: string;          // Nombre del producto (para display)
  quantity: number;              // Cantidad del producto
  modifiers: PromoCodeModifier[]; // Modificadores del producto
}

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Promo Code - Modelo completo para visualización
 */
export interface PromoCode {
  id: number;
  name: string;
  code: string;
  description: string;
  startDate: string;              // ISO date string
  endDate: string;                // ISO date string
  minimumAmount: number;          // Monto mínimo de compra (puede ser 0)
  type: PromoCodeType;
  discountValue: number | null;   // Valor del descuento (null para tipo 3 y 4)
  requireTurnOn: boolean;         // Si requiere activación
  isActive: boolean;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
  availableStores: number[] | null;
  items: PromoCodeItem[];         // Productos (solo para tipo Product)
}

/**
 * Promo Code Response - De la API (formato de old)
 */
export interface PromoCodeResponse {
  id: number;
  name: string;
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  minimumAmount: number;
  type: number;                   // 1, 2, 3, 4
  bankId: number | null;          // No usado
  fundingTypeId: number | null;   // No usado
  segmentId: number | null;       // No usado
  discountValue: number | null;
  requireTurnOn: boolean;
  isActive: boolean;
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
  availableStores: number[] | null;
  items: PromoCodeItem[];
}

/**
 * Create Promo Code - DTO para crear (formato de old)
 */
export interface CreatePromoCode {
  name: string;
  code: string;
  description: string;
  startDate: string;              // "YYYY-MM-DDTHH:mm:ss" sin Z
  endDate: string;                // "YYYY-MM-DDTHH:mm:ss" sin Z
  minimumAmount: number;          // Puede ser 0
  type: number;                   // PromoCode type: 1, 2, 3, 4
  bankId: null;                   // Siempre null
  fundingTypeId: null;            // Siempre null
  segmentId: null;                // Siempre null
  discountValue: number | null;   // Conversión: % → decimal (15 → 0.15)
  requireTurnOn: boolean;
  isActive: boolean | null;       // Por defecto null, siempre se envía
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
  availableStores: number[] | null;
  items: PromoCodeItem[];         // Solo para tipo Product
}

/**
 * Update Promo Code - DTO para actualizar (formato de old)
 */
export interface UpdatePromoCode {
  name: string;
  code: string;
  description: string;
  startDate: string;
  endDate: string;
  minimumAmount: number;
  type: number;                   // PromoCode type: 1, 2, 3, 4
  bankId: null;
  fundingTypeId: null;
  segmentId: null;
  discountValue: number | null;
  requireTurnOn: boolean;
  isActive: boolean | null;       // Por defecto null, siempre se envía
  availableBrands: number[];
  availableChannels: number[];
  availableCities: number[];
  availableStores: number[] | null;
  items: PromoCodeItem[];
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
