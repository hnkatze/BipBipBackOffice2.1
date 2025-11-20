import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { RegisteredDriverService } from '../../services/registered-driver.service';
import {
  RegisteredDriverListItem,
  RegisteredDriverMetadata,
  RegisteredDriverFilters
} from '../../models/registered-driver.model';
import { RegisteredDriverTableComponent } from '../../components/registered-driver-table/registered-driver-table.component';
import { RegisteredDriverCardComponent } from '../../components/registered-driver-card/registered-driver-card.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';

/**
 * Página principal de lista de drivers registrados
 *
 * Features:
 * - ✅ Lista paginada (tabla desktop + cards mobile)
 * - ✅ Búsqueda con debounce
 * - ✅ Filtros por status
 * - ✅ Activar/Inactivar drivers
 * - ✅ Eliminar drivers
 */
@Component({
  selector: 'app-registered-drivers-list-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    IconField,
    InputIcon,
    PaginatorModule,
    SkeletonModule,
    ConfirmDialogModule,
    ToastModule,
    BreadcrumbComponent,
    RegisteredDriverTableComponent,
    RegisteredDriverCardComponent
  ],
  templateUrl: './registered-drivers-list-page.component.html',
  styleUrl: './registered-drivers-list-page.component.scss',
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisteredDriversListPageComponent {
  private readonly driverService = inject(RegisteredDriverService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // ============================================================================
  // STATE SIGNALS
  // ============================================================================

  /** Breadcrumb items */
  breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Drivers Registrados', link: '' },
  ]);

  /** Lista de drivers */
  drivers = signal<RegisteredDriverListItem[]>([]);

  /** Metadata de paginación */
  metadata = signal<RegisteredDriverMetadata | null>(null);

  /** Loading state */
  loading = signal(false);

  /** Status seleccionado para filtro */
  selectedStatus = signal<string | null>(null);

  /** Control de búsqueda */
  searchControl = new FormControl('');

  /** Search term como signal (para reactividad) */
  searchTerm = signal('');

  /** Página actual (base 1) */
  currentPage = signal(1);

  /** Tamaño de página */
  pageSize = signal(10);

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Total de activos */
  totalActive = computed(() => this.metadata()?.totalActive ?? 0);

  /** Total de inactivos */
  totalInactive = computed(() => this.metadata()?.totalInactive ?? 0);

  /** Total de penalizados */
  totalPenalized = computed(() => this.metadata()?.totalLockedPenalty ?? 0);

  /** Total de registros */
  totalCount = computed(() => this.metadata()?.totalCount ?? 0);

  /** Filtros actuales */
  currentFilters = computed<RegisteredDriverFilters>(() => ({
    status: this.selectedStatus() ?? undefined,
    search: this.searchTerm().trim() || undefined
  }));

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  constructor() {
    // Setup search con debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe((value) => {
        this.searchTerm.set(value || '');
        this.currentPage.set(1);
        this.loadDrivers();
      });

    // Carga inicial
    this.loadDrivers();
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar drivers con filtros actuales
   */
  loadDrivers(): void {
    this.loading.set(true);

    this.driverService
      .getDriversList(this.currentPage(), this.pageSize(), this.currentFilters())
      .subscribe({
        next: (response) => {
          this.drivers.set(response.data);
          this.metadata.set(response.metadata);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading drivers:', err);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los drivers'
          });
        }
      });
  }

  // ============================================================================
  // FILTERS
  // ============================================================================

  /**
   * Filtrar por status
   */
  filterByStatus(status: string | null): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadDrivers();
  }

  // ============================================================================
  // PAGINATION
  // ============================================================================

  /**
   * Cambio de página
   */
  onPageChange(event: PaginatorState): void {
    this.currentPage.set((event.page ?? 0) + 1);
    this.pageSize.set(event.rows ?? 10);
    this.loadDrivers();
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Ver detalles de un driver
   */
  viewDetails(driver: RegisteredDriverListItem): void {
    this.router.navigate(['/driver-app/registered-users-drivers', driver.id]);
  }

  /**
   * Editar driver
   */
  editDriver(id: number): void {
    this.router.navigate(['/driver-app/registered-users-drivers', id, 'edit']);
  }

  /**
   * Cambiar status del driver con confirmación
   */
  toggleDriverStatus(data: { id: number; currentStatus: boolean }): void {
    const action = data.currentStatus ? 'inactivar' : 'activar';
    const newStatus = !data.currentStatus;

    this.confirmationService.confirm({
      header: `Confirmar ${action}`,
      message: `¿Estás seguro que querés ${action} este driver?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: `Sí, ${action}`,
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: data.currentStatus ? 'p-button-warning' : 'p-button-success',
      accept: () => {
        this.driverService.updateDriverStatus(data.id, newStatus).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Actualizado',
              detail: `Driver ${action}do exitosamente`
            });
            this.loadDrivers();
          },
          error: (err) => {
            console.error('Error updating status:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `No se pudo ${action} el driver`
            });
          }
        });
      }
    });
  }

  /**
   * Eliminar driver con confirmación
   */
  deleteDriver(id: number): void {
    this.confirmationService.confirm({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro que querés eliminar este driver? Esta acción no se puede deshacer.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.driverService.deleteDriver(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Eliminado',
              detail: 'Driver eliminado exitosamente'
            });
            this.loadDrivers();
          },
          error: (err) => {
            console.error('Error deleting driver:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar el driver'
            });
          }
        });
      }
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * TrackBy para optimizar ngFor
   */
  trackByDriverId(_index: number, driver: RegisteredDriverListItem): number {
    return driver.id;
  }
}
