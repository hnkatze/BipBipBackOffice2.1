import { Component, OnInit, ChangeDetectionStrategy, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem, MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { RadioButton } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';

// Services & Models
import { DriverPaymentsService } from '../../services/driver-payments.service';
import {
  DriverPayment,
  Country,
  Brand,
  PaginationMetadata,
  ReportType
} from '../../models/driver-payments.model';

// Utils
import { downloadBase64File } from '../../../../../../shared/utils/file-download.utils';
import { formatDate } from '../../../../../../shared/utils/date.utils';

/**
 * Componente para gestionar pagos a drivers
 *
 * Flujo:
 * 1. Carga tabla INMEDIATAMENTE con fechas por defecto
 * 2. Solo 2 date pickers + botón "Buscar" para recargar
 * 3. Modal para seleccionar tipo de reporte
 */
@Component({
  selector: 'app-driver-payments-page',
  templateUrl: './driver-payments-page.component.html',
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
    RadioButton,
    SelectModule
  ],
  providers: [MessageService]
})
export class DriverPaymentsPageComponent implements OnInit {
  private driverPaymentsService = inject(DriverPaymentsService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // State signals - Data
  payments = signal<DriverPayment[]>([]);
  countries = signal<Country[]>([]);
  brands = signal<Brand[]>([]);

  // State signals - UI
  loading = signal<boolean>(false);
  exportingPDF = signal<boolean>(false);
  exportingExcel = signal<boolean>(false);
  exportingTXT = signal<boolean>(false);
  exportingExtendedHours = signal<boolean>(false);
  exportingAdjustments = signal<boolean>(false);
  error = signal<string | null>(null);

  // Flag para prevenir llamadas múltiples
  private isLoadingData = false;

  // Modals
  showReportModal = signal<boolean>(false);
  showExtendedHoursModal = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);
  metadata = signal<PaginationMetadata | null>(null);

  // Report type selection
  selectedReportType = signal<ReportType>('general');

  // Forms
  filterForm!: FormGroup;
  extendedHoursForm!: FormGroup;

  // Breadcrumb
  breadcrumbs: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Planillas', routerLink: '/accounting/spreadsheets' },
    { label: 'Pagos a Drivers' }
  ];

  // Computed
  isExporting = computed(() => {
    return this.exportingPDF() || this.exportingExcel() || this.exportingTXT() ||
           this.exportingExtendedHours() || this.exportingAdjustments();
  });

  /**
   * Verifica si hay un rango de fechas válido
   * NOTA: Método simple (no computed) para evitar bucles de change detection
   */
  hasDateRange(): boolean {
    const dateRange = this.filterForm?.get('dateRange')?.value;
    return !!(dateRange && dateRange[0] && dateRange[1]);
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadCountries();
    this.loadBrands();
    this.loadInitialData();
  }

  /**
   * Inicializa los formularios
   */
  private initializeForms(): void {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Formulario principal de filtros
    this.filterForm = this.fb.group({
      dateRange: [[yesterday, today], Validators.required],
      reportType: ['general', Validators.required]
    });

    // Listen to report type changes (NO escuchamos dateRange para evitar bucle)
    this.filterForm.get('reportType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedReportType.set(value);
      });

    // Formulario de horario extendido
    this.extendedHoursForm = this.fb.group({
      dateRange: [null, Validators.required],
      brandId: [null, Validators.required]
    });
  }

  /**
   * Carga datos iniciales con fechas por defecto
   */
  private loadInitialData(): void {
    this.loadPayments();
  }

  /**
   * Carga la lista de países (solo para banderas)
   */
  private loadCountries(): void {
    this.driverPaymentsService.getCountries()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.countries.set(data);
        },
        error: (err) => {
          console.error('Error al cargar países:', err);
        }
      });
  }

  /**
   * Carga la lista de marcas
   */
  private loadBrands(): void {
    this.driverPaymentsService.getBrands()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.brands.set(data);
        },
        error: (err) => {
          console.error('Error al cargar marcas:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las marcas',
            life: 3000
          });
        }
      });
  }

  /**
   * Aplica los filtros y recarga desde la página 1
   */
  applyFilters(): void {
    this.currentPage.set(1);
    this.loadPayments();
  }

  /**
   * Carga la lista de pagos con filtros y paginación
   */
  loadPayments(page?: number): void {
    // Prevenir llamadas múltiples simultáneas (fix bucle infinito)
    if (this.isLoadingData) {
      return;
    }

    const dateRange = this.filterForm?.get('dateRange')?.value;

    // Si no hay fechas, salir sin mostrar mensaje (puede ser que aún no se inicializó)
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return;
    }

    this.isLoadingData = true;
    this.loading.set(true);
    this.error.set(null);

    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    // Si no se proporciona page, usar currentPage, si currentPage es inválido, usar 1
    const pageNumber = page || this.currentPage() || 1;

    this.driverPaymentsService.getPaymentsList(
      pageNumber,
      this.pageSize(),
      fechaInicio,
      fechaFin
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.payments.set(response.data);
          this.metadata.set(response.metadata);
          this.totalRecords.set(response.metadata.totalCount);
          this.currentPage.set(pageNumber);
          this.loading.set(false);
          this.isLoadingData = false;
        },
        error: (err) => {
          console.error('Error al cargar pagos:', err);
          this.error.set('Error al cargar los pagos');
          this.loading.set(false);
          this.isLoadingData = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los pagos',
            life: 3000
          });
        }
      });
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(event: any): void {
    // Validar que event.page sea un número válido
    if (event.page === undefined || event.page === null || isNaN(event.page)) {
      return;
    }

    const newPage = event.page + 1; // PrimeNG usa 0-indexed
    this.pageSize.set(event.rows);
    this.loadPayments(newPage);
  }

  /**
   * Obtiene la URL de la bandera del país
   */
  getCountryFlag(countryId: number): string {
    const country = this.countries().find(c => c.countryId === countryId);
    return country?.flagImage || '';
  }

  /**
   * Abre el modal de reportes
   */
  openReportModal(): void {
    if (!this.hasDateRange()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas',
        life: 3000
      });
      return;
    }
    this.showReportModal.set(true);
  }

  /**
   * Cierra el modal de reportes
   */
  closeReportModal(): void {
    this.showReportModal.set(false);
  }

  /**
   * Genera y descarga reporte PDF
   */
  exportPDF(): void {
    if (!this.hasDateRange()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas',
        life: 3000
      });
      return;
    }

    const { dateRange, reportType } = this.filterForm.value;
    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingPDF.set(true);

    let reportObservable;
    let reportName = '';

    switch (reportType) {
      case 'general':
        reportObservable = this.driverPaymentsService.generateGeneralPDFReport(fechaInicio, fechaFin);
        reportName = 'Reporte General';
        break;
      case 'detail':
        reportObservable = this.driverPaymentsService.generateDetailPDFReport(fechaInicio, fechaFin);
        reportName = 'Reporte Detalle';
        break;
      case 'baseOps':
        reportObservable = this.driverPaymentsService.generateBaseOpsPDFReport(fechaInicio, fechaFin);
        reportName = 'Reporte Base Operaciones';
        break;
      default:
        this.exportingPDF.set(false);
        return;
    }

    reportObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `${reportName} (${fechaInicio} - ${fechaFin}).pdf`;
          downloadBase64File(base64Data, fileName, 'application/pdf');

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte PDF generado correctamente',
            life: 3000
          });

          this.exportingPDF.set(false);
          this.closeReportModal();
        },
        error: (err) => {
          console.error('Error al generar PDF:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el reporte PDF',
            life: 3000
          });
          this.exportingPDF.set(false);
        }
      });
  }

  /**
   * Genera y descarga reporte Excel
   */
  exportExcel(): void {
    if (!this.hasDateRange()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas',
        life: 3000
      });
      return;
    }

    const { dateRange, reportType } = this.filterForm.value;
    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingExcel.set(true);

    let reportObservable;
    let reportName = '';

    switch (reportType) {
      case 'general':
        reportObservable = this.driverPaymentsService.generateGeneralExcelReport(fechaInicio, fechaFin);
        reportName = 'Reporte General';
        break;
      case 'detail':
        reportObservable = this.driverPaymentsService.generateDetailExcelReport(fechaInicio, fechaFin);
        reportName = 'Reporte Detalle';
        break;
      case 'baseOps':
        reportObservable = this.driverPaymentsService.generateBaseOpsExcelReport(fechaInicio, fechaFin);
        reportName = 'Reporte Base Operaciones';
        break;
      default:
        this.exportingExcel.set(false);
        return;
    }

    reportObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `${reportName} (${fechaInicio} - ${fechaFin}).xlsx`;
          downloadBase64File(base64Data, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte Excel generado correctamente',
            life: 3000
          });

          this.exportingExcel.set(false);
          this.closeReportModal();
        },
        error: (err) => {
          console.error('Error al generar Excel:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el reporte Excel',
            life: 3000
          });
          this.exportingExcel.set(false);
        }
      });
  }

  /**
   * Genera y descarga formato BAC (TXT)
   */
  exportBAC(): void {
    if (!this.hasDateRange()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas',
        life: 3000
      });
      return;
    }

    const { dateRange } = this.filterForm.value;
    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingTXT.set(true);

    this.driverPaymentsService.generateBACFormat(fechaInicio, fechaFin)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `BIP BIP BAC (${fechaInicio} - ${fechaFin}).txt`;
          downloadBase64File(base64Data, fileName, 'text/plain');

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Archivo BAC generado correctamente',
            life: 3000
          });

          this.exportingTXT.set(false);
          this.closeReportModal();
        },
        error: (err) => {
          console.error('Error al generar BAC:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el archivo BAC',
            life: 3000
          });
          this.exportingTXT.set(false);
        }
      });
  }

  /**
   * Abre el modal de horario extendido
   */
  openExtendedHoursModal(): void {
    this.showExtendedHoursModal.set(true);
  }

  /**
   * Cierra el modal de horario extendido
   */
  closeExtendedHoursModal(): void {
    this.showExtendedHoursModal.set(false);
    this.extendedHoursForm.reset();
  }

  /**
   * Genera y descarga reporte de horario extendido
   */
  exportExtendedHours(): void {
    if (this.extendedHoursForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos',
        life: 3000
      });
      return;
    }

    const formValue = this.extendedHoursForm.value;
    const dateRange = formValue.dateRange;

    // Validar que el rango de fechas esté completo
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas completo',
        life: 3000
      });
      return;
    }

    this.exportingExtendedHours.set(true);

    const fechaInicio = new Date(dateRange[0]).toISOString();
    const fechaFin = new Date(dateRange[1]).toISOString();

    this.driverPaymentsService.generateExtendedHoursReport(fechaInicio, fechaFin, formValue.brandId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `reporte-horario-extendido-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`;
          downloadBase64File(base64Data, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte de horario extendido generado correctamente',
            life: 3000
          });

          this.exportingExtendedHours.set(false);
          this.closeExtendedHoursModal();
        },
        error: (err) => {
          console.error('Error al generar reporte de horario extendido:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el reporte de horario extendido',
            life: 3000
          });
          this.exportingExtendedHours.set(false);
        }
      });
  }

  /**
   * Genera y descarga reporte de ajustes
   */
  exportAdjustments(): void {
    if (!this.hasDateRange()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas',
        life: 3000
      });
      return;
    }

    const { dateRange } = this.filterForm.value;
    this.exportingAdjustments.set(true);

    const fechaInicio = new Date(dateRange[0]).toISOString();
    const fechaFinal = new Date(dateRange[1]).toISOString();

    this.driverPaymentsService.generateAdjustmentsReport(fechaInicio, fechaFinal)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `reporte-ajustes-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`;
          downloadBase64File(base64Data, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte de ajustes generado correctamente',
            life: 3000
          });

          this.exportingAdjustments.set(false);
        },
        error: (err) => {
          console.error('Error al generar reporte de ajustes:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el reporte de ajustes',
            life: 3000
          });
          this.exportingAdjustments.set(false);
        }
      });
  }
}
