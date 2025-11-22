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
import { ImageModule } from 'primeng/image';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';

// Models & Services
import { FiscalCorrelative, StatusFilter } from '../../models/fiscal-correlative.model';
import { FiscalCorrelativeService } from '../../services/fiscal-correlative.service';
import { FiscalCorrelativeFormComponent } from '../../components/fiscal-correlative-form/fiscal-correlative-form.component';

/**
 * FiscalCorrelativesComponent - Lista de correlativos fiscales con CRUD
 *
 * Features:
 * - Tabla con paginación server-side
 * - Filtros por estado (Todos/Activos/Inactivos)
 * - Búsqueda por texto
 * - Toggle inline de estado activo/inactivo
 * - Drawer para crear/editar
 * - Muestra bandera del país
 */
@Component({
  selector: 'app-fiscal-correlatives',
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
    ImageModule,
    BreadcrumbModule,
    SkeletonModule,
    PaginatorModule,
    FiscalCorrelativeFormComponent
  ],
  templateUrl: './fiscal-correlatives.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiscalCorrelativesComponent implements OnInit {
  private readonly fiscalCorrelativeService = inject(FiscalCorrelativeService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Correlativos Fiscales' }
  ];

  // Signals del servicio
  readonly fiscalCorrelatives = this.fiscalCorrelativeService.fiscalCorrelatives;
  readonly totalRecords = this.fiscalCorrelativeService.totalRecords;
  readonly currentPage = this.fiscalCorrelativeService.currentPage;
  readonly pageSize = this.fiscalCorrelativeService.pageSize;
  readonly isLoading = this.fiscalCorrelativeService.isLoading;
  readonly statusFilters = this.fiscalCorrelativeService.statusFilters;

  // Signals de datos de referencia para lookups
  readonly countries = this.fiscalCorrelativeService.countries;

  // Estado local del componente
  readonly searchTerm = signal<string>('');
  readonly selectedCorrelativeId = signal<number | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly activeStatusFilter = signal<StatusFilter>(this.statusFilters()[0]);

  ngOnInit(): void {
    // Cargar datos de referencia primero (para lookups de banderas, etc.)
    this.fiscalCorrelativeService.loadReferenceData();
    this.loadFiscalCorrelatives();
  }

  /**
   * Carga la lista de correlativos fiscales
   */
  loadFiscalCorrelatives(): void {
    const page = this.currentPage();
    const pageSize = this.pageSize();
    const status = this.activeStatusFilter().filter;
    const searchTerm = this.searchTerm();

    this.fiscalCorrelativeService
      .getFiscalCorrelatives(page, pageSize, status, searchTerm)
      .subscribe({
        error: (error) => {
          console.error('Error loading fiscal correlatives:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar correlativos fiscales'
          });
        }
      });
  }

  /**
   * Maneja el cambio de página en la tabla
   */
  onPageChange(event: any): void {
    this.fiscalCorrelativeService.currentPage.set(event.first / event.rows);
    this.fiscalCorrelativeService.pageSize.set(event.rows);
    this.loadFiscalCorrelatives();
  }

  /**
   * Maneja el cambio de filtro de estado
   */
  onStatusFilterChange(filter: StatusFilter): void {
    this.activeStatusFilter.set(filter);
    this.fiscalCorrelativeService.selectedStatus.set(filter.filter);
    this.fiscalCorrelativeService.currentPage.set(0);
    this.loadFiscalCorrelatives();
  }

  /**
   * Maneja la búsqueda
   */
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.fiscalCorrelativeService.searchTerm.set(value);
    this.fiscalCorrelativeService.currentPage.set(0);
    this.loadFiscalCorrelatives();
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.fiscalCorrelativeService.searchTerm.set('');
    this.fiscalCorrelativeService.currentPage.set(0);
    this.loadFiscalCorrelatives();
  }

  /**
   * Abre el drawer para crear un nuevo correlativo fiscal
   */
  openCreateDrawer(): void {
    this.selectedCorrelativeId.set(null);
    this.isDrawerOpen.set(true);
  }

  /**
   * Abre el drawer para editar un correlativo fiscal existente
   */
  openEditDrawer(correlativeId: number): void {
    this.selectedCorrelativeId.set(correlativeId);
    this.isDrawerOpen.set(true);
  }

  /**
   * Cierra el drawer
   */
  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedCorrelativeId.set(null);
  }

  /**
   * Maneja el guardado exitoso desde el drawer
   */
  onCorrelativeSaved(): void {
    this.loadFiscalCorrelatives();
    this.closeDrawer();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: this.selectedCorrelativeId()
        ? 'Correlativo fiscal actualizado correctamente'
        : 'Correlativo fiscal creado correctamente'
    });
  }

  /**
   * Cambia el estado activo/inactivo de un correlativo fiscal
   */
  onToggleStatus(correlative: FiscalCorrelative): void {
    // Pasar el estado actual (antes del cambio) al servicio
    // El servicio se encargará de invertirlo
    const newStatus = !correlative.corrBillStatus;
    this.fiscalCorrelativeService.changeStatus(correlative.corrBillId, correlative.corrBillStatus).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Correlativo fiscal ${newStatus ? 'activado' : 'desactivado'} correctamente`
        });
        this.loadFiscalCorrelatives();
      },
      error: (error) => {
        console.error('Error changing fiscal correlative status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cambiar el estado del correlativo fiscal'
        });
      }
    });
  }

  /**
   * Obtiene la URL de la bandera del país mediante lookup
   */
  getCountryFlag(countryId: number): string | null {
    return this.countries().find(c => c.countryId === countryId)?.countryUrlFlag || null;
  }

  /**
   * Formatea la fecha límite
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
