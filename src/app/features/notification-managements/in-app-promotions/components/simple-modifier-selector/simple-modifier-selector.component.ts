import {
  Component,
  Input,
  input,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  OnInit,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

// PrimeNG
import { MultiSelectModule } from 'primeng/multiselect';

// Services & Models
import { LoyaltyService } from '@features/notification-managements/loyalty-program/services/loyalty.service';
import { Modifier } from '@features/notification-managements/loyalty-program/models';

/**
 * Simple Modifier Selector Component
 * Selector inline de modificadores que se activa cuando hay un producto seleccionado
 * Recibe productId y brandCode, carga modificadores y permite multi-selección
 */
@Component({
  selector: 'app-simple-modifier-selector',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MultiSelectModule
  ],
  template: `
    <div class="flex flex-col gap-2">
      <label [for]="fieldId" class="font-medium text-gray-900 dark:text-white">
        {{ label }}
      </label>
      <p-multiselect
        [id]="fieldId"
        [formControl]="control"
        [options]="modifierOptions()"
        optionLabel="label"
        optionValue="value"
        [placeholder]="placeholder"
        [filter]="true"
        filterPlaceholder="Buscar modificador..."
        [loading]="isLoadingModifiers()"
        [disabled]="!isEnabled()"
        display="chip"
        [showClear]="true">
        <ng-template let-option pTemplate="item">
          <div class="flex flex-col">
            <span class="font-semibold">{{ option.label }}</span>
            @if (option.options && option.options.length > 0) {
              <span class="text-sm text-gray-600">{{ option.options.length }} opciones</span>
            }
          </div>
        </ng-template>
      </p-multiselect>
      @if (showError()) {
        <small class="text-danger-500">{{ errorMessage }}</small>
      }
      <small class="text-gray-500">{{ helperText }}</small>
    </div>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleModifierSelectorComponent implements OnInit {
  @Input({ required: true }) control!: FormControl;

  // Signal inputs para reactividad
  productId = input<string>('');
  brandCode = input<string>('');

  // Configuración
  @Input() fieldId: string = 'modifiers';
  @Input() label: string = 'Modificadores';
  @Input() placeholder: string = 'Seleccione modificadores';
  @Input() helperText: string = 'Modificadores opcionales del producto';
  @Input() errorMessage: string = 'Campo requerido';

  private readonly loyaltyService = inject(LoyaltyService);

  // ============================================================================
  // SIGNALS
  // ============================================================================

  readonly modifiers = signal<Modifier[]>([]);
  readonly isLoadingModifiers = signal(false);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly isEnabled = computed(() => {
    const prodId = this.productId();
    const brand = this.brandCode();
    return !!prodId && !!brand;
  });

  readonly modifierOptions = computed(() => {
    return this.modifiers().map(modifier => ({
      value: modifier.modifierId,
      label: modifier.name,
      options: modifier.options || []
    }));
  });

  readonly showError = computed(() => {
    return this.control?.invalid && (this.control?.dirty || this.control?.touched) || false;
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  constructor() {
    // Watch for productId and brandCode changes to load modifiers
    effect(() => {
      const prodId = this.productId();
      const brand = this.brandCode();

      console.log('🔍 SimpleModifierSelector - productId:', prodId, 'brandCode:', brand);

      if (prodId && brand) {
        this.loadModifiers(prodId, brand);
      } else {
        this.modifiers.set([]);
        this.control?.setValue([]);
        this.control?.disable();
      }
    });
  }

  ngOnInit(): void {
    // Initialize disabled state
    if (!this.isEnabled()) {
      this.control?.disable();
    }
  }

  // ============================================================================
  // METHODS
  // ============================================================================

  private loadModifiers(productId: string, brandCode: string): void {
    this.isLoadingModifiers.set(true);
    this.modifiers.set([]);

    console.log('📡 Loading modifiers for:', { productId, brandCode });

    this.loyaltyService.getModifiers(productId, brandCode).subscribe({
      next: (response) => {
        console.log('✅ Modifiers loaded:', response);
        if (response.modifiers && response.modifiers.length > 0) {
          this.modifiers.set(response.modifiers);
          this.control?.enable();
        } else {
          console.log('⚠️ No modifiers found for this product');
          this.modifiers.set([]);
          this.control?.disable();
        }
        this.isLoadingModifiers.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading modifiers:', error);
        this.modifiers.set([]);
        this.control?.disable();
        this.isLoadingModifiers.set(false);
      }
    });
  }
}
