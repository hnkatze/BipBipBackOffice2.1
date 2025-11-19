import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { RegistrationFormListItem } from '../../models/registration-form.model';
import { RegistrationFormStatusBadgeComponent } from '../registration-form-status-badge/registration-form-status-badge.component';

/**
 * Card de formulario de registro para mobile
 *
 * Usage:
 * ```html
 * <app-registration-form-card
 *   [form]="form"
 *   (viewDetails)="handleViewDetails($event)"
 *   (approve)="handleApprove($event)"
 *   (reject)="handleReject($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-registration-form-card',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    DividerModule,
    RegistrationFormStatusBadgeComponent
  ],
  templateUrl: './registration-form-card.component.html',
  styleUrl: './registration-form-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationFormCardComponent {
  /** Formulario a mostrar */
  form = input.required<RegistrationFormListItem>();

  /** Evento al ver detalles */
  viewDetails = output<RegistrationFormListItem>();

  /** Evento al aprobar */
  approve = output<number>();

  /** Evento al rechazar */
  reject = output<number>();

  /**
   * Emitir evento de ver detalles
   */
  onViewDetails(): void {
    this.viewDetails.emit(this.form());
  }

  /**
   * Emitir evento de aprobar
   */
  onApprove(): void {
    this.approve.emit(this.form().id);
  }

  /**
   * Emitir evento de rechazar
   */
  onReject(): void {
    this.reject.emit(this.form().id);
  }
}
