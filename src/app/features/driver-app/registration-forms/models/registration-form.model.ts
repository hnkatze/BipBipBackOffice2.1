import { RegistrationFormStatus } from './registration-form-status.enum';

/**
 * Item de lista de formularios de registro
 */
export interface RegistrationFormListItem {
  id: number;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  countryId: number;
  countryName: string;
  cityId: number;
  cityName: string;
  requestDate: string;
  status: RegistrationFormStatus;
}

/**
 * Detalle completo de un formulario de registro
 */
export interface RegistrationFormDetail {
  driverNumber: number;
  name: string;
  assignedBase: string;
  status: RegistrationFormStatus;
  phone: string;
  email: string;
  countryId: number;
  countryName: string;
  cityId: number;
  cityName: string;
  registrationDate: string;
  daysOnRecord: number;
  dni: string;
  bloodTypeId: number;
  bloodType: string;
  address: string;
  bankName: string;
  accountType: string;
  accountOwner: string;
  accountNumber: string;
  dniImageUrl: string;
  criminalRecordImageUrl: string;
  driverLicenseImageUrl: string;
}

/**
 * Metadata de paginación
 */
export interface RegistrationFormMetadata {
  totalPending: number;
  totalRejected: number;
  page: number;
  perPage: number;
  pageCount: number;
  totalCount: number;
}

/**
 * Filtros para la lista de formularios
 */
export interface RegistrationFormFilters {
  status?: RegistrationFormStatus;
  search?: string;
}

/**
 * Respuesta del API - Lista
 */
export interface RegistrationFormListResponse {
  data: RegistrationFormListItemResponse[];
  metadata: RegistrationFormMetadata;
}

/**
 * Respuesta del API - Item de lista
 */
export interface RegistrationFormListItemResponse {
  codDeliveryForm: number;
  nameApplicant: string;
  phoneApplicant: string;
  emailApplicant: string;
  codCountry: number;
  nameCountry: string;
  codCity: number;
  nameCity: string;
  dateRequestApplicant: string;
  statusApplicant: string;
}

/**
 * Respuesta del API - Detalle
 */
export interface RegistrationFormDetailResponse {
  numDriver: number;
  name: string;
  assignedBase: string;
  status: string;
  phone: string;
  email: string;
  codCountry: number;
  nameCountry: string;
  codCity: number;
  nameCity: string;
  registrationDate: string;
  daysRecords: number;
  dni: string;
  codBloodType: number;
  bloodType: string;
  address: string;
  nameBank: string;
  accountType: string;
  accountOwner: string;
  accountNumber: string;
  pathDni: string;
  pathcriminalRecord: string;
  pathDriverLicense: string;
}

/**
 * Documento para la galería
 */
export interface RegistrationFormDocument {
  title: string;
  itemImageSrc: string;
  thumbnailImageSrc: string;
  alt: string;
}
