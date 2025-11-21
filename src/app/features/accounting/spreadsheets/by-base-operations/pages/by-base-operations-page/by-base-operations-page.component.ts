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
import { ByBaseOperationsService } from '../../services/by-base-operations.service';
import { Headquarter } from '../../models/by-base-operations.model';

// Utils
import { downloadBase64File } from '../../../../../../shared/utils/file-download.utils';
import { formatDate } from '../../../../../../shared/utils/date.utils';

/**
 * Componente para gestionar planillas por base de operaciones
 *
 * Permite generar reportes PDF y Excel filtrados por:
 * - Rango de fechas
 * - Base de operaciones
 */
@Component({
  selector: 'app-by-base-operations-page',
  templateUrl: './by-base-operations-page.component.html',
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
export class ByBaseOperationsPageComponent implements OnInit {
  private byBaseOperationsService = inject(ByBaseOperationsService);
  private messageService = inject(MessageService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // State signals
  headquarters = signal<Headquarter[]>([]);
  loading = signal<boolean>(false);
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
    { label: 'Por Base de Operaciones' }
  ];

  isExporting = computed(() => {
    return this.exportingPDF() || this.exportingExcel();
  });

  ngOnInit(): void {
    this.initializeForm();
    this.loadHeadquarters();
  }

  /**
   * Inicializa el formulario de filtros
   */
  private initializeForm(): void {
    this.filterForm = this.fb.group({
      dateRange: [null, Validators.required],
      headquarter: [null, Validators.required]
    });

    // Escuchar cambios en el formulario para actualizar el estado de validación
    this.filterForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isFormValid.set(this.filterForm.valid);
      });
  }

  /**
   * Carga la lista de sedes/bases de operaciones
   */
  loadHeadquarters(): void {
    this.loading.set(true);
    this.error.set(null);

    this.byBaseOperationsService.getHeadquarters()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.headquarters.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar bases de operaciones:', err);
          this.error.set('Error al cargar las bases de operaciones');
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las bases de operaciones',
            life: 3000
          });
        }
      });
  }

  /**
   * Genera y descarga el reporte en formato PDF
   */
  exportPDF(): void {
    if (!this.filterForm.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor completa todos los filtros',
        life: 3000
      });
      return;
    }

    const { dateRange, headquarter } = this.filterForm.value;
    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingPDF.set(true);

    this.byBaseOperationsService.generatePDFReport(fechaInicio, fechaFin, headquarter.codHeadquarter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `Planilla Base Operación ${headquarter.headquarterName} (${fechaInicio} - ${fechaFin}).pdf`;
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
    if (!this.filterForm.valid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor completa todos los filtros',
        life: 3000
      });
      return;
    }

    const { dateRange, headquarter } = this.filterForm.value;
    const fechaInicio = formatDate(dateRange[0], 'yyyy-MM-dd');
    const fechaFin = formatDate(dateRange[1], 'yyyy-MM-dd');

    this.exportingExcel.set(true);

    this.byBaseOperationsService.generateExcelReport(fechaInicio, fechaFin, headquarter.codHeadquarter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (base64Data) => {
          const fileName = `Planilla Base Operación ${headquarter.headquarterName} (${fechaInicio} - ${fechaFin}).xlsx`;
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
