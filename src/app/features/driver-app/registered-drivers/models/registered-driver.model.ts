/**
 * Item de la lista de drivers registrados (Frontend)
 */
export interface RegisteredDriverListItem {
  id: number;
  driverCode: string;
  name: string;
  status: boolean;
  cityId: number;
  cityName: string;
  countryId: number;
  countryName: string;
  email: string;
  phone: string;
  dateRegis: string;
  baseAsign: string;
  isPenalized: boolean;
}

/**
 * Item de la lista de drivers desde el backend
 */
export interface RegisteredDriverListItemResponse {
  driverId: number;
  driverCode: string;
  driverFullName: string;
  driverPhone: string;
  driverEmail: string;
  idCountry: number;
  countryName: string;
  idCity: number;
  cityName: string;
  driverCreatedAt: string;
  codHeadquarter: number;
  assignedHeadquarters: string;
  driverStatus: boolean;
  isPenalized?: boolean;
}

/**
 * Metadata de paginación para lista de drivers
 */
export interface RegisteredDriverMetadata {
  totalLockedPenalty: number;
  totalActive: number;
  totalInactive: number;
  page: number;
  perPage: number;
  pageCount: number;
  totalCount: number;
}

/**
 * Respuesta de la API para lista de drivers
 */
export interface RegisteredDriverListResponse {
  records: RegisteredDriverListItemResponse[];
  metadata: RegisteredDriverMetadata;
}

/**
 * Filtros para búsqueda de drivers
 */
export interface RegisteredDriverFilters {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  countries?: number[];
  cities?: number[];
}

/**
 * Método de pago del driver
 */
export interface PaymentMethod {
  id: number;
  method: string;
  accountNumber: string;
  accountOwner: string;
  bank: string;
  bankId: number;
}

/**
 * Cupón asignado al driver
 */
export interface DriverCoupon {
  codCoupons: number;
  dateIssued: number;
  expirationDate: number;
  statusCoupons: number;
}

/**
 * Detalle completo de un driver
 */
export interface RegisteredDriverDetail {
  driverId: number;
  driverFullName: string;
  driverUserName: string;
  codHeadquarter: number;
  assignedHeadquarters: string;
  driverStatus: boolean;
  passwordHash: string;
  driverPhone: string;
  driverEmail: string;
  idCountry: number;
  countryName: string;
  idCity: number;
  cityName: string;
  driverCreatedAt: string;
  driverDNI: string;
  idBloodType: number;
  bloodType: string;
  driverAddress: string;
  paymentMethod: PaymentMethod;
  driverCoupons: DriverCoupon[];
  pathImageDni: string;
  pathImageCriminalRecords: string;
  pathImageDriverLicense: string;
  pathImageProfile: string;
  codMotivePenalty: number;
  isBlocked: boolean;
  motivePenalty: string;
  penaltyDuration: number;
}

/**
 * DTO para actualizar un driver
 */
export interface UpdateDriverRequest {
  userName: string;
  driverFullName: string;
  headquarterId: number;
  password: string;
  telephone: string;
  email: string;
  countryId: number;
  cityId: number;
  registrationDate: string;
  dni: string;
  bloodTypeId: number;
  address: string;
  paymentMethodId: number;
  bankAccount: string;
  bankId: number;
  photoDni: string;
  photoProfile: string;
  photoDriverLicense: string;
  photoPoliceRecord: string;
}

/**
 * Documento de imagen del driver
 */
export interface DriverDocument {
  title: string;
  itemImageSrc: string;
  thumbnailImageSrc: string;
  alt: string;
}

/**
 * DTO para penalizar un driver
 */
export interface PenalizeDriverRequest {
  driverId: number;
  reasonId: number;
  description: string;
  startDate: string; // ISO format
  endDate: string; // ISO format
}

/**
 * DTO para agregar cupones a un driver
 */
export interface AddCouponRequest {
  driverId: number;
  reason: string;
  quantity: number;
}

/**
 * Motivo de penalización (catálogo)
 */
export interface PenaltyReason {
  id: number;
  name: string;
}

/**
 * Información de penalización activa
 */
export interface PenalizedInfo {
  codDriverPenalty: number;
  reason: string;
  duration?: number;
  startDate: string;
  endDate: string;
}
