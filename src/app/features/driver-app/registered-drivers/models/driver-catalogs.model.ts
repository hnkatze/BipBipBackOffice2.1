/**
 * Sede/Base asignada
 */
export interface Headquarter {
  codHeadquarter: number;
  headquarterName: string;
}

/**
 * Banco para método de pago
 */
export interface Bank {
  codDeliveryBank: number;
  deliveryBank: string;
}

/**
 * Tipo de sangre
 */
export interface BloodType {
  id: number;
  type: string;
}

/**
 * Método de pago disponible
 */
export interface PaymentMethodCatalog {
  id: number;
  method: string;
}

/**
 * País
 */
export interface Country {
  countryId: number;
  countryName: string;
  countryCode: string;
  isActive: boolean;
  countryPrefix: string;
  countryUrlFlag: string;
  countryMask: string;
}

/**
 * Ciudad
 */
export interface City {
  cityId: number;
  codCountry: number;
  countryUrlFlag: string;
  countryName: string;
  cityName: string;
  cityCode: string;
  isActive: boolean;
  couponMin: number;
  publish: boolean;
  codZone: number;
  zoneName: string;
  orderMin: number;
  freeShipping: boolean;
  faCpayment: boolean;
}

/**
 * Resumen de motivos de penalización
 */
export interface PenaltySummary {
  codDriverPenalty: number;
  reason: string;
}

/**
 * Upload de imagen a S3
 */
export interface UploadImageResponse {
  presignedUrl: string;
  url: string;
}
