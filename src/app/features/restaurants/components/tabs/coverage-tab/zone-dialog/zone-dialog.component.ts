import {
  Component,
  input,
  output,
  effect,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';

// Components
import { GoogleMapZoneEditorComponent, type ZoneEditorData } from '@shared/components';

import type {
  CoverageZone,
  CreateCoverageZoneRequest,
  UpdateCoverageZoneRequest
} from '../../../../models/coverage-zone.model';

@Component({
  selector: 'app-zone-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    GoogleMapZoneEditorComponent
  ],
  templateUrl: './zone-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZoneDialogComponent {
  private readonly fb = inject(FormBuilder);

  // Inputs
  readonly visible = input.required<boolean>();
  readonly mode = input.required<'create' | 'edit'>();
  readonly zone = input<CoverageZone | null>(null);
  readonly isRestaurant = input.required<boolean>();
  readonly restaurantCoords = input.required<{ lat: number; lon: number }>();

  // Outputs
  readonly onClose = output<void>();
  readonly onSave = output<CreateCoverageZoneRequest | UpdateCoverageZoneRequest>();

  // State
  readonly isSaving = signal<boolean>(false);

  // Computed: Zone data for Google Maps Editor
  readonly zoneEditorData = computed<ZoneEditorData | null>(() => {
    const formValue = this.zoneForm.value;
    const lat = formValue.zoneLat || 0;
    const lon = formValue.zoneLon || 0;
    const radius = formValue.zoneRadius || 0;

    // Only return data if we have valid coordinates
    if (lat !== 0 && lon !== 0) {
      return { lat, lon, radius };
    }
    return null;
  });

  // Form
  readonly zoneForm = this.fb.group({
    zoneName: ['', [Validators.required, Validators.minLength(3)]],
    zoneRadius: [0, [Validators.required, Validators.min(100)]],
    zoneLat: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    zoneLon: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
    zoneMinAmount: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    // Effect to load zone data when editing
    effect(() => {
      const currentZone = this.zone();
      const currentMode = this.mode();

      if (currentMode === 'edit' && currentZone) {
        this.loadZoneData(currentZone);
      } else if (currentMode === 'create') {
        this.zoneForm.reset({
          zoneName: '',
          zoneRadius: 0,
          zoneLat: 0,
          zoneLon: 0,
          zoneMinAmount: 0
        });
      }
    });
  }

  /**
   * Load zone data into form
   */
  private loadZoneData(zone: CoverageZone): void {
    this.zoneForm.patchValue({
      zoneName: zone.zoneName,
      zoneRadius: zone.zoneRadius,
      zoneLat: zone.zoneLat,
      zoneLon: zone.zoneLon,
      zoneMinAmount: zone.zoneMinAmount
    });
  }

  /**
   * Handle zone changes from Google Maps Editor
   */
  onZoneChangeFromMap(data: ZoneEditorData): void {
    this.zoneForm.patchValue({
      zoneLat: data.lat,
      zoneLon: data.lon,
      zoneRadius: Math.round(data.radius)
    }, { emitEvent: false });
  }

  /**
   * Close dialog
   */
  closeDialog(): void {
    this.zoneForm.reset();
    this.onClose.emit();
  }

  /**
   * Save zone
   */
  saveZone(): void {
    if (this.zoneForm.invalid) {
      this.zoneForm.markAllAsTouched();
      return;
    }

    const formValue = this.zoneForm.value;

    if (this.mode() === 'create') {
      const request: CreateCoverageZoneRequest = {
        isRestaurant: this.isRestaurant(),
        zoneName: formValue.zoneName!,
        minAmount: formValue.zoneMinAmount!,
        zoneRad: formValue.zoneRadius!,
        zoneLat: formValue.zoneLat!,
        zoneLon: formValue.zoneLon!
      };
      this.onSave.emit(request);
    } else {
      const request: UpdateCoverageZoneRequest = {
        isRestaurant: this.isRestaurant(),
        zoneName: formValue.zoneName!,
        minAmount: formValue.zoneMinAmount!,
        zoneRad: formValue.zoneRadius!,
        zoneLat: formValue.zoneLat!,
        zoneLon: formValue.zoneLon!
      };
      this.onSave.emit(request);
    }
  }

  /**
   * Get dialog title
   */
  getDialogTitle(): string {
    const zoneType = this.isRestaurant() ? 'Restaurante' : 'Conductor';
    return this.mode() === 'create'
      ? `Agregar Zona de ${zoneType}`
      : `Editar Zona de ${zoneType}`;
  }

  /**
   * Check if field is invalid and touched
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.zoneForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.zoneForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'Este campo es requerido';
    if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
    if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;

    return '';
  }
}
