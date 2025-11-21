import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { DrawerModule } from 'primeng/drawer';
import { MenuItem, MessageService, SelectItem } from 'primeng/api';
import { PopoverModule } from 'primeng/popover';
import { DialogService } from 'primeng/dynamicdialog';

// Models & Services
import { TrackOrderList, TimeFilterType, ActiveFilter, OrderSearchParams, VolumeChartData } from '../../models';
import { OrderTrackingService } from '../../services';
import { FilterSidebarComponent } from '../../components/filter-sidebar/filter-sidebar.component';
import { VolumeChartComponent } from '../../components/volume-chart/volume-chart.component';
import { EditDeliveryTimeDialogComponent } from '../../components/edit-delivery-time-dialog/edit-delivery-time-dialog.component';
import { CancelOrderDialogComponent } from '../../components/cancel-order-dialog/cancel-order-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-order-tracking-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    BreadcrumbModule,
    SkeletonModule,
    ToastModule,
    SelectModule,
    TagModule,
    TooltipModule,
    ChipModule,
    DrawerModule,
    CurrencyPipe,
    DatePipe,
    FilterSidebarComponent,
    VolumeChartComponent,
    PopoverModule
  ],
  providers: [MessageService, DialogService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './order-tracking-page.component.html',
  styleUrl: './order-tracking-page.component.scss'
})
export class OrderTrackingPageComponent implements OnInit {
  readonly orderTrackingService = inject(OrderTrackingService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);

  // Search subject for debouncing
  private searchSubject = new Subject<string>();

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'SAC', routerLink: '/sac' },
    { label: 'Seguimiento de Pedidos' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  // Form controls
  readonly searchControl = new FormControl('');
  readonly timeFilterControl = new FormControl<TimeFilterType | null>(TimeFilterType.LAST_HOUR);

  // Local signals
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly showFilterSidebar = signal(false);
  readonly activeFilters = signal<ActiveFilter[]>([
    { type: 'time', label: 'Tiempo: Última hora', value: TimeFilterType.LAST_HOUR }
  ]);

  // Flag to track if this is the initial lazy load
  private initialLazyLoadDone = false;

  // Charts signals
  readonly showCharts = signal(true);
  readonly chartsLoading = signal(false);
  readonly volumePendingData = signal<VolumeChartData>({ name: 'Pedidos Pendientes', series: [] });
  readonly volumeCompletedData = signal<VolumeChartData>({ name: 'Pedidos Completados', series: [] });
  readonly volumeCancelledData = signal<VolumeChartData>({ name: 'Pedidos Cancelados', series: [] });

  // Time filter options
  readonly timeFilterOptions: SelectItem<TimeFilterType>[] = [
    { label: 'Última hora', value: TimeFilterType.LAST_HOUR },
    { label: 'Últimas 24 horas', value: TimeFilterType.LAST_24_HOURS },
    { label: 'Últimos 7 días', value: TimeFilterType.LAST_WEEK },
    { label: 'Último mes', value: TimeFilterType.LAST_MONTH }
  ];

  // Computed signals
  readonly isLoading = computed(() => this.orderTrackingService.isLoading());
  readonly orders = computed(() => this.orderTrackingService.orders());
  readonly totalRecords = computed(() => this.orderTrackingService.totalCount());
  readonly hasActiveFilters = computed(() => this.activeFilters().length > 0);

  constructor() {
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(2000),
      distinctUntilChanged()
    ).subscribe(searchText => {
      this.performSearch();
    });
  }

  ngOnInit(): void {
    // onLazyLoad se encarga de la carga inicial de órdenes
    this.loadCharts();
  }

  /**
   * Carga los datos de los gráficos
   */
  loadCharts(): void {
    this.chartsLoading.set(true);

    const timeOption = this.timeFilterControl.value || TimeFilterType.LAST_HOUR;

    forkJoin({
      pending: this.orderTrackingService.getVolumeOrders(timeOption),
      completed: this.orderTrackingService.getVolumeCompletedOrders(timeOption),
      cancelled: this.orderTrackingService.getVolumeCancelledOrders(timeOption)
    }).subscribe({
      next: ({ pending, completed, cancelled }) => {
        this.volumePendingData.set(pending);
        this.volumeCompletedData.set(completed);
        this.volumeCancelledData.set(cancelled);
        this.chartsLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar gráficos:', error);
        this.chartsLoading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los gráficos de volumen'
        });
      }
    });
  }

  /**
   * Alterna la visualización de los gráficos
   */
  toggleCharts(): void {
    this.showCharts.update(show => !show);
  }

  /**
   * Carga las órdenes con los filtros actuales
   */
  loadOrders(): void {
    const params: OrderSearchParams = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      option: this.timeFilterControl.value || undefined,
      filter: this.searchControl.value || undefined
    };

    this.orderTrackingService.searchOrders(params).subscribe({
      next: () => {
        // Success - data is already set in the service
      },
      error: (error) => {
        console.error('Error al cargar órdenes:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las órdenes'
        });
      }
    });
  }

  /**
   * Maneja el cambio en el input de búsqueda
   */
  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  /**
   * Maneja la tecla Enter en el input de búsqueda
   */
  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchSubject.next((event.target as HTMLInputElement).value);
      this.performSearch();
    }
  }

  /**
   * Ejecuta la búsqueda
   */
  private performSearch(): void {
    this.currentPage.set(1); // Reset to first page
    this.loadOrders();

    // Update active filters
    const searchText = this.searchControl.value;
    if (searchText) {
      const existing = this.activeFilters().filter(f => f.type !== 'search');
      this.activeFilters.set([
        ...existing,
        { type: 'search', label: `Búsqueda: "${searchText}"`, value: searchText }
      ]);
    } else {
      this.activeFilters.update(filters => filters.filter(f => f.type !== 'search'));
    }
  }

  /**
   * Maneja el cambio del filtro de tiempo
   */
  onTimeFilterChange(): void {
    this.currentPage.set(1);
    this.loadOrders();
    this.loadCharts(); // Recargar gráficos con el nuevo filtro de tiempo

    // Update active filters
    const timeFilter = this.timeFilterControl.value;
    if (timeFilter) {
      const option = this.timeFilterOptions.find(o => o.value === timeFilter);
      const existing = this.activeFilters().filter(f => f.type !== 'time');
      this.activeFilters.set([
        ...existing,
        { type: 'time', label: `Tiempo: ${option?.label}`, value: timeFilter }
      ]);
    } else {
      this.activeFilters.update(filters => filters.filter(f => f.type !== 'time'));
    }
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(event: any): void {
    // La primera vez que se dispara onLazyLoad es en el ngOnInit de la tabla
    // En ese caso, cargamos los datos iniciales
    if (!this.initialLazyLoadDone) {
      this.initialLazyLoadDone = true;
      this.loadOrders();
      return;
    }

    // Evitar bucle infinito: si ya estamos cargando, no hacer nada
    if (this.isLoading()) {
      return;
    }

    // PrimeNG envía 'first' (índice del primer registro) y 'rows' (registros por página)
    // Calculamos el número de página: page = (first / rows) + 1
    const rows = event.rows || 10;
    const first = event.first || 0;
    const page = Math.floor(first / rows) + 1;

    // Solo cargar si realmente cambió la página o el tamaño
    if (page !== this.currentPage() || rows !== this.pageSize()) {
      this.currentPage.set(page);
      this.pageSize.set(rows);
      this.loadOrders();
    }
  }

  /**
   * Abre el sidebar de filtros avanzados
   */
  openFilterSidebar(): void {
    this.showFilterSidebar.set(true);
  }

  /**
   * Maneja la aplicación de filtros avanzados desde el sidebar
   */
  onFiltersApplied(filters: any): void {
    this.showFilterSidebar.set(false);
    this.currentPage.set(1);

    // Format dates if present
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange;
      startDate = this.formatDateToISO(start);
      endDate = this.formatDateToISO(end);
    }

    // Build advanced filters object
    const advancedFilters = {
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      StartDate: startDate,
      EndDate: endDate,
      CountryIds: filters.selectedCountries || [],
      CityIds: filters.selectedCities || [],
      Brands: filters.selectedBrands || []
    };

    // Update active filters display
    this.updateActiveFiltersFromAdvanced(filters, startDate, endDate);

    // Call service
    this.orderTrackingService.searchWithAdvancedFilters(advancedFilters).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Filtros aplicados',
          detail: `Se encontraron ${response.records.length} órdenes`
        });
      },
      error: (error) => {
        console.error('Error applying advanced filters:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron aplicar los filtros avanzados'
        });
      }
    });
  }

  /**
   * Formatea una fecha a ISO string (YYYY-MM-DD)
   */
  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Actualiza los filtros activos basándose en los filtros avanzados aplicados
   */
  private updateActiveFiltersFromAdvanced(filters: any, startDate?: string, endDate?: string): void {
    const newActiveFilters: ActiveFilter[] = [];

    // Add date range filter
    if (startDate && endDate) {
      newActiveFilters.push({
        type: 'date',
        label: `Fecha: ${startDate} - ${endDate}`,
        value: { startDate, endDate }
      });
    }

    // Add countries filter
    if (filters.selectedCountries && filters.selectedCountries.length > 0) {
      newActiveFilters.push({
        type: 'country',
        label: `Países: ${filters.selectedCountries.length} seleccionados`,
        value: filters.selectedCountries
      });
    }

    // Add cities filter
    if (filters.selectedCities && filters.selectedCities.length > 0) {
      newActiveFilters.push({
        type: 'city',
        label: `Ciudades: ${filters.selectedCities.length} seleccionadas`,
        value: filters.selectedCities
      });
    }

    // Add brands filter
    if (filters.selectedBrands && filters.selectedBrands.length > 0) {
      newActiveFilters.push({
        type: 'brand',
        label: `Marcas: ${filters.selectedBrands.length} seleccionadas`,
        value: filters.selectedBrands
      });
    }

    this.activeFilters.set(newActiveFilters);
  }

  /**
   * Elimina un filtro activo
   */
  removeFilter(filter: ActiveFilter): void {
    if (filter.type === 'search') {
      this.searchControl.setValue('');
      this.activeFilters.update(filters => filters.filter(f => f.type !== 'search'));
    } else if (filter.type === 'time') {
      // Reset to default LAST_HOUR
      this.timeFilterControl.setValue(TimeFilterType.LAST_HOUR);
      this.activeFilters.update(filters => {
        const filtered = filters.filter(f => f.type !== 'time');
        return [...filtered, { type: 'time', label: 'Tiempo: Última hora', value: TimeFilterType.LAST_HOUR }];
      });
    } else if (['date', 'country', 'city', 'brand'].includes(filter.type)) {
      // Remove advanced filter
      this.activeFilters.update(filters => filters.filter(f => f.type !== filter.type));

      // If all advanced filters are removed, reload with basic search
      const remainingAdvancedFilters = this.activeFilters().filter(f =>
        ['date', 'country', 'city', 'brand'].includes(f.type)
      );

      if (remainingAdvancedFilters.length === 0) {
        // Reload with basic search
        this.loadOrders();
        return;
      }
    }

    this.loadOrders();
  }

  /**
   * Limpia todos los filtros
   */
  clearAllFilters(): void {
    this.searchControl.setValue('');
    this.timeFilterControl.setValue(TimeFilterType.LAST_HOUR);
    this.activeFilters.set([
      { type: 'time', label: 'Tiempo: Última hora', value: TimeFilterType.LAST_HOUR }
    ]);
    this.loadOrders();
  }

  /**
   * Navega al detalle de una orden
   */
  viewOrderDetails(order: TrackOrderList): void {
    this.router.navigate(['/sac/order-tracking', order.numOrder]);
  }

  /**
   * Abre el diálogo para editar tiempo de entrega
   */
  editDeliveryTime(order: TrackOrderList): void {
    const ref = this.dialogService.open(EditDeliveryTimeDialogComponent, {
      header: '',
      width: '500px',
      modal: true,
      data: { order }
    });

    if (ref) {
      ref.onClose.subscribe((result) => {
        if (result) {
          // Actualizar localmente el tiempo estimado
          const updatedOrders = this.orderTrackingService.orders().map(o =>
            o.numOrder === order.numOrder ? { ...o, estimatedTime: result.newTime } : o
          );
          this.orderTrackingService.orders.set(updatedOrders);

          this.messageService.add({
            severity: 'success',
            summary: 'Tiempo actualizado',
            detail: `El tiempo de entrega se ha modificado a ${result.newTime}`
          });
        }
      });
    }
  }

  /**
   * Abre el diálogo para cancelar una orden
   */
  cancelOrder(order: TrackOrderList): void {
    const ref = this.dialogService.open(CancelOrderDialogComponent, {
      header: '',
      width: '550px',
      modal: true,
      data: { order }
    });

    if (ref) {
      ref.onClose.subscribe((result) => {
        if (result?.success) {
          // Recargar las órdenes para reflejar el cambio
          this.loadOrders();
        }
      });
    }
  }

  /**
   * Obtiene los items del menú de acciones para una orden
   */
  getOrderMenuItems(order: TrackOrderList): MenuItem[] {
    const isCancelled = order.orderStatus.toUpperCase() === 'CANCELADO';

    if (isCancelled) {
      return [
        {
          label: 'Ver detalles',
          icon: 'pi pi-eye',
          command: () => this.viewOrderDetails(order)
        }
      ];
    }

    return [
      {
        label: 'Ver detalles',
        icon: 'pi pi-eye',
        command: () => this.viewOrderDetails(order)
      },
      {
        label: 'Editar',
        icon: 'pi pi-pencil',
        command: () => this.editDeliveryTime(order)
      },
      {
        label: 'Cancelar pedido',
        icon: 'pi pi-ban',
        command: () => this.cancelOrder(order)
      }
    ];
  }

  /**
   * Obtiene la severidad del tag según el estado de la orden
   */
  getOrderStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completado') || statusLower.includes('entregado')) {
      return 'success';
    } else if (statusLower.includes('cancelado')) {
      return 'danger';
    } else if (statusLower.includes('proceso') || statusLower.includes('preparando')) {
      return 'info';
    } else if (statusLower.includes('pendiente')) {
      return 'warn';
    }
    return 'secondary';
  }

  /**
   * Trunca el texto de detalles de la orden
   */
  truncateOrderDetails(details: string, maxLength: number = 50): string {
    if (!details || details.length <= maxLength) {
      return details;
    }
    return details.substring(0, maxLength) + '...';
  }
}
