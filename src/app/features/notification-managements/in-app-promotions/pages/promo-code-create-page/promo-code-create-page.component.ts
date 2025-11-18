import { Component, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';

// Services & Models
import { PromoCodeService } from '../../services/promo-code.service';
import { CreatePromoCode, PromoCodeType, PROMO_CODE_TYPE_OPTIONS, PromoCodeItem } from '../../models/promo-code.model';
import { GlobalDataService } from '@core/services/global-data.service';

@Component({
  selector: 'app-promo-code-create-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    ToggleSwitchModule,
    MultiSelectModule,
    ToastModule,
    TableModule
  ],
  providers: [MessageService],
  templateUrl: './promo-code-create-page.component.html',
  styleUrl: './promo-code-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoCodeCreatePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly isSaving = signal<boolean>(false);
  readonly selectedType = signal<PromoCodeType>(PromoCodeType.Percentage);
  readonly selectedProducts = signal<PromoCodeItem[]>([]);

  // Data global
  readonly brands = this.globalDataService.brands;
  readonly channels = this.globalDataService.channels;
  readonly cities = this.globalDataService.cities;

  // ============================================================================
  // FORM
  // ============================================================================

  form!: FormGroup;

  // Opciones para selects
  readonly promoCodeTypeOptions = PROMO_CODE_TYPE_OPTIONS;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly brandsOptions = computed(() =>
    this.brands().map(brand => ({
      id: brand.id,
      name: brand.name
    }))
  );

  readonly channelsOptions = computed(() =>
    this.channels().map(channel => ({
      id: channel.id,
      description: channel.description
    }))
  );

  readonly citiesOptions = computed(() =>
    this.cities().map(city => ({
      id: city.id,
      name: city.name
    }))
  );

  // Mostrar/ocultar campos según tipo
  readonly showDiscountValue = computed(() => {
    const type = this.selectedType();
    return type === PromoCodeType.Percentage || type === PromoCodeType.FixedDiscount;
  });

  readonly showProductSelection = computed(() =>
    this.selectedType() === PromoCodeType.Product
  );

  readonly isPercentage = computed(() =>
    this.selectedType() === PromoCodeType.Percentage
  );

  readonly isFixedDiscount = computed(() =>
    this.selectedType() === PromoCodeType.FixedDiscount
  );

  readonly isFreeShipping = computed(() =>
    this.selectedType() === PromoCodeType.FreeShipping
  );

  readonly isProduct = computed(() =>
    this.selectedType() === PromoCodeType.Product
  );

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor() {
    // Cargar data global si no está cargada
    effect(() => {
      if (this.brands().length === 0) {
        this.globalDataService.forceRefresh('brands');
      }
      if (this.channels().length === 0) {
        this.globalDataService.forceRefresh('channels');
      }
      if (this.cities().length === 0) {
        this.globalDataService.forceRefresh('cities');
      }
    });
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    this.initForm();
  }

  // ============================================================================
  // MÉTODOS - Form Initialization
  // ============================================================================

  initForm(): void {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      code: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      startDate: [today, Validators.required],
      endDate: [tomorrow, Validators.required],
      minimumAmount: [0, [Validators.required, Validators.min(0)]],
      type: [PromoCodeType.Percentage, Validators.required],
      discountValue: [0],
      requireTurnOn: [false],
      availableBrands: [[], Validators.required],
      availableChannels: [[]],
      availableCities: [[]],
      availableStores: [[]]
    });

    // Configurar validador de end date
    const endDateControl = this.form.get('endDate');
    endDateControl?.setValidators([
      Validators.required,
      this.endDateValidator.bind(this)
    ]);

    // Suscribirse a cambios de type
    this.form.get('type')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.selectedType.set(type);
        this.updateTypeValidations(type);
      });

    // Inicializar validaciones para tipo por defecto
    this.updateTypeValidations(PromoCodeType.Percentage);
  }

  // ============================================================================
  // MÉTODOS - Validaciones y Lógica Condicional
  // ============================================================================

  private endDateValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = this.form?.get('startDate')?.value;
    const endDate = control.value;

    if (startDate && endDate) {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);

      if (end <= start) {
        return { endDateInvalid: true };
      }
    }
    return null;
  }

  private discountValueValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    const type = this.form?.get('type')?.value;
    const minimumAmount = this.form?.get('minimumAmount')?.value || 0;

    if (type === PromoCodeType.Percentage) {
      // Para porcentaje: debe estar entre 1 y 100
      if (value < 1 || value > 100) {
        return { percentageRange: true };
      }
    }

    if (type === PromoCodeType.FixedDiscount) {
      // Para descuento fijo: debe ser mayor a 0 y menor que minimumAmount
      if (value <= 0) {
        return { fixedDiscountMin: true };
      }
      if (minimumAmount > 0 && value >= minimumAmount) {
        return { fixedDiscountExceedsMinimum: true };
      }
    }

    return null;
  }

  private updateTypeValidations(type: PromoCodeType): void {
    const discountValueControl = this.form.get('discountValue');

    // Limpiar validadores primero
    discountValueControl?.clearValidators();

    // Agregar validadores según el tipo
    if (type === PromoCodeType.Percentage || type === PromoCodeType.FixedDiscount) {
      discountValueControl?.setValidators([
        Validators.required,
        Validators.min(0.01),
        this.discountValueValidator.bind(this)
      ]);
    }

    discountValueControl?.updateValueAndValidity();
  }

  // ============================================================================
  // MÉTODOS - Form Helpers
  // ============================================================================

  hasError(field: string): boolean {
    const control = this.form.get(field);
    return control?.invalid && (control?.dirty || control?.touched) || false;
  }

  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    if (!control?.errors) return '';

    if (control.hasError('required')) return 'Campo requerido';
    if (control.hasError('minlength')) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Mínimo ${minLength} caracteres`;
    }
    if (control.hasError('min')) {
      const min = control.errors['min'].min;
      return `Valor mínimo: ${min}`;
    }
    if (control.hasError('endDateInvalid')) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio';
    }
    if (control.hasError('percentageRange')) {
      return 'El porcentaje debe estar entre 1 y 100';
    }
    if (control.hasError('fixedDiscountMin')) {
      return 'El descuento debe ser mayor a 0';
    }
    if (control.hasError('fixedDiscountExceedsMinimum')) {
      return 'El descuento debe ser menor que el monto mínimo';
    }

    return 'Campo inválido';
  }

  // ============================================================================
  // MÉTODOS - Product Selection
  // ============================================================================

  onOpenProductSelector(): void {
    // TODO: Abrir modal de selección de productos
    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Modal de productos en desarrollo'
    });
  }

  onRemoveProduct(index: number): void {
    const products = [...this.selectedProducts()];
    products.splice(index, 1);
    this.selectedProducts.set(products);
  }

  // ============================================================================
  // MÉTODOS - Submit y Navegación
  // ============================================================================

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    // Validar productos si es tipo Product
    if (this.selectedType() === PromoCodeType.Product && this.selectedProducts().length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Debe seleccionar al menos un producto'
      });
      return;
    }

    this.isSaving.set(true);

    const formData: CreatePromoCode = {
      name: this.form.value.name,
      code: this.form.value.code.toUpperCase(), // Convertir a mayúsculas
      description: this.form.value.description,
      startDate: this.formatDateToBackend(this.form.value.startDate),
      endDate: this.formatDateToBackend(this.form.value.endDate),
      minimumAmount: this.form.value.minimumAmount,
      type: this.form.value.type,
      bankId: null,
      fundingTypeId: null,
      segmentId: null,
      discountValue: this.convertDiscountValue(),
      requireTurnOn: this.form.value.requireTurnOn,
      availableBrands: this.form.value.availableBrands,
      availableChannels: this.form.value.availableChannels || [],
      availableCities: this.form.value.availableCities || [],
      availableStores: this.form.value.availableStores?.length > 0 ? this.form.value.availableStores : null,
      items: this.selectedType() === PromoCodeType.Product ? this.selectedProducts() : []
    };

    this.promoCodeService.createPromoCode(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Código promocional creado correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error creating promo code:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el código promocional'
          });
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/notification-managements/in-app-promotions']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Convierte el discountValue según el tipo:
   * - Percentage: divide por 100 (15 → 0.15)
   * - FixedDiscount: deja el valor tal cual
   * - FreeShipping y Product: retorna null
   */
  private convertDiscountValue(): number | null {
    const type = this.form.value.type;
    const value = this.form.value.discountValue;

    if (type === PromoCodeType.Percentage) {
      return value / 100; // 15 → 0.15
    }
    if (type === PromoCodeType.FixedDiscount) {
      return value;
    }
    return null; // FreeShipping y Product
  }

  /**
   * Formatea fecha al formato del backend: "YYYY-MM-DDTHH:mm:ss" (sin Z)
   */
  private formatDateToBackend(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }
}
