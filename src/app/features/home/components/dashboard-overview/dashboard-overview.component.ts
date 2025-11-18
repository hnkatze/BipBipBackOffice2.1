import { Component, signal, computed, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

// Chart.js
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// PrimeNG
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

// Services & Models
import { DashboardService } from '../../services/dashboard.service';
import { GlobalDataService } from '@core/services/global-data.service';
import type { DashboardData, DashboardKPI, DashboardFilters } from '../../models/dashboard.model';

// Registrar Chart.js y plugins
Chart.register(...registerables, ChartDataLabels);

/**
 * DashboardOverviewComponent
 *
 * Componente de resumen del dashboard con KPIs, tabla y gráfico donut
 */
@Component({
  selector: 'app-dashboard-overview',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    SelectModule,
    DatePickerModule,
    TableModule,
    ChartModule,
    ButtonModule,
    SkeletonModule
  ],
  templateUrl: './dashboard-overview.component.html',
  styleUrls: ['./dashboard-overview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardOverviewComponent implements OnInit {
  // Services
  private readonly dashboardService = inject(DashboardService);
  private readonly globalDataService = inject(GlobalDataService);
  private readonly fb = inject(FormBuilder);

  // Signals
  readonly isLoading = signal(false);
  readonly dashboardData = signal<DashboardData | null>(null);
  readonly error = signal<string | null>(null);

  // Form
  readonly filtersForm: FormGroup;

  // Options para select de ciudades (desde GlobalDataService)
  readonly cities = computed(() => {
    const citiesFromService = this.globalDataService.citiesShort();
    return [
      { name: 'Todas las ciudades', id: undefined },
      ...citiesFromService.map(city => ({
        name: city.name,
        id: city.id
      }))
    ];
  });

  // Options para rangos de fechas predefinidos
  readonly dateRangeOptions = signal([
    { label: 'Personalizado', value: 'custom' },
    { label: 'Hoy', value: 'today' },
    { label: 'Ayer', value: 'yesterday' },
    { label: 'Últimos 7 días', value: 'last7days' },
    { label: 'Últimos 15 días', value: 'last15days' },
    { label: 'Últimos 30 días', value: 'last30days' },
    { label: 'Esta semana', value: 'thisWeek' },
    { label: 'Semana pasada', value: 'lastWeek' },
    { label: 'Este mes', value: 'thisMonth' },
    { label: 'Mes pasado', value: 'lastMonth' },
    { label: 'Últimos 90 días', value: 'last90days' }
  ]);

  // Computed - KPIs de órdenes
  readonly orderKpis = computed<DashboardKPI[]>(() => {
    const data = this.dashboardData();
    if (!data) return [];

    return [
      {
        label: 'Total De Ordenes',
        value: data.totalOrders,
        icon: 'pi pi-shopping-cart'
      },
      {
        label: 'Total De Ordenes Entregadas',
        value: data.deliveredOrders,
        icon: 'pi pi-check-circle'
      },
      {
        label: 'Total Ordenes En Proceso',
        value: data.ordersInProgress,
        icon: 'pi pi-clock'
      }
    ];
  });

  // Computed - KPIs de costos de envío
  readonly shippingKpis = computed<DashboardKPI[]>(() => {
    const data = this.dashboardData();
    if (!data) return [];

    return [
      {
        label: 'Promedio de Pagos de Envío',
        value: data.shippingCosts.averageShippingPayment,
        icon: 'pi pi-wallet'
      },
      {
        label: 'Promedio de Costo de Envío',
        value: data.shippingCosts.averageShippingCost,
        icon: 'pi pi-dollar'
      },
      {
        label: 'Costo Máximo de Envío',
        value: data.shippingCosts.maxShippingCost,
        icon: 'pi pi-arrow-up'
      },
      {
        label: 'Total de Costos de Envío',
        value: data.shippingCosts.totalShippingCosts,
        icon: 'pi pi-money-bill'
      },
      {
        label: 'Total Pago de Envío',
        value: data.shippingCosts.totalShippingPayments,
        icon: 'pi pi-credit-card'
      }
    ];
  });

  // Computed - KPIs de ventas
  readonly salesKpis = computed<DashboardKPI[]>(() => {
    const data = this.dashboardData();
    if (!data) return [];

    return [
      {
        label: 'Ticket Promedio',
        value: data.avgTicket || 0,
        icon: 'pi pi-dollar'
      },
      {
        label: 'Promedio Órdenes/Día',
        value: data.avgOrdersPerDay || 0,
        icon: 'pi pi-chart-line'
      }
    ];
  });

  // Computed - KPIs de clientes
  readonly customerKpis = computed<DashboardKPI[]>(() => {
    const data = this.dashboardData();
    if (!data) return [];

    return [
      {
        label: 'Clientes Recurrentes',
        value: data.recurrentCustomersPercentage || 0,
        icon: 'pi pi-users'
      }
    ];
  });

  // Computed - Chart data para el donut
  readonly chartData = computed(() => {
    const data = this.dashboardData();
    if (!data) return null;

    return {
      labels: data.ordersByChannel.map(item => item.channel),
      datasets: [
        {
          data: data.ordersByChannel.map(item => item.total),
          backgroundColor: [
            '#FB0021', // primary-500 - Rojo principal
            '#F7395B', // primary-400 - Rojo medio claro
            '#FA8D9F', // primary-200 - Rojo claro
            '#FCBCC6'  // primary-100 - Rojo muy claro
          ],
          hoverBackgroundColor: [
            '#E9001C', // primary-600 - Hover oscuro
            '#F85D78', // primary-300 - Hover medio
            '#F7395B', // primary-400 - Hover claro
            '#FA8D9F'  // primary-200 - Hover muy claro
          ]
        }
      ]
    };
  });

  // Computed - Leyendas del chart
  readonly chartLegends = computed(() => {
    const data = this.dashboardData();
    if (!data) return [];

    const total = data.ordersByChannel.reduce((acc, item) => acc + item.total, 0);
    const colors = ['#FB0021', '#F7395B', '#FA8D9F', '#FCBCC6'];

    return data.ordersByChannel.map((item, index) => ({
      label: item.channel,
      value: item.total,
      percentage: ((item.total / total) * 100).toFixed(1),
      color: colors[index]
    }));
  });

  // Opciones para el chart con porcentajes en el donut
  readonly chartOptions = {
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const dataset = context.dataset.data as number[];
            const total = dataset.reduce((acc: number, curr: number) => acc + curr, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString('es-CO')} (${percentage}%)`;
          }
        }
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: 14
        },
        formatter: (value: number, context: any) => {
          const dataset = context.chart.data.datasets[0].data as number[];
          const total = dataset.reduce((acc: number, curr: number) => acc + curr, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          return `${percentage}%`;
        }
      }
    },
    cutout: '60%',
    responsive: true,
    maintainAspectRatio: true
  };

  constructor() {
    // Establecer rango de fechas por defecto (últimos 30 días)
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Inicializar formulario de filtros con fechas por defecto
    this.filtersForm = this.fb.group({
      selectedCity: [{ name: 'Todas las ciudades', id: undefined }],
      selectedDateRange: [this.dateRangeOptions()[5]], // Últimos 30 días
      dateRange: [[thirtyDaysAgo, today]],
      approved: [true]
    });
  }

  ngOnInit(): void {
    // Cargar las ciudades si no están cargadas
    if (this.globalDataService.citiesShort().length === 0) {
      this.globalDataService.forceRefresh('citiesShort');
    }

    this.loadDashboardData();
  }

  /**
   * Carga los datos del dashboard con los filtros actuales
   */
  loadDashboardData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const filters = this.buildFilters();

    this.dashboardService.getDashboardData(filters).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error cargando datos del dashboard:', error);
        this.error.set('Error al cargar los datos del dashboard. Por favor, intenta nuevamente.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Construye el objeto de filtros desde el formulario
   */
  private buildFilters(): DashboardFilters {
    const formValue = this.filtersForm.value;
    const filters: DashboardFilters = {};

    // Rango de fechas (OBLIGATORIO)
    if (formValue.dateRange && Array.isArray(formValue.dateRange)) {
      const [startDate, endDate] = formValue.dateRange;

      // Si tenemos fechas, las usamos
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      } else {
        // Si no hay fechas, establecer últimos 30 días por defecto
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        filters.startDate = thirtyDaysAgo;
        filters.endDate = today;
      }
    } else {
      // Si dateRange es null, usar últimos 30 días
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      filters.startDate = thirtyDaysAgo;
      filters.endDate = today;
    }

    // Ciudad
    if (formValue.selectedCity?.id !== undefined) {
      filters.cityId = formValue.selectedCity.id;
    }

    // Aprobado (siempre true)
    filters.approved = true;

    return filters;
  }

  /**
   * Aplica los filtros seleccionados
   */
  applyFilters(): void {
    this.loadDashboardData();
  }

  /**
   * Limpia los filtros y recarga los datos
   */
  clearFilters(): void {
    // Restablecer a últimos 30 días
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.filtersForm.patchValue({
      selectedCity: { name: 'Todas las ciudades', id: undefined },
      selectedDateRange: this.dateRangeOptions()[5], // Últimos 30 días
      dateRange: [thirtyDaysAgo, today],
      approved: true
    });
    this.loadDashboardData();
  }

  /**
   * Maneja el cambio de rango de fecha predefinido
   */
  onDateRangeChange(): void {
    const selectedRange = this.filtersForm.get('selectedDateRange')?.value;
    if (!selectedRange || selectedRange.value === 'custom') {
      return;
    }

    const dateRange = this.calculateDateRange(selectedRange.value);
    this.filtersForm.patchValue({
      dateRange: dateRange
    }, { emitEvent: false });
  }

  /**
   * Calcula el rango de fechas según la opción seleccionada
   */
  private calculateDateRange(rangeType: string): [Date, Date] {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final del día de hoy

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Inicio del día

    switch (rangeType) {
      case 'today':
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        const yesterday = new Date(startDate);
        yesterday.setHours(23, 59, 59, 999);
        return [startDate, yesterday];

      case 'last7days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'last15days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 14);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'last30days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'last90days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 89);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'thisWeek':
        // Lunes de esta semana
        startDate = new Date(today);
        const dayOfWeek = startDate.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si es domingo, retroceder 6 días
        startDate.setDate(startDate.getDate() + diff);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'lastWeek':
        // Lunes de la semana pasada
        const lastWeekStart = new Date(today);
        const currentDay = lastWeekStart.getDay();
        const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        lastWeekStart.setDate(lastWeekStart.getDate() + daysToMonday - 7);
        lastWeekStart.setHours(0, 0, 0, 0);

        // Domingo de la semana pasada
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        return [lastWeekStart, lastWeekEnd];

      case 'thisMonth':
        // Primer día del mes actual
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'lastMonth':
        // Primer día del mes pasado
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        lastMonthStart.setHours(0, 0, 0, 0);

        // Último día del mes pasado
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return [lastMonthStart, lastMonthEnd];

      default:
        // Por defecto, últimos 30 días
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
    }

    return [startDate, today];
  }

  /**
   * Maneja el cambio manual del datepicker
   */
  onManualDateChange(): void {
    // Cambiar a "Personalizado" cuando se edita manualmente
    this.filtersForm.patchValue({
      selectedDateRange: this.dateRangeOptions()[0] // Personalizado
    }, { emitEvent: false });
  }

  /**
   * Formatea números grandes con separadores de miles usando coma
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-HN', {
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Formatea valores monetarios en formato de moneda
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  /**
   * Formatea valores como porcentaje
   */
  formatPercentage(value: number): string {
    return new Intl.NumberFormat('es-HN', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value / 100);
  }

  /**
   * Calcula el total de órdenes por marca
   */
  getTotalByBrand(): number {
    const data = this.dashboardData();
    if (!data) return 0;
    return data.ordersByBrand.reduce((acc, item) => acc + item.total, 0);
  }

  /**
   * Calcula el total de ingresos por marca
   */
  getTotalRevenueByBrand(): number {
    const data = this.dashboardData();
    if (!data) return 0;
    return data.ordersByBrand.reduce((acc, item) => acc + (item.totalRevenue || 0), 0);
  }

  /**
   * Calcula el total de órdenes por ciudad
   */
  getTotalByCity(): number {
    const data = this.dashboardData();
    if (!data) return 0;
    return data.ordersByCity.reduce((acc, item) => acc + item.total, 0);
  }
}
