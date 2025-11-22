import { Component, ChangeDetectionStrategy, signal, inject, output, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';
import { GlobalDataService } from '@core/services/global-data.service';
import { type AssignmentFilterParams } from '../../../models';
import { type City } from '@core/models/global-data.model';

/**
 * AssignmentFilterComponent
 *
 * Sidebar component for filtering automatic assignments
 * Features:
 * - Date range filter
 * - Country multi-select
 * - City multi-select (dependent on country selection)
 * - Text search with debounce
 * - Filter validation
 */
@Component({
  selector: 'app-assignment-filter',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerModule,
    ButtonModule,
    DatePickerModule,
    MultiSelectModule,
    CheckboxModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DividerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [(visible)]="visible"
      position="right"
      styleClass="!w-full md:!w-[450px]"
      header="Filtros de Búsqueda"
    >
      <form [formGroup]="filterForm" class="w-full flex flex-col gap-4">
        <!-- Search Input -->
        <div class="flex flex-col gap-2">
          <label for="search" class="font-semibold text-gray-700">Buscar</label>
          <p-iconfield iconPosition="left">
            <p-inputicon styleClass="pi pi-search" />
            <input
              pInputText
              id="search"
              formControlName="search"
              placeholder="Buscar por driver u orden..."
              class="w-full"
            />
          </p-iconfield>
          <small class="text-gray-500"> Busca por nombre de driver o número de orden </small>
        </div>

        <p-divider />

        <!-- Date Range -->
        <div class="flex flex-col gap-2">
          <label for="dateRange" class="font-semibold text-gray-700">Rango de Fechas</label>
          <p-datePicker
            formControlName="dateRange"
            selectionMode="range"
            [showIcon]="true"
            iconDisplay="button"
            placeholder="Selecciona rango de fechas"
            dateFormat="dd/mm/yy"
            [maxDate]="maxDate"
            class="w-full "
          />
          @if (filterForm.get('dateRange')?.errors?.['invalidRange']) {
          <small class="p-error"> La fecha inicial debe ser menor a la fecha final </small>
          }
        </div>

        <p-divider />

        <!-- Country Filter -->
        <div class="flex flex-col gap-2">
          <label for="countries" class="font-semibold text-gray-700">Países</label>
          <p-multiSelect
            formControlName="countries"
            [options]="countries()"
            optionLabel="name"
            optionValue="id"
            placeholder="Selecciona países"
            [showToggleAll]="true"
            selectLabel="Seleccionar todos"
            [filter]="true"
            filterPlaceholder="Buscar país..."
            class="w-full"
          >
            <ng-template let-country pTemplate="item">
              <div class="flex items-center gap-3">
                @if (country.urlFlag) {
                <img
                  [src]="country.urlFlag"
                  [alt]="country.name"
                  class="w-6 h-4 object-cover rounded"
                />
                }
                <span>{{ country.name }}</span>
              </div>
            </ng-template>
          </p-multiSelect>
        </div>

        <!-- Enable City Filter Checkbox -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center">
            <p-checkbox
              formControlName="enableCityFilter"
              [binary]="true"
              inputId="enableCityFilter"
            />
            <label for="enableCityFilter" class="ml-2 cursor-pointer"> Especificar ciudades </label>
          </div>
        </div>

        <!-- City Filter (conditional) -->
        @if (filterForm.get('enableCityFilter')?.value) {
        <div class="flex flex-col gap-2">
          <label for="cities" class="font-semibold text-gray-700">Ciudades</label>
          <p-multiSelect
            formControlName="cities"
            [options]="availableCities()"
            optionLabel="name"
            optionValue="id"
            placeholder="Selecciona ciudades"
            [showToggleAll]="true"
            selectLabel="Seleccionar todas"
            [filter]="true"
            filterPlaceholder="Buscar ciudad..."
            [disabled]="availableCities().length === 0"
            class="w-full"
          >
            <ng-template let-city pTemplate="item">
              <div class="flex items-center gap-3">
                @if (city.countryUrlFlag) {
                <img
                  [src]="city.countryUrlFlag"
                  [alt]="city.countryName"
                  class="w-6 h-4 object-cover rounded"
                />
                }
                <div class="flex flex-col">
                  <div>{{ city.name }}</div>
                  <small class="text-gray-500">{{ city.countryName }}</small>
                </div>
              </div>
            </ng-template>
          </p-multiSelect>
          @if (availableCities().length === 0) {
          <small class="text-gray-500"> Selecciona al menos un país para filtrar ciudades </small>
          }
        </div>
        }

        <!-- Action Buttons -->
        <div class="mt-4 pt-4 border-t border-gray-200 w-full flex justify-between">
          <p-button
            label="Limpiar"
            severity="secondary"
            [outlined]="true"
            (onClick)="clearFilters()"
          />
          <p-button
            label="Aplicar Filtros"
            severity="primary"
            (onClick)="applyFilters()"
            [disabled]="!filterForm.valid"
          />
        </div>
      </form>
    </p-drawer>
  `,
})
export class AssignmentFilterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly globalData = inject(GlobalDataService);

  // State
  readonly visible = signal(false);
  readonly availableCities = signal<City[]>([]);

  // Access global data via signals
  readonly countries = computed(() => this.globalData.countries().filter(c => c.isActive));
  readonly cities = computed(() => this.globalData.cities().filter(c => c.isActive));

  // Max date for date picker (today)
  readonly maxDate = new Date();

  // Outputs
  readonly onFilter = output<AssignmentFilterParams>();
  readonly onSearch = output<string>();
  readonly onClear = output<void>();

  // Form
  filterForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize filter form
   */
  private initializeForm(): void {
    this.filterForm = this.fb.group({
      search: [''],
      dateRange: [null],
      countries: [[]],
      cities: [[]],
      enableCityFilter: [false],
    });

    // Watch for country changes to update available cities
    this.filterForm.get('countries')?.valueChanges.subscribe((selectedCountries) => {
      this.updateAvailableCities(selectedCountries || []);
      // Clear cities when countries change
      if (this.filterForm.get('enableCityFilter')?.value) {
        this.filterForm.patchValue({ cities: [] }, { emitEvent: false });
      }
    });

    // Disable cities when checkbox is unchecked
    this.filterForm.get('enableCityFilter')?.valueChanges.subscribe((enabled) => {
      if (!enabled) {
        this.filterForm.patchValue({ cities: [] }, { emitEvent: false });
      }
    });
  }


  /**
   * Update available cities based on selected countries
   */
  private updateAvailableCities(selectedCountryIds: number[]): void {
    if (selectedCountryIds.length === 0) {
      this.availableCities.set([]);
      return;
    }

    const filtered = this.cities().filter((city) => selectedCountryIds.includes(city.countryCode));
    this.availableCities.set(filtered);
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    if (!this.filterForm.valid) {
      return;
    }

    const formValue = this.filterForm.value;
    const searchText = formValue.search?.trim();

    // If search text exists, emit search event
    if (searchText) {
      this.onSearch.emit(searchText);
      return;
    }

    // Otherwise, emit filter params
    const filterParams: AssignmentFilterParams = {
      pageNumber: 1,
      pageSize: 10,
    };

    if (formValue.countries?.length > 0) {
      filterParams.countries = formValue.countries;
    }

    if (formValue.enableCityFilter && formValue.cities?.length > 0) {
      filterParams.cities = formValue.cities;
    }

    if (formValue.dateRange?.[0]) {
      filterParams.dateFrom = this.formatDate(formValue.dateRange[0]);
    }

    if (formValue.dateRange?.[1]) {
      filterParams.dateTo = this.formatDate(formValue.dateRange[1]);
    }

    this.onFilter.emit(filterParams);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      dateRange: null,
      countries: [],
      cities: [],
      enableCityFilter: false,
    });
    this.onClear.emit();
  }

  /**
   * Format date to ISO string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Show/hide drawer
   */
  show(): void {
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }
}
