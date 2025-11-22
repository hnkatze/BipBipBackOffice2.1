import { Component, OnInit, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { RadioButton } from 'primeng/radiobutton';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';

// Models
import { DriverAdjustment, AdjustmentType } from '../../models/payroll-adjustment.model';

/**
 * Componente de formulario para crear/editar ajustes de driver
 * Se usa dentro de un drawer lateral
 */
@Component({
  selector: 'app-adjustment-form-drawer',
  templateUrl: './adjustment-form-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    Textarea,
    RadioButton,
    DatePickerModule,
    InputNumberModule
  ]
})
export class AdjustmentFormDrawerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);

  // Inputs
  mode = input<'create' | 'edit'>('create');
  adjustment = input<DriverAdjustment | null>(null);
  driverId = input.required<number>();

  // Outputs
  save = output<any>();
  cancel = output<void>();

  // State
  form!: FormGroup;
  saving = signal<boolean>(false);

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Inicializa el formulario
   */
  private initializeForm(): void {
    const adjustmentData = this.adjustment();
    const isIncome = adjustmentData ? adjustmentData.adjustmentAmount > 0 : true;
    const amount = adjustmentData ? Math.abs(adjustmentData.adjustmentAmount) : null;

    let dateRange: [Date, Date] | null = null;
    if (adjustmentData?.adjustmentDateFrom && adjustmentData?.adjustmentDateTo) {
      dateRange = [
        new Date(adjustmentData.adjustmentDateFrom),
        new Date(adjustmentData.adjustmentDateTo)
      ];
    }

    this.form = this.fb.group({
      adjustmentType: [isIncome ? 'income' : 'deduction', Validators.required],
      adjustmentAmount: [amount, [Validators.required, Validators.min(0.01), Validators.max(999999)]],
      adjustmentReason: [
        adjustmentData?.adjustmentReason || '',
        [Validators.required, Validators.minLength(10), Validators.maxLength(500)]
      ],
      dateRange: [dateRange, Validators.required]
    });
  }

  /**
   * Valida que el rango de fechas sea válido
   */
  private isDateRangeValid(): boolean {
    const dateRange = this.form.get('dateRange')?.value;
    return !!(dateRange && dateRange[0] && dateRange[1]);
  }

  /**
   * Guarda el ajuste
   */
  onSave(): void {
    if (this.form.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos correctamente',
        life: 3000
      });
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.isDateRangeValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor selecciona un rango de fechas completo',
        life: 3000
      });
      return;
    }

    const formValue = this.form.value;
    const dateRange = formValue.dateRange;

    // Calcular el monto con signo según el tipo
    const amount = formValue.adjustmentType === 'income'
      ? Math.abs(formValue.adjustmentAmount)
      : -Math.abs(formValue.adjustmentAmount);

    const data = {
      driverId: this.driverId(),
      adjustmentAmount: amount,
      adjustmentReason: formValue.adjustmentReason,
      adjustmentDateFrom: new Date(dateRange[0]).toISOString(),
      adjustmentDateTo: new Date(dateRange[1]).toISOString()
    };

    this.save.emit(data);
  }

  /**
   * Cancela la edición
   */
  onCancel(): void {
    this.cancel.emit();
  }

  /**
   * Obtiene mensaje de error para un campo
   */
  getErrorMessage(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Este campo es obligatorio';
    }
    if (control.errors['min']) {
      return `El valor mínimo es ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `El valor máximo es ${control.errors['max'].max}`;
    }
    if (control.errors['minlength']) {
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    }
    if (control.errors['maxlength']) {
      return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
    }

    return '';
  }
}
