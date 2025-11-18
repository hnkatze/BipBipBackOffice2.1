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

@Component({
  selector: 'app-product-reward-edit-page',
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
    SimpleProductSelectorComponent
  ],
  providers: [MessageService],
  templateUrl: './product-reward-edit-page.component.html',
  styleUrl: './product-reward-edit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductRewardEditPageComponent implements OnInit {
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
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly selectedTriggerType = signal<TriggerType>(TriggerType.Product);
  readonly selectedRewardType = signal<RewardType>(RewardType.None);

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
  // COMPUTED (igual que create-page)
  // ============================================================================

  readonly brandsOptions = computed(() =>
    this.brands().map(brand => ({ id: brand.id, name: brand.name }))
  );

  readonly channelsOptions = computed(() =>
    this.channels().map(channel => ({ id: channel.id, description: channel.description }))
  );

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
    effect(() => {
      if (this.brands().length === 0) this.globalDataService.forceRefresh('brands');
      if (this.channels().length === 0) this.globalDataService.forceRefresh('channels');
    });
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    this.initForm();
    this.loadReward();
  }

  // ============================================================================
  // MÉTODOS - Form Initialization (igual que create)
  // ============================================================================

  initForm(): void {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.form = this.fb.group({
      triggerId: [TriggerType.Product, Validators.required],
      brandId: [null, Validators.required],
      rewardType: [RewardType.None, Validators.required],
      startTime: [today, Validators.required],
      endTime: [tomorrow, Validators.required],
      productCode: [''],
      modifierCode: [''],
      channelId: [null],
      constraintType: ['minimum_purchase'],
      minimumPurchaseValue: [0],
      constraintDateFrom: [null],
      constraintDateTo: [null],
      constraintIsActive: [true],
      productToReward: [''],
      modifiersToReward: [''],
      productToRewardQty: [1],
      deliveryCharge: [0],
      discount: [0],
      isActive: [true]
    });

    const endTimeControl = this.form.get('endTime');
    endTimeControl?.setValidators([Validators.required, this.endTimeValidator.bind(this)]);

    this.form.get('triggerId')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.selectedTriggerType.set(type);
        this.updateTriggerValidations(type);
      });

    this.form.get('rewardType')?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.selectedRewardType.set(type);
        this.updateRewardValidations(type);
      });

    this.updateTriggerValidations(TriggerType.Product);
    this.updateRewardValidations(RewardType.None);
  }

  // ============================================================================
  // MÉTODOS - Load Data
  // ============================================================================

  private loadReward(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de recompensa no válido'
      });
      this.router.navigate(['/notification-managements/in-app-promotions']);
      return;
    }

    this.rewardId.set(+id);
    this.isLoading.set(true);

    this.productRewardService.getProductRewardById(+id)
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

    // Convertir modifiers array a string
    const modifiersStr = reward.modifiersToReward ? reward.modifiersToReward.join(', ') : '';

    this.form.patchValue({
      triggerId: reward.triggerId,
      brandId: reward.brandId,
      rewardType: reward.rewardType,
      startTime: reward.startTime ? new Date(reward.startTime) : new Date(),
      endTime: reward.endTime ? new Date(reward.endTime) : new Date(),
      productCode: reward.productCode || '',
      modifierCode: reward.modifierCode || '',
      channelId: reward.channelId || null,
      productToReward: reward.productToReward || '',
      modifiersToReward: modifiersStr,
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
  // MÉTODOS - Validaciones (igual que create)
  // ============================================================================

  private endTimeValidator(control: AbstractControl): ValidationErrors | null {
    const startTime = this.form?.get('startTime')?.value;
    const endTime = control.value;
    if (startTime && endTime) {
      const start = startTime instanceof Date ? startTime : new Date(startTime);
      const end = endTime instanceof Date ? endTime : new Date(endTime);
      if (end <= start) return { endTimeInvalid: true };
    }
    return null;
  }

  private updateTriggerValidations(triggerType: TriggerType): void {
    const productCodeControl = this.form.get('productCode');
    const minimumPurchaseValueControl = this.form.get('minimumPurchaseValue');

    productCodeControl?.clearValidators();
    minimumPurchaseValueControl?.clearValidators();

    if (triggerType === TriggerType.Product) {
      productCodeControl?.setValidators([Validators.required]);
    } else {
      minimumPurchaseValueControl?.setValidators([Validators.required, Validators.min(0.01)]);
    }

    productCodeControl?.updateValueAndValidity();
    minimumPurchaseValueControl?.updateValueAndValidity();
  }

  private updateRewardValidations(rewardType: RewardType): void {
    const productToRewardControl = this.form.get('productToReward');
    const productToRewardQtyControl = this.form.get('productToRewardQty');
    const deliveryChargeControl = this.form.get('deliveryCharge');
    const discountControl = this.form.get('discount');

    productToRewardControl?.clearValidators();
    productToRewardQtyControl?.clearValidators();
    deliveryChargeControl?.clearValidators();
    discountControl?.clearValidators();

    if (rewardType === RewardType.FreeProduct) {
      productToRewardControl?.setValidators([Validators.required]);
      productToRewardQtyControl?.setValidators([Validators.required, Validators.min(1)]);
    } else if (rewardType === RewardType.ShippingDiscount) {
      deliveryChargeControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else if (rewardType === RewardType.FixedDiscount || rewardType === RewardType.PercentageDiscount) {
      discountControl?.setValidators([Validators.required, Validators.min(0.01)]);
      if (rewardType === RewardType.PercentageDiscount) {
        discountControl?.addValidators(Validators.max(100));
      }
    }

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
    if (control.hasError('min')) return `Valor mínimo: ${control.errors['min'].min}`;
    if (control.hasError('max')) return `Valor máximo: ${control.errors['max'].max}`;
    if (control.hasError('endTimeInvalid')) return 'La fecha/hora de fin debe ser posterior a la de inicio';
    return 'Campo inválido';
  }

  // ============================================================================
  // MÉTODOS - Submit
  // ============================================================================

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Complete todos los campos requeridos' });
      return;
    }

    const id = this.rewardId();
    if (!id) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'ID no válido' });
      return;
    }

    this.isSaving.set(true);

    const formValue = this.form.value;
    const constraint = (formValue.triggerId === TriggerType.BrandAndChannel || formValue.triggerId === TriggerType.Brand) ? {
      type: formValue.constraintType,
      minimumPurchase: { value: formValue.minimumPurchaseValue },
      dateFrom: formValue.constraintDateFrom ? this.formatDateToBackend(formValue.constraintDateFrom) : null,
      dateTo: formValue.constraintDateTo ? this.formatDateToBackend(formValue.constraintDateTo) : null,
      isActive: formValue.constraintIsActive
    } : null;

    const modifiersToReward = formValue.modifiersToReward
      ? formValue.modifiersToReward.split(',').map((m: string) => m.trim()).filter((m: string) => m !== '')
      : null;

    const formData: UpdateProductReward = {
      triggerId: formValue.triggerId,
      brandId: formValue.brandId,
      rewardType: formValue.rewardType,
      startTime: this.formatDateToBackend(formValue.startTime),
      endTime: this.formatDateToBackend(formValue.endTime),
      productCode: formValue.triggerId === TriggerType.Product ? formValue.productCode : '',
      modifierCode: formValue.triggerId === TriggerType.Product && formValue.modifierCode ? formValue.modifierCode : undefined,
      channelId: formValue.triggerId === TriggerType.BrandAndChannel ? formValue.channelId : undefined,
      productToReward: formValue.rewardType === RewardType.FreeProduct ? formValue.productToReward : null,
      modifiersToReward: formValue.rewardType === RewardType.FreeProduct ? modifiersToReward : null,
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
          this.messageService.add({ severity: 'success', summary: 'Éxito', detail: 'Recompensa actualizada correctamente' });
          setTimeout(() => this.router.navigate(['/notification-managements/in-app-promotions']), 1500);
        },
        error: (error) => {
          console.error('Error updating product reward:', error);
          this.isSaving.set(false);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la recompensa' });
        }
      });
  }

  onCancel(): void {
    this.router.navigate(['/notification-managements/in-app-promotions']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => this.form.get(key)?.markAsTouched());
  }

  private convertDiscountValue(): number | null {
    const rewardType = this.form.value.rewardType;
    const value = this.form.value.discount;
    if (rewardType === RewardType.PercentageDiscount) return value / 100;
    if (rewardType === RewardType.FixedDiscount) return value;
    return null;
  }

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
