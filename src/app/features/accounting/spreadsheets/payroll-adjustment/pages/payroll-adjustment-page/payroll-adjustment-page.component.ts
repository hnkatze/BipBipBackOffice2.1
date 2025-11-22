import { Component, OnInit, ChangeDetectionStrategy, signal, computed, inject, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MenuItem, MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { startWith } from 'rxjs/operators';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DrawerModule } from 'primeng/drawer';
import { InputNumberModule } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Popover } from 'primeng/popover';

// Services & Models
import { PayrollAdjustmentService } from '../../services/payroll-adjustment.service';
import { GlobalDataService } from '../../../../../../core/services/global-data.service';
import {
  PayrollCommand,
  DriverAdjustment,
  DriverSummary,
  PaginationMetadata,
  DriverAdjustmentRequest
} from '../../models/payroll-adjustment.model';

// Components
import { AdjustmentFormDrawerComponent } from '../../components/adjustment-form-drawer/adjustment-form-drawer.component';

// Utils
import { formatDate } from '../../../../../../shared/utils/date.utils';

/**
 * Componente para gestionar ajustes de planilla
 *
 * Funcionalidades:
 * 1. Filtrar comandas por ciudad, driver, fechas y búsqueda general
 * 2. Ver tabla de comandas de pago
 * 3. Gestionar ajustes de ingreso/deducción por driver (CRUD)
 */
@Component({
  selector: 'app-payroll-adjustment-page',
  templateUrl: './payroll-adjustment-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    BreadcrumbModule,
    ToastModule,
    TableModule,
    TagModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    DrawerModule,
    InputNumberModule,
    Textarea,
    TooltipModule,
    Popover,
    AdjustmentFormDrawerComponent
  ],
  providers: [MessageService]
})
export class PayrollAdjustmentPageComponent implements OnInit {
  private payrollService = inject(PayrollAdjustmentService);
  private globalData = inject(GlobalDataService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);

  @ViewChild('commandActionsPopover') commandActionsPopover!: Popover;

  // State signals - Data
  commands = signal<PayrollCommand[]>([]);
  adjustments = signal<DriverAdjustment[]>([]);
  drivers = signal<DriverSummary[]>([]);
  cities = computed(() => this.globalData.citiesShort());

  // State signals - UI
  loadingCommands = signal<boolean>(false);
  loadingAdjustments = signal<boolean>(false);
  loadingDrivers = signal<boolean>(false);
  error = signal<string | null>(null);

  // Drawer state
  showDrawer = signal<boolean>(false);
  drawerMode = signal<'create' | 'edit'>('create');
  selectedAdjustment = signal<DriverAdjustment | null>(null);

  // Delete modal
  showDeleteModal = signal<boolean>(false);
  deletingAdjustment = signal<DriverAdjustment | null>(null);
  isDeleting = signal<boolean>(false);

  // Command value adjustment modal
  showCommandAdjustmentModal = signal<boolean>(false);
  adjustingCommand = signal<PayrollCommand | null>(null);
  commandAdjustmentForm!: FormGroup;
  isAdjustingCommand = signal<boolean>(false);
  selectedCommandForPopover = signal<PayrollCommand | null>(null);

  // Pagination - Commands
  currentPageCommands = signal<number>(1);
  pageSizeCommands = signal<number>(10);
  totalRecordsCommands = signal<number>(0);
  metadataCommands = signal<PaginationMetadata | null>(null);

  // Pagination - Adjustments
  currentPageAdjustments = signal<number>(1);
  pageSizeAdjustments = signal<number>(10);
  totalRecordsAdjustments = signal<number>(0);
  metadataAdjustments = signal<PaginationMetadata | null>(null);

  // Forms
  filterForm!: FormGroup;

  // Breadcrumb
  breadcrumbs: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Planillas', routerLink: '/accounting/spreadsheets' },
    { label: 'Ajuste de Planilla' }
  ];

  // Expose Math for template
  protected readonly Math = Math;

  // Form value as signal
  formValue = signal<any>(null);

  // Computed
  selectedDriverId = computed(() => this.formValue()?.driverId || null);
  hasDriverSelected = computed(() => !!this.selectedDriverId());
  canSearch = computed(() => {
    const values = this.formValue();
    if (!values) return false;

    const cityId = values.cityId;
    const driverId = values.driverId;
    const dateRange = values.dateRange;
    const hasDates = !!(dateRange && dateRange[0] && dateRange[1]);

    return !!(cityId && (driverId || hasDates));
  });

  ngOnInit(): void {
    this.initializeForm();
    // Cargar ciudades manualmente
    this.globalData.forceRefresh('citiesShort');
  }

  /**
   * Inicializa el formulario de filtros
   */
  private initializeForm(): void {
    const today = new Date();

    this.filterForm = this.fb.group({
      cityId: [null, Validators.required],
      driverId: [null],
      dateRange: [[today, today]],
      generalSearch: ['']
    });

    // Update formValue signal whenever form changes
    this.filterForm.valueChanges
      .pipe(
        startWith(this.filterForm.value),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(values => {
        this.formValue.set(values);
      });

    // Listen to city changes
    this.filterForm.get('cityId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cityId) => {
        if (cityId) {
          this.loadDriversByCity(cityId);
          // Reset driver selection when city changes
          this.filterForm.patchValue({ driverId: null }, { emitEvent: false });
          this.drivers.set([]);
        } else {
          this.drivers.set([]);
        }
      });
  }

  /**
   * Carga drivers por ciudad
   */
  private loadDriversByCity(cityId: number): void {
    this.loadingDrivers.set(true);

    this.payrollService.getDriversByCity(cityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.drivers.set(data);
          this.loadingDrivers.set(false);
        },
        error: (err) => {
          console.error('Error al cargar drivers:', err);
          this.loadingDrivers.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los drivers',
            life: 3000
          });
        }
      });
  }

  /**
   * Aplica los filtros y busca datos
   */
  applyFilters(): void {
    if (!this.canSearch()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debe seleccionar una ciudad y al menos un driver o rango de fechas',
        life: 3000
      });
      return;
    }

    this.currentPageCommands.set(1);
    this.currentPageAdjustments.set(1);
    this.loadData();
  }

  /**
   * Limpia los filtros
   */
  clearFilters(): void {
    const today = new Date();
    this.filterForm.reset({
      cityId: null,
      driverId: null,
      dateRange: [today, today],
      generalSearch: ''
    });
    this.commands.set([]);
    this.adjustments.set([]);
    this.drivers.set([]);
    this.error.set(null);
  }

  /**
   * Carga los datos (comandas y ajustes si hay driver)
   */
  private loadData(): void {
    const driverId = this.selectedDriverId();

    if (driverId) {
      // Cargar comandas y ajustes en paralelo
      this.loadingCommands.set(true);
      this.loadingAdjustments.set(true);

      forkJoin({
        commands: this.getCommandsObservable(),
        adjustments: this.getAdjustmentsObservable(driverId)
      })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ commands, adjustments }) => {
            this.commands.set(commands.data);
            this.metadataCommands.set(commands.metadata);
            this.totalRecordsCommands.set(commands.metadata.totalCount);

            this.adjustments.set(adjustments.data);
            this.metadataAdjustments.set(adjustments.metadata);
            this.totalRecordsAdjustments.set(adjustments.metadata.totalCount);

            this.loadingCommands.set(false);
            this.loadingAdjustments.set(false);
          },
          error: (err) => {
            console.error('Error al cargar datos:', err);
            this.loadingCommands.set(false);
            this.loadingAdjustments.set(false);
            this.error.set('Error al cargar los datos');
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudieron cargar los datos',
              life: 3000
            });
          }
        });
    } else {
      // Solo cargar comandas
      this.loadCommands();
    }
  }

  /**
   * Carga solo las comandas
   */
  private loadCommands(page?: number): void {
    this.loadingCommands.set(true);
    const pageNumber = page || this.currentPageCommands() || 1;

    this.getCommandsObservable(pageNumber)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.commands.set(response.data);
          this.metadataCommands.set(response.metadata);
          this.totalRecordsCommands.set(response.metadata.totalCount);
          this.currentPageCommands.set(pageNumber);
          this.loadingCommands.set(false);
        },
        error: (err) => {
          console.error('Error al cargar comandas:', err);
          this.error.set('Error al cargar las comandas');
          this.loadingCommands.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las comandas',
            life: 3000
          });
        }
      });
  }

  /**
   * Carga solo los ajustes
   */
  private loadAdjustments(page?: number): void {
    const driverId = this.selectedDriverId();
    if (!driverId) return;

    this.loadingAdjustments.set(true);
    const pageNumber = page || this.currentPageAdjustments() || 1;

    this.getAdjustmentsObservable(driverId, pageNumber)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.adjustments.set(response.data);
          this.metadataAdjustments.set(response.metadata);
          this.totalRecordsAdjustments.set(response.metadata.totalCount);
          this.currentPageAdjustments.set(pageNumber);
          this.loadingAdjustments.set(false);
        },
        error: (err) => {
          console.error('Error al cargar ajustes:', err);
          this.loadingAdjustments.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los ajustes',
            life: 3000
          });
        }
      });
  }

  /**
   * Construye el observable de comandas con filtros
   */
  private getCommandsObservable(page?: number) {
    const formValue = this.filterForm.value;
    const dateRange = formValue.dateRange;
    const pageNumber = page || this.currentPageCommands() || 1;

    const driver = this.drivers().find(d => d.idDriver === formValue.driverId);
    const driverCode = driver?.codeDriver;

    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateRange && dateRange[0] && dateRange[1]) {
      startDate = new Date(dateRange[0]).toISOString();
      endDate = new Date(dateRange[1]).toISOString();
    }

    return this.payrollService.getPayrollCommands(
      pageNumber,
      this.pageSizeCommands(),
      driverCode,
      startDate,
      endDate,
      formValue.generalSearch || undefined
    );
  }

  /**
   * Construye el observable de ajustes
   */
  private getAdjustmentsObservable(driverId: number, page?: number) {
    const pageNumber = page || this.currentPageAdjustments() || 1;

    return this.payrollService.getDriverAdjustments(
      driverId,
      pageNumber,
      this.pageSizeAdjustments()
    );
  }

  /**
   * Maneja el cambio de página en comandas
   */
  onPageChangeCommands(event: any): void {
    if (event.page === undefined || event.page === null || isNaN(event.page)) {
      return;
    }

    const newPage = event.page + 1; // PrimeNG usa 0-indexed
    this.pageSizeCommands.set(event.rows);
    this.loadCommands(newPage);
  }

  /**
   * Maneja el cambio de página en ajustes
   */
  onPageChangeAdjustments(event: any): void {
    if (event.page === undefined || event.page === null || isNaN(event.page)) {
      return;
    }

    const newPage = event.page + 1; // PrimeNG usa 0-indexed
    this.pageSizeAdjustments.set(event.rows);
    this.loadAdjustments(newPage);
  }

  /**
   * Abre el drawer para crear ajuste
   */
  openCreateDrawer(): void {
    if (!this.hasDriverSelected()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Debe seleccionar un driver primero',
        life: 3000
      });
      return;
    }

    this.drawerMode.set('create');
    this.selectedAdjustment.set(null);
    this.showDrawer.set(true);
  }

  /**
   * Abre el drawer para editar ajuste
   */
  openEditDrawer(adjustment: DriverAdjustment): void {
    if (adjustment.id === null) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede editar un ajuste temporal',
        life: 3000
      });
      return;
    }

    this.drawerMode.set('edit');
    this.selectedAdjustment.set(adjustment);
    this.showDrawer.set(true);
  }

  /**
   * Cierra el drawer
   */
  closeDrawer(): void {
    this.showDrawer.set(false);
    this.selectedAdjustment.set(null);
  }

  /**
   * Guarda un ajuste (create o update)
   */
  onSaveAdjustment(data: DriverAdjustmentRequest): void {
    const mode = this.drawerMode();

    if (mode === 'create') {
      this.createAdjustment(data);
    } else {
      const adjustmentId = this.selectedAdjustment()?.id;
      if (adjustmentId) {
        this.updateAdjustment(adjustmentId, data);
      }
    }
  }

  /**
   * Crea un nuevo ajuste
   */
  private createAdjustment(data: DriverAdjustmentRequest): void {
    this.payrollService.createDriverAdjustment(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Ajuste creado correctamente',
            life: 3000
          });
          this.closeDrawer();
          this.loadAdjustments();
        },
        error: (err) => {
          console.error('Error al crear ajuste:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el ajuste',
            life: 3000
          });
        }
      });
  }

  /**
   * Actualiza un ajuste existente
   */
  private updateAdjustment(adjustmentId: number, data: DriverAdjustmentRequest): void {
    this.payrollService.updateDriverAdjustment(adjustmentId, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Ajuste actualizado correctamente',
            life: 3000
          });
          this.closeDrawer();
          this.loadAdjustments();
        },
        error: (err) => {
          console.error('Error al actualizar ajuste:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el ajuste',
            life: 3000
          });
        }
      });
  }

  /**
   * Abre el modal de confirmación para eliminar
   */
  confirmDelete(adjustment: DriverAdjustment): void {
    if (adjustment.id === null) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'No se puede eliminar un ajuste temporal',
        life: 3000
      });
      return;
    }

    this.deletingAdjustment.set(adjustment);
    this.showDeleteModal.set(true);
  }

  /**
   * Cierra el modal de eliminación
   */
  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deletingAdjustment.set(null);
  }

  /**
   * Elimina un ajuste
   */
  deleteAdjustment(): void {
    const adjustment = this.deletingAdjustment();
    if (!adjustment || adjustment.id === null) return;

    this.isDeleting.set(true);

    this.payrollService.deleteDriverAdjustment(adjustment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Ajuste eliminado correctamente',
            life: 3000
          });
          this.isDeleting.set(false);
          this.closeDeleteModal();
          this.loadAdjustments();
        },
        error: (err) => {
          console.error('Error al eliminar ajuste:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar el ajuste',
            life: 3000
          });
          this.isDeleting.set(false);
        }
      });
  }

  /**
   * Formatea un número como moneda
   */
  formatCurrency(value: number): string {
    return `L ${value.toFixed(2)}`;
  }

  /**
   * Obtiene el tipo de badge para un ajuste
   */
  getAdjustmentType(amount: number): 'success' | 'danger' {
    return amount > 0 ? 'success' : 'danger';
  }

  /**
   * Obtiene el label del tipo de ajuste
   */
  getAdjustmentTypeLabel(amount: number): string {
    return amount > 0 ? 'Ingreso' : 'Deducción';
  }

  /**
   * Formatea una fecha
   */
  formatDateString(date: Date | string): string {
    return formatDate(new Date(date), 'dd/MM/yyyy');
  }

  /**
   * Abre el modal para ajustar valor de comanda
   */
  openCommandAdjustmentModal(command: PayrollCommand): void {
    this.adjustingCommand.set(command);

    // Inicializar formulario con valor actual
    this.commandAdjustmentForm = this.fb.group({
      newValue: [command.comandaValue, [Validators.required, Validators.min(0), Validators.max(999999)]],
      reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });

    this.showCommandAdjustmentModal.set(true);
  }

  /**
   * Cierra el modal de ajuste de comanda
   */
  closeCommandAdjustmentModal(): void {
    this.showCommandAdjustmentModal.set(false);
    this.adjustingCommand.set(null);
  }

  /**
   * Procesa el ajuste de valor de comanda
   */
  submitCommandAdjustment(): void {
    if (this.commandAdjustmentForm.invalid) {
      Object.keys(this.commandAdjustmentForm.controls).forEach(key => {
        this.commandAdjustmentForm.get(key)?.markAsTouched();
      });
      return;
    }

    const command = this.adjustingCommand();
    if (!command) return;

    const formValue = this.commandAdjustmentForm.value;
    this.isAdjustingCommand.set(true);

    this.payrollService.adjustCommandValue(command.deliveryId, formValue.newValue, formValue.reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Ajuste de comanda realizado correctamente',
            life: 3000
          });
          this.isAdjustingCommand.set(false);
          this.closeCommandAdjustmentModal();
          // Recargar comandas
          this.loadCommands();
        },
        error: (err) => {
          console.error('Error al ajustar comanda:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo ajustar el valor de la comanda',
            life: 3000
          });
          this.isAdjustingCommand.set(false);
        }
      });
  }

  /**
   * Obtiene la diferencia de valor en el ajuste
   */
  get commandValueDifference(): number {
    const command = this.adjustingCommand();
    if (!command) return 0;

    const newValue = this.commandAdjustmentForm?.get('newValue')?.value || 0;
    return newValue - command.comandaValue;
  }

  /**
   * Verifica si hay cambios en el valor
   */
  get hasCommandValueChanges(): boolean {
    const command = this.adjustingCommand();
    if (!command) return false;

    const newValue = this.commandAdjustmentForm?.get('newValue')?.value;
    return newValue !== command.comandaValue;
  }

  /**
   * Navega al detalle de la orden
   */
  viewOrderDetail(orderId: string | number): void {
    this.router.navigate(['/sac/order-tracking', orderId]);
  }

  /**
   * Abre/cierra el popover de acciones de comanda
   */
  toggleCommandActionsPopover(event: Event, command: PayrollCommand): void {
    this.selectedCommandForPopover.set(command);
    this.commandActionsPopover.toggle(event);
  }

  /**
   * Ver orden desde el popover
   */
  viewOrderDetailFromPopover(): void {
    const command = this.selectedCommandForPopover();
    if (command) {
      this.commandActionsPopover.hide();
      this.viewOrderDetail(command.orderId);
    }
  }

  /**
   * Abrir modal de ajuste desde el popover
   */
  openCommandAdjustmentFromPopover(): void {
    const command = this.selectedCommandForPopover();
    if (command) {
      this.commandActionsPopover.hide();
      this.openCommandAdjustmentModal(command);
    }
  }
}
