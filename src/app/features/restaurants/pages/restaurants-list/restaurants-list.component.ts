import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { PaginatorModule } from 'primeng/paginator';
import { ToastModule } from 'primeng/toast';
import { PopoverModule } from 'primeng/popover';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MessageService, MenuItem } from 'primeng/api';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';

import { RestaurantService } from '../../services/restaurant.service';
import { RestaurantFiltersComponent } from '../../components/restaurant-filters/restaurant-filters.component';
import type { RestaurantFilters } from '../../models/restaurant.model';

@Component({
  selector: 'app-restaurants-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    PaginatorModule,
    ToastModule,
    PopoverModule,
    BreadcrumbModule,
    DividerModule,
    SkeletonModule,
    RestaurantFiltersComponent
  ],
  templateUrl: './restaurants-list.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantsListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly restaurantService = inject(RestaurantService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Restaurantes' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  // Local signals
  readonly searchTerm = signal<string>('');
  readonly selectedStatusId = signal<number>(-1); // -1 = All, 1 = Active, 0 = Inactive
  readonly filtersVisible = signal<boolean>(false);
  readonly appliedCountries = signal<number[]>([]);
  readonly appliedCities = signal<number[]>([]);

  // Search debounce timer
  private searchTimeout: any;

  // Reference service signals directly (no computed wrapper needed)
  readonly restaurants = this.restaurantService.restaurants;
  readonly isLoading = this.restaurantService.isLoading;
  readonly totalRecords = this.restaurantService.totalRecords;
  readonly currentPage = this.restaurantService.currentPage;
  readonly pageSize = this.restaurantService.pageSize;
  readonly statusFilters = this.restaurantService.statusFilters;

  // Computed signals
  readonly hasData = computed(() => this.restaurants().length > 0);
  readonly hasFilters = computed(() =>
    this.appliedCountries().length > 0 ||
    this.appliedCities().length > 0 ||
    this.searchTerm().trim() !== ''
  );

  ngOnInit(): void {
    this.loadRestaurants();
  }

  /**
   * Load restaurants with current filters
   */
  loadRestaurants(): void {
    const filters: RestaurantFilters = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      search: this.searchTerm() || undefined
    };

    // Add status filters
    const selectedStatus = this.selectedStatusId();
    if (selectedStatus === 1) {
      filters.statusActive = true;
      filters.statusInactive = false;
    } else if (selectedStatus === 0) {
      filters.statusActive = false;
      filters.statusInactive = true;
    } else {
      // All - both active and inactive
      filters.statusActive = true;
      filters.statusInactive = true;
    }

    // Add location filters
    if (this.appliedCountries().length > 0) {
      filters.countries = this.appliedCountries();
    }

    if (this.appliedCities().length > 0) {
      filters.cities = this.appliedCities();
    }

    this.restaurantService.getRestaurants(filters).subscribe({
      next: () => {
      },
      error: (error) => {
        console.error('Error loading restaurants:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar los restaurantes'
        });
      }
    });
  }

  /**
   * Handle page change event from paginator
   */
  onPageChange(event: any): void {
    // Check if page size changed
    if (event.rows !== this.pageSize()) {
      // Page size changed - reset to first page
      this.restaurantService.pageSize.set(event.rows);
      this.restaurantService.currentPage.set(0);
    } else {
      // Just page number changed
      this.restaurantService.currentPage.set(event.page);
    }

    this.loadRestaurants();
  }

  /**
   * Handle search input change with debounce
   */
  onSearchChange(value: string): void {
    // Clear existing timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Set new timeout
    this.searchTimeout = setTimeout(() => {
      this.searchTerm.set(value);
      this.restaurantService.currentPage.set(0); // Reset to first page
      this.loadRestaurants();
    }, 500); // 500ms debounce
  }

  /**
   * Handle status filter change
   */
  onStatusFilterChange(statusId: number): void {
    this.selectedStatusId.set(statusId);
    this.restaurantService.currentPage.set(0); // Reset to first page
    this.loadRestaurants();
  }

  /**
   * Open filters sidebar
   */
  openFilters(): void {
    this.filtersVisible.set(true);
  }

  /**
   * Close filters sidebar
   */
  closeFilters(): void {
    this.filtersVisible.set(false);
  }

  /**
   * Handle filters applied from sidebar
   */
  onApplyFilters(filters: { countries: number[]; cities: number[] }): void {
    this.appliedCountries.set(filters.countries);
    this.appliedCities.set(filters.cities);
    this.restaurantService.currentPage.set(0); // Reset to first page
    this.loadRestaurants();
    this.closeFilters();
  }

  /**
   * Clear all filters
   */
  onClearFilters(): void {
    this.searchTerm.set('');
    this.selectedStatusId.set(-1);
    this.appliedCountries.set([]);
    this.appliedCities.set([]);
    this.restaurantService.currentPage.set(0);
    this.loadRestaurants();
  }

  /**
   * Handle create new restaurant
   */
  onCreateRestaurant(): void {
    this.router.navigate(['/restaurants/restaurant/create']);
  }

  isActiveDelivery(active: boolean, publish: boolean):boolean {
    return active && publish;
  }

  /**
   * Toggle delivery status (publish)
   * Controls if the restaurant can receive delivery orders
   */
  onToggleDeliveryStatus(restaurantId: number, popover: any): void {
    popover.hide();
    this.restaurantService.toggleDeliveryStatus(restaurantId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Estado de domicilio actualizado correctamente'
        });
        this.loadRestaurants();
      },
      error: (error) => {
        console.error('Error toggling delivery status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al actualizar el estado de domicilio'
        });
      }
    });
  }

  /**
   * Toggle store status (active)
   * Controls if the restaurant can receive delivery + takeaway orders
   */
  onToggleStoreStatus(restaurantId: number, popover: any): void {
    popover.hide();
    this.restaurantService.toggleStoreStatus(restaurantId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Estado general actualizado correctamente'
        });
        this.loadRestaurants();
      },
      error: (error) => {
        console.error('Error toggling store status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al actualizar el estado general'
        });
      }
    });
  }

  /**
   * Handle view restaurant details
   */
  onViewRestaurant(restaurantId: number): void {
    this.router.navigate(['/restaurants/restaurant', restaurantId]);
  }

  /**
   * Handle edit restaurant
   */
  onEditRestaurant(restaurantId: number, popover: any): void {
    popover.hide();
    this.router.navigate(['/restaurants/restaurant', restaurantId, 'edit']);
  }

  /**
   * Handle view restaurant and close popover
   */
  onViewRestaurantWithClose(restaurantId: number, popover: any): void {
    popover.hide();
    this.onViewRestaurant(restaurantId);
  }

  /**
   * Get severity for status tag
   */
  getStatusSeverity(status: boolean): 'success' | 'danger' {
    return status ? 'success' : 'danger';
  }

  /**
   * Get label for status tag
   */
  getStatusLabel(status: boolean): string {
    return status ? 'Activo' : 'Inactivo';
  }
}
