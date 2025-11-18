import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, combineLatest, forkJoin, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { OrderStatusType } from '@shared/enums/order-status.enum';
import type {
  DashboardData,
  DashboardFilters,
  ApiResponse,
  HomeByCityDto,
  HomeByBrandsDto,
  HomeByPaymentMethodDto,
  HomeByChannelDto,
  HomeTotalOrdersByStatusDto,
  ShippingCostsStatisticsDto,
  AvgTicketGlobalDto,
  BrandSalesSummaryItemDto,
  PercentageDto,
  AvgValueDto
} from '../models/dashboard.model';
import { environment } from '@environments/environment';

/**
 * DashboardService
 *
 * Servicio para obtener datos del dashboard desde la API
 * Conecta con los endpoints de /api/v1/home/
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiURLDash;

  /**
   * Construye los query params para los endpoints
   */
  private buildParams(filters: DashboardFilters): HttpParams {
    let params = new HttpParams();

    // Fechas (OBLIGATORIAS)
    if (filters.startDate) {
      params = params.set('StartDate', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params = params.set('EndDate', filters.endDate.toISOString());
    }

    // Parámetros opcionales
    if (filters.approved !== undefined) {
      params = params.set('Approved', filters.approved.toString());
    }
    if (filters.orderStatusId !== undefined) {
      params = params.set('OrderStatusId', filters.orderStatusId.toString());
    }
    if (filters.cityId !== undefined) {
      params = params.set('CityId', filters.cityId.toString());
    }

    return params;
  }

  /**
   * Obtiene órdenes por ciudad
   */
  getOrdersByCity(filters: DashboardFilters): Observable<HomeByCityDto[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<HomeByCityDto[]>>(`${this.apiUrl}home/by-city`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error al obtener órdenes por ciudad:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene órdenes por marca
   */
  getOrdersByBrand(filters: DashboardFilters): Observable<HomeByBrandsDto[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<HomeByBrandsDto[]>>(`${this.apiUrl}home/by-brand`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error al obtener órdenes por marca:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene órdenes por método de pago
   */
  getOrdersByPaymentMethod(filters: DashboardFilters): Observable<HomeByPaymentMethodDto[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<HomeByPaymentMethodDto[]>>(`${this.apiUrl}home/by-payment-method`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error al obtener órdenes por método de pago:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene órdenes por canal
   */
  getOrdersByChannel(filters: DashboardFilters): Observable<HomeByChannelDto[]> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<HomeByChannelDto[]>>(`${this.apiUrl}home/by-channel`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error al obtener órdenes por canal:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene el total de órdenes por estado
   */
  getTotalOrdersByStatus(filters: DashboardFilters): Observable<number> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<HomeTotalOrdersByStatusDto>>(`${this.apiUrl}home/total-by-status`, { params })
      .pipe(
        map(response => response.data?.totalOrders || 0),
        catchError(error => {
          console.error('Error al obtener total de órdenes por estado:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene estadísticas de costos de envío
   */
  getShippingCostsStatistics(filters: DashboardFilters): Observable<ShippingCostsStatisticsDto> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<ShippingCostsStatisticsDto>>(`${this.apiUrl}orders/shipping-costs/statistics`, { params })
      .pipe(
        map(response => response.data || {
          promedioPagosEnvio: 0,
          promedioCostoEnvio: 0,
          costoMaximoEnvio: 0,
          totalCostosEnvio: 0,
          totalPagosEnvio: 0
        }),
        catchError(error => {
          console.error('Error al obtener estadísticas de costos de envío:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene el ticket promedio global
   */
  getAvgTicketGlobal(filters: DashboardFilters): Observable<number> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<AvgTicketGlobalDto>>(`${this.apiUrl}orders/avg-ticket/global`, { params })
      .pipe(
        map(response => response.data?.avgSubTotal || 0),
        catchError(error => {
          console.error('Error al obtener ticket promedio global:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene el resumen de ventas por marca (ingresos)
   */
  getBrandSalesSummary(filters: DashboardFilters, topN: number = 100): Observable<BrandSalesSummaryItemDto[]> {
    let params = this.buildParams(filters);
    params = params.set('TopN', topN.toString());

    return this.http.get<ApiResponse<BrandSalesSummaryItemDto[]>>(`${this.apiUrl}orders/brand-sales/summary`, { params })
      .pipe(
        map(response => response.data || []),
        catchError(error => {
          console.error('Error al obtener resumen de ventas por marca:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene el porcentaje de clientes recurrentes
   */
  getRecurrentCustomersPercentage(filters: DashboardFilters): Observable<number> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<PercentageDto>>(`${this.apiUrl}orders/recurrent-customers/percentage`, { params })
      .pipe(
        map(response => response.data?.percent || 0),
        catchError(error => {
          console.error('Error al obtener porcentaje de clientes recurrentes:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene el promedio de órdenes procesadas por día
   */
  getAvgOrdersPerDay(filters: DashboardFilters): Observable<number> {
    const params = this.buildParams(filters);
    return this.http.get<ApiResponse<AvgValueDto>>(`${this.apiUrl}orders/avg-per-day`, { params })
      .pipe(
        map(response => response.data?.value || 0),
        catchError(error => {
          console.error('Error al obtener promedio de órdenes por día:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obtiene todos los datos del dashboard en una sola llamada
   * Combina múltiples endpoints para construir DashboardData completo
   */
  getDashboardData(filters: DashboardFilters): Observable<DashboardData> {
    // Validar que las fechas existan (son obligatorias)
    if (!filters.startDate || !filters.endDate) {
      return throwError(() => new Error('Las fechas de inicio y fin son obligatorias'));
    }

    // Obtener órdenes entregadas (estado 8 = Entregada)
    const deliveredOrders$ = this.getTotalOrdersByStatus({
      ...filters,
      orderStatusId: OrderStatusType.Entregada
    });

    // Obtener órdenes en proceso (estados 1-7: excluyendo Entregada y Cancelada)
    // Hacemos una llamada para todas las órdenes menos entregadas y canceladas
    const allOrders$ = this.getTotalOrdersByStatus(filters);
    const cancelledOrders$ = this.getTotalOrdersByStatus({
      ...filters,
      orderStatusId: OrderStatusType.Cancelada
    });

    const ordersInProgress$ = combineLatest([
      allOrders$,
      deliveredOrders$,
      cancelledOrders$
    ]).pipe(
      map(([all, delivered, cancelled]) => all - delivered - cancelled)
    );

    // Obtener datos de los otros endpoints
    const ordersByPaymentMethod$ = this.getOrdersByPaymentMethod(filters);
    const ordersByChannel$ = this.getOrdersByChannel(filters);
    const ordersByBrand$ = this.getOrdersByBrand(filters);
    const ordersByCity$ = this.getOrdersByCity(filters);
    const shippingCostsStats$ = this.getShippingCostsStatistics(filters);

    // Nuevos endpoints
    const avgTicket$ = this.getAvgTicketGlobal(filters);
    const brandSales$ = this.getBrandSalesSummary(filters);
    const recurrentCustomers$ = this.getRecurrentCustomersPercentage(filters);
    const avgOrdersPerDay$ = this.getAvgOrdersPerDay(filters);

    // Combinar todas las llamadas
    return forkJoin({
      deliveredOrders: deliveredOrders$,
      ordersInProgress: ordersInProgress$,
      ordersByPaymentMethod: ordersByPaymentMethod$,
      ordersByChannel: ordersByChannel$,
      ordersByBrand: ordersByBrand$,
      ordersByCity: ordersByCity$,
      shippingCosts: shippingCostsStats$,
      avgTicket: avgTicket$,
      brandSales: brandSales$,
      recurrentCustomersPercentage: recurrentCustomers$,
      avgOrdersPerDay: avgOrdersPerDay$
    }).pipe(
      map(data => {
        // Transformar datos de la API al formato del dashboard
        const totalChannelOrders = data.ordersByChannel.reduce((sum, item) => sum + item.totalOrders, 0);

        // Total de órdenes = Entregadas + En Proceso
        const totalOrders = data.deliveredOrders + data.ordersInProgress;

        // Combinar datos de órdenes por marca con datos de ventas (ingresos)
        const brandSalesMap = new Map(
          data.brandSales.map(sale => [sale.brandShortName, sale])
        );

        return {
          totalOrders,
          deliveredOrders: data.deliveredOrders,
          ordersInProgress: data.ordersInProgress,
          ordersByPaymentMethod: data.ordersByPaymentMethod.map(item => ({
            method: item.paymentMethodName,
            total: item.totalOrders
          })),
          ordersByChannel: data.ordersByChannel.map(item => ({
            channel: item.channelDescription,
            total: item.totalOrders,
            percentage: totalChannelOrders > 0
              ? Math.round((item.totalOrders / totalChannelOrders) * 100)
              : 0
          })),
          ordersByBrand: data.ordersByBrand.map(item => {
            const salesData = brandSalesMap.get(item.brandName);
            return {
              brandId: 0, // No viene en la API, pero podríamos mapearlo
              brandName: item.brandName,
              logo: item.brandLogoUrl,
              total: item.totalOrders,
              totalRevenue: salesData?.totalMoney,
              totalSalesDelivered: salesData?.totalSalesDelivered
            };
          }),
          ordersByCity: data.ordersByCity.map(item => ({
            cityId: 0, // No viene en la API, pero podríamos mapearlo
            cityName: item.cityName,
            total: item.totalOrders
          })),
          shippingCosts: {
            averageShippingPayment: data.shippingCosts.promedioPagosEnvio,
            averageShippingCost: data.shippingCosts.promedioCostoEnvio,
            maxShippingCost: data.shippingCosts.costoMaximoEnvio,
            totalShippingCosts: data.shippingCosts.totalCostosEnvio,
            totalShippingPayments: data.shippingCosts.totalPagosEnvio
          },
          avgTicket: data.avgTicket,
          avgOrdersPerDay: data.avgOrdersPerDay,
          recurrentCustomersPercentage: data.recurrentCustomersPercentage
        };
      }),
      catchError(error => {
        console.error('Error al obtener datos del dashboard:', error);
        return throwError(() => error);
      })
    );
  }
}
