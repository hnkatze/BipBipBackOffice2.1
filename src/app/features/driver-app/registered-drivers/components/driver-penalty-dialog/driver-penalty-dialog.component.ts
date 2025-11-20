import { Component, signal, output, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { PenaltyReason } from '../../models/registered-driver.model';

export interface PenaltyFormData {
  driverId: number;
  reasonId: number;
  description: string;
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-driver-penalty-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ReactiveFormsModule,
    TextareaModule,
    DatePickerModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-penalty-dialog.component.html',
})
export class DriverPenaltyDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  visible = signal(false);
  driverId = signal<number>(0);
  driverName = signal<string>('');
  loading = signal(false);
  reasons = signal<PenaltyReason[]>([]);

  minDate = new Date();

  penaltyForm = this.fb.group({
    reasonId: [null as number | null, [Validators.required]],
    description: ['', [Validators.required, Validators.minLength(10)]],
    startDate: [new Date(), [Validators.required]],
    endDate: [null as Date | null, [Validators.required]],
  });

  confirm = output<PenaltyFormData>();

  ngOnInit(): void {
    // Default penalty reasons
    this.reasons.set([
      { id: 1, name: 'Mala conducta' },
      { id: 2, name: 'Cancelación de pedidos' },
      { id: 3, name: 'Quejas de clientes' },
      { id: 4, name: 'Documentos vencidos' },
      { id: 5, name: 'Incumplimiento de normas' },
      { id: 6, name: 'Otro' },
    ]);
  }

  open(id: number, name: string, reasons?: PenaltyReason[]): void {
    this.driverId.set(id);
    this.driverName.set(name);

    if (reasons && reasons.length > 0) {
      this.reasons.set(reasons);
    }

    this.penaltyForm.reset({
      reasonId: null,
      description: '',
      startDate: new Date(),
      endDate: null,
    });

    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.loading.set(false);
    this.penaltyForm.reset();
  }

  onSubmit(): void {
    if (this.penaltyForm.invalid) {
      this.penaltyForm.markAllAsTouched();
      return;
    }

    const startDate = this.penaltyForm.value.startDate!;
    const endDate = this.penaltyForm.value.endDate!;

    if (endDate <= startDate) {
      alert('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    this.loading.set(true);
    const formData: PenaltyFormData = {
      driverId: this.driverId(),
      reasonId: this.penaltyForm.value.reasonId!,
      description: this.penaltyForm.value.description!,
      startDate: startDate,
      endDate: endDate,
    };

    this.confirm.emit(formData);
  }

  getErrorMessage(field: string): string {
    const control = this.penaltyForm.get(field);
    if (!control?.errors || !control.touched) return '';

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['minlength'])
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;

    return '';
  }
}
