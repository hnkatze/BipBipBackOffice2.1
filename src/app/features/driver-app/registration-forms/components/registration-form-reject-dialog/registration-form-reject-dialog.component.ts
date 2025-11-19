import { Component, ChangeDetectionStrategy, signal, output } from '@angular/core';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { CommonModule } from '@angular/common';

/**
 * Dialog para rechazar una solicitud de registro con comentario obligatorio
 *
 * Usage:
 * ```html
 * <app-registration-form-reject-dialog
 *   #rejectDialog
 *   (confirmed)="handleReject($event)"
 *   (cancelled)="handleCancel()"
 * />
 * ```
 *
 * ```typescript
 * // Abrir dialog
 * this.rejectDialog.open();
 * ```
 */
@Component({
  selector: 'app-registration-form-reject-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    TextareaModule
  ],
  templateUrl: './registration-form-reject-dialog.component.html',
  styleUrl: './registration-form-reject-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationFormRejectDialogComponent {
  /** Visibilidad del dialog */
  visible = signal(false);

  /** Control del comentario */
  commentControl = new FormControl('', [
    Validators.required,
    Validators.minLength(10),
    Validators.maxLength(200)
  ]);

  /** Evento cuando se confirma el rechazo */
  confirmed = output<string>();

  /** Evento cuando se cancela */
  cancelled = output<void>();

  /**
   * Abrir el dialog
   */
  open(): void {
    this.visible.set(true);
    this.commentControl.reset();
  }

  /**
   * Cancelar y cerrar
   */
  cancel(): void {
    this.visible.set(false);
    this.commentControl.reset();
    this.cancelled.emit();
  }

  /**
   * Confirmar rechazo
   */
  confirm(): void {
    if (this.commentControl.valid && this.commentControl.value) {
      this.visible.set(false);
      this.confirmed.emit(this.commentControl.value);
      this.commentControl.reset();
    }
  }
}
