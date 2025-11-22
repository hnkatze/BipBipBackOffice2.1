import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
import { Establishment, StatusFilter } from '../../models/establishment.model';
import { EstablishmentService } from '../../services/establishment.service';
import { EstablishmentFormComponent } from '../../components/establishment-form/establishment-form.component';

/**
 * EstablishmentsComponent - Lista de establecimientos con CRUD
 *
 * Features:
 * - Tabla con paginación server-side
 * - Filtros por estado (Todos/Activos/Inactivos)
 * - Búsqueda por nombre
 * - Toggle inline de estado activo/inactivo
 * - Drawer para crear/editar
 */
@Component({
  selector: 'app-establishments',
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
    EstablishmentFormComponent
  ],
  templateUrl: './establishments.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstablishmentsComponent implements OnInit {
  private readonly establishmentService = inject(EstablishmentService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Establecimientos' }
  ];

  // Signals del servicio
  readonly establishments = this.establishmentService.establishments;
  readonly totalRecords = this.establishmentService.totalRecords;
  readonly currentPage = this.establishmentService.currentPage;
  readonly pageSize = this.establishmentService.pageSize;
  readonly isLoading = this.establishmentService.isLoading;
  readonly statusFilters = this.establishmentService.statusFilters;

  // Estado local del componente
  readonly searchTerm = signal<string>('');
  readonly selectedEstablishmentId = signal<number | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly activeStatusFilter = signal<StatusFilter>(this.statusFilters()[0]);

  ngOnInit(): void {
    this.loadEstablishments();
  }

  /**
   * Carga la lista de establecimientos
   */
  loadEstablishments(): void {
    const page = this.currentPage();
    const pageSize = this.pageSize();
    const status = this.activeStatusFilter().filter;
    const searchTerm = this.searchTerm();

    this.establishmentService
      .getEstablishments(page, pageSize, status, searchTerm)
      .subscribe({
        error: (error) => {
          console.error('Error loading establishments:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar establecimientos'
          });
        }
      });
  }

  /**
   * Maneja el cambio de página en la tabla
   */
  onPageChange(event: any): void {
    this.establishmentService.currentPage.set(event.first / event.rows);
    this.establishmentService.pageSize.set(event.rows);
    this.loadEstablishments();
  }

  /**
   * Maneja el cambio de filtro de estado
   */
  onStatusFilterChange(filter: StatusFilter): void {
    this.activeStatusFilter.set(filter);
    this.establishmentService.selectedStatus.set(filter.filter);
    this.establishmentService.currentPage.set(0);
    this.loadEstablishments();
  }

  /**
   * Maneja la búsqueda
   */
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.establishmentService.searchTerm.set(value);
    this.establishmentService.currentPage.set(0);
    this.loadEstablishments();
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.establishmentService.searchTerm.set('');
    this.establishmentService.currentPage.set(0);
    this.loadEstablishments();
  }

  /**
   * Abre el drawer para crear un nuevo establecimiento
   */
  openCreateDrawer(): void {
    this.selectedEstablishmentId.set(null);
    this.isDrawerOpen.set(true);
  }

  /**
   * Abre el drawer para editar un establecimiento existente
   */
  openEditDrawer(establishmentId: number): void {
    this.selectedEstablishmentId.set(establishmentId);
    this.isDrawerOpen.set(true);
  }

  /**
   * Cierra el drawer
   */
  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedEstablishmentId.set(null);
  }

  /**
   * Maneja el guardado exitoso desde el drawer
   */
  onEstablishmentSaved(): void {
    this.loadEstablishments();
    this.closeDrawer();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: this.selectedEstablishmentId()
        ? 'Establecimiento actualizado correctamente'
        : 'Establecimiento creado correctamente'
    });
  }

  /**
   * Cambia el estado activo/inactivo de un establecimiento
   */
  onToggleStatus(establishment: Establishment): void {
    // Pasar el estado actual (antes del cambio) al servicio
    // El servicio se encargará de invertirlo
    const newStatus = !establishment.establishmentsActive;
    this.establishmentService.changeStatus(establishment.establishmentsId, establishment.establishmentsActive).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Establecimiento ${newStatus ? 'activado' : 'desactivado'} correctamente`
        });
        this.loadEstablishments();
      },
      error: (error) => {
        console.error('Error changing establishment status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cambiar el estado del establecimiento'
        });
      }
    });
  }
}
