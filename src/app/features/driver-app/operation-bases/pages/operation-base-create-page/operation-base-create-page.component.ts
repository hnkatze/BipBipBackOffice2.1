import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  viewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { FieldsetModule } from 'primeng/fieldset';
import { ChipModule } from 'primeng/chip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Shared Components
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';

// Feature Components
import { RestaurantSelectorModalComponent } from '../../components/restaurant-selector-modal/restaurant-selector-modal.component';
import { DriverSelectorModalComponent } from '../../components/driver-selector-modal/driver-selector-modal.component';

// Models and Services
import { OperationBaseService } from '../../services/operation-base.service';
import {
  Country,
  City,
  RestaurantForBase,
  DriverUnassigned,
  BoxDetails,
} from '../../models/operation-base.model';

/**
 * Página para crear una nueva base de operaciones
 *
 * Features:
 * - Form con 3 secciones colapsables (Location, Drivers, Boxes)
 * - Modals para selección de restaurante y drivers
 * - Validación en tiempo real
 * - Chips para visualizar selecciones
 */
@Component({
  selector: 'app-operation-base-create-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    FieldsetModule,
    ChipModule,
    ToastModule,
    BreadcrumbComponent,
    RestaurantSelectorModalComponent,
    DriverSelectorModalComponent,
  ],
  templateUrl: './operation-base-create-page.component.html',
  styleUrls: ['./operation-base-create-page.component.scss'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationBaseCreatePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly operationBaseService = inject(OperationBaseService);
  private readonly messageService = inject(MessageService);

  // ViewChilds para modals
  readonly restaurantModal = viewChild.required(RestaurantSelectorModalComponent);
  readonly driverModal = viewChild.required(DriverSelectorModalComponent);

  // ============================================================================
  // SIGNALS
  // ============================================================================

  /** Loading states */
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingCities = signal(false);

  /** Catálogos */
  readonly countries = signal<Country[]>([]);
  readonly cities = signal<City[]>([]);

  /** Selecciones */
  readonly selectedRestaurant = signal<RestaurantForBase | null>(null);
  readonly selectedDrivers = signal<DriverUnassigned[]>([]);

  /** Ciudad seleccionada (signal reactivo) */
  readonly selectedCityId = signal<number | null>(null);

  /** Breadcrumb */
  readonly breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Bases de Operaciones', link: '/driver-app/operation-bases' },
    { label: 'Crear Base', link: '' },
  ]);

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Puede seleccionar restaurante */
  readonly canSelectRestaurant = computed(() => this.selectedCityId() !== null);

  /** Puede seleccionar drivers */
  readonly canSelectDrivers = computed(() => this.selectedCityId() !== null);

  /** Cantidad de drivers seleccionados */
  readonly driversCount = computed(() => this.selectedDrivers().length);

  /** Error si headquarterSize <= driversCount */
  readonly headquarterSizeError = computed(() => {
    const size = this.baseForm.value.headquarterSize;
    const count = this.driversCount();
    return size !== null && size !== undefined && size <= count;
  });

  /** Form es válido para guardar */
  readonly canSave = computed(() => {
    // Forzar que el computed reaccione al estado del form
    const status = this.formStatus();
    const formValid = status === 'VALID';
    const hasRestaurant = this.selectedRestaurant() !== null;
    const hasDrivers = this.selectedDrivers().length > 0;
    const noSizeError = !this.headquarterSizeError();

    console.log('[CREATE PAGE] canSave check:', {
      formStatus: status,
      formValid,
      hasRestaurant,
      hasDrivers,
      noSizeError,
      formErrors: this.baseForm.errors,
      formValue: this.baseForm.value
    });

    return formValid && hasRestaurant && hasDrivers && noSizeError;
  });

  // ============================================================================
  // FORM
  // ============================================================================

  readonly baseForm = this.fb.group({
    // Ubicación
    countryId: [null as number | null, [Validators.required]],
    cityId: [null as number | null, [Validators.required]],

    // Boxes
    numberBoxBegin: ['', [Validators.required]],
    numberBoxEnd: ['', [Validators.required]],
    numberCurrent: ['', [Validators.required]],
    headquarterSize: [null as number | null, [Validators.required, Validators.min(1)]],

    // Contacto
    contactName: ['', [Validators.required]],
    contactNumber: ['', [Validators.required]],
  });

  // Convertir el estado del form a signal reactivo
  readonly formStatus = toSignal(this.baseForm.statusChanges, {
    initialValue: this.baseForm.status
  });

  ngOnInit(): void {
    this.loadCatalogs();
    this.setupFormListeners();
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar catálogos iniciales (países)
   */
  private loadCatalogs(): void {
    this.loading.set(true);

    this.operationBaseService.getCountries().subscribe({
      next: (countries) => {
        this.countries.set(countries.filter((c) => c.isActive));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading countries:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los países',
        });
        this.loading.set(false);
      },
    });
  }

  /**
   * Cargar ciudades cuando cambia el país
   */
  private loadCities(countryId: number): void {
    this.loadingCities.set(true);

    this.operationBaseService.getCitiesByCountry(countryId).subscribe({
      next: (cities) => {
        this.cities.set(cities.filter((c) => c.isActive));
        this.loadingCities.set(false);
      },
      error: (err) => {
        console.error('Error loading cities:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las ciudades',
        });
        this.loadingCities.set(false);
      },
    });
  }

  /**
   * Setup listeners del form
   */
  private setupFormListeners(): void {
    // Cuando cambia el país, cargar ciudades y limpiar selecciones
    this.baseForm.get('countryId')?.valueChanges.subscribe((countryId) => {
      if (countryId) {
        this.loadCities(countryId);
        // Limpiar ciudad, restaurante y drivers
        this.baseForm.patchValue({ cityId: null });
        this.selectedRestaurant.set(null);
        this.selectedDrivers.set([]);
      } else {
        this.cities.set([]);
      }
    });

    // Cuando cambia la ciudad, actualizar signal y limpiar restaurante y drivers
    this.baseForm.get('cityId')?.valueChanges.subscribe((cityId) => {
      this.selectedCityId.set(cityId); // Actualizar el signal reactivo
      if (cityId) {
        this.selectedRestaurant.set(null);
        this.selectedDrivers.set([]);
      }
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Abrir modal de selección de restaurante
   */
  openRestaurantSelector(): void {
    const cityId = this.selectedCityId();

    if (!cityId) {
      return;
    }

    const modal = this.restaurantModal();
    modal.open(cityId);
  }

  /**
   * Manejar selección de restaurante desde modal
   */
  onRestaurantSelected(restaurant: RestaurantForBase): void {
    this.selectedRestaurant.set(restaurant);
  }

  /**
   * Remover restaurante seleccionado
   */
  removeRestaurant(): void {
    this.selectedRestaurant.set(null);
  }

  /**
   * Abrir modal de selección de drivers
   */
  openDriverSelector(): void {
    const cityId = this.selectedCityId();

    if (!cityId) {
      return;
    }

    const modal = this.driverModal();
    modal.open(cityId, this.selectedDrivers());
  }

  /**
   * Manejar selección de drivers desde modal
   */
  onDriversSelected(drivers: DriverUnassigned[]): void {
    this.selectedDrivers.set(drivers);
  }

  /**
   * Remover un driver de la selección
   */
  removeDriver(driverId: number): void {
    const current = this.selectedDrivers();
    this.selectedDrivers.set(current.filter((d) => d.driverId !== driverId));
  }

  /**
   * Guardar base de operaciones
   */
  save(): void {
    if (!this.canSave()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    const restaurant = this.selectedRestaurant();
    const drivers = this.selectedDrivers();
    const formValue = this.baseForm.value;

    if (!restaurant) return;

    const payload: BoxDetails = {
      size: formValue.headquarterSize!,
      numbBoxBegin: formValue.numberBoxBegin!,
      numbBoxEnd: formValue.numberBoxEnd!,
      numbCurrent: formValue.numberCurrent!,
      status: true, // Siempre activo al crear
      contactName: formValue.contactName!,
      contactNumb: formValue.contactNumber!,
      storeId: restaurant.restId,
      drivers: drivers.map((d) => d.driverId),
    };

    this.saving.set(true);

    this.operationBaseService.createOperationBase(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Base de operaciones creada correctamente',
        });

        // Navegar a la lista
        setTimeout(() => {
          this.router.navigate(['/driver-app/operation-bases']);
        }, 1500);
      },
      error: (err) => {
        console.error('Error creating operation base:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear la base de operaciones',
        });
        this.saving.set(false);
      },
    });
  }

  /**
   * Cancelar y volver a la lista
   */
  cancel(): void {
    this.router.navigate(['/driver-app/operation-bases']);
  }
}
