/**
 * Push In App Models
 *
 * Modelos para la gestión de notificaciones push in-app
 * (banners programados con targeting por marca y ciudad)
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Intervalo de visualización del banner
 */
export enum BannerInterval {
  Hour = 1,
  Day = 24,
  Week = 168,
  Month = 720
}

/**
 * Opciones para el selector de intervalo
 */
export interface BannerIntervalOption {
  value: BannerInterval;
  label: string;
}

export const BANNER_INTERVAL_OPTIONS: BannerIntervalOption[] = [
  { value: BannerInterval.Hour, label: 'Cada Hora' },
  { value: BannerInterval.Day, label: 'Cada Día' },
  { value: BannerInterval.Week, label: 'Cada Semana' },
  { value: BannerInterval.Month, label: 'Cada Mes' }
];

// ============================================================================
// MAIN MODELS
// ============================================================================

/**
 * Push In App - Modelo completo
 */
export interface PushInApp {
  id: number;
  isActive: boolean;
  bannerName: string;
  pathBannerMobile: string;
  pathBannerTablet: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  availableBrands: number[];
  availableCities: number[];
  interval: BannerInterval;
}

/**
 * Push In App Response - De la API
 */
export interface PushInAppResponse {
  id: number;
  isActive: boolean;
  bannerName: string;
  pathBannerMobile: string;
  pathBannerTablet: string;
  startDate: string;
  endDate: string;
  availableBrands: number[];
  availableCities: number[];
  interval: number;
}

/**
 * Create Push In App - DTO para crear
 */
export interface CreatePushInApp {
  bannerName: string;
  pathBannerMobile: string;
  pathBannerTablet: string;
  startDate: string;
  endDate: string;
  availableBrands: number[];
  availableCities: number[];
  interval: BannerInterval;
  isActive: boolean;
}

/**
 * Update Push In App - DTO para actualizar
 */
export interface UpdatePushInApp {
  bannerName: string;
  pathBannerMobile: string;
  pathBannerTablet: string;
  startDate: string;
  endDate: string;
  availableBrands: number[];
  availableCities: number[];
  interval: BannerInterval;
  isActive: boolean;
}

/**
 * Update Status Request
 */
export interface UpdateStatusRequest {
  status: boolean;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Metadata de paginación
 */
export interface Metadata {
  page: number;
  perPage: number;
  pageCount: number;
  totalCount: number;
}

/**
 * Respuesta paginada
 */
export interface PushInAppPaginatedResponse {
  data: PushInAppResponse[];
  metadata: Metadata;
}

/**
 * Metadata vacía por defecto
 */
export const emptyMetadata: Metadata = {
  page: 1,
  perPage: 10,
  pageCount: 0,
  totalCount: 0
};

// ============================================================================
// S3 UPLOAD
// ============================================================================

/**
 * Presigned URL Response
 */
export interface PresignedUrlResponse {
  presignedUrl: string;
  fileUrl: string;
}
