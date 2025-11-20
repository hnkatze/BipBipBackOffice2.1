import { Component, signal, output, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';

export interface CouponFormData {
  driverId: number;
  reason: string;
  quantity: number;
}

@Component({
  selector: 'app-driver-coupon-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ReactiveFormsModule,
    TextareaModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-coupon-dialog.component.html',
})
export class DriverCouponDialogComponent {
  private readonly fb = inject(FormBuilder);

  visible = signal(false);
  driverId = signal<number>(0);
  driverName = signal<string>('');
  loading = signal(false);

  quantityOptions = [
    { label: '1 cupón', value: 1 },
    { label: '2 cupones', value: 2 },
    { label: '3 cupones', value: 3 },
    { label: '4 cupones', value: 4 },
    { label: '5 cupones', value: 5 },
  ];

  couponForm = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(10)]],
    quantity: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
  });

  confirm = output<CouponFormData>();

  open(id: number, name: string): void {
    this.driverId.set(id);
    this.driverName.set(name);
    this.couponForm.reset({ reason: '', quantity: 1 });
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.loading.set(false);
    this.couponForm.reset();
  }

  onSubmit(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const formData: CouponFormData = {
      driverId: this.driverId(),
      reason: this.couponForm.value.reason!,
      quantity: this.couponForm.value.quantity!,
    };

    this.confirm.emit(formData);
  }

  getErrorMessage(field: string): string {
    const control = this.couponForm.get(field);
    if (!control?.errors || !control.touched) return '';

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['minlength'])
      return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['min']) return 'Debe ser al menos 1';
    if (control.errors['max']) return 'Máximo 5 cupones';

    return '';
  }
}
