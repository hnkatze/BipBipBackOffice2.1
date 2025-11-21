import { Component, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services & Models
import { PromotionalDiscountService } from '../../services/promotional-discount.service';
import {
  CreatePromotionalDiscount,
  UpdatePromotionalDiscount,
  PromotionalDiscountResponse,
  DiscountType,
  DISCOUNT_TYPE_OPTIONS
} from '../../models/promotional-discount.model';
import { GlobalDataService } from '@core/services/global-data.service';

@Component({
  selector: 'app-promotional-discount-form-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    ToggleSwitchModule,
    MultiSelectModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './promotional-discount-form-page.component.html',
  styleUrl: './promotional-discount-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromotionalDiscountFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly promotionalDiscountService = inject(PromotionalDiscountService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly discountId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.discountId() !== null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly selectedDiscountType = signal<DiscountType>(DiscountType.FixedDiscount);

  // Data global
  readonly brands = this.globalDataService.brands;
  readonly channels = this.globalDataService.channels;
  readonly cities = this.globalDataService.cities;

  // ============================================================================
  // FORM
  // ============================================================================

  form!: FormGroup;

  // Opciones para selects
  readonly discountTypeOptions = DISCOUNT_TYPE_OPTIONS;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Editar Descuento Promocional' : 'Nuevo Descuento Promocional'
  );

  readonly submitButtonLabel = computed(() =>
    this.isEditMode() ? 'Guardar Cambios' : 'Crear Descuento Promocional'
  );

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
    const type = this.selectedDiscountType();
    return type === DiscountType.FixedDiscount || type === DiscountType.PercentageDiscount;
  });

  readonly showDeliveryCost = computed(() =>
    this.selectedDiscountType() === DiscountType.DeliveryCost
  );

  readonly isPercentage = computed(() =>
    this.selectedDiscountType() === DiscountType.PercentageDiscount
  );

  readonly isFixedDiscount = computed(() =>
    this.selectedDiscountType() === DiscountType.FixedDiscount
  );

  readonly isDeliveryCost = computed(() =>
    this.selectedDiscountType() === DiscountType.DeliveryCost
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
    this.checkEditMode();
  }

  // ============================================================================
  // MÉTODOS - Edit Mode Check
  // ============================================================================

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.discountId.set(+id);
      this.loadDiscount(+id);
    }
  }

  // ============================================================================
  // MÉTODOS - Form Initialization
  // ============================================================================

  initForm(): void {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.form = this.fb.group({
      type: [5], // Promotional Discount type
      discountType: [DiscountType.FixedDiscount, Validators.required],
      discountValue: [0, [Validators.min(0)]],
      deliveryCost: [0, [Validators.min(0)]],
      startDate: [today, Validators.required],
      endDate: [tomorrow, Validators.required],
      availableBrands: [[], Validators.required],
      availableChannels: [[], Validators.required],
      availableCities: [[], Validators.required],
      isActive: [false]
    });

    // Configurar validador de end date
    const endDateControl = this.form.get('endDate');
    endDateControl?.setValidators([
      Validators.required,
      this.endDateValidator.bind(this)
    ]);

    // Suscribirse a cambios de discountType
    this.form.get('discountType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.selectedDiscountType.set(type);
        this.updateTypeValidations(type);
      });

    // Inicializar validaciones para tipo por defecto
    this.updateTypeValidations(DiscountType.FixedDiscount);
  }

  // ============================================================================
  // MÉTODOS - Load Data
  // ============================================================================

  private loadDiscount(id: number): void {
    this.isLoading.set(true);

    this.promotionalDiscountService.getPromotionalDiscountById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (discount) => {
          this.populateForm(discount);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading promotional discount:', error);
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el descuento promocional'
          });
          this.router.navigate(['/notification-managements/in-app-promotions']);
        }
      });
  }

  private populateForm(discount: PromotionalDiscountResponse): void {
    // Convertir discountValue de backend a frontend
    let displayDiscountValue = 0;
    if (discount.discountType === DiscountType.PercentageDiscount) {
      // Backend: 0.15 → Frontend: 15
      displayDiscountValue = discount.discountValue * 100;
    } else {
      // Backend: 50 → Frontend: 50
      displayDiscountValue = discount.discountValue;
    }

    this.form.patchValue({
      discountType: discount.discountType,
      discountValue: displayDiscountValue,
      deliveryCost: discount.deliveryCost,
      startDate: discount.startDate ? new Date(discount.startDate) : new Date(),
      endDate: discount.endDate ? new Date(discount.endDate) : new Date(),
      availableBrands: discount.availableBrands || [],
      availableChannels: discount.availableChannels || [],
      availableCities: discount.availableCities || [],
      isActive: discount.isActive
    });

    // Actualizar tipo seleccionado
    this.selectedDiscountType.set(discount.discountType);

    // Actualizar validaciones después de poblar
    this.updateTypeValidations(discount.discountType);
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

  private updateTypeValidations(type: DiscountType): void {
    const discountValueControl = this.form.get('discountValue');
    const deliveryCostControl = this.form.get('deliveryCost');

    // Limpiar validadores primero
    discountValueControl?.clearValidators();
    deliveryCostControl?.clearValidators();

    if (type === DiscountType.DeliveryCost) {
      // Para DeliveryCost: deliveryCost es requerido, discountValue no
      deliveryCostControl?.setValidators([Validators.required, Validators.min(0)]);
      discountValueControl?.setValidators([Validators.min(0)]);
      // Setear discountValue a 0
      discountValueControl?.setValue(0);
    } else {
      // Para FixedDiscount y PercentageDiscount: discountValue es requerido, deliveryCost no
      discountValueControl?.setValidators([Validators.required, Validators.min(0)]);
      deliveryCostControl?.setValidators([Validators.min(0)]);
      // Setear deliveryCost a 0
      deliveryCostControl?.setValue(0);

      // Para porcentaje, agregar validación de máximo 100
      if (type === DiscountType.PercentageDiscount) {
        discountValueControl?.addValidators(Validators.max(100));
      }
    }

    discountValueControl?.updateValueAndValidity();
    deliveryCostControl?.updateValueAndValidity();
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
    if (control.hasError('min')) {
      const min = control.errors['min'].min;
      return `Valor mínimo: ${min}`;
    }
    if (control.hasError('max')) {
      const max = control.errors['max'].max;
      return `Valor máximo: ${max}`;
    }
    if (control.hasError('endDateInvalid')) {
      return 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    return 'Campo inválido';
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

    this.isSaving.set(true);

    if (this.isEditMode()) {
      this.updateDiscount();
    } else {
      this.createDiscount();
    }
  }

  private createDiscount(): void {
    const formData: CreatePromotionalDiscount = {
      type: 5, // Promotional Discount
      discountType: this.form.value.discountType,
      discountValue: this.convertDiscountValue(),
      deliveryCost: this.form.value.discountType === DiscountType.DeliveryCost
        ? this.form.value.deliveryCost
        : 0,
      startDate: this.formatDateToISO(this.form.value.startDate),
      endDate: this.formatDateToISO(this.form.value.endDate),
      availableBrands: this.form.value.availableBrands,
      availableChannels: this.form.value.availableChannels,
      availableCities: this.form.value.availableCities,
      isActive: false // SIEMPRE se crea desactivado
    };

    this.promotionalDiscountService.createPromotionalDiscount(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Descuento promocional creado correctamente'
          });
          // Mensaje informativo sobre estado desactivado
          setTimeout(() => {
            this.messageService.add({
              severity: 'info',
              summary: 'Información',
              detail: 'El descuento se ha creado en estado desactivado. Para activarlo, dirígete a la tabla y cambia su estado manualmente.'
            });
          }, 500);
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 2500);
        },
        error: (error) => {
          console.error('Error creating promotional discount:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear el descuento promocional'
          });
        }
      });
  }

  private updateDiscount(): void {
    const id = this.discountId();
    if (!id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de descuento promocional no válido'
      });
      return;
    }

    const formData: UpdatePromotionalDiscount = {
      type: 5, // Promotional Discount
      discountType: this.form.value.discountType,
      discountValue: this.convertDiscountValue(),
      deliveryCost: this.form.value.discountType === DiscountType.DeliveryCost
        ? this.form.value.deliveryCost
        : 0,
      startDate: this.formatDateToISO(this.form.value.startDate),
      endDate: this.formatDateToISO(this.form.value.endDate),
      availableBrands: this.form.value.availableBrands,
      availableChannels: this.form.value.availableChannels,
      availableCities: this.form.value.availableCities,
      isActive: this.form.value.isActive
    };

    this.promotionalDiscountService.updatePromotionalDiscount(id, formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Descuento promocional actualizado correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error updating promotional discount:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el descuento promocional'
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
   * - PercentageDiscount: divide por 100 (15 → 0.15)
   * - FixedDiscount: deja el valor tal cual
   * - DeliveryCost: retorna 0
   */
  private convertDiscountValue(): number {
    const type = this.form.value.discountType;
    const value = this.form.value.discountValue;

    if (type === DiscountType.PercentageDiscount) {
      return value / 100; // 15 → 0.15
    }
    if (type === DiscountType.FixedDiscount) {
      return value;
    }
    return 0; // DeliveryCost
  }

  /**
   * Formatea fecha al formato ISO
   */
  private formatDateToISO(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString();
    }
    return new Date(date).toISOString();
  }
}
