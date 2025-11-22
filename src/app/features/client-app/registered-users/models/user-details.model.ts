/**
 * User Details Models
 * Models for the User Details Drawer with 8 tabs
 */

/**
 * ============================================
 * TAB 1: GENERAL
 * ============================================
 */

export interface CustomerProfile {
  numcliente: number;
  nombre: string;
  telefono: string;
  email: string;
  genero: string;
  tipoAutorizacion: string;
  fechaRegistro: string;
  ciudad: string;
  fechaNacimiento: string;
  addresses: CustomerAddress[];
}

export interface CustomerAddress {
  address: string;
  reference: string;
  latitude: number;
  longitude: number;
  isMain: boolean;
  isActive: boolean;
}

/**
 * ============================================
 * TAB 2: ORDERS
 * ============================================
 */

export interface CustomerOrdersResponse {
  metadata: {
    page: number;
    perPage: number;
    pageCount: number;
    totalCount: number;
  };
  records: CustomerOrder[];
}

export interface CustomerOrder {
  ordersId: number;
  brandName: string;
  orderDate: string;
  totalOrder: number;
  unlockOrder: string;
  isApproved: boolean;
}

/**
 * ============================================
 * TAB 3: LOYALTY
 * ============================================
 */

export interface CustomerLoyalty {
  idNivelLealtad: number;
  nivelLealtad: string;
  puntosDisponibles: number;
  puntosObtenidos: number;
  benefits: any[];
}

/**
 * ============================================
 * TAB 4: BIP LOGS
 * ============================================
 */

export interface BipTransactionsResponse {
  metadata: {
    page: number;
    perPage: number;
    pageCount: number;
    totalCount: number;
  };
  records: BipTransaction[];
}

export interface BipTransaction {
  bipsEarned: number;
  availableBips: number;
  bipsDateCreated: string;
  bipsUser: string;
  comments: string;
  bipsCurrentlyEarned: number;
  bipsCurrentlyAvailable: number;
}

/**
 * ============================================
 * TAB 5: INCIDENTS
 * ============================================
 */

export interface IncidentsResponse {
  metadata: {
    page: number;
    perPage: number;
    pageCount: number;
    totalCount: number;
  };
  records: CustomerIncident[];
}

export interface CustomerIncident {
  incidentId: number;
  incidentDate: string;
  type: string;
  status: string;
  description: string;
  orderId?: number;
  resolution?: string;
}

/**
 * ============================================
 * TAB 6: GRANT BIPS
 * ============================================
 */

export interface GrantBipsForm {
  quantity: number;
  reason: string;
}

export type BipReason = {
  code: 'B' | 'I' | 'P' | 'H';
  label: string;
};

export const BIP_REASONS: BipReason[] = [
  { code: 'B', label: 'BipStories' },
  { code: 'I', label: 'Influencer' },
  { code: 'P', label: 'Promociones/Recuperación Clientes' },
  { code: 'H', label: 'Débito Manual' }
];

/**
 * ============================================
 * TAB 7: GRANT BENEFITS
 * ============================================
 */

export interface AvailableBenefit {
  idLoyaltyItemWallet: number;
  codLoyaltyLevel: number;
  maxItemWallet: number;
  loyaltyNameWallet: string;
  loyaltyDescriptionWallet: string;
  isProduct: any;
  discountValue: any;
  itemCode: any;
  itemCount: any;
  loyaltyItemProducto: any;
}

export interface GrantBenefitForm {
  loyaltyItemId: number;
  quantity: number;
}

/**
 * ============================================
 * TAB 8: SPECIAL PERMISSIONS
 * ============================================
 */

export interface SpecialPermission {
  customerId: number;
  quantityOrders: number;
  cashSpent: number;
  storeId: number;
  storeName: string;
  brandName: string;
  cityName: string;
  createdDate: string;
}

export interface CreateSpecialPermissionForm {
  customerId: number;
  storeId: number;
  quantityOrders: number;
  cashSpent: number;
}

export interface Brand {
  brandId: number;
  brandName: string;
}

export interface Store {
  storeId: number;
  storeName: string;
}
