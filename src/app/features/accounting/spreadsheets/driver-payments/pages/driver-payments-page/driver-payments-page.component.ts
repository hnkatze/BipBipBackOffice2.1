import { Component, OnInit, ChangeDetectionStrategy, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem, MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { RadioButton } from 'primeng/radiobutton';

// Services & Models
import { DriverPaymentsService } from '../../services/driver-payments.service';
import {
  DriverPayment,
  Country,
  City,
  Headquarter,
  PaginationMetadata,
  ReportType
} from '../../models/driver-payments.model';

// Utils
import { downloadBase64File } from '../../../../../../shared/utils/file-download.utils';
import { formatDate } from '../../../../../../shared/utils/date.utils';

/**
 * Componente para gestionar pagos a drivers
 *
 * Módulo híbrido que muestra tabla de datos paginada Y permite
 * generar múltiples tipos de reportes (PDF/Excel/TXT)
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
    MultiSelectModule,
    SelectModule,
    BreadcrumbModule,
    ToastModule,
    TableModule,
    TagModule,
    RadioButton
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
  cities = signal<City[]>([]);
  allCities = signal<City[]>([]); // Todas las ciudades cargadas
  headquarters = signal<Headquarter[]>([]);

  // State signals - UI
  loading = signal<boolean>(false);
  loadingCities = signal<boolean>(false);
  exportingPDF = signal<boolean>(false);
  exportingExcel = signal<boolean>(false);
  exportingTXT = signal<boolean>(false);
  error = signal<string | null>(null);
  filtersVisible = signal<boolean>(true);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);
  metadata = signal<PaginationMetadata | null>(null);

  // Report type selection
  selectedReportType = signal<ReportType>('general');

  // Form
  filterForm!: FormGroup;

  // Breadcrumb
  breadcrumbs: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Planillas', routerLink: '/accounting/spreadsheets' },
    { label: 'Pagos a Drivers' }
  ];

  // Computed
  isExporting = computed(() => {
    return this.exportingPDF() || this.exportingExcel() || this.exportingTXT();
  });

  hasDateRange = computed(() => {
    const dateRange = this.filterForm?.get('dateRange')?.value;
    return dateRange && dateRange[0] && dateRange[1];
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadInitialData();
  }

  /**
   * Inicializa el formulario de filtros
   */
  private initializeForm(): void {
    this.filterForm = this.fb.group({
      dateRange: [null, Validators.required],
      countries: [[]],
      cities: [[]],
      headquarters: [[]],
      reportType: ['general', Validators.required]
    });

    // Listen to report type changes
    this.filterForm.get('reportType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.selectedReportType.set(value);
      });
  }

  /**
   * Carga datos iniciales (países, bases)
   */
  private loadInitialData(): void {
    this.loadCountries();
    this.loadHeadquarters();
  }

  /**
   * Carga la lista de países
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
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los países',
            life: 3000
          });
        }
      });
  }

  /**
   * Carga la lista de bases de operación
   */
  private loadHeadquarters(): void {
    this.driverPaymentsService.getHeadquarters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.headquarters.set(data);
        },
        error: (err) => {
          console.error('Error al cargar bases:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las bases de operación',
            life: 3000
          });
        }
      });
  }

  /**
   * Maneja el cambio de selección de países
   */
  onCountriesChange(selectedCountries: Country[]): void {
    if (!selectedCountries || selectedCountries.length === 0) {
      this.cities.set([]);
      this.filterForm.patchValue({ cities: [] });
      return;
    }

    this.loadCitiesByCountries(selectedCountries.map(c => c.countryId));
  }

  /**
   * Carga ciudades de los países seleccionados
   */
  private loadCitiesByCountries(countryIds: number[]): void {
    this.loadingCities.set(true);
    this.filterForm.patchValue({ cities: [] });

    // Cargar ciudades de cada país seleccionado
    const cityRequests = countryIds.map(countryId =>
      this.driverPaymentsService.getCitiesByCountry(countryId)
    );

    // Combinar todas las respuestas
    Promise.all(cityRequests.map(req => req.toPromise()))
      .then((results) => {
        const allCities = results.flat().filter(city => city !== undefined) as City[];
        this.cities.set(allCities);
        this.allCities.set(allCities);
        this.loadingCities.set(false);
      })
      .catch((err) => {
        console.error('Error al cargar ciudades:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las ciudades',
          life: 3000
        });
        this.loadingCities.set(false);
      });
  }

  /**
   * Aplica los filtros y carga la primera página
   */
  applyFilters(): void {
    this.currentPage.set(1);
    this.loadPayments();
  }

  /**
   * Carga la lista de pagos con filtros y paginación
   */
  loadPayments(page: number = this.currentPage()): void {
    const dateRange = this.filterForm.get('dateRange')?.value;

    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas',
        life: 3000
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.driverPaymentsService.getPaymentsList(
      page,
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
          this.currentPage.set(page);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar pagos:', err);
          this.error.set('Error al cargar los pagos');
          this.loading.set(false);
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
    const newPage = event.page + 1; // PrimeNG usa 0-indexed
    this.pageSize.set(event.rows);
    this.loadPayments(newPage);
  }

  /**
   * Toggle visibilidad de filtros
   */
  toggleFilters(): void {
    this.filtersVisible.update(v => !v);
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
}
