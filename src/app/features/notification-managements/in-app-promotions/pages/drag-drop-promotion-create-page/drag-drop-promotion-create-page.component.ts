import { Component, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Services & Models
import { DragDropPromotionService } from '../../services/drag-drop-promotion.service';
import { CreateDragDropPromotion } from '../../models/drag-drop-promotion.model';
import { GlobalDataService } from '@core/services/global-data.service';
import { ImageUploadService } from '@shared/services/image-upload.service';

// Components
import { DragDropPromotionPreviewComponent, PromotionPreviewData } from '../../components/drag-drop-promotion-preview/drag-drop-promotion-preview.component';

@Component({
  selector: 'app-drag-drop-promotion-create-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DatePickerModule,
    ToggleSwitchModule,
    MultiSelectModule,
    ToastModule,
    DragDropPromotionPreviewComponent
  ],
  providers: [MessageService],
  templateUrl: './drag-drop-promotion-create-page.component.html',
  styleUrl: './drag-drop-promotion-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DragDropPromotionCreatePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly dragDropPromotionService = inject(DragDropPromotionService);
  private readonly globalDataService = inject(GlobalDataService);
  private readonly imageUploadService = inject(ImageUploadService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly isSaving = signal<boolean>(false);
  readonly isUploadingImage = signal<boolean>(false);
  readonly productImagePreview = signal<string>('');

  // Data global
  readonly brands = this.globalDataService.brands;
  readonly channels = this.globalDataService.channels;

  // ============================================================================
  // FORM
  // ============================================================================

  form!: FormGroup;

  // Opciones para selects
  readonly prefixBannerOptions = [
    { value: 'Desde', label: 'Desde' },
    { value: 'Hasta', label: 'Hasta' }
  ];

  readonly promotionTypeOptions = [
    { value: '6x4', label: '6x4' },
    { value: '5x8', label: '5x8' },
    { value: '7x8', label: '7x8' }
  ];

  readonly actionTypeOptions = [
    { value: 'redirect', label: 'Redireccionar' },
    { value: 'clipboard', label: 'Copiar y Pegar' }
  ];

  // Media positions dinámicas según promotion type
  readonly availableMediaPositions = signal<{ value: string; label: string }[]>([]);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly brandsOptions = computed(() =>
    this.brands().map(brand => ({
      id: brand.id,
      name: brand.name,
      logo: brand.logo
    }))
  );

  readonly channelsOptions = computed(() =>
    this.channels().map(channel => ({
      id: channel.id,
      description: channel.description
    }))
  );

  readonly isActionTypeRedirect = computed(() =>
    this.form?.get('actionType')?.value === 'redirect'
  );

  readonly isActionTypeClipboard = computed(() =>
    this.form?.get('actionType')?.value === 'clipboard'
  );

  // ============================================================================
  // PREVIEW DATA
  // ============================================================================

  /**
   * Signal que se actualiza con los cambios del form para el preview
   */
  readonly formValues = signal<any>({});

  readonly previewData = computed<PromotionPreviewData>(() => {
    const values = this.formValues();
    const selectedBrands = values.availableBrands || [];
    const firstBrandId = selectedBrands[0];
    const brandData = this.brands().find(b => b.id === firstBrandId);

    return {
      title: values.title || 'Título de la promoción',
      description: values.description || 'Descripción de la promoción',
      banner: values.banner || '',
      prefixBanner: values.prefixBanner || '',
      mediaUrl: values.mediaUrl || '',
      mediaPosition: values.mediaPosition || 'top',
      promotionType: values.promotionType || '6x4',
      actionType: values.actionType || '',
      brandLogo: brandData?.logo || '',
      brandName: brandData?.name || '',
      productImage: this.productImagePreview() || values.mediaUrl || '',  // Usar mediaUrl como productImage
      recentlyAdded: values.recentlyAdded || false
    };
  });

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
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      banner: ['', Validators.required],
      prefixBanner: [''],
      mediaUrl: ['', Validators.required],  // URL de la imagen del producto
      mediaPosition: ['top', Validators.required],
      promotionType: ['6x4', Validators.required],
      actionType: ['', Validators.required],
      recentlyAdded: [false],
      promoStartDate: [today, Validators.required],
      promoEndDate: [tomorrow, Validators.required],
      availableBrands: [[], Validators.required],
      availableChannels: [[]],
      availableStores: [[]],
      productId: [''],
      promoCode: ['']
    });

    // Inicializar media positions para el tipo por defecto
    this.updateAvailableMediaPositions('6x4');

    // Configurar validación de end date
    const endDateControl = this.form.get('promoEndDate');
    endDateControl?.setValidators([
      Validators.required,
      this.endDateValidator.bind(this)
    ]);

    // Suscribirse a cambios de promotion type
    this.form.get('promotionType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.updateAvailableMediaPositions(type);
      });

    // Suscribirse a cambios de action type
    this.form.get('actionType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(actionType => {
        this.updateActionTypeValidations(actionType);
      });

    // Suscribirse a cambios del form completo para actualizar preview
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(values => {
        this.formValues.set(values);
      });

    // Inicializar formValues con valores iniciales
    this.formValues.set(this.form.value);
  }

  // ============================================================================
  // MÉTODOS - Validaciones y Lógica Condicional
  // ============================================================================

  private endDateValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = this.form?.get('promoStartDate')?.value;
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

  private updateAvailableMediaPositions(promotionType: string): void {
    const positionsMap: Record<string, { value: string; label: string }[]> = {
      '6x4': [
        { value: 'top', label: 'Arriba' },
        { value: 'bottom', label: 'Abajo' }
      ],
      '5x8': [
        { value: 'left', label: 'Izquierda' },
        { value: 'right', label: 'Derecha' }
      ],
      '7x8': [
        { value: 'full', label: 'Completo' }
      ]
    };

    this.availableMediaPositions.set(positionsMap[promotionType] || []);

    // Actualizar mediaPosition al primer valor disponible
    const firstPosition = positionsMap[promotionType]?.[0]?.value;
    if (firstPosition) {
      this.form.get('mediaPosition')?.setValue(firstPosition);
    }
  }

  private updateActionTypeValidations(actionType: string): void {
    const productIdControl = this.form.get('productId');
    const promoCodeControl = this.form.get('promoCode');

    if (actionType === 'redirect') {
      productIdControl?.setValidators([Validators.required]);
      promoCodeControl?.clearValidators();
      promoCodeControl?.setValue('');
    } else if (actionType === 'clipboard') {
      promoCodeControl?.setValidators([Validators.required]);
      productIdControl?.clearValidators();
      productIdControl?.setValue('');
    }

    productIdControl?.updateValueAndValidity();
    promoCodeControl?.updateValueAndValidity();
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
    if (control.hasError('endDateInvalid')) return 'La fecha de fin debe ser posterior a la fecha de inicio';

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

    const formData: CreateDragDropPromotion = {
      title: this.form.value.title,
      description: this.form.value.description || '',
      banner: this.form.value.banner,
      prefixBanner: this.form.value.prefixBanner || '',
      mediaUrl: this.form.value.mediaUrl,  // URL de la imagen del producto
      mediaPosition: this.form.value.mediaPosition,
      promotionType: this.form.value.promotionType,
      actionType: this.form.value.actionType,
      recentlyAdded: this.form.value.recentlyAdded,
      promoStartDate: this.formatDateToISO(this.form.value.promoStartDate),
      promoEndDate: this.formatDateToISO(this.form.value.promoEndDate),
      availableBrands: this.form.value.availableBrands,
      availableChannels: this.form.value.availableChannels || [],
      availableStores: this.form.value.availableStores || [],
      productId: this.form.value.productId || '',
      promoCode: this.form.value.promoCode || ''
    };

    this.dragDropPromotionService.createDragDropPromotion(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Promoción creada correctamente'
          });
          setTimeout(() => {
            this.router.navigate(['/notification-managements/in-app-promotions']);
          }, 1500);
        },
        error: (error) => {
          console.error('Error creating promotion:', error);
          this.isSaving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo crear la promoción'
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

  private formatDateToISO(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString();
    }
    return new Date(date).toISOString();
  }

  // ============================================================================
  // MÉTODOS - Image Upload
  // ============================================================================

  /**
   * Maneja el upload de la imagen del producto
   */
  onProductImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validar tipo de archivo y tamaño
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Solo se permiten archivos PNG, JPG o JPEG'
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'El archivo no debe superar los 5MB'
      });
      return;
    }

    // Crear preview temporal
    const previewUrl = URL.createObjectURL(file);
    this.productImagePreview.set(previewUrl);

    // Subir imagen a S3 con optimización
    this.isUploadingImage.set(true);

    const timestamp = Date.now();
    const imageName = `promotion_${timestamp}`;

    this.imageUploadService.createStorageForImage(imageName, file, {
      folder: 'promotions',
      removeSpaces: true,
      optimize: true,
      maxWidth: 750,
      maxHeight: 750,
      quality: 0.8,
      format: 'webp',
      maxSizeKB: 200
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => {
          this.isUploadingImage.set(false);
          this.form.patchValue({
            mediaUrl: url  // Guardar en mediaUrl
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Imagen subida correctamente'
          });
        },
        error: (error) => {
          this.isUploadingImage.set(false);
          this.productImagePreview.set('');
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al subir la imagen. Intente nuevamente.'
          });
          console.error('Error uploading image:', error);
        }
      });
  }

  /**
   * Remueve la imagen del producto
   */
  onRemoveProductImage(): void {
    const currentPreview = this.productImagePreview();
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }
    this.productImagePreview.set('');
    this.form.patchValue({
      mediaUrl: ''  // Limpiar mediaUrl
    });
  }
}
