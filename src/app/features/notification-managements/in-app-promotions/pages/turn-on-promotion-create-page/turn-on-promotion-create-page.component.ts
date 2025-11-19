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
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services & Models
import { TurnOnPromotionService } from '../../services/turn-on-promotion.service';
import {
  CreateTurnOnPromotion,
  TurnOnDiscountType,
  TURN_ON_DISCOUNT_TYPE_OPTIONS,
  TurnOnCampaignType,
  TargetAudienceSummary
} from '../../models';
import { GlobalDataService } from '@core/services/global-data.service';
import { forkJoin } from 'rxjs';

/**
 * Modo de promoción Turn On
 */
enum PromotionMode {
  PromoCode = 'promocode',      // Con código promocional
  Discount = 'discount'         // Descuento directo
}

@Component({
  selector: 'app-turn-on-promotion-create-page',
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
    RadioButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './turn-on-promotion-create-page.component.html',
  styleUrl: './turn-on-promotion-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TurnOnPromotionCreatePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly turnOnService = inject(TurnOnPromotionService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly isSaving = signal<boolean>(false);
  readonly isLoadingData = signal<boolean>(false);
  readonly promotionMode = signal<PromotionMode>(PromotionMode.Discount);
  readonly selectedDiscountType = signal<TurnOnDiscountType>(TurnOnDiscountType.FixedDiscount);

  // Data
  readonly targetAudiences = signal<TargetAudienceSummary[]>([]);
  readonly promoCodes = signal<any[]>([]);
  readonly brands = this.globalDataService.brands;

  // Expose enum to template
  readonly PromotionMode = PromotionMode;

  // ============================================================================
  // FORM
  // ============================================================================

  form!: FormGroup;

  // Opciones para selects
  readonly discountTypeOptions = TURN_ON_DISCOUNT_TYPE_OPTIONS;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly targetAudiencesOptions = computed(() =>
    this.targetAudiences().map(audience => ({
      id: audience.id,
      name: audience.name
    }))
  );

  readonly brandsOptions = computed(() =>
    this.brands().map(brand => ({
      id: brand.id,
      name: brand.name
    }))
  );

  readonly promoCodesOptions = computed(() =>
    this.promoCodes().map(promo => ({
      id: promo.id,
      code: promo.code,
      name: promo.name || promo.code
    }))
  );

  // Mostrar campos según modo
  readonly showPromoCodeFields = computed(() =>
    this.promotionMode() === PromotionMode.PromoCode
  );

  readonly showDiscountFields = computed(() =>
    this.promotionMode() === PromotionMode.Discount
  );

  readonly isPercentage = computed(() =>
    this.selectedDiscountType() === TurnOnDiscountType.PercentageDiscount
  );

  readonly isFixedDiscount = computed(() =>
    this.selectedDiscountType() === TurnOnDiscountType.FixedDiscount
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
    });
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  // ============================================================================
  // MÉTODOS - Form Initialization
  // ============================================================================

  initForm(): void {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    this.form = this.fb.group({
      // Básico
      type: [3], // Turn On Promotion type
      criteriaId: [null, Validators.required],
      promotionMode: [PromotionMode.Discount, Validators.required],

      // Para modo PromoCode
      selectedBrands: [[]],
      promocodeRequired: [null],

      // Para modo Discount
      discountType: [TurnOnDiscountType.FixedDiscount],
      discountValue: [0],

      // Restricciones (obligatorias)
      minimumPurchaseValue: [0, [Validators.required, Validators.min(0.01)]],
      constraintDateFrom: [today, Validators.required],
      constraintDateTo: [nextMonth, Validators.required],
      constraintIsActive: [true]
    });

    // Validador de end date
    const dateToControl = this.form.get('constraintDateTo');
    dateToControl?.setValidators([
      Validators.required,
      this.endDateValidator.bind(this)
    ]);

    // Suscribirse a cambios de modo
    this.form.get('promotionMode')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mode => {
        this.promotionMode.set(mode);
        this.updateModeValidations(mode);
      });

    // Suscribirse a cambios de tipo de descuento
    this.form.get('discountType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.selectedDiscountType.set(type);
        this.updateDiscountTypeValidations(type);
      });

    // Suscribirse a cambios de marcas (para filtrar promo codes)
    this.form.get('selectedBrands')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(brands => {
        if (brands && brands.length > 0) {
          this.loadPromoCodesByBrands(brands);
        } else {
          this.promoCodes.set([]);
          this.form.patchValue({ promocodeRequired: null });
        }
      });

    // Inicializar validaciones para modo por defecto
    this.updateModeValidations(PromotionMode.Discount);
  }

  // ============================================================================
  // MÉTODOS - Load Data
  // ============================================================================

  private loadInitialData(): void {
    this.isLoadingData.set(true);

    this.turnOnService.getTargetAudienceSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (audiences) => {
          this.targetAudiences.set(audiences);
          this.isLoadingData.set(false);
        },
        error: (error) => {
          console.error('Error loading target audiences:', error);
          this.isLoadingData.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la lista de públicos objetivo'
          });
        }
      });
  }

  private loadPromoCodesByBrands(brandIds: number[]): void {
    this.turnOnService.getPromoCodesByBrands(brandIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (codes) => {
          this.promoCodes.set(codes);
        },
        error: (error) => {
          console.error('Error loading promo codes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar los códigos promocionales'
          });
        }
      });
  }

  // ============================================================================
  // MÉTODOS - Validaciones y Lógica Condicional
  // ============================================================================

  private endDateValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = this.form?.get('constraintDateFrom')?.value;
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

  private updateModeValidations(mode: PromotionMode): void {
    const promoCodeControl = this.form.get('promocodeRequired');
    const discountTypeControl = this.form.get('discountType');
    const discountValueControl = this.form.get('discountValue');
    const brandsControl = this.form.get('selectedBrands');

    // Limpiar validadores
    promoCodeControl?.clearValidators();
    discountTypeControl?.clearValidators();
    discountValueControl?.clearValidators();
    brandsControl?.clearValidators();

    if (mode === PromotionMode.PromoCode) {
      // Modo PromoCode: requiere marcas y código
      brandsControl?.setValidators([Validators.required]);
      promoCodeControl?.setValidators([Validators.required]);
    } else {
      // Modo Discount: requiere tipo y valor
      discountTypeControl?.setValidators([Validators.required]);
      discountValueControl?.setValidators([Validators.required, Validators.min(0.01)]);

      // Agregar validación de max para porcentaje
      const currentType = this.form.get('discountType')?.value;
      if (currentType === TurnOnDiscountType.PercentageDiscount) {
        discountValueControl?.addValidators(Validators.max(100));
      }
    }

    promoCodeControl?.updateValueAndValidity();
    discountTypeControl?.updateValueAndValidity();
    discountValueControl?.updateValueAndValidity();
    brandsControl?.updateValueAndValidity();
  }

  private updateDiscountTypeValidations(type: TurnOnDiscountType): void {
    const discountValueControl = this.form.get('discountValue');

    if (!discountValueControl) return;

    // Limpiar validadores
    discountValueControl.clearValidators();

    // Agregar validadores base
    discountValueControl.setValidators([Validators.required, Validators.min(0.01)]);

    // Para porcentaje, agregar max 100
    if (type === TurnOnDiscountType.PercentageDiscount) {
      discountValueControl.addValidators(Validators.max(100));
    }

    discountValueControl.updateValueAndValidity();
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
  // MÉTODOS - Availability Check
  // ============================================================================

  private checkAvailability(): Promise<boolean> {
    const mode = this.promotionMode();
    const checkObservable = mode === PromotionMode.PromoCode
      ? this.turnOnService.checkTurnOnByPromocodeAvailability()
      : this.turnOnService.checkTurnOnAvailability();

    return new Promise((resolve) => {
      checkObservable
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (response) => {
            if (response.anyCampaign) {
              // Mostrar confirmación
              this.messageService.add({
                severity: 'warn',
                summary: 'Campaña Activa',
                detail: 'Ya existe una campaña activa. Debe eliminarla antes de crear una nueva.',
                sticky: true
              });
              resolve(false);
            } else {
              resolve(true);
            }
          },
          error: (error) => {
            console.error('Error checking availability:', error);
            resolve(true); // Continuar si falla la verificación
          }
        });
    });
  }

  // ============================================================================
  // MÉTODOS - Submit y Navegación
  // ============================================================================

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    // Verificar disponibilidad
    const isAvailable = await this.checkAvailability();
    if (!isAvailable) {
      return;
    }

    this.isSaving.set(true);

    const mode = this.promotionMode();
    const formData: CreateTurnOnPromotion = {
      promotionType: 3, // Turn On Promotion global type
      criteriaId: this.form.value.criteriaId,
      type: mode === PromotionMode.Discount ? this.form.value.discountType : null,
      value: mode === PromotionMode.Discount ? this.convertDiscountValue() : 0,
      promocodeRequired: mode === PromotionMode.PromoCode ? this.form.value.promocodeRequired : null,
      constraints: {
        type: 'minimum_purchase',
        dateFrom: this.formatDateToISO(this.form.value.constraintDateFrom),
        dateTo: this.formatDateToISO(this.form.value.constraintDateTo),
        enable: this.form.value.constraintIsActive,
        minimumPurchase: {
          value: this.form.value.minimumPurchaseValue
        }
      }
    };

    this.turnOnService.createTurnOnPromotion(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Promoción Turn On creada correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error creating turn on promotion:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la promoción Turn On'
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
   */
  private convertDiscountValue(): number {
    const type = this.form.value.discountType;
    const value = this.form.value.discountValue;

    if (type === TurnOnDiscountType.PercentageDiscount) {
      return value / 100; // 15 → 0.15
    }
    return value;
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
