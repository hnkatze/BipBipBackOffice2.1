/**
 * Turn On Promotion Models
 *
 * Modelos para promociones de activación automática
 * que se aplican a públicos objetivo específicos
 */

import { Metadata } from './shared.model';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipos de descuento para Turn On Promotion
 */
export enum TurnOnDiscountType {
  FixedDiscount = 0,        // Descuento Fijo en Lempiras
  PercentageDiscount = 1    // Descuento Porcentual
}

/**
 * Opciones para el selector de tipo de descuento
 */
export interface TurnOnDiscountTypeOption {
  value: TurnOnDiscountType;
  label: string;
  icon: string;
}

export const TURN_ON_DISCOUNT_TYPE_OPTIONS: TurnOnDiscountTypeOption[] = [
  {
    value: TurnOnDiscountType.FixedDiscount,
    label: 'Descuento Fijo',
    icon: 'pi pi-dollar'
  },
  {
    value: TurnOnDiscountType.PercentageDiscount,
    label: 'Descuento Porcentual',
    icon: 'pi pi-percentage'
  }
];

/**
 * Tipo de campaña Turn On
 */
export enum TurnOnCampaignType {
  TurnOn = 1,              // Descuento automático
  TurnOnByPromocode = 2    // Con código promocional
}

// ============================================================================
// CONSTRAINT MODELS
// ============================================================================

/**
 * Minimum Purchase - Mínimo de Compra
 */
export interface MinimumPurchase {
  value: number;
}

/**
 * Constraint - Restricción
 */
export interface TurnOnConstraint {
  type: string;                    // Tipo: "minimum_purchase"
  dateFrom: string;                // Fecha inicio ISO
  dateTo: string;                  // Fecha fin ISO
  enable: boolean;                 // Si está habilitada
  minimumPurchase: MinimumPurchase;
}

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Turn On Promotion - Modelo completo
 */
export interface TurnOnPromotion {
  id?: number;
  criteriaId: number;              // ID del público objetivo
  type: TurnOnDiscountType | null; // Tipo de descuento (0=Fijo, 1=Porcentaje)
  value: number;                   // Valor del descuento
  promocodeRequired: number | null; // ID del promo code requerido (o null)
  constraints?: TurnOnConstraint;  // Restricciones
}

/**
 * Turn On Promotion Response - De la API
 */
export interface TurnOnPromotionResponse {
  id: number;
  criteriaId: number;
  criteriaName?: string;           // Nombre del público objetivo
  type: number;                    // 0=Fijo, 1=Porcentaje
  value: number;                   // Valor del descuento
  promocodeRequired: number | null;
  promocodeName?: string;          // Nombre del promo code
  constraints?: TurnOnConstraint;
  isActive?: boolean;
}

/**
 * Create Turn On Promotion - DTO para crear
 */
export interface CreateTurnOnPromotion {
  criteriaId: number;
  type: TurnOnDiscountType | null;
  value: number;
  promocodeRequired: number | null;
  constraints?: TurnOnConstraint;
}

/**
 * Update Turn On Promotion - DTO para actualizar
 */
export interface UpdateTurnOnPromotion {
  criteriaId: number;
  type: TurnOnDiscountType | null;
  value: number;
  promocodeRequired: number | null;
  constraints?: TurnOnConstraint;
}

// ============================================================================
// TABLE/LIST MODELS
// ============================================================================

/**
 * Turn On Promotion para tabla/lista
 */
export interface TurnOnPromotionTable {
  id: number;
  type: string;                    // Descripción del tipo
  discountType: TurnOnDiscountType; // 0=Fijo, 1=Porcentaje
  discountValue: number;           // Valor del descuento
  targetPublic: string;            // Nombre del público objetivo
  isActive: boolean;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Respuesta paginada
 */
export interface TurnOnPromotionPaginatedResponse {
  data: TurnOnPromotionResponse[];
  metadata: Metadata;
}

// ============================================================================
// AVAILABILITY
// ============================================================================

/**
 * Respuesta de disponibilidad de campaña
 */
export interface TurnOnAvailabilityResponse {
  anyCampaign: boolean;  // true si ya existe una campaña activa
}

// ============================================================================
// TARGET AUDIENCE (Público Objetivo)
// ============================================================================

/**
 * Target Audience Summary - Para selector
 */
export interface TargetAudienceSummary {
  id: number;
  name: string;
  description?: string;
}
