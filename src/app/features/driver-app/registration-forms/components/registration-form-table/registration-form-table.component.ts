import { Component, ChangeDetectionStrategy, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { RegistrationFormListItem } from '../../models/registration-form.model';
import { RegistrationFormStatusBadgeComponent } from '../registration-form-status-badge/registration-form-status-badge.component';

/**
 * Tabla de formularios de registro para desktop
 *
 * Usage:
 * ```html
 * <app-registration-form-table
 *   [forms]="forms()"
 *   (viewDetails)="handleViewDetails($event)"
 *   (approve)="handleApprove($event)"
 *   (reject)="handleReject($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-registration-form-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    Popover,
    RegistrationFormStatusBadgeComponent
  ],
  templateUrl: './registration-form-table.component.html',
  styleUrl: './registration-form-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationFormTableComponent {
  /** Lista de formularios */
  forms = input.required<RegistrationFormListItem[]>();

  /** Evento al ver detalles */
  viewDetails = output<RegistrationFormListItem>();

  /** Evento al aprobar */
  approve = output<number>();

  /** Evento al rechazar */
  reject = output<number>();

  /** ID del formulario actual (para el popover) */
  currentFormId = signal<number>(0);

  /** Referencia al popover de acciones */
  readonly actionsMenu = viewChild<Popover>('actionsMenu');

  /**
   * TrackBy function para optimizar rendering
   */
  trackByFormId(_index: number, form: RegistrationFormListItem): number {
    return form.id;
  }

  /**
   * Emitir evento de ver detalles
   */
  onViewDetails(form: RegistrationFormListItem): void {
    this.viewDetails.emit(form);
  }

  /**
   * Emitir evento de aprobar
   */
  onApprove(id: number): void {
    this.approve.emit(id);
  }

  /**
   * Emitir evento de rechazar
   */
  onReject(id: number): void {
    this.reject.emit(id);
  }
}
