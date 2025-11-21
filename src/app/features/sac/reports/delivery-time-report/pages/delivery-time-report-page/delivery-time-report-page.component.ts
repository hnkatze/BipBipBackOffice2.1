import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { RadioButton } from 'primeng/radiobutton';
import { MenuItem, MessageService } from 'primeng/api';

// Services & Models
import { DeliveryTimeReportService } from '../../services';
import { DeliveryTimeReportParams, FileFormat } from '../../../shared/models';
import {
  downloadExcelFromBase64,
  downloadPDFFromBase64,
  generateReportFilename,
  formatDateISO
} from '../../../shared/utils';

@Component({
  selector: 'app-delivery-time-report-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    BreadcrumbModule,
    CardModule,
    ToastModule,
    RadioButton
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delivery-time-report-page.component.html',
  styleUrl: './delivery-time-report-page.component.scss'
})
export class DeliveryTimeReportPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly reportService = inject(DeliveryTimeReportService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'SAC', routerLink: '/sac' },
    { label: 'Reportes', routerLink: '/sac/reportes' },
    { label: 'Tiempo de Entrega' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  // Signals
  readonly isLoading = signal(false);
  readonly maxDate = new Date();

  // Enum for template
  readonly FileFormat = FileFormat;

  // Form
  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  /**
   * Inicializa el formulario con validaciones
   */
  private initForm(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.form = this.fb.group({
      dateRange: [[thirtyDaysAgo, today], [Validators.required]],
      format: [FileFormat.Excel, [Validators.required]]
    });
  }

  /**
   * Genera y descarga el reporte
   */
  generateReport(): void {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const dateRange: Date[] = this.form.value.dateRange;
    if (!dateRange || dateRange.length !== 2) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Debes seleccionar fecha de inicio y fin'
      });
      return;
    }

    const [startDate, endDate] = dateRange;
    const format = this.form.value.format;

    const params: DeliveryTimeReportParams = {
      fechaInicio: formatDateISO(startDate),
      fechaFinal: formatDateISO(endDate),
      format
    };

    this.isLoading.set(true);

    this.reportService.generateReport(params).subscribe({
      next: (response) => {

        try {
          // La respuesta viene directamente como string base64
          const base64 = response;

          if (!base64) {
            throw new Error('No se recibió el archivo del servidor');
          }

          const filename = generateReportFilename(
            'ReporteTiempoEntrega',
            startDate,
            endDate
          );

          // Descargar según el formato seleccionado
          if (format === FileFormat.PDF) {
            downloadPDFFromBase64(base64, filename);
          } else {
            downloadExcelFromBase64(base64, filename);
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Reporte descargado correctamente'
          });
        } catch (error) {
          console.error('Error al procesar el reporte:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo procesar el archivo descargado'
          });
        } finally {
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        console.error('❌ [DELIVERY-TIME-REPORT] Error:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo generar el reporte'
        });
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Limpia el formulario
   */
  clearForm(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    this.form.patchValue({
      dateRange: [thirtyDaysAgo, today],
      format: FileFormat.Excel
    });
  }
}
