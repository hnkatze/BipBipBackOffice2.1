import { Component, OnInit, ChangeDetectionStrategy, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MenuItem, MessageService } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ToastModule } from 'primeng/toast';

// Services & Models
import { SettlementsDeliveryService } from '../../services/settlements-delivery.service';
import { City, Driver } from '../../models/settlements-delivery.model';

// Utils
import { downloadBase64File } from '../../../../../../shared/utils/file-download.utils';
import { formatDate } from '../../../../../../shared/utils/date.utils';

/**
 * Componente para gestionar liquidaciones por delivery
 *
 * Permite generar reportes PDF y Excel filtrados por:
 * - Rango de fechas
 * - Ciudad
 * - Driver/Repartidor
 */
@Component({
  selector: 'app-settlements-delivery-page',
  templateUrl: './settlements-delivery-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    BreadcrumbModule,
    ToastModule
  ],
  providers: [MessageService]
})
export class SettlementsDeliveryPageComponent implements OnInit {
  private settlementsDeliveryService = inject(SettlementsDeliveryService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // State signals
  cities = signal<City[]>([]);
  drivers = signal<Driver[]>([]);
  loading = signal<boolean>(false);
  loadingDrivers = signal<boolean>(false);
  exportingPDF = signal<boolean>(false);
  exportingExcel = signal<boolean>(false);
  error = signal<string | null>(null);

  // Form
  filterForm!: FormGroup;
  isFormValid = signal<boolean>(false);

  // Breadcrumb
  breadcrumbs: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Planillas', routerLink: '/accounting/spreadsheets' },
    { label: 'Liquidaciones Delivery' }
  ];

  // Computed
  isExporting = computed(() => {
    return this.exportingPDF() || this.exportingExcel();
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadCities();
  }

  /**
   * Inicializa el formulario de filtros
   */
  private initializeForm(): void {
    this.filterForm = this.fb.group({
      dateRange: [null, Validators.required],
      city: [null, Validators.required],
      driver: [null, Validators.required]
    });

    // Escuchar cambios en el formulario para actualizar el estado de validación
    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isFormValid.set(this.filterForm.valid);
      });
  }

  /**
   * Carga la lista de ciudades
   */
  loadCities(): void {
    this.loading.set(true);
    this.error.set(null);

    this.settlementsDeliveryService.getCities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.cities.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar ciudades:', err);
          this.error.set('Error al cargar las ciudades');
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las ciudades',
            life: 3000
          });
        }
      });
  }

  /**
   * Maneja el cambio de ciudad
   */
  onCityChange(city: City): void {
    if (!city) {
      this.drivers.set([]);
      this.filterForm.patchValue({ driver: null });
      return;
    }

    this.loadDriversByCity(city.cityId);
  }

  /**
   * Carga los drivers de una ciudad específica
   */
  private loadDriversByCity(cityId: number): void {
    this.loadingDrivers.set(true);
    this.filterForm.patchValue({ driver: null });

    this.settlementsDeliveryService.getDriversByCity(cityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.drivers.set(data);
          this.loadingDrivers.set(false);
        },
        error: (err) => {
          console.error('Error al cargar drivers:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los drivers',
            life: 3000
          });
          this.loadingDrivers.set(false);
        }
      });
  }

  /**
   * Genera y descarga el reporte en formato PDF
   * NOTA: El PDF requiere formato dd-MM-yyyy
   */
  exportPDF(): void {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor completa todos los filtros',
        life: 3000
      });
      return;
    }

    const { dateRange, driver } = this.filterForm.value;

    if (!driver) return;

    // PDF usa formato dd-MM-yyyy
    const fechaInicio = formatDate(dateRange[0], 'dd-MM-yyyy');
    const fechaFin = formatDate(dateRange[1], 'dd-MM-yyyy');

    this.exportingPDF.set(true);

    this.settlementsDeliveryService.generatePDFReport(fechaInicio, fechaFin, driver.idDriver)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `Liquidaciones ${driver.fullNameDriver} (${fechaInicio} - ${fechaFin}).pdf`;
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
   * Genera y descarga el reporte en formato Excel
   * NOTA: El Excel requiere formato yyyy-MM-dd
   */
  exportExcel(): void {
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor completa todos los filtros',
        life: 3000
      });
      return;
    }

    const { dateRange, driver } = this.filterForm.value;

    if (!driver) return;

    // Excel usa formato yyyy-MM-dd
    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingExcel.set(true);

    this.settlementsDeliveryService.generateExcelReport(fechaInicio, fechaFin, driver.idDriver)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `Liquidaciones ${driver.fullNameDriver} (${fechaInicio} - ${fechaFin}).xlsx`;
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
}
