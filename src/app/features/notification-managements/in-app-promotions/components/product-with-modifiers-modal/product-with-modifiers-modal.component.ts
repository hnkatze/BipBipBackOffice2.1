import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';

// Services & Models
import { LoyaltyService } from '@features/notification-managements/loyalty-program/services/loyalty.service';
import { Modifier, ModifierOption } from '@features/notification-managements/loyalty-program/models';

// Components
import { SimpleProductSelectorComponent } from '../simple-product-selector/simple-product-selector.component';

/**
 * Modal para agregar productos con modificadores a PromoCode
 * Permite seleccionar Brand → Product → Modifiers (FormArray) → Quantity
 */
@Component({
  selector: 'app-product-with-modifiers-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    SelectModule,
    SimpleProductSelectorComponent
  ],
  templateUrl: './product-with-modifiers-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductWithModifiersModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly dialogConfig = inject(DynamicDialogConfig);
  private readonly loyaltyService = inject(LoyaltyService);

  // ============================================================================
  // SIGNALS
  // ============================================================================

  readonly modifiersList = signal<Modifier[]>([]);
  readonly isLoadingModifiers = signal(false);
  readonly optionsPerModifier = signal<Record<number, ModifierOption[]>>({});
  readonly selectedProductId = signal<string>('');
  readonly selectedProduct = signal<any>(null);

  // Data pasada desde el componente padre
  readonly brandsData = signal<any[]>([]);

  // ============================================================================
  // FORM
  // ============================================================================

  form!: FormGroup;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly hasSelectedProduct = computed(() => {
    return !!this.selectedProductId();
  });

  readonly hasModifiers = computed(() => this.modifiersList().length > 0);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  constructor() {
    // Watch for product and brand changes to load product details and modifiers
    effect(() => {
      const productId = this.selectedProductId();
      const brandId = this.form?.get('brandId')?.value;

      if (productId && brandId) {
        this.loadProductAndModifiers(productId, brandId);
      }
    });
  }

  ngOnInit(): void {
    // Get brands data from dialog config
    if (this.dialogConfig.data?.brands) {
      this.brandsData.set(this.dialogConfig.data.brands);
    }

    // Initialize form
    this.initForm();

    // Subscribe to productId changes
    this.form.get('productId')?.valueChanges.subscribe(productId => {
      this.selectedProductId.set(productId || '');
    });
  }

  // ============================================================================
  // FORM METHODS
  // ============================================================================

  private initForm(): void {
    this.form = this.fb.group({
      brandId: [null, Validators.required],
      productId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      modifiers: this.fb.array([])
    });
  }

  get modifiersArray(): FormArray {
    return this.form.get('modifiers') as FormArray;
  }

  createModifierGroup(): FormGroup {
    const group = this.fb.group({
      modifierId: ['', Validators.required],
      modifierOptionId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });

    const index = this.modifiersArray.length;

    // Watch for modifier selection to load options
    group.get('modifierId')?.valueChanges.subscribe(modifierId => {
      group.get('modifierOptionId')?.setValue('');

      if (!modifierId) {
        this.updateOptionsForModifier(index, []);
        return;
      }

      const modifier = this.modifiersList().find(m => m.modifierId === modifierId);
      if (modifier && modifier.options) {
        this.updateOptionsForModifier(index, modifier.options);

        // Auto-select if only one option
        if (modifier.options.length === 1) {
          group.get('modifierOptionId')?.setValue(modifier.options[0].modifierOptionId);
        }
      } else {
        this.updateOptionsForModifier(index, []);
      }
    });

    return group;
  }

  private updateOptionsForModifier(index: number, options: ModifierOption[]): void {
    const current = this.optionsPerModifier();
    this.optionsPerModifier.set({
      ...current,
      [index]: options
    });
  }

  addModifier(): void {
    this.modifiersArray.push(this.createModifierGroup());
  }

  removeModifier(index: number): void {
    this.modifiersArray.removeAt(index);

    // Remove options for this index
    const current = this.optionsPerModifier();
    delete current[index];
    this.optionsPerModifier.set({ ...current });
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  private loadProductAndModifiers(productId: string, brandId: number): void {
    this.isLoadingModifiers.set(true);
    this.modifiersArray.clear();
    this.modifiersList.set([]);
    this.optionsPerModifier.set({});

    // First, load products to get the brand code
    this.loyaltyService.getProducts(brandId).subscribe({
      next: (products) => {
        const product = products.find(p => p.productId === productId);

        if (!product) {
          console.error('Product not found:', productId);
          this.isLoadingModifiers.set(false);
          return;
        }

        this.selectedProduct.set(product);

        // Now load modifiers using the product's brand code
        const brandCode = product.brand; // This is the short code like "PH", "DNS", etc.

        this.loyaltyService.getModifiers(productId, brandCode).subscribe({
          next: (response) => {
            if (response.modifiers && response.modifiers.length > 0) {
              this.modifiersList.set(response.modifiers);
            }
            this.isLoadingModifiers.set(false);
          },
          error: (error) => {
            console.error('Error loading modifiers:', error);
            this.modifiersList.set([]);
            this.isLoadingModifiers.set(false);
          }
        });
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.isLoadingModifiers.set(false);
      }
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  getModifierOptions(index: number): ModifierOption[] {
    return this.optionsPerModifier()[index] || [];
  }

  getModifierLabel(modifierId: string): string {
    const modifier = this.modifiersList().find(m => m.modifierId === modifierId);
    return modifier?.name || modifierId;
  }

  hasError(field: string, index?: number): boolean {
    if (index !== undefined) {
      const control = this.modifiersArray.at(index)?.get(field);
      return control?.invalid && (control?.dirty || control?.touched) || false;
    }
    const control = this.form.get(field);
    return control?.invalid && (control?.dirty || control?.touched) || false;
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formValue = this.form.value;

    // Get brand name
    const brand = this.brandsData().find((b: any) => b.id === formValue.brandId);
    const brandName = brand?.name || '';

    // Get product name
    const product = this.selectedProduct();
    const productName = product?.name || formValue.productId;

    // Filter and transform modifiers to match backend format
    // Backend expects: { modifierId: string, quantity: number }
    // modifierId should be the option ID (modifierOptionId), not the parent modifier ID
    const validModifiers = formValue.modifiers
      .filter((mod: any) => mod.modifierOptionId) // Only modifiers with an option selected
      .map((mod: any) => {
        // Find the modifier option to get its name
        const modifier = this.modifiersList().find(m => m.modifierId === mod.modifierId);
        const option = modifier?.options?.find((o: ModifierOption) => o.modifierOptionId === mod.modifierOptionId);
        const modifierName = option?.name || mod.modifierOptionId;

        return {
          modifierId: mod.modifierOptionId, // Use the option ID as modifierId
          modifierName: modifierName,       // Add modifier name for display
          quantity: mod.quantity
        };
      });

    const productData = {
      brandId: formValue.brandId,
      brandName: brandName,         // Add brand name
      productId: formValue.productId,
      productName: productName,     // Add product name
      quantity: formValue.quantity,
      modifiers: validModifiers
    };

    this.dialogRef.close(productData);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });

    this.modifiersArray.controls.forEach(control => {
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      }
    });
  }
}
