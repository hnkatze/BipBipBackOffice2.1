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
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { DialogService } from 'primeng/dynamicdialog';

// Services & Models
import { PromoCodeService } from '../../services/promo-code.service';
import { CreatePromoCode, UpdatePromoCode, PromoCodeResponse, PromoCodeType, PROMO_CODE_TYPE_OPTIONS, PromoCodeItem } from '../../models/promo-code.model';
import { GlobalDataService } from '@core/services/global-data.service';
import { LoyaltyService } from '@features/notification-managements/loyalty-program/services/loyalty.service';
import { forkJoin, tap } from 'rxjs';

// Components
import { ProductWithModifiersModalComponent } from '../../components/product-with-modifiers-modal/product-with-modifiers-modal.component';

@Component({
  selector: 'app-promo-code-form-page',
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
  providers: [MessageService, DialogService],
  templateUrl: './promo-code-form-page.component.html',
  styleUrl: './promo-code-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoCodeFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly globalDataService = inject(GlobalDataService);
  private readonly loyaltyService = inject(LoyaltyService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly promoCodeId = signal<number | null>(null);
  readonly isEditMode = computed(() => this.promoCodeId() !== null);
  readonly isLoading = signal<boolean>(false);
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

  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'Editar Código Promocional' : 'Nuevo Código Promocional'
  );

  readonly submitButtonLabel = computed(() =>
    this.isEditMode() ? 'Actualizar' : 'Crear'
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
    this.checkEditMode();
  }

  // ============================================================================
  // MÉTODOS - Form Initialization
  // ============================================================================

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.promoCodeId.set(+id);
      this.loadPromoCode(+id);
    }
  }

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
      isActive: [null],
      availableBrands: [[], Validators.required],
      availableChannels: [[], Validators.required],
      availableCities: [[], Validators.required],
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
  // MÉTODOS - Load Data
  // ============================================================================

  private loadPromoCode(id: number): void {
    this.isLoading.set(true);

    this.promoCodeService.getPromoCodeById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (promoCode) => {
          this.populateForm(promoCode);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading promo code:', error);
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el código promocional'
          });
          this.router.navigate(['/notification-managements/in-app-promotions']);
        }
      });
  }

  private populateForm(promoCode: PromoCodeResponse): void {
    // Default type to Percentage if null
    const promoType = promoCode.type ?? PromoCodeType.Percentage;

    // Convertir discountValue de backend a frontend
    let displayDiscountValue = 0;
    if (promoCode.discountValue !== null) {
      if (promoType === PromoCodeType.Percentage) {
        // Backend: 0.15 → Frontend: 15
        displayDiscountValue = promoCode.discountValue * 100;
      } else {
        // Backend: 50 → Frontend: 50
        displayDiscountValue = promoCode.discountValue;
      }
    }

    // Convertir availableBrands según el tipo
    // Si es tipo Producto, convertir array a valor único (primera marca)
    // Si es otro tipo, mantener como array
    const brandsValue = promoType === PromoCodeType.Product
      ? (promoCode.availableBrands && promoCode.availableBrands.length > 0 ? promoCode.availableBrands[0] : null)
      : (promoCode.availableBrands || []);

    this.form.patchValue({
      name: promoCode.name,
      code: promoCode.code,
      description: promoCode.description,
      startDate: promoCode.startDate ? new Date(promoCode.startDate) : new Date(),
      endDate: promoCode.endDate ? new Date(promoCode.endDate) : new Date(),
      minimumAmount: promoCode.minimumAmount,
      type: promoType,
      discountValue: displayDiscountValue,
      requireTurnOn: promoCode.requireTurnOn ?? false,
      isActive: promoCode.isActive ?? null,
      availableBrands: brandsValue,
      availableChannels: promoCode.availableChannels || [],
      availableCities: promoCode.availableCities || [],
      availableStores: promoCode.availableStores || []
    });

    // Actualizar tipo y productos
    this.selectedType.set(promoType);

    // Filtrar items válidos y enriquecer con nombres si faltan
    if (promoCode.items && promoCode.items.length > 0) {
      const validItems = promoCode.items.filter(
        item => item.productId && item.productId.trim() !== ''
      );
      if (validItems.length > 0) {
        // Para tipo Producto, usar availableBrands[0] como brandId si no está definido
        if (promoType === PromoCodeType.Product && promoCode.availableBrands && promoCode.availableBrands.length > 0) {
          const brandId = promoCode.availableBrands[0];
          validItems.forEach(item => {
            if (!item.brandId || item.brandId === 0 || item.brandId === null) {
              item.brandId = brandId;
            }
          });
        }
        // Si los items no tienen nombres, intentamos cargarlos
        this.enrichProductNames(validItems);
      }
    }

    // Actualizar validaciones después de poblar
    this.updateTypeValidations(promoType);
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
    const brandsControl = this.form.get('availableBrands');

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

    // Manejar conversión de marcas según el tipo
    if (type === PromoCodeType.Product) {
      // Si cambió a tipo Producto, convertir array a valor único
      const currentBrands = brandsControl?.value;
      if (Array.isArray(currentBrands) && currentBrands.length > 0) {
        // Tomar solo la primera marca
        brandsControl?.setValue(currentBrands[0], { emitEvent: false });
      } else if (Array.isArray(currentBrands) && currentBrands.length === 0) {
        // Si no hay marcas, dejar null
        brandsControl?.setValue(null, { emitEvent: false });
      }
      // Si ya es un valor único, dejarlo como está
    } else {
      // Si cambió de tipo Producto a otro tipo, convertir valor único a array
      const currentBrands = brandsControl?.value;
      if (!Array.isArray(currentBrands)) {
        if (currentBrands !== null && currentBrands !== undefined) {
          // Convertir a array de un elemento
          brandsControl?.setValue([currentBrands], { emitEvent: false });
        } else {
          // Si es null, poner array vacío
          brandsControl?.setValue([], { emitEvent: false });
        }
      }
    }
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
    const ref = this.dialogService.open(ProductWithModifiersModalComponent, {
      header: 'Agregar Producto',
      width: '800px',
      data: {
        brands: this.brands()
      }
    });

    ref?.onClose.subscribe((productData: PromoCodeItem | undefined) => {
      if (productData) {
        const products = [...this.selectedProducts()];
        products.push(productData);
        this.selectedProducts.set(products);

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Producto agregado correctamente'
        });
      }
    });
  }

  onRemoveProduct(index: number): void {
    const products = [...this.selectedProducts()];
    products.splice(index, 1);
    this.selectedProducts.set(products);

    this.messageService.add({
      severity: 'info',
      summary: 'Producto eliminado',
      detail: 'El producto fue removido de la lista'
    });
  }

  getBrandName(brandId: number): string {
    const brand = this.brands().find(b => b.id === brandId);
    return brand?.name || `ID: ${brandId}`;
  }

  getProductName(productId: string): string {
    // En producción, esto debería buscar en una lista de productos cargados
    return productId;
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

    if (this.isEditMode()) {
      this.updatePromoCode();
    } else {
      this.createPromoCode();
    }
  }

  private createPromoCode(): void {
    // Convertir availableBrands a array si es un valor único (tipo Producto)
    const brandsValue = this.form.value.availableBrands;
    const brandsArray = Array.isArray(brandsValue) ? brandsValue : [brandsValue];

    const formData: CreatePromoCode = {
      name: this.form.value.name,
      code: this.form.value.code.toUpperCase(), // Convertir a mayúsculas
      description: this.form.value.description,
      startDate: this.formatDateToBackend(this.form.value.startDate),
      endDate: this.formatDateToBackend(this.form.value.endDate),
      minimumAmount: this.form.value.minimumAmount,
      type: this.form.value.type, // PromoCode type (1=Percentage, 2=Fixed, 3=FreeShipping, 4=Product)
      bankId: null,
      fundingTypeId: null,
      segmentId: null,
      discountValue: this.convertDiscountValue(),
      requireTurnOn: this.form.value.requireTurnOn,
      isActive: null, // Always null by default
      availableBrands: brandsArray, // Siempre enviar como array
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

  private updatePromoCode(): void {
    const id = this.promoCodeId();
    if (!id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de código promocional no válido'
      });
      return;
    }

    // Convertir availableBrands a array si es un valor único (tipo Producto)
    const brandsValue = this.form.value.availableBrands;
    const brandsArray = Array.isArray(brandsValue) ? brandsValue : [brandsValue];

    const formData: UpdatePromoCode = {
      name: this.form.value.name,
      code: this.form.value.code.toUpperCase(), // Convertir a mayúsculas
      description: this.form.value.description,
      startDate: this.formatDateToBackend(this.form.value.startDate),
      endDate: this.formatDateToBackend(this.form.value.endDate),
      minimumAmount: this.form.value.minimumAmount,
      type: this.form.value.type, // PromoCode type (1=Percentage, 2=Fixed, 3=FreeShipping, 4=Product)
      bankId: null,
      fundingTypeId: null,
      segmentId: null,
      discountValue: this.convertDiscountValue(),
      requireTurnOn: this.form.value.requireTurnOn,
      isActive: this.form.value.isActive ?? null,
      availableBrands: brandsArray, // Siempre enviar como array
      availableChannels: this.form.value.availableChannels || [],
      availableCities: this.form.value.availableCities || [],
      availableStores: this.form.value.availableStores?.length > 0 ? this.form.value.availableStores : null,
      items: this.selectedType() === PromoCodeType.Product ? this.selectedProducts() : []
    };

    this.promoCodeService.updatePromoCode(id, formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Código promocional actualizado correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error updating promo code:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el código promocional'
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
   * Enriquece los productos con sus nombres cuando faltan
   * Se usa al cargar un PromoCode existente para mostrar nombres en vez de solo IDs
   */
  private enrichProductNames(items: PromoCodeItem[]): void {
    // Agrupar items por brandId para minimizar llamadas a la API
    const itemsByBrand = new Map<number, PromoCodeItem[]>();

    items.forEach(item => {
      if (!itemsByBrand.has(item.brandId)) {
        itemsByBrand.set(item.brandId, []);
      }
      itemsByBrand.get(item.brandId)!.push(item);
    });

    // Crear observables para cargar productos por cada marca
    const productRequests = Array.from(itemsByBrand.entries()).map(([brandId, brandItems]) => {
      return this.loyaltyService.getProducts(brandId).pipe(
        tap((products: any[]) => {
          // Enriquecer cada item con el nombre del producto
          brandItems.forEach(item => {
            const product = products.find((p: any) => p.productId === item.productId);
            if (product) {
              // Agregar nombre del producto
              item.productName = product.name || item.productId;

              // Buscar el brand name desde globalDataService
              const brand = this.brands().find(b => b.id === brandId);
              if (brand) {
                item.brandName = brand.name;
              }
            }
          });
        })
      );
    });

    // Ejecutar todas las peticiones en paralelo
    forkJoin(productRequests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Ahora cargar los modificadores para cada producto
          this.enrichModifierNames(items);
        },
        error: (error: unknown) => {
          console.error('Error cargando nombres de productos:', error);
          // Aunque falle, mostrar los productos con los datos que tengamos
          this.selectedProducts.set([...items]);
        }
      });
  }

  /**
   * Enriquece los modificadores con sus nombres
   */
  private enrichModifierNames(items: PromoCodeItem[]): void {
    // Crear observables para cargar modificadores de cada producto
    const modifierRequests = items
      .filter(item => item.modifiers && item.modifiers.length > 0)
      .map(item => {
        // Buscar el brand name para pasarlo a la API
        const brand = this.brands().find(b => b.id === item.brandId);
        const brandName = brand?.name || item.brandId.toString();

        return this.loyaltyService.getModifiers(item.productId, brandName).pipe(
          tap((response: any) => {
            // response.modifiers es un array de modificadores
            if (response.modifiers && Array.isArray(response.modifiers)) {
              item.modifiers.forEach(modifier => {
                // Buscar el modificador y la opción que coincida
                response.modifiers.forEach((mod: any) => {
                  if (mod.options && Array.isArray(mod.options)) {
                    const option = mod.options.find(
                      (opt: any) => opt.modifierOptionId === modifier.modifierId
                    );
                    if (option) {
                      modifier.modifierName = option.name || modifier.modifierId;
                    }
                  }
                });
              });
            }
          })
        );
      });

    // Si no hay modificadores que cargar, simplemente actualizar el signal
    if (modifierRequests.length === 0) {
      this.selectedProducts.set([...items]);
      return;
    }

    // Ejecutar todas las peticiones en paralelo
    forkJoin(modifierRequests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Actualizar el signal con los items enriquecidos
          this.selectedProducts.set([...items]);
        },
        error: (error: unknown) => {
          console.error('Error cargando nombres de modificadores:', error);
          // Aunque falle, mostrar los productos con los datos que tengamos
          this.selectedProducts.set([...items]);
        }
      });
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
