import {
  Component,
  ChangeDetectionStrategy,
  signal,
  output,
  inject,
  computed,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TableModule, Table } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { CheckboxModule } from 'primeng/checkbox';

// Models and Services
import { OperationBaseService } from '../../services/operation-base.service';
import { DriverUnassigned } from '../../models/operation-base.model';

/**
 * Modal para seleccionar múltiples drivers sin asignar
 *
 * Features:
 * - Tabla con checkbox para selección múltiple
 * - Búsqueda por nombre o alias
 * - Paginación
 * - Select All checkbox
 * - Mantiene selección previa al reabrir
 */
@Component({
  selector: 'app-driver-selector-modal',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    CheckboxModule,
  ],
  templateUrl: './driver-selector-modal.component.html',
  styleUrls: ['./driver-selector-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverSelectorModalComponent {
  private readonly operationBaseService = inject(OperationBaseService);

  // ViewChild
  readonly table = viewChild<Table>('dt');

  /** Evento cuando se confirma la selección */
  readonly driversSelected = output<DriverUnassigned[]>();

  // ============================================================================
  // SIGNALS
  // ============================================================================

  /** Visibilidad del modal */
  readonly visible = signal(false);

  /** Estado de carga */
  readonly loading = signal(false);

  /** Lista de drivers disponibles */
  readonly drivers = signal<DriverUnassigned[]>([]);

  /** Drivers seleccionados */
  readonly selectedDrivers = signal<DriverUnassigned[]>([]);

  /** Término de búsqueda */
  readonly searchTerm = signal('');

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Indica si hay drivers seleccionados */
  readonly hasSelection = computed(() => this.selectedDrivers().length > 0);

  /** Cantidad de drivers seleccionados */
  readonly selectionCount = computed(() => this.selectedDrivers().length);

  // ============================================================================
  // METHODS
  // ============================================================================

  /**
   * Abrir el modal y cargar drivers disponibles
   * @param cityId ID de la ciudad
   * @param currentSelection Drivers ya seleccionados (para mantener selección)
   */
  open(cityId: number, currentSelection: DriverUnassigned[] = []): void {
    this.visible.set(true);
    this.searchTerm.set('');
    this.selectedDrivers.set([...currentSelection]); // Mantener selección previa
    this.loadDrivers(cityId);
  }

  /**
   * Aplicar filtro cuando cambia el término de búsqueda
   */
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    const tableRef = this.table();
    if (tableRef) {
      tableRef.filterGlobal(value, 'contains');
    }
  }

  /**
   * Cerrar el modal y limpiar estado
   */
  close(): void {
    this.visible.set(false);
    this.selectedDrivers.set([]);
    this.searchTerm.set('');
  }

  /**
   * Cargar drivers sin asignar de una ciudad
   */
  private loadDrivers(cityId: number): void {
    this.loading.set(true);

    this.operationBaseService.getUnlinkedDrivers(cityId).subscribe({
      next: (drivers) => {
        this.drivers.set(drivers);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading drivers:', err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Confirmar selección y cerrar modal
   */
  confirm(): void {
    if (this.hasSelection()) {
      this.driversSelected.emit(this.selectedDrivers());
      this.close();
    }
  }

  /**
   * Track by para optimizar rendering
   */
  trackByDriverId(index: number, driver: DriverUnassigned): number {
    return driver.driverId;
  }
}
