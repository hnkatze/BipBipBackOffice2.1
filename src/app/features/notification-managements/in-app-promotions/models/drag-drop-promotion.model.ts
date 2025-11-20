/**
 * Drag & Drop Promotion Models
 *
 * Modelos para promociones visuales drag & drop
 * mostradas en la app (banners, videos)
 */

import { Metadata } from './shared.model';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipos de promoción drag & drop
 */
export enum PromotionType {
  Banner = 'Banner',
  Video = 'Video'
}

/**
 * Tipos de acción al hacer clic
 */
export enum ActionType {
  None = 'None',
  Product = 'Product',
  Category = 'Category',
  ExternalLink = 'ExternalLink'
}

/**
 * Opciones para el selector de tipo de promoción
 */
export interface PromotionTypeOption {
  value: PromotionType;
  label: string;
  icon: string;
}

export const PROMOTION_TYPE_OPTIONS: PromotionTypeOption[] = [
  {
    value: PromotionType.Banner,
    label: 'Banner',
    icon: 'pi pi-image'
  },
  {
    value: PromotionType.Video,
    label: 'Video',
    icon: 'pi pi-video'
  }
];

/**
 * Opciones para el selector de tipo de acción
 */
export interface ActionTypeOption {
  value: ActionType;
  label: string;
  icon: string;
}

export const ACTION_TYPE_OPTIONS: ActionTypeOption[] = [
  {
    value: ActionType.None,
    label: 'Ninguna',
    icon: 'pi pi-ban'
  },
  {
    value: ActionType.Product,
    label: 'Producto',
    icon: 'pi pi-box'
  },
  {
    value: ActionType.Category,
    label: 'Categoría',
    icon: 'pi pi-th-large'
  },
  {
    value: ActionType.ExternalLink,
    label: 'Enlace Externo',
    icon: 'pi pi-external-link'
  }
];

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Drag & Drop Promotion - Modelo completo
 */
export interface DragDropPromotion {
  id: number;
  title: string;
  description: string;
  productId: string | null;
  promotionType: PromotionType;
  actionType: ActionType;
  recentlyAdded: boolean;
  promoStartDate: string;           // ISO date string
  promoEndDate: string;             // ISO date string
  isActive: boolean;
  mediaUrl?: string;                // URL del banner o video
}

/**
 * Drag & Drop Promotion Response - De la API
 */
export interface DragDropPromotionResponse {
  id: number;
  title: string;
  description: string;
  banner: string;                   // Precio o texto según actionType
  prefixBanner: string;              // "Desde", "Hasta"
  productId: string;
  mediaUrl: string;                  // URL de la imagen del producto
  mediaPosition: string;             // top, bottom, left, right, full
  promotionType: string;             // 6x4, 5x8, 7x8
  actionType: string;                // redirect, clipboard
  recentlyAdded: boolean;
  promoStartDate: string;
  promoEndDate: string;
  isActive: boolean;
  availableBrands: number[];
  availableChannels: number[];
  availableStores: number[];
  promoCode: string;
}

/**
 * Create Drag & Drop Promotion - DTO para crear
 */
export interface CreateDragDropPromotion {
  title: string;
  description: string;
  banner: string;
  prefixBanner: string;
  mediaUrl: string;
  mediaPosition: string;
  promotionType: string;
  actionType: string;
  recentlyAdded: boolean;
  promoStartDate: string;
  promoEndDate: string;
  availableBrands: number[];
  availableChannels: number[];
  availableStores: number[];
  productId: string;
  promoCode: string;
}

/**
 * Update Drag & Drop Promotion - DTO para actualizar
 */
export interface UpdateDragDropPromotion {
  title: string;
  description: string;
  banner: string;
  prefixBanner: string;
  mediaUrl: string;
  mediaPosition: string;
  promotionType: string;
  actionType: string;
  recentlyAdded: boolean;
  promoStartDate: string;
  promoEndDate: string;
  availableBrands: number[];
  availableChannels: number[];
  availableStores: number[];
  productId: string;
  promoCode: string;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Respuesta paginada
 */
export interface DragDropPromotionPaginatedResponse {
  data: DragDropPromotionResponse[];
  metadata: Metadata;
}
