import {
  Component,
  ChangeDetectionStrategy,
  signal,
  output,
  inject,
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
import { RadioButtonModule } from 'primeng/radiobutton';

// Services
import { OperationBaseService } from '../../services/operation-base.service';
import { RestaurantForBase } from '../../models/operation-base.model';

/**
 * Modal para seleccionar un restaurante disponible para crear base
 *
 * Features:
 * - Tabla con restaurantes sin base asignada
 * - Búsqueda por nombre/acrónimo
 * - Radio selection
 */
@Component({
  selector: 'app-restaurant-selector-modal',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    RadioButtonModule,
  ],
  templateUrl: './restaurant-selector-modal.component.html',
  styleUrls: ['./restaurant-selector-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantSelectorModalComponent {
  private readonly operationBaseService = inject(OperationBaseService);

  // ViewChild
  readonly table = viewChild<Table>('dt');

  // Output
  readonly restaurantSelected = output<RestaurantForBase>();

  // Signals
  readonly visible = signal(false);
  readonly loading = signal(false);
  readonly restaurants = signal<RestaurantForBase[]>([]);
  readonly selectedRestaurant = signal<RestaurantForBase | null>(null);
  readonly searchTerm = signal('');

  /**
   * Abrir modal y cargar restaurantes
   */
  open(cityId: number): void {
    this.visible.set(true);
    this.searchTerm.set('');
    this.loadRestaurants(cityId);
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
   * Cerrar modal
   */
  close(): void {
    this.visible.set(false);
    this.selectedRestaurant.set(null);
    this.searchTerm.set('');
  }

  /**
   * Cargar restaurantes disponibles por ciudad
   */
  private loadRestaurants(cityId: number): void {
    this.loading.set(true);

    this.operationBaseService.getUnlinkedRestaurants(cityId).subscribe({
      next: (restaurants) => {
        this.restaurants.set(restaurants);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading restaurants:', err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Confirmar selección
   */
  confirm(): void {
    const selected = this.selectedRestaurant();
    if (selected) {
      this.restaurantSelected.emit(selected);
      this.close();
    }
  }

  /**
   * Track by para optimizar rendering
   */
  trackByRestaurantId(index: number, restaurant: RestaurantForBase): number {
    return restaurant.restId;
  }
}
