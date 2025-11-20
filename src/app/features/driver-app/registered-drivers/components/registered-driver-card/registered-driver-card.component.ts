import { Component, ChangeDetectionStrategy, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { RegisteredDriverListItem } from '../../models/registered-driver.model';
import { RegisteredDriverStatusBadgeComponent } from '../registered-driver-status-badge/registered-driver-status-badge.component';

/**
 * Card de driver registrado para mobile
 *
 * Usage:
 * ```html
 * <app-registered-driver-card
 *   [driver]="driver"
 *   (viewDetails)="viewDetails($event)"
 *   (edit)="editDriver($event)"
 *   (toggleStatus)="toggleStatus($event)"
 *   (delete)="deleteDriver($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-registered-driver-card',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    Popover,
    RegisteredDriverStatusBadgeComponent
  ],
  templateUrl: './registered-driver-card.component.html',
  styleUrl: './registered-driver-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisteredDriverCardComponent {
  /** Driver a mostrar */
  driver = input.required<RegisteredDriverListItem>();

  /** Evento al ver detalles */
  viewDetails = output<RegisteredDriverListItem>();

  /** Evento al editar */
  edit = output<number>();

  /** Evento al cambiar status */
  toggleStatus = output<{ id: number; currentStatus: boolean }>();

  /** Evento al eliminar */
  delete = output<number>();

  /** Referencia al popover de acciones */
  readonly actionsMenu = viewChild<Popover>('actionsMenu');

  /**
   * Emitir evento de ver detalles
   */
  onViewDetails(): void {
    this.viewDetails.emit(this.driver());
  }

  /**
   * Emitir evento de editar
   */
  onEdit(): void {
    this.edit.emit(this.driver().id);
  }

  /**
   * Emitir evento de toggle status
   */
  onToggleStatus(): void {
    const driver = this.driver();
    this.toggleStatus.emit({
      id: driver.id,
      currentStatus: driver.status
    });
  }

  /**
   * Emitir evento de eliminar
   */
  onDelete(): void {
    this.delete.emit(this.driver().id);
  }
}
