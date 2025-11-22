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
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';

// Services & Models
import { AwardsService } from '../../services/awards.service';
import { GlobalDataService } from '../../../../../../core/services/global-data.service';
import { AwardsReportParams } from '../../models/awards.model';

// Utils
import { downloadBase64File } from '../../../../../../shared/utils/file-download.utils';
import { formatDate } from '../../../../../../shared/utils/date.utils';

/**
 * Componente para generar reportes de premiaciones
 *
 * Funcionalidades:
 * 1. Filtrar por rango de fechas, marcas y ciudades
 * 2. Limitar cantidad de registros (opcional)
 * 3. Descargar reporte Excel
 */
@Component({
  selector: 'app-awards-page',
  templateUrl: './awards-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    BreadcrumbModule,
    ToastModule,
    MultiSelectModule,
    InputNumberModule
  ],
  providers: [MessageService]
})
export class AwardsPageComponent implements OnInit {
  private awardsService = inject(AwardsService);
  private globalData = inject(GlobalDataService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // State signals
  brands = computed(() => this.globalData.brands());
  cities = computed(() => this.globalData.citiesShort());
  generating = signal<boolean>(false);

  // Form
  filterForm!: FormGroup;

  // Breadcrumb
  breadcrumbs: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Planillas', routerLink: '/accounting/spreadsheets' },
    { label: 'Premiaciones' }
  ];

  ngOnInit(): void {
    this.initializeForm();
    // Cargar ciudades y marcas manualmente
    this.globalData.forceRefresh('citiesShort');
    this.globalData.forceRefresh('brands');
  }

  /**
   * Inicializa el formulario de filtros
   */
  private initializeForm(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.filterForm = this.fb.group({
      dateRange: [[firstDayOfMonth, today], Validators.required],
      brandIds: [[], [Validators.required, Validators.minLength(1)]],
      cityIds: [[], [Validators.required, Validators.minLength(1)]],
      recordLimit: [null, [Validators.min(1), Validators.max(10000)]]
    });
  }

  /**
   * Genera y descarga el reporte de premiaciones
   */
  generateReport(): void {
    if (this.filterForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos obligatorios',
        life: 3000
      });
      Object.keys(this.filterForm.controls).forEach(key => {
        this.filterForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.filterForm.value;
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

    this.generating.set(true);

    const params: AwardsReportParams = {
      fechaInicio: new Date(dateRange[0]).toISOString(),
      fechaFinal: new Date(dateRange[1]).toISOString(),
      marcas: formValue.brandIds,
      ciudades: formValue.cityIds
    };

    // Agregar límite de registros si existe
    if (formValue.recordLimit) {
      params.top = formValue.recordLimit;
    }

    this.awardsService.generateAwardsReport(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `Reporte-Premiaciones-${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`;
          downloadBase64File(base64Data, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte de premiaciones generado correctamente',
            life: 3000
          });

          this.generating.set(false);
        },
        error: (err) => {
          console.error('Error al generar reporte de premiaciones:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo generar el reporte de premiaciones',
            life: 3000
          });
          this.generating.set(false);
        }
      });
  }

  /**
   * Limpia el formulario
   */
  clearFilters(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    this.filterForm.reset({
      dateRange: [firstDayOfMonth, today],
      brandIds: [],
      cityIds: [],
      recordLimit: null
    });
  }

  /**
   * Obtiene mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.filterForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['minLength']) {
      return 'Debe seleccionar al menos un elemento';
    }
    if (control.errors['min']) {
      return `El valor mínimo es ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `El valor máximo es ${control.errors['max'].max}`;
    }

    return '';
  }
}
