/**
 * Models e interfaces para el módulo de Bases de Operaciones
 */

/**
 * Base de operaciones en la lista/mapa
 */
export interface OperationBase {
  codHeadquarter: number;
  pathLogoHeadquarter: string;
  headquarterName: string;
  headquarterAddress: string;
  headquarterAcronym: string;
  pedidoPorHora: number;
  VolDriverPorHora: number;
  locationDriver: LocationDriver;
  headquarterLatitude: number;
  headquarterLongitude: number;
}

/**
 * Ubicación (país y ciudad) de un driver o base
 */
export interface LocationDriver {
  countryId: number | null;
  countryName: string | null;
  cityId: number | null;
  cityName: string | null;
}

/**
 * Response paginado de bases de operaciones
 */
export interface OperationBaseListResponse {
  metadata: {
    page: number;
    perPage: number;
    pageCount: number;
    totalCount: number;
  };
  records: OperationBase[];
}

/**
 * Detalles completos de una base de operaciones
 */
export interface OperationBaseDetail {
  codHeadquarter: number;
  pathLogoHeadquarter: string;
  headquarterName: string;
  headquarterAddress: string;
  headquarterAcronym: string;
  pedidoPorHora: number;
  VolDriverPorHora: number;
  locationDriver: LocationDriverDetail;
  numberBoxBegin: string;
  numberBoxEnd: string;
  numberCurrent: string;
  contactName: string;
  contactNumber: string;
  headquarterSize: string;
  listDriver: DriverAssigned[];
}

/**
 * Ubicación detallada (siempre con valores, no nullables)
 */
export interface LocationDriverDetail {
  countryId: number;
  countryName: string;
  cityId: number;
  cityName: string;
}

/**
 * Driver asignado a una base
 */
export interface DriverAssigned {
  driverId: number;
  driverName: string;
  driverPhoneNumb: string;
  driverEmail: string;
  driverCountryId: number;
  driverCountryName: string;
  driverCityId: number;
  driverCityName: string;
  driverDateAdd: string; // ISO date string
}

/**
 * Driver sin asignar (disponible para asignar)
 */
export interface DriverUnassigned {
  driverId: number;
  driverFullName: string;
  driverPhone: string;
  driverEmail: string;
  idCity: number;
  idCountry: number;
  driverCreatedAt: string; // ISO date string
}

/**
 * Filtros aplicados para búsqueda de bases
 */
export interface OperationBaseFilters {
  countryIds?: number[];
  cityIds?: number[];
  brandIds?: number[];
}

/**
 * País para catálogo
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
 * Ciudad para catálogo
 */
export interface City {
  cityId: number;
  codCountry: number;
  countryUrlFlag: string | null;
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
 * Marca/Restaurante para catálogo
 */
export interface Brand {
  idBrand: number;
  nameBrand: string;
  logoBrand: string;
  imageBrand: string;
  imageMenuBrand: string;
  shortNameBrand: string;
  isSendOrder: boolean;
  urlLogoHeader: string;
  codePayingPosgc: number;
  isActiveBrand: boolean;
  position: number;
  totalRestaurants: number;
}

/**
 * Restaurante disponible para crear base
 */
export interface RestaurantForBase {
  restId: number;
  restBrandLogo: string;
  restAddress: string;
  restName: string;
  restShortName: string;
  restCityId: number;
  restCountryId: number;
}

/**
 * Request para editar una base
 */
export interface EditOperationBaseRequest {
  id: number;
  numberCurrent: string;
  numberBoxBegin: string;
  numberBoxEnd: string;
  contactName: string;
  contactNumber: string;
  headquarterSize: number;
  driversToAssign: number[];
  driversToUnassign: number[];
}

/**
 * Detalles de boxes para crear/editar base
 */
export interface BoxDetails {
  size: number;
  numbBoxBegin: string;
  numbBoxEnd: string;
  numbCurrent: string;
  status: boolean;
  contactName: string;
  contactNumb: string;
  storeId: number;
  drivers: number[];
}

/**
 * Estados del flujo de creación de base (wizard)
 */
export enum OperationBaseWizardStep {
  BASE = 'BASE',
  DRIVER = 'DRIVER',
  FORM = 'FORM',
}
