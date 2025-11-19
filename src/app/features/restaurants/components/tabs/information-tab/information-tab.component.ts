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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { RestaurantService } from '../../../services/restaurant.service';
import type {
  CreateRestaurantRequest,
  UpdateRestaurantRequest
} from '../../../models/restaurant.model';
import { GoogleMapComponent, type Coordinates } from '@shared/components';

@Component({
  selector: 'app-information-tab',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    CheckboxModule,
    MessageModule,
    GoogleMapComponent
  ],
  templateUrl: './information-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InformationTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly restaurantService = inject(RestaurantService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Inputs
  readonly restaurantId = input<number | null>(null);
  readonly mode = input<'create' | 'edit' | 'view'>('view');

  // Outputs
  readonly onSave = output<number>();
  readonly onError = output<string>();

  // Local state
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly showPin = signal<boolean>(false);

  // Reference data from service
  readonly countries = this.restaurantService.countries;
  readonly allCities = this.restaurantService.cities;
  readonly brands = this.restaurantService.brands;

  // Filtered cities based on selected country
  readonly availableCities = computed(() => {
    const selectedCountryId = this.form?.get('restCountryId')?.value;
    if (!selectedCountryId) {
      return [];
    }
    return this.allCities().filter(city => city.codCountry === selectedCountryId);
  });

  // Form
  form!: FormGroup;

  constructor() {
    // Effect to load restaurant data when ID changes
    effect(() => {
      const id = this.restaurantId();
      if (id) {
        this.loadRestaurantData(id);
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.loadReferenceData();
  }

  /**
   * Initialize form with all 13 fields
   */
  private initForm(): void {
    this.form = this.fb.group({
      restName: ['', [Validators.required, Validators.minLength(3)]],
      restCountryId: [null, [Validators.required]],
      restCityId: [null, [Validators.required]],
      restBrandId: [null, [Validators.required]],
      restCodPostGC: [''], // Opcional
      restShortName: ['', [Validators.maxLength(50)]], // Opcional
      isHeadquarter: [false],
      restAddress: ['', [Validators.required]],
      accessPIN: ['', [Validators.required, Validators.minLength(4)]],
      link: [''],
      restLat: [0],
      restLon: [0],
      restStatus: [true],
      restUrllogo: ['']
    });

    // If view mode, disable form
    if (this.mode() === 'view') {
      this.form.disable();
    }

    // Subscribe to country changes to reset city when country changes
    this.form.get('restCountryId')?.valueChanges.subscribe(() => {
      this.form.patchValue({ restCityId: null });
    });
  }

  /**
   * Load all reference data
   */
  private loadReferenceData(): void {
    this.restaurantService.getCountries().subscribe();
    this.restaurantService.getCitiesList().subscribe();
    this.restaurantService.getBrands().subscribe();
  }

  /**
   * Load restaurant data for edit/view mode
   */
  private loadRestaurantData(id: number): void {
    this.isLoading.set(true);
    this.restaurantService.getRestaurantDetail(id).subscribe({
      next: (detail) => {
        this.form.patchValue({
          restName: detail.restName,
          restCountryId: detail.restCountryId,
          restCityId: detail.restCityId,
          restBrandId: detail.restBrandId,
          restCodPostGC: detail.restCodPostGC,
          restShortName: detail.restShortName,
          isHeadquarter: detail.isHeadquarter,
          restAddress: detail.restAddress,
          accessPIN: detail.accessPIN,
          link: detail.link,
          restLat: detail.restLat,
          restLon: detail.restLon,
          restStatus: detail.restStatus,
          restUrllogo: detail.restUrllogo
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading restaurant data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la información del restaurante'
        });
        this.isLoading.set(false);
        this.onError.emit('Error loading restaurant data');
      }
    });
  }

  /**
   * Save restaurant (CREATE or UPDATE)
   */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario Incompleto',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.isSaving.set(true);
    const formValue = this.form.getRawValue();

    if (this.mode() === 'create') {
      this.createRestaurant(formValue);
    } else {
      this.updateRestaurant(formValue);
    }
  }

  /**
   * Create new restaurant
   */
  private createRestaurant(data: CreateRestaurantRequest): void {
    this.restaurantService.createRestaurant(data).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Restaurante creado correctamente'
        });

        // Emit the new restaurant ID
        const newId = response.restId || response.id || response.data?.restId;
        if (newId) {
          this.onSave.emit(newId);
        }
      },
      error: (error) => {
        console.error('Error creating restaurant:', error);
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo crear el restaurante'
        });
        this.onError.emit('Error creating restaurant');
      }
    });
  }

  /**
   * Update existing restaurant
   */
  private updateRestaurant(data: UpdateRestaurantRequest): void {
    const id = this.restaurantId();
    if (!id) {
      return;
    }

    this.restaurantService.updateRestaurant(id, data).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Restaurante actualizado correctamente'
        });
        this.onSave.emit(id);
      },
      error: (error) => {
        console.error('Error updating restaurant:', error);
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo actualizar el restaurante'
        });
        this.onError.emit('Error updating restaurant');
      }
    });
  }

  /**
   * Cancel and go back to list
   */
  cancel(): void {
    this.router.navigate(['/restaurants/restaurant']);
  }

  /**
   * Toggle PIN visibility
   */
  togglePinVisibility(): void {
    this.showPin.update(value => !value);
  }

  /**
   * Set location from map
   */
  onMapLocationSelected(coords: Coordinates): void {
    this.form.patchValue({
      restLat: coords.lat,
      restLon: coords.lng
    });
  }

  /**
   * Get initial coordinates for the map (when editing)
   */
  getInitialCoordinates(): Coordinates | undefined {
    const lat = this.form.get('restLat')?.value;
    const lon = this.form.get('restLon')?.value;

    if (lat && lon && lat !== 0 && lon !== 0) {
      return { lat, lng: lon };
    }

    return undefined;
  }
}
