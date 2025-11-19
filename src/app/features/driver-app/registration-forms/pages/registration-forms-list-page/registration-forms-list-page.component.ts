import { Component, ChangeDetectionStrategy, signal, computed, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
import { RegistrationFormService } from '../../services/registration-form.service';
import {
  RegistrationFormListItem,
  RegistrationFormMetadata,
  RegistrationFormFilters
} from '../../models/registration-form.model';
import { RegistrationFormStatus } from '../../models/registration-form-status.enum';
import { RegistrationFormTableComponent } from '../../components/registration-form-table/registration-form-table.component';
import { RegistrationFormCardComponent } from '../../components/registration-form-card/registration-form-card.component';
import { RegistrationFormDetailDrawerComponent } from '../../components/registration-form-detail-drawer/registration-form-detail-drawer.component';

/**
 * Página principal de lista de formularios de registro
 *
 * Features:
 * - ✅ Lista paginada (tabla desktop + cards mobile)
 * - ✅ Búsqueda con debounce
 * - ✅ Filtros por status
 * - ✅ Drawer de detalles
 * - ✅ Aprobar/rechazar con confirmación
 */
@Component({
  selector: 'app-registration-forms-list-page',
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
    RegistrationFormTableComponent,
    RegistrationFormCardComponent,
    RegistrationFormDetailDrawerComponent
  ],
  templateUrl: './registration-forms-list-page.component.html',
  styleUrl: './registration-forms-list-page.component.scss',
  providers: [ConfirmationService, MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationFormsListPageComponent {
  private readonly formService = inject(RegistrationFormService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  /** Referencia al drawer de detalles */
  private readonly detailDrawer = viewChild<RegistrationFormDetailDrawerComponent>('detailDrawer');

  /** Enum de estados para usar en el template */
  readonly RegistrationFormStatus = RegistrationFormStatus;

  // ============================================================================
  // STATE SIGNALS
  // ============================================================================

  /** Lista de formularios */
  forms = signal<RegistrationFormListItem[]>([]);

  /** Metadata de paginación */
  metadata = signal<RegistrationFormMetadata | null>(null);

  /** Loading state */
  loading = signal(false);

  /** Status seleccionado para filtro */
  selectedStatus = signal<RegistrationFormStatus | null>(null);

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

  /** Total de pendientes */
  totalPending = computed(() => this.metadata()?.totalPending ?? 0);

  /** Total de rechazados */
  totalRejected = computed(() => this.metadata()?.totalRejected ?? 0);

  /** Total de registros */
  totalCount = computed(() => this.metadata()?.totalCount ?? 0);

  /** Filtros actuales */
  currentFilters = computed<RegistrationFormFilters>(() => ({
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
        this.loadForms();
      });

    // Carga inicial
    this.loadForms();
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar formularios con filtros actuales
   */
  loadForms(): void {
    this.loading.set(true);

    this.formService
      .getFormsList(this.currentPage(), this.pageSize(), this.currentFilters())
      .subscribe({
        next: (response) => {
          this.forms.set(response.data);
          this.metadata.set(response.metadata);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading forms:', err);
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los formularios'
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
  filterByStatus(status: RegistrationFormStatus | null): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadForms();
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
    this.loadForms();
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Ver detalles de un formulario
   */
  viewDetails(form: RegistrationFormListItem): void {
    this.detailDrawer()?.open(form.id);
  }

  /**
   * Aprobar formulario con confirmación
   */
  approveForm(id: number): void {
    this.confirmationService.confirm({
      header: 'Confirmar Aprobación',
      message: '¿Estás seguro que querés aprobar esta solicitud?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, aprobar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      accept: () => {
        this.formService.approveForm(id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Aprobado',
              detail: 'La solicitud fue aprobada exitosamente'
            });
            this.loadForms();
          },
          error: (err) => {
            console.error('Error approving form:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo aprobar la solicitud'
            });
          }
        });
      }
    });
  }

  /**
   * Rechazar formulario con confirmación
   */
  rejectForm(id: number): void {
    this.confirmationService.confirm({
      header: 'Confirmar Rechazo',
      message: '¿Estás seguro que querés rechazar esta solicitud?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, rechazar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.formService.rejectForm(id, '').subscribe({
          next: () => {
            this.messageService.add({
              severity: 'info',
              summary: 'Rechazado',
              detail: 'La solicitud fue rechazada'
            });
            this.loadForms();
          },
          error: (err) => {
            console.error('Error rejecting form:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo rechazar la solicitud'
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
  trackByFormId(_index: number, form: RegistrationFormListItem): number {
    return form.id;
  }
}
