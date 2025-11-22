import { Component, input, output, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FileUploadModule } from 'primeng/fileupload';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule} from 'primeng/inputnumber';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { BrandService } from '../../services/brand.service';
import type { Brand, CreateBrandRequest, UpdateBrandRequest } from '../../models/brand.model';
import { ImageUploadService } from '@shared/services/image-upload.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

/**
 * BrandFormComponent - Formulario para crear/editar marcas
 *
 * Features:
 * ✅ Drawer lateral (p-sidebar)
 * ✅ Reactive Forms con validaciones
 * ✅ Upload de 3 tipos de imágenes
 * ✅ Preview de imágenes
 * ✅ Modo crear y editar
 */
@Component({
  selector: 'app-brand-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    ToggleSwitchModule,
    FileUploadModule,
    DividerModule,
    InputNumberModule,
    IconFieldModule,
    InputIconModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <p-drawer
      [(visible)]="visible"
      position="right"
      styleClass="!w-full md:!w-[600px]"
      (onHide)="onClose()"
      [header]="isEditMode() ? 'Editar Marca' : 'Nueva Marca'"
    >
      <!-- Toast -->
      <p-toast />

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Información Básica -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Información Básica
          </h3>

          <!-- Nombre -->
          <div>
            <label for="nameBrand" class="block text-sm font-medium mb-2">
              Nombre Completo <span class="text-red-500">*</span>
            </label>
            <p-iconfield class="w-full">
              <p-inputicon>
                <i class="pi pi-tag"></i>
              </p-inputicon>
              <input
                pInputText
                id="nameBrand"
                formControlName="nameBrand"
                placeholder="Ej: Pizza Hut"
                class="w-full"
              />
            </p-iconfield>
            @if (form.get('nameBrand')?.invalid && form.get('nameBrand')?.touched) {
              <small class="text-red-500">El nombre es requerido</small>
            }
          </div>

          <!-- Nombre Corto -->
          <div>
            <label for="shortNameBrand" class="block text-sm font-medium mb-2">
              Nombre Corto <span class="text-red-500">*</span>
            </label>
            <p-iconfield class="w-full">
              <p-inputicon>
                <i class="pi pi-bookmark"></i>
              </p-inputicon>
              <input
                pInputText
                id="shortNameBrand"
                formControlName="shortNameBrand"
                placeholder="Ej: PH"
                class="w-full"
              />
            </p-iconfield>
            @if (form.get('shortNameBrand')?.invalid && form.get('shortNameBrand')?.touched) {
              <small class="text-red-500">El nombre corto es requerido</small>
            }
          </div>

          <!-- Código de Pago -->
          <div>
            <label for="codePayingPosgc" class="block text-sm font-medium mb-2">
              Código de Pago
            </label>
            <p-iconfield class="w-full">
              <p-inputicon>
                <i class="pi pi-hashtag"></i>
              </p-inputicon>
              <p-inputNumber
                inputId="codePayingPosgc"
                formControlName="codePayingPosgc"
                [min]="0"
                class="w-full"
              />
            </p-iconfield>
          </div>
        </div>

        <p-divider />

        <!-- Imágenes -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Imágenes
          </h3>

          <!-- Logo Principal -->
          <div>
            <label class="block text-sm font-medium mb-2">
              Logo Principal <span class="text-red-500">*</span>
            </label>

            <!-- Zona de Drag & Drop -->
            <div
              class="relative border-2 border-dashed rounded-lg transition-all duration-200"
              [class.border-gray-300]="!isDraggingLogo()"
              [class.border-primary-500]="isDraggingLogo()"
              [class.bg-primary-50]="isDraggingLogo()"
              [class.dark:border-gray-600]="!isDraggingLogo()"
              [class.dark:bg-primary-900/20]="isDraggingLogo()"
              (dragover)="onDragOver($event, 'logo')"
              (dragleave)="onDragLeave($event, 'logo')"
              (drop)="onDrop($event, 'logo')"
            >
              <div class="p-6 text-center">
                @if (logoPreview()) {
                  <!-- Con imagen -->
                  <div class="relative inline-block">
                    <img
                      [src]="logoPreview()"
                      alt="Logo preview"
                      class="w-32 h-32 object-contain rounded mx-auto mb-3"
                    />
                    <button
                      type="button"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      (click)="clearLogo()"
                    >
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Arrastra otra imagen o haz clic para cambiar
                  </p>
                } @else {
                  <!-- Sin imagen -->
                  <i class="pi pi-cloud-upload text-5xl text-gray-400 dark:text-gray-500 mb-3 block"></i>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arrastra tu logo aquí
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    o haz clic en el botón para seleccionar
                  </p>
                }

                <!-- FileUpload -->
                <p-fileUpload
                  mode="basic"
                  [auto]="true"
                  accept="image/*"
                  [maxFileSize]="2000000"
                  chooseLabel="Seleccionar archivo"
                  chooseIcon="pi pi-folder-open"
                  (onSelect)="onLogoSelect($event)"
                  styleClass="w-full"
                />
              </div>
            </div>

            <small class="text-gray-500 dark:text-gray-400 block mt-2">
              PNG, JPG, WebP. Máximo 2MB
            </small>
          </div>

          <!-- Logo Header -->
          <div>
            <label class="block text-sm font-medium mb-2">
              Logo Header <span class="text-red-500">*</span>
            </label>

            <!-- Zona de Drag & Drop -->
            <div
              class="relative border-2 border-dashed rounded-lg transition-all duration-200"
              [class.border-gray-300]="!isDraggingLogoHeader()"
              [class.border-primary-500]="isDraggingLogoHeader()"
              [class.bg-primary-50]="isDraggingLogoHeader()"
              [class.dark:border-gray-600]="!isDraggingLogoHeader()"
              [class.dark:bg-primary-900/20]="isDraggingLogoHeader()"
              (dragover)="onDragOver($event, 'logoHeader')"
              (dragleave)="onDragLeave($event, 'logoHeader')"
              (drop)="onDrop($event, 'logoHeader')"
            >
              <div class="p-6 text-center">
                @if (logoHeaderPreview()) {
                  <!-- Con imagen -->
                  <div class="relative inline-block">
                    <img
                      [src]="logoHeaderPreview()"
                      alt="Logo header preview"
                      class="w-32 h-32 object-contain rounded mx-auto mb-3"
                    />
                    <button
                      type="button"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      (click)="clearLogoHeader()"
                    >
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Arrastra otra imagen o haz clic para cambiar
                  </p>
                } @else {
                  <!-- Sin imagen -->
                  <i class="pi pi-cloud-upload text-5xl text-gray-400 dark:text-gray-500 mb-3 block"></i>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arrastra tu logo header aquí
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    o haz clic en el botón para seleccionar
                  </p>
                }

                <!-- FileUpload -->
                <p-fileUpload
                  mode="basic"
                  [auto]="true"
                  accept="image/*"
                  [maxFileSize]="2000000"
                  chooseLabel="Seleccionar archivo"
                  chooseIcon="pi pi-folder-open"
                  (onSelect)="onLogoHeaderSelect($event)"
                  styleClass="w-full"
                />
              </div>
            </div>

            <small class="text-gray-500 dark:text-gray-400 block mt-2">
              PNG, JPG, WebP. Máximo 2MB
            </small>
          </div>

          <!-- Imagen Menú -->
          <div>
            <label class="block text-sm font-medium mb-2">
              Imagen Menú <span class="text-red-500">*</span>
            </label>

            <!-- Zona de Drag & Drop -->
            <div
              class="relative border-2 border-dashed rounded-lg transition-all duration-200"
              [class.border-gray-300]="!isDraggingImageMenu()"
              [class.border-primary-500]="isDraggingImageMenu()"
              [class.bg-primary-50]="isDraggingImageMenu()"
              [class.dark:border-gray-600]="!isDraggingImageMenu()"
              [class.dark:bg-primary-900/20]="isDraggingImageMenu()"
              (dragover)="onDragOver($event, 'imageMenu')"
              (dragleave)="onDragLeave($event, 'imageMenu')"
              (drop)="onDrop($event, 'imageMenu')"
            >
              <div class="p-6 text-center">
                @if (imageMenuPreview()) {
                  <!-- Con imagen -->
                  <div class="relative inline-block">
                    <img
                      [src]="imageMenuPreview()"
                      alt="Image menu preview"
                      class="w-32 h-32 object-contain rounded mx-auto mb-3"
                    />
                    <button
                      type="button"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                      (click)="clearImageMenu()"
                    >
                      <i class="pi pi-times text-xs"></i>
                    </button>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Arrastra otra imagen o haz clic para cambiar
                  </p>
                } @else {
                  <!-- Sin imagen -->
                  <i class="pi pi-cloud-upload text-5xl text-gray-400 dark:text-gray-500 mb-3 block"></i>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Arrastra tu imagen de menú aquí
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    o haz clic en el botón para seleccionar
                  </p>
                }

                <!-- FileUpload -->
                <p-fileUpload
                  mode="basic"
                  [auto]="true"
                  accept="image/*"
                  [maxFileSize]="2000000"
                  chooseLabel="Seleccionar archivo"
                  chooseIcon="pi pi-folder-open"
                  (onSelect)="onImageMenuSelect($event)"
                  styleClass="w-full"
                />
              </div>
            </div>

            <small class="text-gray-500 dark:text-gray-400 block mt-2">
              PNG, JPG, WebP. Máximo 2MB. Se optimizará automáticamente
            </small>
          </div>
        </div>

        <p-divider />

        <!-- Configuración -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Configuración
          </h3>

          <!-- Estado -->
          <div class="flex items-center justify-between">
            <label for="isActive" class="text-sm font-medium">
              Marca Activa
            </label>
            <p-toggleSwitch
              inputId="isActiveBrand"
              formControlName="isActiveBrand"
            />
          </div>

          <!-- Enviar Orden -->
          <div class="flex items-center justify-between">
            <label for="isSendOrder" class="text-sm font-medium">
              Enviar Orden
            </label>
            <p-toggleSwitch
              inputId="isSendOrder"
              formControlName="isSendOrder"
            />
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p-button
            label="Cancelar"
            severity="secondary"
            [outlined]="true"
            (onClick)="handleCancel()"
            styleClass="flex-1"
          />
          <p-button
            type="submit"
            [label]="isEditMode() ? 'Actualizar' : 'Crear'"
            [loading]="brandService.isLoading()"
            [disabled]="form.invalid"
            styleClass="flex-1"
          />
        </div>
      </form>
    </p-drawer>
  `,
  styles: [`
    :host ::ng-deep {
      .p-drawer-header {
        padding: 1.5rem;
      }

      .p-drawer-content {
        padding: 1.5rem;
      }

      .p-fileupload-choose {
        width: 100%;
      }
    }
  `]
})
export class BrandFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly brandService = inject(BrandService);
  private readonly imageUploadService = inject(ImageUploadService);
  private readonly messageService = inject(MessageService);

  // Inputs/Outputs
  readonly brand = input<Brand | null>(null);
  readonly onSave = output<void>();
  readonly onCancel = output<void>();

  // Signals
  visible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly logoPreview = signal<string | null>(null);
  readonly logoHeaderPreview = signal<string | null>(null);
  readonly imageMenuPreview = signal<string | null>(null);

  // Drag & Drop signals
  readonly isDraggingLogo = signal<boolean>(false);
  readonly isDraggingLogoHeader = signal<boolean>(false);
  readonly isDraggingImageMenu = signal<boolean>(false);

  // Form
  form!: FormGroup;

  constructor() {
    // Effect para detectar cuando se pasa una marca para editar
    effect(() => {
      const brandToEdit = this.brand();
      if (brandToEdit) {
        this.isEditMode.set(true);
        this.loadBrand(brandToEdit);
      }
    });
  }

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      nameBrand: ['', Validators.required],
      shortNameBrand: ['', Validators.required],
      logoBrand: ['', Validators.required],
      logoHeaderBrand: ['', Validators.required],
      imageMenuBrand: ['', Validators.required],
      codePayingPosgc: [0],
      isActiveBrand: [true],
      isSendOrder: [false],
      position: [0]
    });
  }

  private loadBrand(brand: Brand): void {
    this.form.patchValue({
      nameBrand: brand.nameBrand,
      shortNameBrand: brand.shortNameBrand,
      logoBrand: brand.logoBrand,
      logoHeaderBrand: brand.urlLogoHeader,
      imageMenuBrand: brand.imageMenuBrand,
      codePayingPosgc: brand.codePayingPosgc,
      isActiveBrand: brand.isActiveBrand,
      isSendOrder: brand.isSendOrder,
      position: brand.position
    });

    // Set previews
    this.logoPreview.set(brand.logoBrand);
    this.logoHeaderPreview.set(brand.urlLogoHeader);
    this.imageMenuPreview.set(brand.imageMenuBrand);
  }

  onLogoSelect(event: any): void {
    const file = event.files[0];
    if (file) {
      // Preview local
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);

      // TODO: Upload to server
      // For now, just set a placeholder URL
      this.form.patchValue({ logoBrand: 'https://via.placeholder.com/150' });
    }
  }

  onLogoHeaderSelect(event: any): void {
    const file = event.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoHeaderPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);

      this.form.patchValue({ logoHeaderBrand: 'https://via.placeholder.com/150' });
    }
  }

  onImageMenuSelect(event: any): void {
    const file = event.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imageMenuPreview.set(e.target.result);
      };
      reader.readAsDataURL(file);

      this.form.patchValue({ imageMenuBrand: 'https://via.placeholder.com/150' });
    }
  }

  clearLogo(): void {
    this.logoPreview.set(null);
    this.form.patchValue({ logoBrand: '' });
  }

  clearLogoHeader(): void {
    this.logoHeaderPreview.set(null);
    this.form.patchValue({ logoHeaderBrand: '' });
  }

  clearImageMenu(): void {
    this.imageMenuPreview.set(null);
    this.form.patchValue({ imageMenuBrand: '' });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const formValue = this.form.value;

    if (this.isEditMode()) {
      // Update
      const brandToUpdate = this.brand();
      if (!brandToUpdate) return;

      const updateRequest: UpdateBrandRequest = {
        nameBrand: formValue.nameBrand,
        shortNameBrand: formValue.shortNameBrand,
        logoBrand: formValue.logoBrand,
        logoHeaderBrand: formValue.logoHeaderBrand,
        imageMenuBrand: formValue.imageMenuBrand,
        codePayingPosgc: formValue.codePayingPosgc,
        isActiveBrand: formValue.isActiveBrand,
        isSendOrder: formValue.isSendOrder,
        position: formValue.position
      };

      this.brandService.updateBrand(brandToUpdate.idBrand, updateRequest).subscribe({
        next: () => {
          this.onSave.emit();
          this.onClose();
        },
        error: (error) => {
          console.error('Error actualizando marca:', error);
        }
      });
    } else {
      // Create
      const createRequest: CreateBrandRequest = {
        nameBrand: formValue.nameBrand,
        shortNameBrand: formValue.shortNameBrand,
        logoBrand: formValue.logoBrand,
        logoHeaderBrand: formValue.logoHeaderBrand,
        imageMenuBrand: formValue.imageMenuBrand,
        codePayingPosgc: formValue.codePayingPosgc,
        isActiveBrand: formValue.isActiveBrand,
        isSendOrder: formValue.isSendOrder,
        position: formValue.position
      };

      this.brandService.createBrand(createRequest).subscribe({
        next: () => {
          this.onSave.emit();
          this.onClose();
        },
        error: (error) => {
          console.error('Error creando marca:', error);
        }
      });
    }
  }

  open(): void {
    this.visible.set(true);
  }

  handleCancel(): void {
    this.onCancel.emit();
    this.onClose();
  }

  onClose(): void {
    this.visible.set(false);
    this.form.reset();
    this.logoPreview.set(null);
    this.logoHeaderPreview.set(null);
    this.imageMenuPreview.set(null);
  }

  // Drag & Drop handlers
  onDragOver(event: DragEvent, type: 'logo' | 'logoHeader' | 'imageMenu'): void {
    event.preventDefault();
    event.stopPropagation();

    if (type === 'logo') this.isDraggingLogo.set(true);
    else if (type === 'logoHeader') this.isDraggingLogoHeader.set(true);
    else if (type === 'imageMenu') this.isDraggingImageMenu.set(true);
  }

  onDragLeave(event: DragEvent, type: 'logo' | 'logoHeader' | 'imageMenu'): void {
    event.preventDefault();
    event.stopPropagation();

    if (type === 'logo') this.isDraggingLogo.set(false);
    else if (type === 'logoHeader') this.isDraggingLogoHeader.set(false);
    else if (type === 'imageMenu') this.isDraggingImageMenu.set(false);
  }

  onDrop(event: DragEvent, type: 'logo' | 'logoHeader' | 'imageMenu'): void {
    event.preventDefault();
    event.stopPropagation();

    // Reset dragging state
    if (type === 'logo') this.isDraggingLogo.set(false);
    else if (type === 'logoHeader') this.isDraggingLogoHeader.set(false);
    else if (type === 'imageMenu') this.isDraggingImageMenu.set(false);

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      console.error('Solo se permiten imágenes');
      // TODO: Mostrar toast error
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2000000) {
      console.error('La imagen no debe superar 2MB');
      // TODO: Mostrar toast error
      return;
    }

    // Procesar archivo
    this.processImageFile(file, type);
  }

  private processImageFile(file: File, type: 'logo' | 'logoHeader' | 'imageMenu'): void {
    // Primero mostrar el preview local
    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (type === 'logo') {
        this.logoPreview.set(e.target.result);
      } else if (type === 'logoHeader') {
        this.logoHeaderPreview.set(e.target.result);
      } else if (type === 'imageMenu') {
        this.imageMenuPreview.set(e.target.result);
      }
    };
    reader.readAsDataURL(file);

    // Luego subir la imagen a S3
    const timestamp = Date.now();
    const imageName = `${type}_${timestamp}`;

    this.imageUploadService.uploadBrandImage(imageName, file, true).subscribe({
      next: (url: string) => {
        // Actualizar el form con la URL real
        if (type === 'logo') {
          this.form.patchValue({ logoBrand: url });
        } else if (type === 'logoHeader') {
          this.form.patchValue({ logoHeaderBrand: url });
        } else if (type === 'imageMenu') {
          this.form.patchValue({ imageMenuBrand: url });
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Imagen subida correctamente',
          life: 2000
        });
      },
      error: (error: any) => {
        console.error('Error subiendo imagen:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo subir la imagen',
          life: 3000
        });
      }
    });
  }
}
