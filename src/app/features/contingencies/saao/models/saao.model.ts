/**
 * SAAO Models - Sistema de Asignación y Análisis de Órdenes
 * Modelos para el análisis de órdenes, drivers y tiempos de entrega
 */

/**
 * Orden SAAO - Representa una orden con toda la información de asignación y tiempos
 */
export interface SaaoOrder {
  // Información de la orden
  orderId: number;
  fechaOrden: string; // Formato: "MM-DD"
  storeShortName: string; // Nombre corto del restaurante

  // Tiempos de la orden
  hora: string; // Hora de creación (HH:mm)
  horaAsignacion: string | null; // Hora de asignación al driver (HH:mm) - null si pendiente
  horaFinalizacion: string | null; // Hora de finalización/entrega (HH:mm) - null si pendiente
  horaLiquidacion: string | null; // Hora de liquidación (HH:mm) - null si pendiente por liquidar
  minutos: number; // Minutos entre creación y asignación

  // Información del driver
  driverCode: string; // Código del driver (e.g., "BIP-01529")
  driverNombre: string; // Nombre completo del driver
  driverId: number; // ID numérico del driver

  // Estado y código
  codMesa: string | null; // Estado de la orden (e.g., "Orden Asignada")

  // Información de incidentes (nullable)
  codOrderIncident?: number | null; // Código del incidente
  incidentType: string | null; // Tipo de incidente (e.g., "D" para driver)
  previousDriverId: number | null; // ID del driver anterior en caso de reasignación
  createDateIncidente: string | null; // Fecha de creación del incidente
  userCreateIncident: string | null; // Usuario que creó el incidente
}

/**
 * Filtros para búsqueda de órdenes SAAO
 */
export interface SaaoFilters {
  fechaInicio?: string; // Fecha inicio (formato ISO)
  fechaFin?: string; // Fecha fin (formato ISO)
  driverId?: string; // Filtrar por driver específico
  restaurante?: string; // Filtrar por restaurante (shortname)
  conIncidentes?: boolean; // Solo órdenes con incidentes
  minMinutos?: number; // Mínimo de minutos de asignación
  maxMinutos?: number; // Máximo de minutos de asignación
}

/**
 * Parámetros del API para el endpoint /api/OrderTracking/saao/report
 * cityId y rango de fechas (dateFrom - dateTo) son OBLIGATORIOS
 */
export interface SaaoReportParams {
  cityId: number; // ID de la ciudad (OBLIGATORIO)
  dateFrom: string; // Fecha inicio en formato YYYY-MM-DD (OBLIGATORIO)
  dateTo: string; // Fecha fin en formato YYYY-MM-DD (OBLIGATORIO)
  storeId?: number; // ID del comercio/restaurante (OPCIONAL)
  driverId?: number; // ID del driver (OPCIONAL)
  brandId?: number; // ID de la marca (OPCIONAL)
  orderIds?: number[]; // Array de IDs de órdenes específicas (OPCIONAL)
}

/**
 * Interface para opción de ciudad en el select
 */
export interface CityOption {
  cityId: number;
  cityName: string;
}

/**
 * Interface para driver del API /Driver/DriverByCity/summary
 */
export interface DriverOption {
  idDriver: number;
  codeDriver: string;
  fullNameDriver: string;
}

/**
 * Interface para store/restaurante del API
 * Data viene del endpoint /api/Restaurant/UnlinkedRestaurants
 */
export interface StoreOption {
  restId: number; // ID del restaurante
  restBrandLogo: string; // URL del logo de la marca
  restAddress: string; // Dirección del restaurante
  restName: string; // Nombre completo del restaurante
  restShortName: string; // Nombre corto (e.g., "PH 14")
  restCityId: number; // ID de la ciudad
  restCountryId: number; // ID del país
}

/**
 * Interface para marca del API
 */
export interface BrandOption {
  idBrand: number;
  nameBrand: string;
  logoBrand: string;
  sortOrderBrand: number;
}

/**
 * Estadísticas de un driver
 */
export interface DriverStats {
  driver_id: number;
  DriverId: string;
  Nombre: string;
  totalOrdenes: number;
  ordenesConIncidentes: number;
  promedioMinutosAsignacion: number;
  totalMinutosAsignacion: number;
  ordenesRapidas: number; // Órdenes asignadas en menos de 11 minutos
  ordenesLentas: number; // Órdenes asignadas en 11 minutos o más
}

/**
 * Estado de un driver
 * Información del API /Driver/status/{driverId}
 */

export interface DriverStatus {
  driverId: number
  driverCode: string
  fullname: string
  cityId: number
  cityName?: string // Nombre de la ciudad (opcional)
  isAvailableForAssignment: boolean
  isCurrentlyWorking: boolean
  status: boolean
  hasActivePenalty: boolean
}

/**
 * Estadísticas de un restaurante
 */
export interface RestaurantStats {
  shortname: string;
  totalOrdenes: number;
  ordenesConIncidentes: number;
  promedioMinutosAsignacion: number;
  driversUnicos: number;
}

/**
 * Tipo de incidente
 */
export enum IncidentType {
  DRIVER = 'D',
  RESTAURANT = 'R',
  CLIENT = 'C',
  SYSTEM = 'S'
}

/**
 * Información detallada de un incidente
 */
export interface IncidentDetail {
  codOrderIncident: number;
  order_id: number;
  OrderId: number;
  create_date_incidente: string;
  user_create_incident: string;
  incident_type: IncidentType;
  previous_driver_id: number | null;
  current_driver_id: number;
  shortname: string;
  FechaOrden: string;
}

/**
 * Respuesta del API para órdenes SAAO
 */
export interface SaaoOrdersResponse {
  success: boolean;
  data: SaaoOrder[];
  total: number;
  page?: number;
  pageSize?: number;
}

/**
 * Respuesta del API para estadísticas
 */
export interface SaaoStatsResponse {
  success: boolean;
  drivers: DriverStats[];
  restaurants: RestaurantStats[];
  totalOrdenes: number;
  totalIncidentes: number;
  promedioGlobalMinutos: number;
}

/**
 * Opciones para exportación de datos
 */
export interface ExportOptions {
  formato: 'excel' | 'csv' | 'pdf';
  incluirIncidentes: boolean;
  incluirEstadisticas: boolean;
  fechaInicio: string;
  fechaFin: string;
}

/**
 * Helper para calcular tiempos entre estados
 */
export interface OrderTimings {
  minutosAsignacion: number; // Hora - HoraAsignacion
  minutosEntrega: number; // HoraAsignacion - HoraFinalizacion
  minutosLiquidacion: number; // HoraFinalizacion - HoraLiquidacion
  minutosTotal: number; // Hora - HoraLiquidacion
}

/**
 * Constantes para categorización de tiempos
 * - RAPIDA: Menos de 10 minutos (óptimo)
 * - LENTA: 11 minutos en adelante (necesita atención)
 */
export const TIMING_CATEGORIES = {
  RAPIDA: { max: 11, label: 'Rápida', color: 'green' },
  LENTA: { min: 11, label: 'Lenta', color: 'red' }
} as const;

/**
 * Helper para obtener categoría de tiempo de asignación
 * Retorna 'RAPIDA' si es menor a 11 minutos, 'LENTA' si es 11 o más
 */
export function getTimingCategory(minutos: number): keyof typeof TIMING_CATEGORIES {
  if (minutos < TIMING_CATEGORIES.RAPIDA.max) return 'RAPIDA';
  return 'LENTA';
}

/**
 * Helper para parsear tiempo HH:mm a minutos desde medianoche
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper para calcular diferencia en minutos entre dos tiempos
 */
export function calculateTimeDifference(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  // Manejar caso donde el tiempo cruza medianoche
  if (endMinutes < startMinutes) {
    return (24 * 60 - startMinutes) + endMinutes;
  }

  return endMinutes - startMinutes;
}

/**
 * Helper para calcular todos los timings de una orden
 * Retorna 0 si alguno de los tiempos es null (pendiente por liquidar)
 */
export function calculateOrderTimings(order: SaaoOrder): OrderTimings {
  return {
    minutosAsignacion: order.minutos, // Ya viene calculado
    minutosEntrega:
      order.horaAsignacion && order.horaFinalizacion
        ? calculateTimeDifference(order.horaAsignacion, order.horaFinalizacion)
        : 0,
    minutosLiquidacion:
      order.horaFinalizacion && order.horaLiquidacion
        ? calculateTimeDifference(order.horaFinalizacion, order.horaLiquidacion)
        : 0,
    minutosTotal:
      order.horaLiquidacion
        ? calculateTimeDifference(order.hora, order.horaLiquidacion)
        : 0
  };
}

/**
 * Helper para verificar si una orden está pendiente por liquidar
 * Una orden está pendiente si cualquiera de los tiempos finales es null
 */
export function isPendingSettlement(order: SaaoOrder): boolean {
  return (
    order.horaAsignacion === null ||
    order.horaFinalizacion === null ||
    order.horaLiquidacion === null
  );
}

/**
 * Helper para obtener el estado de liquidación de una orden
 */
export function getSettlementStatus(order: SaaoOrder): string {
  if (order.horaLiquidacion === null) {
    return 'Pendiente por Liquidar';
  }
  if (order.horaFinalizacion === null) {
    return 'Pendiente por Finalizar';
  }
  if (order.horaAsignacion === null) {
    return 'Pendiente por Asignar';
  }
  return 'Liquidada';
}

/**
 * Helper para verificar si una orden tiene incidente
 */
export function hasIncident(order: SaaoOrder): boolean {
  return order.codOrderIncident !== null && order.codOrderIncident !== undefined;
}

/**
 * Helper para obtener detalle de incidente de una orden
 */
export function getIncidentDetail(order: SaaoOrder): IncidentDetail | null {
  if (!hasIncident(order)) return null;

  return {
    codOrderIncident: order.codOrderIncident!,
    order_id: order.orderId,
    OrderId: order.orderId,
    create_date_incidente: order.createDateIncidente!,
    user_create_incident: order.userCreateIncident!,
    incident_type: (order.incidentType?.trim() as IncidentType) || IncidentType.SYSTEM,
    previous_driver_id: order.previousDriverId,
    current_driver_id: order.driverId,
    shortname: order.storeShortName,
    FechaOrden: order.fechaOrden
  };
}
