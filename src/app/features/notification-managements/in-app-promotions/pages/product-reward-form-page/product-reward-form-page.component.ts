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
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services & Models
import { ProductRewardService } from '../../services/product-reward.service';
import {
  CreateProductReward,
  UpdateProductReward,
  ProductRewardResponse,
  TriggerType,
  RewardType,
  TRIGGER_TYPE_OPTIONS,
  REWARD_TYPE_OPTIONS
} from '../../models/product-reward.model';
import { GlobalDataService } from '@core/services/global-data.service';

// Components
import { SimpleProductSelectorComponent } from '../../components/simple-product-selector/simple-product-selector.component';
import { SimpleModifierSelectorComponent } from '../../components/simple-modifier-selector/simple-modifier-selector.component';

// Models
import { Product } from '@features/notification-managements/loyalty-program/models';

@Component({
  selector: 'app-product-reward-form-page',
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
    ToastModule,
    SimpleProductSelectorComponent,
    SimpleModifierSelectorComponent
  ],
  providers: [MessageService],
  templateUrl: './product-reward-form-page.component.html',
  styleUrl: './product-reward-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductRewardFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly productRewardService = inject(ProductRewardService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly rewardId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.rewardId() !== null);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly selectedTriggerType = signal<TriggerType>(TriggerType.Product);
  readonly selectedRewardType = signal<RewardType>(RewardType.None);

  // Productos seleccionados (para obtener brandCode para modificadores)
  readonly selectedTriggerProduct = signal<Product | null>(null);
  readonly selectedRewardProduct = signal<Product | null>(null);

  // Data global
  readonly brands = this.globalDataService.brands;
  readonly channels = this.globalDataService.channels;

  // ============================================================================
  // FORM
  // ============================================================================

  form!: FormGroup;

  // Opciones para selects
  readonly triggerTypeOptions = TRIGGER_TYPE_OPTIONS;
  readonly rewardTypeOptions = REWARD_TYPE_OPTIONS;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Editar Recompensa de Producto' : 'Nueva Recompensa de Producto'
  );

  readonly submitButtonLabel = computed(() =>
    this.isEditMode() ? 'Guardar Cambios' : 'Crear Recompensa'
  );

  readonly brandsOptions = computed(() => {
    const options = this.brands().map(brand => ({
      id: brand.id,
      name: brand.name
    }));
    console.log('📋 brandsOptions computed:', options.length, options);
    return options;
  });

  readonly channelsOptions = computed(() =>
    this.channels().map(channel => ({
      id: channel.id,
      description: channel.description
    }))
  );

  // Mostrar/ocultar secciones según trigger type
  readonly showProductTrigger = computed(() =>
    this.selectedTriggerType() === TriggerType.Product
  );

  readonly showChannelSelector = computed(() =>
    this.selectedTriggerType() === TriggerType.BrandAndChannel
  );

  readonly showConstraints = computed(() => {
    const trigger = this.selectedTriggerType();
    return trigger === TriggerType.BrandAndChannel || trigger === TriggerType.Brand;
  });

  // Mostrar/ocultar secciones según reward type
  readonly showProductReward = computed(() =>
    this.selectedRewardType() === RewardType.FreeProduct
  );

  readonly showDiscountFields = computed(() => {
    const reward = this.selectedRewardType();
    return reward === RewardType.FixedDiscount || reward === RewardType.PercentageDiscount;
  });

  readonly showDeliveryCharge = computed(() =>
    this.selectedRewardType() === RewardType.ShippingDiscount
  );

  readonly isPercentageDiscount = computed(() =>
    this.selectedRewardType() === RewardType.PercentageDiscount
  );

  readonly isFixedDiscount = computed(() =>
    this.selectedRewardType() === RewardType.FixedDiscount
  );

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor() {
    // Cargar data global si no está cargada
    effect(() => {
      console.log('🔄 Effect - brands length:', this.brands().length);
      console.log('🔄 Effect - channels length:', this.channels().length);

      if (this.brands().length === 0) {
        console.log('⚠️ Brands vacío, forzando refresh...');
        this.globalDataService.forceRefresh('brands');
      }
      if (this.channels().length === 0) {
        console.log('⚠️ Channels vacío, forzando refresh...');
        this.globalDataService.forceRefresh('channels');
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
      this.rewardId.set(+id);
      this.loadReward(+id);
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
      // Básicos
      type: [4], // Product Reward type
      triggerId: [TriggerType.Product, Validators.required],
      brandId: [null, Validators.required],
      rewardType: [RewardType.None, Validators.required],
      startTime: [today, Validators.required],
      endTime: [tomorrow, Validators.required],

      // Campos para Trigger Type 1 (Producto)
      productCode: [''],
      modifierCode: [[]],  // Array de modifier IDs

      // Campos para Trigger Type 2 (Marca y Canal)
      channelId: [null],

      // Campos para Constraints (Trigger Types 2 y 3)
      constraintType: ['minimum_purchase'],
      minimumPurchaseValue: [0],
      constraintDateFrom: [null],
      constraintDateTo: [null],
      constraintIsActive: [true],

      // Campos para Reward Type 1 (Producto Gratis)
      productToReward: [''],
      modifiersToReward: [[]],  // Array de modifier IDs
      productToRewardQty: [1],

      // Campos para Reward Types 2, 3, 4 (Descuentos)
      deliveryCharge: [0],
      discount: [0],

      // Estado
      isActive: [true]
    });

    // Configurar validador de end time
    const endTimeControl = this.form.get('endTime');
    endTimeControl?.setValidators([
      Validators.required,
      this.endTimeValidator.bind(this)
    ]);

    // Suscribirse a cambios de triggerId
    this.form.get('triggerId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.selectedTriggerType.set(type);
        this.updateTriggerValidations(type);
      });

    // Suscribirse a cambios de rewardType
    this.form.get('rewardType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.selectedRewardType.set(type);
        this.updateRewardValidations(type);
      });

    // Inicializar validaciones para tipos por defecto
    this.updateTriggerValidations(TriggerType.Product);
    this.updateRewardValidations(RewardType.None);
  }

  // ============================================================================
  // MÉTODOS - Load Data
  // ============================================================================

  private loadReward(id: number): void {
    this.isLoading.set(true);

    this.productRewardService.getProductRewardById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reward) => {
          this.populateForm(reward);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading product reward:', error);
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la recompensa'
          });
          this.router.navigate(['/notification-managements/in-app-promotions']);
        }
      });
  }

  private populateForm(reward: ProductRewardResponse): void {
    // Convertir discount de backend a frontend
    let displayDiscount = 0;
    if (reward.discount !== null && reward.rewardType === RewardType.PercentageDiscount) {
      displayDiscount = reward.discount * 100; // 0.15 → 15
    } else if (reward.discount !== null) {
      displayDiscount = reward.discount;
    }

    // Convert modifiers to arrays
    const modifierCodeArray = reward.modifierCode ? [reward.modifierCode] : [];
    const modifiersToRewardArray = reward.modifiersToReward || [];

    this.form.patchValue({
      triggerId: reward.triggerId,
      brandId: reward.brandId,
      rewardType: reward.rewardType,
      startTime: reward.startTime ? new Date(reward.startTime) : new Date(),
      endTime: reward.endTime ? new Date(reward.endTime) : new Date(),
      productCode: reward.productCode || '',
      modifierCode: modifierCodeArray,
      channelId: reward.channelId || null,
      productToReward: reward.productToReward || '',
      modifiersToReward: modifiersToRewardArray,
      productToRewardQty: reward.productToRewardQty || 1,
      deliveryCharge: reward.deliveryCharge || 0,
      discount: displayDiscount,
      isActive: reward.isActive || true
    });

    // Poblar constraint si existe
    if (reward.constraint) {
      this.form.patchValue({
        constraintType: reward.constraint.type || 'minimum_purchase',
        minimumPurchaseValue: reward.constraint.minimumPurchase?.value || 0,
        constraintDateFrom: reward.constraint.dateFrom ? new Date(reward.constraint.dateFrom) : null,
        constraintDateTo: reward.constraint.dateTo ? new Date(reward.constraint.dateTo) : null,
        constraintIsActive: reward.constraint.isActive || false
      });
    }

    // Actualizar tipos seleccionados
    this.selectedTriggerType.set(reward.triggerId);
    this.selectedRewardType.set(reward.rewardType);

    // Actualizar validaciones
    this.updateTriggerValidations(reward.triggerId);
    this.updateRewardValidations(reward.rewardType);
  }

  // ============================================================================
  // MÉTODOS - Validaciones y Lógica Condicional
  // ============================================================================

  private endTimeValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = this.form?.get('startTime')?.value;
    const endTime = control.value;

    if (startTime && endTime) {
      const start = startTime instanceof Date ? startTime : new Date(startTime);
      const end = endTime instanceof Date ? endTime : new Date(endTime);

      if (end <= start) {
        return { endTimeInvalid: true };
      }
    }
    return null;
  }

  private updateTriggerValidations(triggerType: TriggerType): void {
    const productCodeControl = this.form.get('productCode');
    const minimumPurchaseValueControl = this.form.get('minimumPurchaseValue');

    // Limpiar validadores
    productCodeControl?.clearValidators();
    minimumPurchaseValueControl?.clearValidators();

    if (triggerType === TriggerType.Product) {
      // Para Producto: productCode es requerido
      productCodeControl?.setValidators([Validators.required]);

      // Limpiar constraints
      minimumPurchaseValueControl?.setValue(0);
    } else {
      // Para Marca y Canal / Marca: minimumPurchaseValue es requerido
      minimumPurchaseValueControl?.setValidators([
        Validators.required,
        Validators.min(0.01)
      ]);

      // Limpiar producto
      productCodeControl?.setValue('');
      this.form.get('modifierCode')?.setValue([]);
    }

    productCodeControl?.updateValueAndValidity();
    minimumPurchaseValueControl?.updateValueAndValidity();
  }

  private updateRewardValidations(rewardType: RewardType): void {
    const productToRewardControl = this.form.get('productToReward');
    const productToRewardQtyControl = this.form.get('productToRewardQty');
    const deliveryChargeControl = this.form.get('deliveryCharge');
    const discountControl = this.form.get('discount');

    // Limpiar todos los validadores
    productToRewardControl?.clearValidators();
    productToRewardQtyControl?.clearValidators();
    deliveryChargeControl?.clearValidators();
    discountControl?.clearValidators();

    // Aplicar validadores según el tipo
    if (rewardType === RewardType.FreeProduct) {
      productToRewardControl?.setValidators([Validators.required]);
      productToRewardQtyControl?.setValidators([
        Validators.required,
        Validators.min(1)
      ]);
    } else if (rewardType === RewardType.ShippingDiscount) {
      deliveryChargeControl?.setValidators([
        Validators.required,
        Validators.min(0.01)
      ]);
    } else if (rewardType === RewardType.FixedDiscount || rewardType === RewardType.PercentageDiscount) {
      discountControl?.setValidators([
        Validators.required,
        Validators.min(0.01)
      ]);

      if (rewardType === RewardType.PercentageDiscount) {
        discountControl?.addValidators(Validators.max(100));
      }
    }

    // Actualizar validadores
    productToRewardControl?.updateValueAndValidity();
    productToRewardQtyControl?.updateValueAndValidity();
    deliveryChargeControl?.updateValueAndValidity();
    discountControl?.updateValueAndValidity();
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
    if (control.hasError('endTimeInvalid')) {
      return 'La fecha/hora de fin debe ser posterior a la de inicio';
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
      this.updateReward();
    } else {
      this.createReward();
    }
  }

  private createReward(): void {
    const formValue = this.form.value;

    // Preparar constraint (solo para triggers 2 y 3)
    const constraint = (formValue.triggerId === TriggerType.BrandAndChannel ||
                       formValue.triggerId === TriggerType.Brand) ? {
      type: formValue.constraintType,
      minimumPurchase: {
        value: formValue.minimumPurchaseValue
      },
      dateFrom: formValue.constraintDateFrom ? this.formatDateToBackend(formValue.constraintDateFrom) : null,
      dateTo: formValue.constraintDateTo ? this.formatDateToBackend(formValue.constraintDateTo) : null,
      isActive: formValue.constraintIsActive
    } : null;

    // Preparar modifiers (ya vienen como arrays)
    const modifierCodeValue = formValue.triggerId === TriggerType.Product && formValue.modifierCode && formValue.modifierCode.length > 0
      ? formValue.modifierCode[0]  // Backend espera un string, tomamos el primero
      : undefined;

    const modifiersToReward = formValue.rewardType === RewardType.FreeProduct && formValue.modifiersToReward && formValue.modifiersToReward.length > 0
      ? formValue.modifiersToReward  // Backend espera un array
      : null;

    const formData: CreateProductReward = {
      type: 4, // Product Reward
      triggerId: formValue.triggerId,
      brandId: formValue.brandId,
      rewardType: formValue.rewardType,
      startTime: this.formatDateToBackend(formValue.startTime),
      endTime: this.formatDateToBackend(formValue.endTime),
      productCode: formValue.triggerId === TriggerType.Product ? formValue.productCode : '',
      modifierCode: modifierCodeValue,
      channelId: formValue.triggerId === TriggerType.BrandAndChannel ? formValue.channelId : undefined,
      productToReward: formValue.rewardType === RewardType.FreeProduct ? formValue.productToReward : null,
      modifiersToReward: modifiersToReward,
      productToRewardQty: formValue.rewardType === RewardType.FreeProduct ? formValue.productToRewardQty : null,
      deliveryCharge: formValue.rewardType === RewardType.ShippingDiscount ? formValue.deliveryCharge : null,
      discount: this.convertDiscountValue(),
      constraint: constraint,
      isActive: formValue.isActive
    };

    this.productRewardService.createProductReward(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Recompensa de producto creada correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error creating product reward:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la recompensa de producto'
          });
        }
      });
  }

  private updateReward(): void {
    const id = this.rewardId();
    if (!id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de recompensa no válido'
      });
      return;
    }

    const formValue = this.form.value;

    // Preparar constraint (solo para triggers 2 y 3)
    const constraint = (formValue.triggerId === TriggerType.BrandAndChannel ||
                       formValue.triggerId === TriggerType.Brand) ? {
      type: formValue.constraintType,
      minimumPurchase: {
        value: formValue.minimumPurchaseValue
      },
      dateFrom: formValue.constraintDateFrom ? this.formatDateToBackend(formValue.constraintDateFrom) : null,
      dateTo: formValue.constraintDateTo ? this.formatDateToBackend(formValue.constraintDateTo) : null,
      isActive: formValue.constraintIsActive
    } : null;

    // Preparar modifiers (ya vienen como arrays)
    const modifierCodeValue = formValue.triggerId === TriggerType.Product && formValue.modifierCode && formValue.modifierCode.length > 0
      ? formValue.modifierCode[0]  // Backend espera un string, tomamos el primero
      : undefined;

    const modifiersToReward = formValue.rewardType === RewardType.FreeProduct && formValue.modifiersToReward && formValue.modifiersToReward.length > 0
      ? formValue.modifiersToReward  // Backend espera un array
      : null;

    const formData: UpdateProductReward = {
      type: 4, // Product Reward
      triggerId: formValue.triggerId,
      brandId: formValue.brandId,
      rewardType: formValue.rewardType,
      startTime: this.formatDateToBackend(formValue.startTime),
      endTime: this.formatDateToBackend(formValue.endTime),
      productCode: formValue.triggerId === TriggerType.Product ? formValue.productCode : '',
      modifierCode: modifierCodeValue,
      channelId: formValue.triggerId === TriggerType.BrandAndChannel ? formValue.channelId : undefined,
      productToReward: formValue.rewardType === RewardType.FreeProduct ? formValue.productToReward : null,
      modifiersToReward: modifiersToReward,
      productToRewardQty: formValue.rewardType === RewardType.FreeProduct ? formValue.productToRewardQty : null,
      deliveryCharge: formValue.rewardType === RewardType.ShippingDiscount ? formValue.deliveryCharge : null,
      discount: this.convertDiscountValue(),
      constraint: constraint,
      isActive: formValue.isActive
    };

    this.productRewardService.updateProductReward(id, formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Recompensa actualizada correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error updating product reward:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar la recompensa'
          });
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/notification-managements/in-app-promotions']);
  }

  // ============================================================================
  // MÉTODOS - Manejo de Selección de Productos
  // ============================================================================

  onTriggerProductSelected(product: Product | null): void {
    console.log('🎯 Trigger product selected:', product);
    this.selectedTriggerProduct.set(product);

    // Si se deselecciona el producto, limpiar el modificador
    if (!product) {
      this.form.get('modifierCode')?.setValue([]);
    }
  }

  onRewardProductSelected(product: Product | null): void {
    console.log('🎁 Reward product selected:', product);
    this.selectedRewardProduct.set(product);

    // Si se deselecciona el producto, limpiar los modificadores
    if (!product) {
      this.form.get('modifiersToReward')?.setValue([]);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Convierte el discount value según el tipo:
   * - PercentageDiscount: divide por 100 (15 → 0.15)
   * - FixedDiscount: deja el valor tal cual
   * - Otros: retorna null
   */
  private convertDiscountValue(): number | null {
    const rewardType = this.form.value.rewardType;
    const value = this.form.value.discount;

    if (rewardType === RewardType.PercentageDiscount) {
      return value / 100; // 15 → 0.15
    }
    if (rewardType === RewardType.FixedDiscount) {
      return value;
    }
    return null;
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
