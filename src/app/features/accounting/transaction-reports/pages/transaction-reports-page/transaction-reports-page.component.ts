import { Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';

// PrimeNG
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';

// Services
import { TransactionReportsService } from '../../services/transaction-reports.service';
import { TransactionReportParams } from '../../models/transaction-report.model';

// Utils
import { getDateFormatISO } from '@features/reports/utils/report-export.utils';

@Component({
  selector: 'app-transaction-reports-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    ButtonModule,
    CardModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './transaction-reports-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionReportsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(TransactionReportsService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // Form
  filterForm!: FormGroup;

  // Señales del service
  readonly downloading = this.service.downloading;

  ngOnInit(): void {
    this.initFilterForm();
  }

  private initFilterForm(): void {
    // Inicializar con fechas por defecto (último mes hasta hoy)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    this.filterForm = this.fb.group({
      fechaInicio: [lastMonth, Validators.required],
      fechaFinal: [now, Validators.required]
    });
  }

  downloadReport(): void {
    // Validar formulario
    if (this.filterForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Campos requeridos',
        detail: 'Por favor selecciona ambas fechas'
      });
      this.filterForm.markAllAsTouched();
      return;
    }

    const formValue = this.filterForm.value;
    const fechaInicio: Date = formValue.fechaInicio;
    const fechaFinal: Date = formValue.fechaFinal;

    // Validar rango de fechas
    if (fechaInicio > fechaFinal) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: 'La fecha final debe ser mayor o igual que la fecha inicial'
      });
      return;
    }

    // Preparar parámetros en formato YYYY-MM-DD (solo fecha, sin hora)
    const params: TransactionReportParams = {
      fechaInicio: getDateFormatISO(fechaInicio),
      fechaFinal: getDateFormatISO(fechaFinal)
    };

    console.log('📊 [Transaction Reports Component] Solicitando descarga con params:', params);

    // Descargar reporte
    this.service.downloadExcel(params)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'El reporte se ha descargado exitosamente'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error al descargar',
            detail: error.message || 'No se pudo descargar el reporte'
          });
        }
      });
  }

  // Getters para el template
  get fechaInicio() {
    return this.filterForm.get('fechaInicio');
  }

  get fechaFinal() {
    return this.filterForm.get('fechaFinal');
  }
}
