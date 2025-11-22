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
import { FoodDeliveriesService } from '../../services/food-deliveries.service';
import { Brand, Store } from '../../models/food-deliveries.model';

// Utils
import { downloadBase64File } from '../../../../../../shared/utils/file-download.utils';
import { formatDate } from '../../../../../../shared/utils/date.utils';

/**
 * Componente para gestionar reportes de alimentación de deliveries
 *
 * Permite generar reportes PDF y Excel filtrados por:
 * - Rango de fechas
 * - Marca
 * - Tienda
 */
@Component({
  selector: 'app-food-deliveries-page',
  templateUrl: './food-deliveries-page.component.html',
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
export class FoodDeliveriesPageComponent implements OnInit {
  private foodDeliveriesService = inject(FoodDeliveriesService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // State signals
  brands = signal<Brand[]>([]);
  stores = signal<Store[]>([]);
  loading = signal<boolean>(false);
  loadingStores = signal<boolean>(false);
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
    { label: 'Alimentación Deliveries' }
  ];

  // Computed
  isExporting = computed(() => {
    return this.exportingPDF() || this.exportingExcel();
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadBrands();
  }

  /**
   * Inicializa el formulario de filtros
   */
  private initializeForm(): void {
    this.filterForm = this.fb.group({
      dateRange: [null, Validators.required],
      brand: [null, Validators.required],
      store: [null, Validators.required]
    });

    // Escuchar cambios en el formulario para actualizar el estado de validación
    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isFormValid.set(this.filterForm.valid);
      });
  }

  /**
   * Carga la lista de marcas
   */
  loadBrands(): void {
    this.loading.set(true);
    this.error.set(null);

    this.foodDeliveriesService.getBrands()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.brands.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar marcas:', err);
          this.error.set('Error al cargar las marcas');
          this.loading.set(false);
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
   * Maneja el cambio de marca
   */
  onBrandChange(brand: Brand): void {
    if (!brand) {
      this.stores.set([]);
      this.filterForm.patchValue({ store: null });
      return;
    }

    this.loadStoresByBrand(brand.idBrand);
  }

  /**
   * Carga las tiendas de una marca específica
   */
  private loadStoresByBrand(brandId: number): void {
    this.loadingStores.set(true);
    this.filterForm.patchValue({ store: null });

    this.foodDeliveriesService.getStoresByBrand(brandId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.stores.set(data);
          this.loadingStores.set(false);
        },
        error: (err) => {
          console.error('Error al cargar tiendas:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las tiendas',
            life: 3000
          });
          this.loadingStores.set(false);
        }
      });
  }

  /**
   * Genera y descarga el reporte en formato PDF
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

    const { dateRange, store } = this.filterForm.value;
    if (!store) return;

    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingPDF.set(true);

    this.foodDeliveriesService.generatePDFReport(fechaInicio, fechaFin)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `Reporte Alimentación ${store.shortName} (${fechaInicio} - ${fechaFin}).pdf`;
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

    const { dateRange, store } = this.filterForm.value;
    if (!store) return;

    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingExcel.set(true);

    this.foodDeliveriesService.generateExcelReport(fechaInicio, fechaFin)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `Reporte Alimentación ${store.shortName} (${fechaInicio} - ${fechaFin}).xlsx`;
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
