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
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';

// Models & Services
import { Company, StatusFilter } from '../../models/company.model';
import { CompanyService } from '../../services/company.service';
import { CompanyFormComponent } from '../../components/company-form/company-form.component';

/**
 * CompaniesComponent - Lista de empresas con CRUD
 *
 * Features:
 * - Tabla con paginación server-side
 * - Filtros por estado (Todos/Activos/Inactivos)
 * - Búsqueda por nombre
 * - Toggle inline de estado activo/inactivo
 * - Drawer para crear/editar
 */
@Component({
  selector: 'app-companies',
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
    BreadcrumbModule,
    SkeletonModule,
    PaginatorModule,
    TooltipModule,
    CompanyFormComponent
  ],
  templateUrl: './companies.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompaniesComponent implements OnInit {
  private readonly companyService = inject(CompanyService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Empresas' }
  ];

  // Signals del servicio
  readonly companies = this.companyService.companies;
  readonly totalRecords = this.companyService.totalRecords;
  readonly currentPage = this.companyService.currentPage;
  readonly pageSize = this.companyService.pageSize;
  readonly isLoading = this.companyService.isLoading;
  readonly statusFilters = this.companyService.statusFilters;

  // Estado local del componente
  readonly searchTerm = signal<string>('');
  readonly selectedCompanyId = signal<number | null>(null);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly activeStatusFilter = signal<StatusFilter>(this.statusFilters()[0]);

  ngOnInit(): void {
    this.loadCompanies();
  }

  /**
   * Carga la lista de empresas
   */
  loadCompanies(): void {
    const page = this.currentPage();
    const pageSize = this.pageSize();
    const status = this.activeStatusFilter().filter;
    const searchTerm = this.searchTerm();

    this.companyService
      .getCompanies(page, pageSize, status, searchTerm)
      .subscribe({
        error: (error) => {
          console.error('Error loading companies:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar empresas'
          });
        }
      });
  }

  /**
   * Maneja el cambio de página en la tabla
   */
  onPageChange(event: any): void {
    this.companyService.currentPage.set(event.first / event.rows);
    this.companyService.pageSize.set(event.rows);
    this.loadCompanies();
  }

  /**
   * Maneja el cambio de filtro de estado
   */
  onStatusFilterChange(filter: StatusFilter): void {
    this.activeStatusFilter.set(filter);
    this.companyService.selectedStatus.set(filter.filter);
    this.companyService.currentPage.set(0);
    this.loadCompanies();
  }

  /**
   * Maneja la búsqueda
   */
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.companyService.searchTerm.set(value);
    this.companyService.currentPage.set(0);
    this.loadCompanies();
  }

  /**
   * Limpia la búsqueda
   */
  clearSearch(): void {
    this.searchTerm.set('');
    this.companyService.searchTerm.set('');
    this.companyService.currentPage.set(0);
    this.loadCompanies();
  }

  /**
   * Abre el drawer para crear una nueva empresa
   */
  openCreateDrawer(): void {
    this.selectedCompanyId.set(null);
    this.isDrawerOpen.set(true);
  }

  /**
   * Abre el drawer para editar una empresa existente
   */
  openEditDrawer(companyId: number): void {
    this.selectedCompanyId.set(companyId);
    this.isDrawerOpen.set(true);
  }

  /**
   * Cierra el drawer
   */
  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedCompanyId.set(null);
  }

  /**
   * Maneja el guardado exitoso desde el drawer
   */
  onCompanySaved(): void {
    this.loadCompanies();
    this.closeDrawer();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: this.selectedCompanyId()
        ? 'Empresa actualizada correctamente'
        : 'Empresa creada correctamente'
    });
  }

  /**
   * Cambia el estado activo/inactivo de una empresa
   */
  onToggleStatus(company: Company): void {
    // Pasar el estado actual (antes del cambio) al servicio
    // El servicio se encargará de invertirlo
    const newStatus = !company.companyActive;
    this.companyService.changeStatus(company.companyId, company.companyActive).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Empresa ${newStatus ? 'activada' : 'desactivada'} correctamente`
        });
        this.loadCompanies();
      },
      error: (error) => {
        console.error('Error changing company status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cambiar el estado de la empresa'
        });
      }
    });
  }
}
