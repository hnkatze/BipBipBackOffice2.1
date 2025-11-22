import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuItem, MessageService } from 'primeng/api';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';

// Models & Services
import { EmissionPoint, StatusFilter } from '../../models/emission-point.model';
import { EmissionPointService } from '../../services/emission-point.service';
import { EmissionPointFormComponent } from '../../components/emission-point-form/emission-point-form.component';

/**
 * EmissionPointsComponent - Lista de puntos de emisión con CRUD
 *
 * Features:
 * - Tabla con paginación server-side
 * - Filtros por estado (Todos/Activos/Inactivos)
 * - Búsqueda por nombre
 * - Toggle inline de estado activo/inactivo
 * - Drawer para crear/editar
 */
@Component({
  selector: 'app-emission-points',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ToggleSwitchModule,
    ToastModule,
    TooltipModule,
    BreadcrumbModule,
    SkeletonModule,
    PaginatorModule,
    EmissionPointFormComponent
  ],
  templateUrl: './emission-points.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmissionPointsComponent implements OnInit {
  private readonly emissionPointService = inject(EmissionPointService);

  // Breadcrumb
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Puntos de Emisión' }
  ];
  private readonly messageService = inject(MessageService);

  // Estado local del componente
  readonly showDrawer = signal<boolean>(false);
  readonly selectedEmissionPointId = signal<number | null>(null);
  readonly searchInput = signal<string>('');

  // Referencias a Signals del servicio
  readonly emissionPoints = this.emissionPointService.emissionPoints;
  readonly statusFilters = this.emissionPointService.statusFilters;
  readonly isLoading = this.emissionPointService.isLoading;
  readonly currentPage = this.emissionPointService.currentPage;
  readonly pageSize = this.emissionPointService.pageSize;
  readonly totalRecords = this.emissionPointService.totalRecords;
  readonly selectedStatus = this.emissionPointService.selectedStatus;

  // Computed: Filtro de estado activo
  readonly activeStatusFilter = computed(() => {
    const selected = this.selectedStatus();
    return this.statusFilters().find((f) => f.filter === selected) || this.statusFilters()[0];
  });

  ngOnInit(): void {
    this.loadEmissionPoints();
  }

  /**
   * Carga los puntos de emisión
   */
  loadEmissionPoints(): void {
    this.emissionPointService
      .getEmissionPoints(
        this.currentPage(),
        this.pageSize(),
        this.selectedStatus(),
        this.searchInput()
      )
      .subscribe({
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los puntos de emisión',
            life: 3000
          });
        }
      });
  }

  /**
   * Handler de cambio de página
   */
  onPageChange(event: any): void {
    const page = event.first / event.rows;
    this.loadEmissionPoints();
  }

  /**
   * Handler de cambio de filtro de estado
   */
  onStatusFilterChange(filter: StatusFilter): void {
    this.emissionPointService.selectedStatus.set(filter.filter);
    this.emissionPointService.currentPage.set(0); // Reset a primera página
    this.loadEmissionPoints();
  }

  /**
   * Handler de búsqueda
   */
  onSearch(): void {
    this.emissionPointService.searchTerm.set(this.searchInput());
    this.emissionPointService.currentPage.set(0); // Reset a primera página
    this.loadEmissionPoints();
  }

  /**
   * Limpia el filtro de búsqueda
   */
  clearSearch(): void {
    this.searchInput.set('');
    this.emissionPointService.searchTerm.set('');
    this.emissionPointService.currentPage.set(0);
    this.loadEmissionPoints();
  }

  /**
   * Abre el drawer para crear nuevo punto de emisión
   */
  openCreateDrawer(): void {
    this.selectedEmissionPointId.set(null);
    this.showDrawer.set(true);
  }

  /**
   * Abre el drawer para editar punto de emisión existente
   */
  openEditDrawer(emissionPoint: EmissionPoint): void {
    this.selectedEmissionPointId.set(emissionPoint.emissionPointId);
    this.showDrawer.set(true);
  }

  /**
   * Cierra el drawer
   */
  closeDrawer(): void {
    this.showDrawer.set(false);
    this.selectedEmissionPointId.set(null);
  }

  /**
   * Handler cuando se guarda exitosamente
   */
  onSaveSuccess(): void {
    this.closeDrawer();
    this.loadEmissionPoints();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Punto de emisión guardado correctamente',
      life: 3000
    });
  }

  /**
   * Toggle de estado activo/inactivo
   */
  onStatusToggle(emissionPoint: EmissionPoint): void {
    this.emissionPointService.changeStatus(emissionPoint.emissionPointId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Punto de emisión ${!emissionPoint.emissionPointEnabled ? 'activado' : 'desactivado'} correctamente`,
          life: 3000
        });
        this.loadEmissionPoints();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cambiar el estado del punto de emisión',
          life: 3000
        });
      }
    });
  }

  /**
   * Obtiene la severidad del tag según el estado
   */
  getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }
}
