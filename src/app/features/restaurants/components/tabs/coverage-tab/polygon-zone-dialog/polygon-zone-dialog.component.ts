import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import {
  GoogleMapPolygonEditorComponent,
  PolygonData,
} from '@shared/components';

export interface PolygonZoneData {
  zoneName: string;
  zoneMinAmount: number;
  isRestaurant: boolean;
  coordinates: Array<{ lat: number; lon: number }>;
  area?: number;
}

@Component({
  selector: 'app-polygon-zone-dialog',
  imports: [
    Dialog,
    Button,
    FloatLabel,
    InputText,
    InputNumber,
    ReactiveFormsModule,
    GoogleMapPolygonEditorComponent,
  ],
  templateUrl: './polygon-zone-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolygonZoneDialogComponent {
  private fb = new FormBuilder();

  // Inputs
  visible = input.required<boolean>();
  restaurantCoords = input.required<{ lat: number; lon: number }>();
  zoneType = input.required<'restaurant' | 'driver'>();

  // Outputs
  onClose = output<void>();
  onSave = output<PolygonZoneData>();

  // Signals
  currentPolygonData = signal<PolygonData | null>(null);
  isFormValid = signal<boolean>(false);

  // Form
  zoneForm: FormGroup;

  // Computed
  dialogHeader = computed(() => {
    const type = this.zoneType();
    return type === 'restaurant'
      ? 'Crear Zona de Cobertura con Polígono (Restaurante)'
      : 'Crear Zona de Cobertura con Polígono (Conductor)';
  });

  canSave = computed(() => {
    return this.zoneForm.valid && (this.currentPolygonData()?.coordinates.length ?? 0) >= 3;
  });

  constructor() {
    // Inicializar formulario
    this.zoneForm = this.fb.group({
      zoneName: ['', [Validators.required, Validators.minLength(3)]],
      zoneMinAmount: [0, [Validators.required, Validators.min(0)]],
    });

    // Effect para resetear el form cuando se cierra el dialog
    effect(() => {
      if (!this.visible()) {
        this.resetForm();
      }
    });

    // Effect para validar el form
    effect(() => {
      this.isFormValid.set(this.zoneForm.valid);
    });
  }

  onPolygonChange(polygonData: PolygonData): void {
    this.currentPolygonData.set(polygonData);
  }

  handleClose(): void {
    this.onClose.emit();
  }

  handleSave(): void {
    if (!this.canSave()) {
      console.warn('Form inválido o polígono incompleto');
      return;
    }

    const formValue = this.zoneForm.value;
    const polygonData = this.currentPolygonData();

    if (!polygonData) {
      console.error('No hay datos de polígono');
      return;
    }

    const zoneData: PolygonZoneData = {
      zoneName: formValue.zoneName,
      zoneMinAmount: formValue.zoneMinAmount,
      isRestaurant: this.zoneType() === 'restaurant',
      coordinates: polygonData.coordinates,
      area: polygonData.area,
    };

    // Por ahora solo mostramos en consola
    console.log('🗺️ Zona de polígono creada (DEMO):', zoneData);
    console.log('📍 Coordenadas:', zoneData.coordinates);
    console.log('📏 Área:', zoneData.area, 'km²');
    console.log('💰 Monto mínimo:', zoneData.zoneMinAmount);
    console.log('🏪 Tipo:', zoneData.isRestaurant ? 'Restaurante' : 'Conductor');

    this.onSave.emit(zoneData);
    this.handleClose();
  }

  private resetForm(): void {
    this.zoneForm.reset({
      zoneName: '',
      zoneMinAmount: 0,
    });
    this.currentPolygonData.set(null);
  }
}
