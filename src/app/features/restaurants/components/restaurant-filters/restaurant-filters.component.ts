import {
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG imports
import { DrawerModule } from 'primeng/drawer';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';

import { RestaurantService } from '../../services/restaurant.service';
import type { Country, City } from '../../models/restaurant.model';

@Component({
  selector: 'app-restaurant-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DrawerModule,
    MultiSelectModule,
    ButtonModule
  ],
  templateUrl: './restaurant-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RestaurantFiltersComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);

  // Inputs
  readonly visible = input<boolean>(false);
  readonly selectedCountries = input<number[]>([]);
  readonly selectedCities = input<number[]>([]);

  // Outputs
  readonly onApplyFilters = output<{ countries: number[]; cities: number[] }>();
  readonly onClose = output<void>();

  // Local signals for form state
  readonly localCountries = signal<number[]>([]);
  readonly localCities = signal<number[]>([]);

  // Reference data from service
  readonly countries = this.restaurantService.countries;
  readonly allCities = this.restaurantService.cities;

  // Computed: filtered cities based on selected countries
  readonly availableCities = computed(() => {
    const selectedCountryIds = this.localCountries();
    if (selectedCountryIds.length === 0) {
      return [];
    }
    return this.allCities().filter(city =>
      selectedCountryIds.includes(city.codCountry)
    );
  });

  // Computed: check if filters have changed
  readonly hasChanges = computed(() => {
    const currentCountries = this.selectedCountries();
    const currentCities = this.selectedCities();
    const localCountriesArr = this.localCountries();
    const localCitiesArr = this.localCities();

    return (
      JSON.stringify(currentCountries.sort()) !== JSON.stringify(localCountriesArr.sort()) ||
      JSON.stringify(currentCities.sort()) !== JSON.stringify(localCitiesArr.sort())
    );
  });

  // Computed: count of applied filters
  readonly filterCount = computed(() => {
    return this.localCountries().length + this.localCities().length;
  });

  constructor() {
    // Effect to sync input values to local state when sidebar opens
    effect(() => {
      if (this.visible()) {
        this.localCountries.set([...this.selectedCountries()]);
        this.localCities.set([...this.selectedCities()]);
      }
    });
  }

  ngOnInit(): void {
    // Load reference data on init
    this.loadReferenceData();
  }

  /**
   * Load countries and cities list
   */
  loadReferenceData(): void {
    this.restaurantService.getCountries().subscribe({
      error: (error) => {
        console.error('Error loading countries:', error);
      }
    });

    this.restaurantService.getCitiesList().subscribe({
      error: (error) => {
        console.error('Error loading cities:', error);
      }
    });
  }

  /**
   * Handle country selection change
   */
  onCountryChange(selectedIds: number[]): void {
    // When countries change, reset cities that are not in selected countries
    const newCities = this.localCities().filter(cityId => {
      const city = this.allCities().find(c => c.cityId === cityId);
      return city && selectedIds.includes(city.codCountry);
    });
    this.localCities.set(newCities);
  }

  /**
   * Handle countries ngModel change
   */
  onCountriesChange(selectedIds: number[]): void {
    this.localCountries.set(selectedIds);
    this.onCountryChange(selectedIds);
  }

  /**
   * Handle cities ngModel change
   */
  onCitiesChange(selectedIds: number[]): void {
    this.localCities.set(selectedIds);
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.onApplyFilters.emit({
      countries: this.localCountries(),
      cities: this.localCities()
    });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.localCountries.set([]);
    this.localCities.set([]);
  }

  /**
   * Handle sidebar hide
   */
  handleClose(): void {
    this.onClose.emit();
  }
}
