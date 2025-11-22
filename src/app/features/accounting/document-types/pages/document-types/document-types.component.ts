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

// Models & Services
import { DocumentType, StatusFilter } from '../../models/document-type.model';
import { DocumentTypeService } from '../../services/document-type.service';
import { DocumentTypeFormComponent } from '../../components/document-type-form/document-type-form.component';

/**
 * DocumentTypesComponent - Lista de tipos de documento con CRUD
 *
 * Features:
 * - Tabla con paginación server-side
 * - Filtros por estado (Todos/Activos/Inactivos)
 * - Búsqueda por nombre
 * - Toggle inline de estado activo/inactivo
 * - Drawer para crear/editar
 */
@Component({
  selector: 'app-document-types',
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
    DocumentTypeFormComponent
  ],
  templateUrl: './document-types.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentTypesComponent implements OnInit {
  private readonly documentTypeService = inject(DocumentTypeService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Tipos de Documentos' }
  ];

  // Estado local del componente
  readonly showDrawer = signal<boolean>(false);
  readonly selectedDocumentTypeId = signal<number | null>(null);
  readonly searchInput = signal<string>('');

  // Referencias a Signals del servicio
  readonly documentTypes = this.documentTypeService.documentTypes;
  readonly statusFilters = this.documentTypeService.statusFilters;
  readonly isLoading = this.documentTypeService.isLoading;
  readonly currentPage = this.documentTypeService.currentPage;
  readonly pageSize = this.documentTypeService.pageSize;
  readonly totalRecords = this.documentTypeService.totalRecords;
  readonly selectedStatus = this.documentTypeService.selectedStatus;

  // Computed: Filtro de estado activo
  readonly activeStatusFilter = computed(() => {
    const selected = this.selectedStatus();
    return this.statusFilters().find((f) => f.filter === selected) || this.statusFilters()[0];
  });

  ngOnInit(): void {
    this.loadDocumentTypes();
  }

  /**
   * Carga los tipos de documento
   */
  loadDocumentTypes(): void {
    this.documentTypeService
      .getDocumentTypes(
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
            detail: 'Error al cargar los tipos de documento',
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
    this.loadDocumentTypes();
  }

  /**
   * Handler de cambio de filtro de estado
   */
  onStatusFilterChange(filter: StatusFilter): void {
    this.documentTypeService.selectedStatus.set(filter.filter);
    this.documentTypeService.currentPage.set(0); // Reset a primera página
    this.loadDocumentTypes();
  }

  /**
   * Handler de búsqueda
   */
  onSearch(): void {
    this.documentTypeService.searchTerm.set(this.searchInput());
    this.documentTypeService.currentPage.set(0); // Reset a primera página
    this.loadDocumentTypes();
  }

  /**
   * Limpia el filtro de búsqueda
   */
  clearSearch(): void {
    this.searchInput.set('');
    this.documentTypeService.searchTerm.set('');
    this.documentTypeService.currentPage.set(0);
    this.loadDocumentTypes();
  }

  /**
   * Abre el drawer para crear nuevo tipo de documento
   */
  openCreateDrawer(): void {
    this.selectedDocumentTypeId.set(null);
    this.showDrawer.set(true);
  }

  /**
   * Abre el drawer para editar tipo de documento existente
   */
  openEditDrawer(documentType: DocumentType): void {
    this.selectedDocumentTypeId.set(documentType.docTypeId);
    this.showDrawer.set(true);
  }

  /**
   * Cierra el drawer
   */
  closeDrawer(): void {
    this.showDrawer.set(false);
    this.selectedDocumentTypeId.set(null);
  }

  /**
   * Handler cuando se guarda exitosamente
   */
  onSaveSuccess(): void {
    this.closeDrawer();
    this.loadDocumentTypes();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Tipo de documento guardado correctamente',
      life: 3000
    });
  }

  /**
   * Toggle de estado activo/inactivo
   */
  onStatusToggle(documentType: DocumentType): void {
    // Pasar el estado actual (antes del cambio) al servicio
    // El servicio se encargará de invertirlo
    const newStatus = !documentType.isActive;
    this.documentTypeService.changeStatus(documentType.docTypeId, documentType.isActive).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `Tipo de documento ${newStatus ? 'activado' : 'desactivado'} correctamente`,
          life: 3000
        });
        this.loadDocumentTypes();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cambiar el estado del tipo de documento',
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
