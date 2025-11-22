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
import { RadioButton } from 'primeng/radiobutton';

// Services & Models
import { SettlementsStoreService } from '../../services/settlements-store.service';
import { Brand, Store, ReportType } from '../../models/settlements-store.model';

// Utils
import { downloadBase64File } from '../../../../../../shared/utils/file-download.utils';

/**
 * Componente para gestionar liquidaciones por restaurante
 *
 * Permite generar reportes PDF y Excel de dos tipos:
 * - Liquidación Final (automática)
 * - Liquidación Manual (ajustada)
 *
 * Filtros: Marca → Tienda → Fecha
 */
@Component({
  selector: 'app-settlements-store-page',
  templateUrl: './settlements-store-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    BreadcrumbModule,
    ToastModule,
    RadioButton
  ],
  providers: [MessageService]
})
export class SettlementsStorePageComponent implements OnInit {
  private settlementsStoreService = inject(SettlementsStoreService);
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
    { label: 'Liquidación Restaurante' }
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
      date: [null, Validators.required],
      brand: [null, Validators.required],
      store: [null, Validators.required],
      reportType: ['final', Validators.required]
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

    this.settlementsStoreService.getBrands()
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

    this.settlementsStoreService.getStoresByBrand(brandId)
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
   * Formatea fecha al formato especial YYYY-M-D (sin zero-padding)
   */
  private formatDateSpecial(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;  // Sin zero-padding
    const day = date.getDate();         // Sin zero-padding
    return `${year}-${month}-${day}`;
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

    const { date, store, reportType } = this.filterForm.value;
    if (!store) return;

    const fecha = this.formatDateSpecial(date);

    this.exportingPDF.set(true);

    const reportObservable = reportType === 'final'
      ? this.settlementsStoreService.generateFinalPDFReport(fecha, store.shortName, store.restId)
      : this.settlementsStoreService.generateManualPDFReport(fecha, store.shortName, store.restId);

    reportObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const reportTypeLabel = reportType === 'final' ? 'Final' : 'Manual';
          const fileName = `Liquidación ${reportTypeLabel} ${store.shortName} (${fecha}).pdf`;
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

    const { date, store, reportType } = this.filterForm.value;
    if (!store) return;

    const fecha = this.formatDateSpecial(date);

    this.exportingExcel.set(true);

    const reportObservable = reportType === 'final'
      ? this.settlementsStoreService.generateFinalExcelReport(fecha, fecha)
      : this.settlementsStoreService.generateManualExcelReport(fecha, fecha);

    reportObservable
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const reportTypeLabel = reportType === 'final' ? 'Final' : 'Manual';
          const fileName = `Liquidación ${reportTypeLabel} ${store.shortName} (${fecha}).xlsx`;
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
