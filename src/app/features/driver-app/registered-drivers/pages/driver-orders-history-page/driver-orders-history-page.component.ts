import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { RegisteredDriverService } from '../../services/registered-driver.service';
import { OrderHistoryItem, OrderHistoryResponse, EdgeOrdersResponse } from '../../models/registered-driver.model';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';
import { forkJoin } from 'rxjs';

/**
 * Página de historial de pedidos del driver
 *
 * Features:
 * - ✅ Breadcrumb navigation
 * - ✅ Card con primera y última orden (Edge Orders)
 * - ✅ Filtros por estado (En Curso, Completadas, Canceladas)
 * - ✅ Tabla desktop responsiva
 * - ✅ Cards para mobile
 * - ✅ Paginación
 * - ✅ Loading states
 */
@Component({
  selector: 'app-driver-orders-history-page',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    SkeletonModule,
    PaginatorModule,
    ToastModule,
    CardModule,
    BreadcrumbComponent,
  ],
  templateUrl: './driver-orders-history-page.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverOrdersHistoryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly driverService = inject(RegisteredDriverService);
  private readonly messageService = inject(MessageService);

  // ============================================================================
  // STATE SIGNALS
  // ============================================================================

  driverId = signal<number>(0);
  orders = signal<OrderHistoryItem[]>([]);
  loading = signal(false);

  // Edge Orders (primera y última orden)
  edgeOrders = signal<EdgeOrdersResponse | null>(null);
  loadingEdgeOrders = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  totalCount = signal(0);
  totalDelivered = signal(0);
  totalPending = signal(0);
  totalCanceled = signal(0);

  // Filters
  selectedStatus = signal<string>('all'); // 'all', 'in_progress', 'completed', 'cancelled'

  // Breadcrumb
  breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Drivers Registrados', link: '/driver-app/registered-users-drivers' },
    { label: `Driver #${this.driverId()}`, link: `/driver-app/registered-users-drivers/${this.driverId()}` },
    { label: 'Historial de Pedidos', link: '' },
  ]);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    // Obtener ID de la ruta
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      if (id) {
        this.driverId.set(id);
        this.loadInitialData();
      }
    });
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar datos iniciales (edge orders + historial)
   */
  private loadInitialData(): void {
    this.loading.set(true);
    this.loadingEdgeOrders.set(true);

    // Primero cargamos el historial (crítico)
    this.driverService
      .getOrdersHistory(
        this.driverId(),
        this.currentPage(),
        this.pageSize(),
        this.selectedStatus() !== 'all' ? this.selectedStatus() : undefined
      )
      .subscribe({
        next: (ordersHistory) => {
          console.log('Orders History:', ordersHistory);
          console.log('Orders Data:', ordersHistory.data);

          // Orders history
          this.orders.set(ordersHistory.data);
          this.totalCount.set(ordersHistory.metadata.totalCount);
          this.totalDelivered.set(ordersHistory.metadata.totalOrdersDelivered);
          this.totalPending.set(ordersHistory.metadata.totalOrdersPending);
          this.totalCanceled.set(ordersHistory.metadata.totalOrdersCanceled);
          this.loading.set(false);

          console.log('Orders signal after set:', this.orders());
        },
        error: (err) => {
          console.error('Error loading orders:', err);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el historial de pedidos',
          });
        },
      });

    // Luego intentamos cargar edge orders (opcional, no debe bloquear la tabla)
    this.driverService.getEdgeOrders(this.driverId()).subscribe({
      next: (edgeOrders) => {
        console.log('Edge Orders:', edgeOrders);
        this.edgeOrders.set(edgeOrders);
        this.loadingEdgeOrders.set(false);
      },
      error: (err) => {
        console.warn('Edge orders not available:', err);
        this.loadingEdgeOrders.set(false);
        // No mostramos error al usuario, edge orders es opcional
      },
    });
  }

  /**
   * Cargar historial de pedidos (sin edge orders)
   */
  private loadOrders(): void {
    this.loading.set(true);

    this.driverService
      .getOrdersHistory(
        this.driverId(),
        this.currentPage(),
        this.pageSize(),
        this.selectedStatus() !== 'all' ? this.selectedStatus() : undefined
      )
      .subscribe({
        next: (response) => {
          this.orders.set(response.data);
          this.totalCount.set(response.metadata.totalCount);
          this.totalDelivered.set(response.metadata.totalOrdersDelivered);
          this.totalPending.set(response.metadata.totalOrdersPending);
          this.totalCanceled.set(response.metadata.totalOrdersCanceled);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading orders:', err);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el historial de pedidos',
          });
        },
      });
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Filtrar por status
   */
  filterByStatus(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadOrders();
  }

  /**
   * Cambiar página
   */
  onPageChange(event: any): void {
    this.currentPage.set(event.page + 1);
    this.pageSize.set(event.rows);
    this.loadOrders();
  }

  /**
   * Ver detalles de un pedido
   */
  viewOrderDetails(orderId: string): void {
    this.router.navigate(['/sac/order-tracking', orderId]);
  }

  /**
   * Volver al detalle del driver
   */
  goBack(): void {
    this.router.navigate(['/driver-app/registered-users-drivers', this.driverId()]);
  }

  /**
   * Track by para performance
   */
  trackByOrderId(index: number, order: OrderHistoryItem): string {
    return order.orderId;
  }

  /**
   * Obtener clase CSS del status
   */
  getStatusClass(status: string): string {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'entregada' || normalizedStatus === 'completada') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }

    if (normalizedStatus === 'pendiente' || normalizedStatus === 'en curso') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }

    if (normalizedStatus === 'cancelada') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }

    return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}
