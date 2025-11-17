import { Component, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Location } from '@angular/common';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';

// Services & Models
import { PushInAppService } from '../../services/push-in-app.service';
import { GlobalDataService } from '@core/services/global-data.service';
import { BannerInterval, CreatePushInApp, UpdatePushInApp, PushInAppResponse } from '../../models/push-in-app.model';
import { optimizeImage, validateImageFile, formatDateForAPI, formatDateForInput } from '../../utils/push-in-app.utils';

@Component({
  selector: 'app-push-in-app-form-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    DatePickerModule,
    ToggleSwitchModule,
    ToastModule,
    FileUploadModule,
    ImageModule,
    BreadcrumbModule
  ],
  providers: [MessageService],
  templateUrl: './push-in-app-form-page.component.html',
  styleUrl: './push-in-app-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PushInAppFormPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly pushInAppService = inject(PushInAppService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly isEditModeSignal = signal<boolean>(false);
  readonly isSavingSignal = signal<boolean>(false);
  readonly isLoadingSignal = signal<boolean>(false);
  readonly isOptimizingImageSignal = signal<boolean>(false);
  readonly isUploadingImageSignal = signal<boolean>(false);

  readonly pushInAppIdSignal = signal<number | null>(null);
  readonly pushInAppDataSignal = signal<PushInAppResponse | null>(null);

  // Image signals
  readonly bannerImageFileSignal = signal<File | null>(null);
  readonly bannerImagePreviewSignal = signal<string | null>(null);

  // Data from global service
  readonly brands = this.globalDataService.brands;
  readonly cities = this.globalDataService.citiesShort;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly isEditMode = computed(() => this.isEditModeSignal());
  readonly isSaving = computed(() => this.isSavingSignal());
  readonly isLoading = computed(() => this.isLoadingSignal());

  readonly brandsOptions = computed(() => {
    return this.brands().map(brand => ({
      label: brand.name,
      value: brand.id,
      image: brand.logo
    }));
  });

  readonly citiesOptions = computed(() => {
    return this.cities().map(city => ({
      label: city.name,
      value: city.id
    }));
  });

  readonly breadcrumbItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { label: 'Gestión de Notificaciones', routerLink: '/notification-managements' },
      { label: 'Push In App', routerLink: '/notification-managements/push-in-app' }
    ];

    if (this.isEditMode()) {
      items.push({ label: 'Editar' });
    } else {
      items.push({ label: 'Nuevo' });
    }

    return items;
  });

  readonly formIsValid = computed(() => {
    if (!this.pushInAppForm.valid) return false;

    // Check if image exists (new file or existing URL)
    const hasNewImage = !!this.bannerImageFileSignal();
    const hasExistingImage = this.isEditMode() && !!this.pushInAppForm.get('pathBannerMobile')?.value;

    return hasNewImage || hasExistingImage;
  });

  // ============================================================================
  // FORM
  // ============================================================================

  readonly pushInAppForm: FormGroup = this.fb.group({
    bannerName: ['', [Validators.required, Validators.maxLength(255)]],
    pathBannerMobile: [''],
    pathBannerTablet: [''],
    startDate: [null, [Validators.required]],
    endDate: [null, [Validators.required]],
    availableBrands: [[], [Validators.required, this.minArrayLengthValidator(1)]],
    availableCities: [[], [Validators.required, this.minArrayLengthValidator(1)]],
    interval: [BannerInterval.Day, [Validators.required]],
    isActive: [true]
  });

  readonly intervalOptions = [
    { label: 'Cada hora', value: BannerInterval.Hour },
    { label: 'Cada día', value: BannerInterval.Day },
    { label: 'Cada semana', value: BannerInterval.Week },
    { label: 'Cada mes', value: BannerInterval.Month }
  ];

  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  constructor() {
    // Cargar data global si no está cargada
    effect(() => {
      if (this.brands().length === 0) {
        this.globalDataService.forceRefresh('brands');
      }
      if (this.cities().length === 0) {
        this.globalDataService.forceRefresh('citiesShort');
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Verificar si es modo edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditModeSignal.set(true);
      this.pushInAppIdSignal.set(+id);
      this.loadPushInApp(+id);
    }
  }

  // ============================================================================
  // MÉTODOS - Cargar Data
  // ============================================================================

  loadPushInApp(id: number): void {
    this.isLoadingSignal.set(true);

    this.pushInAppService.getPushInAppById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pushInApp) => {
          this.pushInAppDataSignal.set(pushInApp);
          this.loadFormData(pushInApp);
          this.isLoadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error loading push in app:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la notificación'
          });
          this.isLoadingSignal.set(false);
          this.goBack();
        }
      });
  }

  loadFormData(pushInApp: PushInAppResponse): void {
    this.pushInAppForm.patchValue({
      bannerName: pushInApp.bannerName,
      pathBannerMobile: pushInApp.pathBannerMobile,
      pathBannerTablet: pushInApp.pathBannerTablet,
      startDate: new Date(pushInApp.startDate),
      endDate: new Date(pushInApp.endDate),
      availableBrands: pushInApp.availableBrands,
      availableCities: pushInApp.availableCities,
      interval: pushInApp.interval,
      isActive: pushInApp.isActive
    });

    // Cargar preview de imagen existente
    if (pushInApp.pathBannerMobile) {
      this.bannerImagePreviewSignal.set(pushInApp.pathBannerMobile);
    }
  }

  // ============================================================================
  // MÉTODOS - Imagen
  // ============================================================================

  async onImageSelect(event: any): Promise<void> {
    const file = event.files?.[0];
    if (!file) return;

    // Validar archivo
    const validation = validateImageFile(file, 10);
    if (!validation.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: validation.error
      });
      return;
    }

    try {
      // Optimizar imagen
      this.isOptimizingImageSignal.set(true);
      const optimizedFile = await optimizeImage(file, 1200, 800, 0.75);
      this.isOptimizingImageSignal.set(false);

      // Guardar archivo y crear preview
      this.bannerImageFileSignal.set(optimizedFile);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.bannerImagePreviewSignal.set(e.target?.result as string);
      };
      reader.readAsDataURL(optimizedFile);

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Imagen optimizada correctamente'
      });
    } catch (error) {
      console.error('Error optimizing image:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo optimizar la imagen'
      });
      this.isOptimizingImageSignal.set(false);
    }
  }

  removeImage(): void {
    this.bannerImageFileSignal.set(null);
    this.bannerImagePreviewSignal.set(null);
    this.pushInAppForm.patchValue({
      pathBannerMobile: '',
      pathBannerTablet: ''
    });
  }

  // ============================================================================
  // MÉTODOS - Submit
  // ============================================================================

  async onSubmit(): Promise<void> {
    if (!this.formIsValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    this.isSavingSignal.set(true);

    try {
      // Subir imagen si hay una nueva
      let imagePath = this.pushInAppForm.get('pathBannerMobile')?.value;

      if (this.bannerImageFileSignal()) {
        this.isUploadingImageSignal.set(true);
        imagePath = await this.uploadImage(this.bannerImageFileSignal()!);
        this.isUploadingImageSignal.set(false);
      }

      // Preparar datos
      const formValue = this.pushInAppForm.value;
      const data: CreatePushInApp | UpdatePushInApp = {
        bannerName: formValue.bannerName,
        pathBannerMobile: imagePath,
        pathBannerTablet: imagePath, // Mismo path para ambos
        startDate: formatDateForAPI(formValue.startDate)!,
        endDate: formatDateForAPI(formValue.endDate)!,
        availableBrands: formValue.availableBrands,
        availableCities: formValue.availableCities,
        interval: formValue.interval,
        isActive: formValue.isActive
      };

      // Crear o actualizar
      if (this.isEditMode()) {
        await this.updatePushInApp(this.pushInAppIdSignal()!, data as UpdatePushInApp);
      } else {
        await this.createPushInApp(data as CreatePushInApp);
      }
    } catch (error) {
      console.error('Error saving push in app:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la notificación'
      });
      this.isSavingSignal.set(false);
      this.isUploadingImageSignal.set(false);
    }
  }

  private uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.pushInAppService.uploadImage(file)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (url) => resolve(url),
          error: (error) => reject(error)
        });
    });
  }

  private createPushInApp(data: CreatePushInApp): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pushInAppService.createPushInApp(data)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Notificación creada correctamente'
            });
            this.isSavingSignal.set(false);
            setTimeout(() => this.goBack(), 1000);
            resolve();
          },
          error: (error) => {
            reject(error);
          }
        });
    });
  }

  private updatePushInApp(id: number, data: UpdatePushInApp): Promise<void> {
    return new Promise((resolve, reject) => {
      this.pushInAppService.updatePushInApp(id, data)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Notificación actualizada correctamente'
            });
            this.isSavingSignal.set(false);
            setTimeout(() => this.goBack(), 1000);
            resolve();
          },
          error: (error) => {
            reject(error);
          }
        });
    });
  }

  // ============================================================================
  // MÉTODOS - Navegación
  // ============================================================================

  goBack(): void {
    this.location.back();
  }

  // ============================================================================
  // VALIDADORES CUSTOM
  // ============================================================================

  private minArrayLengthValidator(min: number) {
    return (control: any) => {
      if (!control.value || !Array.isArray(control.value)) {
        return { minArrayLength: true };
      }
      return control.value.length >= min ? null : { minArrayLength: true };
    };
  }
}
