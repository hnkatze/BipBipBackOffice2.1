import {
  Component,
  Input,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

// PrimeNG
import { SelectModule } from 'primeng/select';

// Services & Models
import { LoyaltyService } from '@features/notification-managements/loyalty-program/services/loyalty.service';
import { Product } from '@features/notification-managements/loyalty-program/models';

/**
 * Simple Product Selector Component
 * Para usar en Product Reward: solo brand → product selection
 * No maneja modifiers array (eso se mantiene como texto)
 */
@Component({
  selector: 'app-simple-product-selector',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule
  ],
  template: `
    <div class="flex flex-col gap-4" [formGroup]="form">
      <!-- Brand Selector -->
      <div class="flex flex-col gap-2">
        <label [for]="brandFieldName" class="font-medium text-gray-900 dark:text-white">
          {{ brandLabel }} <span class="text-danger-500">*</span>
        </label>
        <p-select
          [id]="brandFieldName"
          [formControlName]="brandFieldName"
          [options]="brandsOptions()"
          optionLabel="name"
          optionValue="id"
          [placeholder]="brandPlaceholder"
          [filter]="true"
          filterPlaceholder="Buscar marca..."
          [loading]="isLoadingBrands()"
          (onChange)="onBrandChange($event.value)" />
        @if (showBrandError()) {
          <small class="text-danger-500">{{ brandErrorMessage }}</small>
        }
        <small class="text-gray-500">{{ brandHelperText }}</small>
      </div>

      <!-- Product Selector -->
      <div class="flex flex-col gap-2">
        <label [for]="productFieldName" class="font-medium text-gray-900 dark:text-white">
          {{ productLabel }} <span class="text-danger-500">*</span>
        </label>
        <p-select
          [id]="productFieldName"
          [formControlName]="productFieldName"
          [options]="productOptions()"
          optionLabel="name"
          optionValue="productId"
          [placeholder]="productPlaceholder"
          [filter]="true"
          filterPlaceholder="Buscar producto..."
          [loading]="isLoadingProducts()"
          [disabled]="!hasSelectedBrand()" />
        @if (showProductError()) {
          <small class="text-danger-500">{{ productErrorMessage }}</small>
        }
        <small class="text-gray-500">{{ productHelperText }}</small>
      </div>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleProductSelectorComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) brandsData: any[] = [];

  // Field names
  @Input() brandFieldName: string = 'brandId';
  @Input() productFieldName: string = 'productCode';

  // Labels
  @Input() brandLabel: string = 'Marca';
  @Input() productLabel: string = 'Producto';

  // Placeholders
  @Input() brandPlaceholder: string = 'Seleccione marca';
  @Input() productPlaceholder: string = 'Seleccione producto';

  // Helper texts
  @Input() brandHelperText: string = 'Marca del producto';
  @Input() productHelperText: string = 'Producto a seleccionar';

  // Error messages
  @Input() brandErrorMessage: string = 'Campo requerido';
  @Input() productErrorMessage: string = 'Campo requerido';

  private readonly loyaltyService = inject(LoyaltyService);

  // ============================================================================
  // SIGNALS
  // ============================================================================

  readonly products = signal<Product[]>([]);
  readonly isLoadingProducts = signal(false);
  readonly isLoadingBrands = signal(false);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly brandsOptions = computed(() =>
    this.brandsData.map(brand => ({
      id: brand.id || brand.idBrand,
      name: brand.name || brand.nameBrand
    }))
  );

  readonly productOptions = computed(() => this.products());

  readonly hasSelectedBrand = computed(() => {
    const brandId = this.form.get(this.brandFieldName)?.value;
    return brandId && brandId > 0;
  });

  readonly showBrandError = computed(() => {
    const control = this.form.get(this.brandFieldName);
    return control?.invalid && (control?.dirty || control?.touched) || false;
  });

  readonly showProductError = computed(() => {
    const control = this.form.get(this.productFieldName);
    return control?.invalid && (control?.dirty || control?.touched) || false;
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  constructor() {
    // Watch for brand changes in form
    effect(() => {
      const brandId = this.form.get(this.brandFieldName)?.value;
      if (brandId && brandId > 0) {
        this.loadProducts(brandId);
      }
    });
  }

  ngOnInit(): void {
    // Load products if brand is already selected
    const brandId = this.form.get(this.brandFieldName)?.value;
    if (brandId && brandId > 0) {
      this.loadProducts(brandId);
    }
  }

  // ============================================================================
  // METHODS
  // ============================================================================

  onBrandChange(brandId: number): void {
    // Clear product selection when brand changes
    this.form.get(this.productFieldName)?.setValue('');
    this.products.set([]);

    if (brandId && brandId > 0) {
      this.loadProducts(brandId);
    }
  }

  private loadProducts(brandId: number): void {
    this.isLoadingProducts.set(true);
    this.products.set([]);

    this.loyaltyService.getProducts(brandId).subscribe({
      next: (products) => {
        this.products.set(products);
        this.isLoadingProducts.set(false);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.products.set([]);
        this.isLoadingProducts.set(false);
      }
    });
  }
}
