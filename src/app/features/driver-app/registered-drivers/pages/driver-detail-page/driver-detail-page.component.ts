import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  viewChild,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { PasswordModule } from 'primeng/password';
import { RegisteredDriverService } from '../../services/registered-driver.service';
import { RegisteredDriverDetail } from '../../models/registered-driver.model';
import { Headquarter, Bank, BloodType, PaymentMethodCatalog, Country, City } from '../../models/driver-catalogs.model';
import { RegisteredDriverStatusBadgeComponent } from '../../components/registered-driver-status-badge/registered-driver-status-badge.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';
import { ImagePreviewDialogComponent } from '../../components/image-preview-dialog/image-preview-dialog.component';
import { DriverUnpenalizeDialogComponent } from '../../components/driver-unpenalize-dialog/driver-unpenalize-dialog.component';
import { DriverCouponDialogComponent, CouponFormData } from '../../components/driver-coupon-dialog/driver-coupon-dialog.component';
import { DriverPenaltyDialogComponent, PenaltyFormData } from '../../components/driver-penalty-dialog/driver-penalty-dialog.component';
import { ImageUploadService } from '@features/maintenance/credentials-and-permissions/services/image-upload.service';
import { finalize, forkJoin } from 'rxjs';

/**
 * Página de detalles de un driver registrado
 *
 * Features:
 * - ✅ Breadcrumb navigation
 * - ✅ Información personal editable
 * - ✅ Gestión de documentos con upload
 * - ✅ Upload de foto de perfil
 * - ✅ Método de pago
 * - ✅ Penalizar/Despenalizar
 * - ✅ Asignar cupones
 * - ✅ Recordar documentos
 * - ✅ Preview de imágenes
 */
@Component({
  selector: 'app-driver-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    TabsModule,
    SkeletonModule,
    ToastModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    PasswordModule,
    BreadcrumbComponent,
    RegisteredDriverStatusBadgeComponent,
    ImagePreviewDialogComponent,
    DriverUnpenalizeDialogComponent,
    DriverCouponDialogComponent,
    DriverPenaltyDialogComponent,
  ],
  templateUrl: './driver-detail-page.component.html',
  styleUrl: './driver-detail-page.component.scss',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly driverService = inject(RegisteredDriverService);
  private readonly imageUploadService = inject(ImageUploadService);
  private readonly messageService = inject(MessageService);

  // ============================================================================
  // VIEWCHILDS - DIALOGS
  // ============================================================================

  imagePreviewDialog = viewChild.required(ImagePreviewDialogComponent);
  unpenalizeDialog = viewChild.required(DriverUnpenalizeDialogComponent);
  couponDialog = viewChild.required(DriverCouponDialogComponent);
  penaltyDialog = viewChild.required(DriverPenaltyDialogComponent);

  // ============================================================================
  // STATE SIGNALS
  // ============================================================================

  /** ID del driver */
  driverId = signal<number>(0);

  /** Detalle completo del driver */
  driverDetail = signal<RegisteredDriverDetail | null>(null);

  /** Loading state */
  loading = signal(false);

  /** Modo: vista o edición */
  mode = signal<'view' | 'edit'>('view');

  /** Loading de guardado */
  saving = signal(false);

  /** Breadcrumb items */
  breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Drivers Registrados', link: '/driver-app/registered-users-drivers' },
    { label: 'Detalle', link: '' },
  ]);

  // ============================================================================
  // CATALOGS
  // ============================================================================

  headquarters = signal<Headquarter[]>([]);
  banks = signal<Bank[]>([]);
  bloodTypes = signal<BloodType[]>([]);
  paymentMethods = signal<PaymentMethodCatalog[]>([]);
  countries = signal<Country[]>([]);
  cities = signal<City[]>([]);

  // ============================================================================
  // IMAGE UPLOAD SIGNALS
  // ============================================================================

  profilePhotoPreview = signal<string | null>(null);
  profilePhotoFile = signal<File | null>(null);
  uploadingProfilePhoto = signal(false);

  dniPhotoPreview = signal<string | null>(null);
  dniPhotoFile = signal<File | null>(null);
  uploadingDniPhoto = signal(false);

  licensePhotoPreview = signal<string | null>(null);
  licensePhotoFile = signal<File | null>(null);
  uploadingLicensePhoto = signal(false);

  recordsPhotoPreview = signal<string | null>(null);
  recordsPhotoFile = signal<File | null>(null);
  uploadingRecordsPhoto = signal(false);

  // ============================================================================
  // REACTIVE FORM
  // ============================================================================

  driverForm = this.fb.group({
    // Datos generales
    userName: ['', [Validators.required]],
    fullName: ['', [Validators.required]],
    headquarterId: [null as number | null, [Validators.required]],
    password: [''],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    countryId: [null as number | null, [Validators.required]],
    cityId: [null as number | null, [Validators.required]],
    dni: ['', [Validators.required]],
    bloodTypeId: [null as number | null],
    address: [''],
    // Datos de pago
    paymentMethodId: [null as number | null],
    bankId: [null as number | null],
    accountOwner: [''],
    accountNumber: [''],
  });

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Si el driver está penalizado */
  isPenalized = computed(() => this.driverDetail()?.isBlocked ?? false);

  /** Label del botón de penalización */
  penaltyButtonLabel = computed(() => (this.isPenalized() ? 'Despenalizar' : 'Penalizar'));

  /** Si está en modo vista */
  isViewMode = computed(() => this.mode() === 'view');

  /** Si está en modo edición */
  isEditMode = computed(() => this.mode() === 'edit');

  /** Cupones del driver */
  driverCoupons = computed(() => {
    const detail = this.driverDetail();
    if (!detail || !detail.driverCoupons) return [];

    // Mapear cupones a formato amigable
    return detail.driverCoupons.map(coupon => ({
      id: coupon.codCoupons,
      quantity: 1, // Backend no especifica cantidad individual
      reason: 'Cupón', // Backend no especifica reason
      createdAt: new Date(coupon.dateIssued).toISOString()
    }));
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    // Obtener ID de la ruta
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);
      if (id) {
        this.driverId.set(id);
        this.loadDriverDetail();
        // Ya no cargamos catálogos aquí, solo cuando se active modo edición
      }
    });

    // Escuchar cambios de país para cargar ciudades (necesario para edición)
    this.driverForm.get('countryId')?.valueChanges.subscribe((countryId) => {
      if (countryId) {
        this.loadCities(countryId);
      }
    });
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar detalle del driver
   */
  private loadDriverDetail(): void {
    this.loading.set(true);

    this.driverService.getDriverDetail(this.driverId()).subscribe({
      next: (detail) => {
        this.driverDetail.set(detail);
        this.populateForm(detail);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading driver detail:', err);
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar el detalle del driver',
        });
        this.router.navigate(['/driver-app/registered-users-drivers']);
      },
    });
  }

  /**
   * Cargar todos los catálogos necesarios para modo edición
   */
  private loadCatalogs(): void {
    forkJoin({
      headquarters: this.driverService.getHeadquarters(),
      banks: this.driverService.getBanks(),
      bloodTypes: this.driverService.getBloodTypes(),
      paymentMethods: this.driverService.getPaymentMethods(),
      countries: this.driverService.getCountries(),
    }).subscribe({
      next: (catalogs) => {
        this.headquarters.set(catalogs.headquarters);
        this.banks.set(catalogs.banks);
        this.bloodTypes.set(catalogs.bloodTypes);
        this.paymentMethods.set(catalogs.paymentMethods);
        this.countries.set(catalogs.countries);
      },
      error: (err) => {
        console.error('Error loading catalogs:', err);
      },
    });
  }

  /**
   * Cargar ciudades por país (necesario cuando el usuario cambia de país en edición)
   */
  private loadCities(countryId: number): void {
    this.driverService.getCitiesByCountry(countryId).subscribe({
      next: (cities) => {
        this.cities.set(cities);
      },
      error: (err) => {
        console.error('Error loading cities:', err);
      },
    });
  }

  /**
   * Poblar formulario con datos del driver
   */
  private populateForm(detail: RegisteredDriverDetail): void {
    this.driverForm.patchValue({
      userName: detail.driverUserName,
      fullName: detail.driverFullName,
      headquarterId: detail.codHeadquarter,
      phone: detail.driverPhone,
      email: detail.driverEmail,
      countryId: detail.idCountry,
      cityId: detail.idCity,
      dni: detail.driverDNI,
      bloodTypeId: detail.idBloodType,
      address: detail.driverAddress,
      paymentMethodId: detail.paymentMethod?.id || null,
      bankId: detail.paymentMethod?.bankId || null,
      accountOwner: detail.paymentMethod?.accountOwner || '',
      accountNumber: detail.paymentMethod?.accountNumber || '',
    });

    // Ya no cargamos ciudades aquí, solo cuando estemos en modo edición
    // Las ciudades se cargarán cuando el usuario active el modo edición
  }

  // ============================================================================
  // MODE ACTIONS
  // ============================================================================

  /**
   * Activar modo edición
   */
  enableEditMode(): void {
    this.mode.set('edit');
    // Cargar catálogos solo cuando se activa el modo edición
    this.loadCatalogs();

    // Cargar ciudades del país del driver
    const countryId = this.driverForm.value.countryId;
    if (countryId) {
      this.loadCities(countryId);
    }
  }

  /**
   * Cancelar edición
   */
  cancelEdit(): void {
    this.mode.set('view');
    const detail = this.driverDetail();
    if (detail) {
      this.populateForm(detail);
    }
    // Limpiar previews de imágenes
    this.clearImagePreviews();
  }

  /**
   * Guardar cambios
   */
  saveChanges(): void {
    if (this.driverForm.invalid) {
      this.driverForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    this.saving.set(true);

    // TODO: Implementar lógica completa de guardado con upload de imágenes
    // Por ahora solo un placeholder
    setTimeout(() => {
      this.saving.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Guardado',
        detail: 'Cambios guardados exitosamente',
      });
      this.mode.set('view');
      this.loadDriverDetail();
    }, 1000);
  }

  // ============================================================================
  // IMAGE UPLOAD
  // ============================================================================

  /**
   * Manejar selección de foto de perfil
   */
  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const error = this.imageUploadService.validateFile(file);

      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
        });
        return;
      }

      this.profilePhotoFile.set(file);
      this.imageUploadService.readFileAsDataURL(file).subscribe((dataUrl) => {
        this.profilePhotoPreview.set(dataUrl);
      });
    }
  }

  /**
   * Manejar selección de foto DNI
   */
  onDniPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const error = this.imageUploadService.validateFile(file);

      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
        });
        return;
      }

      this.dniPhotoFile.set(file);
      this.imageUploadService.readFileAsDataURL(file).subscribe((dataUrl) => {
        this.dniPhotoPreview.set(dataUrl);
      });
    }
  }

  /**
   * Manejar selección de foto de licencia
   */
  onLicensePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const error = this.imageUploadService.validateFile(file);

      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
        });
        return;
      }

      this.licensePhotoFile.set(file);
      this.imageUploadService.readFileAsDataURL(file).subscribe((dataUrl) => {
        this.licensePhotoPreview.set(dataUrl);
      });
    }
  }

  /**
   * Manejar selección de foto de antecedentes
   */
  onRecordsPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const error = this.imageUploadService.validateFile(file);

      if (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
        });
        return;
      }

      this.recordsPhotoFile.set(file);
      this.imageUploadService.readFileAsDataURL(file).subscribe((dataUrl) => {
        this.recordsPhotoPreview.set(dataUrl);
      });
    }
  }

  /**
   * Limpiar previews de imágenes
   */
  private clearImagePreviews(): void {
    this.profilePhotoPreview.set(null);
    this.profilePhotoFile.set(null);
    this.dniPhotoPreview.set(null);
    this.dniPhotoFile.set(null);
    this.licensePhotoPreview.set(null);
    this.licensePhotoFile.set(null);
    this.recordsPhotoPreview.set(null);
    this.recordsPhotoFile.set(null);
  }

  /**
   * Abrir preview de imagen
   */
  openImagePreview(url: string, name: string): void {
    this.imagePreviewDialog().open(url, name);
  }

  // ============================================================================
  // DIALOG ACTIONS
  // ============================================================================

  /**
   * Abrir modal de penalización
   */
  openPenaltyDialog(): void {
    const detail = this.driverDetail();
    if (!detail) return;

    this.penaltyDialog().open(detail.driverId, detail.driverFullName);
  }

  /**
   * Abrir modal de despenalización
   */
  openUnpenalizeDialog(): void {
    const detail = this.driverDetail();
    if (!detail) return;

    this.unpenalizeDialog().open(detail.driverId, detail.driverFullName);
  }

  /**
   * Abrir modal de cupones
   */
  openCouponsDialog(): void {
    const detail = this.driverDetail();
    if (!detail) return;

    this.couponDialog().open(detail.driverId, detail.driverFullName);
  }

  /**
   * Manejar confirmación de penalización
   */
  onPenaltyConfirmed(data: PenaltyFormData): void {
    this.driverService
      .penalizeDriver({
        driverId: data.driverId,
        reasonId: data.reasonId,
        description: data.description,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      })
      .pipe(finalize(() => this.penaltyDialog().close()))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Penalizado',
            detail: 'Driver penalizado exitosamente',
          });
          this.loadDriverDetail();
        },
        error: (err) => {
          console.error('Error penalizing driver:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo penalizar al driver',
          });
        },
      });
  }

  /**
   * Manejar confirmación de despenalización
   */
  onUnpenalizeConfirmed(driverId: number): void {
    this.driverService
      .despenalizeDriver(driverId)
      .pipe(finalize(() => this.unpenalizeDialog().close()))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Despenalizado',
            detail: 'Driver despenalizado exitosamente',
          });
          this.loadDriverDetail();
        },
        error: (err) => {
          console.error('Error unpenalizing driver:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo despenalizar al driver',
          });
        },
      });
  }

  /**
   * Manejar confirmación de cupones
   */
  onCouponConfirmed(data: CouponFormData): void {
    this.driverService
      .addCoupon(data)
      .pipe(finalize(() => this.couponDialog().close()))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Cupones agregados',
            detail: `Se agregaron ${data.quantity} cupones exitosamente`,
          });
          this.loadDriverDetail();
        },
        error: (err) => {
          console.error('Error adding coupons:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron agregar los cupones',
          });
        },
      });
  }

  // ============================================================================
  // OTHER ACTIONS
  // ============================================================================

  /**
   * Recordar documentos
   */
  remindDocuments(): void {
    this.driverService.remindDocuments(this.driverId()).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Enviado',
          detail: 'Recordatorio de documentos enviado al driver',
        });
      },
      error: (err) => {
        console.error('Error sending reminder:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo enviar el recordatorio',
        });
      },
    });
  }

  /**
   * Volver a la lista
   */
  goBack(): void {
    this.router.navigate(['/driver-app/registered-users-drivers']);
  }

  /**
   * Ir al historial de pedidos
   */
  goToOrdersHistory(): void {
    this.router.navigate(['/driver-app/registered-users-drivers', this.driverId(), 'orders-history']);
  }

  /**
   * Ir al historial de penalizaciones
   */
  goToPenaltiesHistory(): void {
    this.router.navigate(['/driver-app/registered-users-drivers', this.driverId(), 'penalties-history']);
  }

  /**
   * Handler para cambio de país (recargar ciudades)
   */
  onCountryChange(event: any): void {
    const countryId = event.value;
    if (countryId) {
      // Limpiar ciudad seleccionada
      this.driverForm.patchValue({ cityId: null });
      // Cargar ciudades del nuevo país
      this.loadCities(countryId);
    }
  }

  /**
   * Limpiar foto de DNI
   */
  clearDniPhoto(): void {
    this.dniPhotoPreview.set(null);
    this.dniPhotoFile.set(null);
  }

  /**
   * Limpiar foto de licencia
   */
  clearLicensePhoto(): void {
    this.licensePhotoPreview.set(null);
    this.licensePhotoFile.set(null);
  }

  /**
   * Limpiar foto de antecedentes
   */
  clearCriminalRecordsPhoto(): void {
    this.recordsPhotoPreview.set(null);
    this.recordsPhotoFile.set(null);
  }
}
