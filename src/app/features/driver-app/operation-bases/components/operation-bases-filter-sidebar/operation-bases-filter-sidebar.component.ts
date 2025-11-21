import {
  Component,
  ChangeDetectionStrategy,
  signal,
  input,
  output,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';
import { OperationBaseService } from '../../services/operation-base.service';
import {
  Country,
  City,
  Brand,
  OperationBaseFilters,
} from '../../models/operation-base.model';

/**
 * Sidebar de filtros para bases de operaciones
 *
 * Features:
 * - Multi-select de países
 * - Multi-select de ciudades (depende de países seleccionados)
 * - Multi-select de marcas
 * - Contador de filtros activos
 * - Botones aplicar y limpiar filtros
 */
@Component({
  selector: 'app-operation-bases-filter-sidebar',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerModule,
    ButtonModule,
    MultiSelectModule,
    BadgeModule,
    SkeletonModule,
  ],
  templateUrl: './operation-bases-filter-sidebar.component.html',
  styleUrls: ['./operation-bases-filter-sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationBasesFilterSidebarComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly operationBaseService = inject(OperationBaseService);

  // Inputs
  readonly visible = input<boolean>(false);

  // Outputs
  readonly visibleChange = output<boolean>();
  readonly filtersChange = output<OperationBaseFilters>();

  // Signals
  readonly loading = signal(false);
  readonly countries = signal<Country[]>([]);
  readonly cities = signal<City[]>([]);
  readonly brands = signal<Brand[]>([]);
  readonly loadingCities = signal(false);

  // Form
  readonly filterForm = this.fb.group({
    selectedCountries: [[] as number[]],
    selectedCities: [[] as number[]],
    selectedBrands: [[] as number[]],
  });

  constructor() {
    // Escuchar cambios en países seleccionados para cargar ciudades
    this.filterForm.get('selectedCountries')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((selectedCountries) => {
        const countryIds = selectedCountries || [];
        if (countryIds.length > 0) {
          this.loadCitiesForCountries(countryIds);
        } else {
          this.cities.set([]);
          this.filterForm.patchValue({ selectedCities: [] });
        }
      });
  }

  ngOnInit(): void {
    this.loadCatalogs();
  }

  /**
   * Cargar catálogos (países y marcas)
   */
  private loadCatalogs(): void {
    this.loading.set(true);

    // Cargar países
    this.operationBaseService.getCountries().subscribe({
      next: (countries) => {
        this.countries.set(countries.filter(c => c.isActive));
      },
      error: (err) => {
        console.error('Error loading countries:', err);
      },
    });

    // Cargar marcas
    this.operationBaseService.getBrands().subscribe({
      next: (brands) => {
        this.brands.set(brands.filter(b => b.isActiveBrand));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading brands:', err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Cargar ciudades para los países seleccionados
   */
  private loadCitiesForCountries(countryIds: number[]): void {
    if (countryIds.length === 0) {
      this.cities.set([]);
      return;
    }

    this.loadingCities.set(true);

    // Cargar ciudades de todos los países seleccionados
    const cityRequests = countryIds.map(countryId =>
      this.operationBaseService.getCitiesByCountry(countryId)
    );

    // Combinar todas las ciudades en un solo array
    Promise.all(cityRequests.map(req => req.toPromise()))
      .then(citiesArrays => {
        const allCities = citiesArrays.flat().filter((city): city is City => city !== undefined);
        this.cities.set(allCities.filter(c => c.isActive));
        this.loadingCities.set(false);
      })
      .catch(err => {
        console.error('Error loading cities:', err);
        this.loadingCities.set(false);
      });
  }

  /**
   * Aplicar filtros
   */
  applyFilters(): void {
    const formValue = this.filterForm.value;

    const filters: OperationBaseFilters = {
      countryIds: formValue.selectedCountries || [],
      cityIds: formValue.selectedCities || [],
      brandIds: formValue.selectedBrands || [],
    };

    this.filtersChange.emit(filters);
    this.closeSidebar();
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.filterForm.reset({
      selectedCountries: [],
      selectedCities: [],
      selectedBrands: [],
    });

    const filters: OperationBaseFilters = {
      countryIds: [],
      cityIds: [],
      brandIds: [],
    };

    this.filtersChange.emit(filters);
    this.closeSidebar();
  }

  /**
   * Cerrar sidebar
   */
  closeSidebar(): void {
    this.visibleChange.emit(false);
  }

  /**
   * Obtener cantidad de filtros activos
   */
  get activeFiltersCount(): number {
    const formValue = this.filterForm.value;
    let count = 0;

    if (formValue.selectedCountries && formValue.selectedCountries.length > 0) {
      count += formValue.selectedCountries.length;
    }
    if (formValue.selectedCities && formValue.selectedCities.length > 0) {
      count += formValue.selectedCities.length;
    }
    if (formValue.selectedBrands && formValue.selectedBrands.length > 0) {
      count += formValue.selectedBrands.length;
    }

    return count;
  }
}
