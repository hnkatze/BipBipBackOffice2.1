/**
 * Product Reward Models
 *
 * Modelos para regalías/recompensas automáticas
 * activadas al comprar productos específicos
 */

import { Metadata } from './shared.model';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipos de trigger/disparador
 */
export enum TriggerType {
  Product = 1,                 // Producto específico
  BrandAndChannel = 2,         // Marca y Canal
  Brand = 3                    // Solo Marca
}

/**
 * Opciones para el selector de tipo de trigger
 */
export interface TriggerTypeOption {
  value: TriggerType;
  label: string;
  icon: string;
}

export const TRIGGER_TYPE_OPTIONS: TriggerTypeOption[] = [
  {
    value: TriggerType.Product,
    label: 'Producto',
    icon: 'pi pi-shopping-cart'
  },
  {
    value: TriggerType.BrandAndChannel,
    label: 'Marca y Canal',
    icon: 'pi pi-sitemap'
  },
  {
    value: TriggerType.Brand,
    label: 'Marca',
    icon: 'pi pi-tag'
  }
];

/**
 * Tipos de recompensa
 */
export enum RewardType {
  None = 0,                    // Ninguno
  FreeProduct = 1,             // Producto Gratis
  ShippingDiscount = 2,        // Descuento en Envío
  FixedDiscount = 3,           // Descuento Fijo
  PercentageDiscount = 4       // Descuento Porcentual
}

/**
 * Opciones para el selector de tipo de recompensa
 */
export interface RewardTypeOption {
  value: RewardType;
  label: string;
  icon: string;
}

export const REWARD_TYPE_OPTIONS: RewardTypeOption[] = [
  {
    value: RewardType.None,
    label: 'Ninguno',
    icon: 'pi pi-ban'
  },
  {
    value: RewardType.FreeProduct,
    label: 'Producto Gratis',
    icon: 'pi pi-gift'
  },
  {
    value: RewardType.ShippingDiscount,
    label: 'Descuento en Envío',
    icon: 'pi pi-truck'
  },
  {
    value: RewardType.FixedDiscount,
    label: 'Descuento Fijo',
    icon: 'pi pi-dollar'
  },
  {
    value: RewardType.PercentageDiscount,
    label: 'Descuento Porcentual',
    icon: 'pi pi-percentage'
  }
];

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Constraint - Restricciones opcionales para la recompensa
 */
export interface Constraint {
  type: string;
  minimumPurchase: {
    value: number;
  };
  dateFrom: string | null;
  dateTo: string | null;
  isActive: boolean;
}

/**
 * Product Reward - Modelo completo
 */
export interface ProductReward {
  id: number;
  productCode: string;
  startTime: string;           // ISO date string
  endTime: string;             // ISO date string
  modifierCode?: string;
  brandId: number;
  rewardType: RewardType;
  channelId?: number;
  triggerId: number;
  productToReward: string | null;
  modifiersToReward: string[] | null;
  productToRewardQty: number | null;
  discount: number | null;
  deliveryCharge: number | null;
  constraint?: Constraint | null;
  isActive?: boolean;
}

/**
 * Product Reward Response - De la API
 */
export interface ProductRewardResponse {
  id: number;
  productCode: string;
  productImage?: string;
  productName?: string;
  startTime: string;
  endTime: string;
  modifierCode?: string;
  brandId: number;
  rewardType: number;
  channelId?: number;
  triggerId: number;
  productToReward: string | null;
  modifiersToReward: string[] | null;
  productToRewardQty: number | null;
  discount: number | null;
  deliveryCharge: number | null;
  constraint?: Constraint | null;
  isActive?: boolean;
}

/**
 * Create Product Reward - DTO para crear
 */
export interface CreateProductReward {
  type: number; // Promotion type identifier (4 = Product Reward)
  productCode: string;
  startTime: string;
  endTime: string;
  modifierCode?: string;
  brandId: number;
  rewardType: RewardType;
  channelId?: number;
  triggerId: number;
  productToReward: string | null;
  modifiersToReward: string[] | null;
  productToRewardQty: number | null;
  discount: number | null;
  deliveryCharge: number | null;
  constraint?: Constraint | null;
  isActive: boolean;
}

/**
 * Update Product Reward - DTO para actualizar
 */
export interface UpdateProductReward {
  type: number; // Promotion type identifier (4 = Product Reward)
  productCode: string;
  startTime: string;
  endTime: string;
  modifierCode?: string;
  brandId: number;
  rewardType: RewardType;
  channelId?: number;
  triggerId: number;
  productToReward: string | null;
  modifiersToReward: string[] | null;
  productToRewardQty: number | null;
  discount: number | null;
  deliveryCharge: number | null;
  constraint?: Constraint | null;
  isActive: boolean;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Respuesta paginada
 */
export interface ProductRewardPaginatedResponse {
  data: ProductRewardResponse[];
  metadata: Metadata;
}
