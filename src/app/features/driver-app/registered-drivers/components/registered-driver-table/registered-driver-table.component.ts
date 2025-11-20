import { Component, ChangeDetectionStrategy, input, output, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { RegisteredDriverListItem } from '../../models/registered-driver.model';
import { RegisteredDriverStatusBadgeComponent } from '../registered-driver-status-badge/registered-driver-status-badge.component';

/**
 * Tabla de drivers registrados para desktop
 *
 * Usage:
 * ```html
 * <app-registered-driver-table
 *   [drivers]="drivers()"
 *   (viewDetails)="viewDetails($event)"
 *   (edit)="editDriver($event)"
 *   (toggleStatus)="toggleStatus($event)"
 *   (delete)="deleteDriver($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-registered-driver-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    Popover,
    RegisteredDriverStatusBadgeComponent
  ],
  templateUrl: './registered-driver-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisteredDriverTableComponent {
  /** Lista de drivers */
  drivers = input.required<RegisteredDriverListItem[]>();

  /** Evento al ver detalles */
  viewDetails = output<RegisteredDriverListItem>();

  /** Evento al editar */
  edit = output<number>();

  /** Evento al cambiar status */
  toggleStatus = output<{ id: number; currentStatus: boolean }>();

  /** Evento al eliminar */
  delete = output<number>();

  /** ID del driver actual (para el popover) */
  currentDriverId = signal<number>(0);

  /** Driver actual completo (para el popover) */
  currentDriver = signal<RegisteredDriverListItem | null>(null);

  /** Referencia al popover de acciones */
  readonly actionsMenu = viewChild<Popover>('actionsMenu');

  /**
   * TrackBy function para optimizar rendering
   */
  trackByDriverId(_index: number, driver: RegisteredDriverListItem): number {
    return driver.id;
  }

  /**
   * Emitir evento de ver detalles
   */
  onViewDetails(driver: RegisteredDriverListItem): void {
    this.viewDetails.emit(driver);
  }

  /**
   * Emitir evento de editar
   */
  onEdit(id: number): void {
    this.edit.emit(id);
  }

  /**
   * Emitir evento de toggle status
   */
  onToggleStatus(driver: RegisteredDriverListItem): void {
    this.toggleStatus.emit({
      id: driver.id,
      currentStatus: driver.status
    });
  }

  /**
   * Emitir evento de eliminar
   */
  onDelete(id: number): void {
    this.delete.emit(id);
  }
}
