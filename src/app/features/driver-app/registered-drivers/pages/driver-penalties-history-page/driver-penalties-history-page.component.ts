import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { RegisteredDriverService } from '../../services/registered-driver.service';
import { PenaltyHistoryItem } from '../../models/registered-driver.model';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';
import { PenaltyDetailsDialogComponent } from '../../components/penalty-details-dialog/penalty-details-dialog.component';

/**
 * Página de historial de penalizaciones del driver
 *
 * Features:
 * - ✅ Breadcrumb navigation
 * - ✅ Filtro por status (Todas, Activas, Finalizadas)
 * - ✅ Búsqueda con debounce
 * - ✅ Tabla desktop responsiva
 * - ✅ Cards para mobile
 * - ✅ Paginación
 * - ✅ Modal de detalles
 * - ✅ Loading states
 */
@Component({
  selector: 'app-driver-penalties-history-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SkeletonModule,
    PaginatorModule,
    ToastModule,
    BreadcrumbComponent,
    PenaltyDetailsDialogComponent,
  ],
  templateUrl: './driver-penalties-history-page.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverPenaltiesHistoryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly driverService = inject(RegisteredDriverService);
  private readonly messageService = inject(MessageService);

  // ============================================================================
  // VIEWCHILDS
  // ============================================================================

  detailsDialog = viewChild.required(PenaltyDetailsDialogComponent);

  // ============================================================================
  // STATE SIGNALS
  // ============================================================================

  driverId = signal<number>(0);
  driverName = signal<string>('');
  penalties = signal<PenaltyHistoryItem[]>([]);
  loading = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  totalCount = signal(0);
  totalActive = signal(0);
  totalInactive = signal(0);

  // Filters
  selectedStatus = signal<number>(0); // 0 = Todas, 1 = Activas, 2 = Finalizadas
  searchControl = new FormControl('');

  // Breadcrumb
  breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Drivers Registrados', link: '/driver-app/registered-users-drivers' },
    { label: `Driver #${this.driverId()}`, link: `/driver-app/registered-users-drivers/${this.driverId()}` },
    { label: 'Historial de Penalizaciones', link: '' },
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
        this.loadPenalties();
      }
    });

    // Búsqueda con debounce
    this.searchControl.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((search) => {
        this.currentPage.set(1);
        if (search && search.trim()) {
          this.searchPenalties(search.trim());
        } else {
          this.loadPenalties();
        }
      });
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar historial de penalizaciones
   */
  private loadPenalties(): void {
    this.loading.set(true);

    this.driverService
      .getPenaltiesHistory(
        this.driverId(),
        this.currentPage(),
        this.pageSize(),
        this.selectedStatus()
      )
      .subscribe({
        next: (response) => {
          this.penalties.set(response.data);
          this.totalCount.set(response.metadata.totalCount);
          this.totalActive.set(response.metadata.totalActive);
          this.totalInactive.set(response.metadata.totalInactive);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading penalties:', err);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el historial de penalizaciones',
          });
        },
      });
  }

  /**
   * Buscar penalizaciones
   */
  private searchPenalties(search: string): void {
    this.loading.set(true);

    this.driverService
      .searchPenaltiesHistory(
        this.driverId(),
        search,
        this.currentPage(),
        this.pageSize(),
        this.selectedStatus()
      )
      .subscribe({
        next: (response) => {
          this.penalties.set(response.data);
          this.totalCount.set(response.metadata.totalCount);
          this.totalActive.set(response.metadata.totalActive);
          this.totalInactive.set(response.metadata.totalInactive);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error searching penalties:', err);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo buscar en el historial',
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
  filterByStatus(status: number): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadPenalties();
  }

  /**
   * Cambiar página
   */
  onPageChange(event: any): void {
    this.currentPage.set(event.page + 1);
    this.pageSize.set(event.rows);

    const search = this.searchControl.value;
    if (search && search.trim()) {
      this.searchPenalties(search.trim());
    } else {
      this.loadPenalties();
    }
  }

  /**
   * Ver detalles de una penalización
   */
  viewDetails(penalty: PenaltyHistoryItem): void {
    this.detailsDialog().open(penalty);
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
  trackByPenaltyId(index: number, penalty: PenaltyHistoryItem): number {
    return index;
  }
}
