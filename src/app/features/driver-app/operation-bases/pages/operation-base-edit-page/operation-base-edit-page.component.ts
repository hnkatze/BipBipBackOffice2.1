import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FieldsetModule } from 'primeng/fieldset';
import { ChipModule } from 'primeng/chip';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

// Shared Components
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';

// Feature Components
import { DriverSelectorModalComponent } from '../../components/driver-selector-modal/driver-selector-modal.component';

// Models and Services
import { OperationBaseService } from '../../services/operation-base.service';
import {
  OperationBaseDetail,
  DriverUnassigned,
  DriverAssigned,
  EditOperationBaseRequest,
} from '../../models/operation-base.model';

/**
 * Página para editar una base de operaciones existente
 *
 * Features:
 * - Form con datos precargados
 * - Modal para agregar/remover drivers
 * - Validación en tiempo real
 * - Tracking de cambios (drivers agregados/removidos)
 */
@Component({
  selector: 'app-operation-base-edit-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    FieldsetModule,
    ChipModule,
    ToastModule,
    SkeletonModule,
    BreadcrumbComponent,
    DriverSelectorModalComponent,
  ],
  templateUrl: './operation-base-edit-page.component.html',
  styleUrls: ['./operation-base-edit-page.component.scss'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationBaseEditPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly operationBaseService = inject(OperationBaseService);
  private readonly messageService = inject(MessageService);

  // ViewChilds para modals
  readonly driverModal = viewChild.required(DriverSelectorModalComponent);

  // ============================================================================
  // SIGNALS
  // ============================================================================

  /** Loading states */
  readonly loading = signal(false);
  readonly saving = signal(false);

  /** ID de la base */
  readonly baseId = signal<number | null>(null);

  /** Detalles originales de la base */
  readonly originalBase = signal<OperationBaseDetail | null>(null);

  /** Drivers originales (al cargar) */
  readonly originalDrivers = signal<DriverAssigned[]>([]);

  /** Drivers actualmente seleccionados */
  readonly selectedDrivers = signal<DriverUnassigned[]>([]);

  /** Breadcrumb */
  readonly breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Bases de Operaciones', link: '/driver-app/operation-bases' },
    { label: 'Editar Base', link: '' },
  ]);

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /** Cantidad de drivers seleccionados */
  readonly driversCount = computed(() => this.selectedDrivers().length);

  /** Error si headquarterSize <= driversCount */
  readonly headquarterSizeError = computed(() => {
    const size = this.baseForm.value.headquarterSize;
    const count = this.driversCount();
    return size !== null && size !== undefined && size <= count;
  });

  /** Form es válido para guardar */
  readonly canSave = computed(() => {
    const status = this.formStatus();
    const formValid = status === 'VALID';
    const noSizeError = !this.headquarterSizeError();

    return formValid && noSizeError;
  });

  /** Drivers a agregar (nuevos) */
  readonly driversToAssign = computed(() => {
    const current = this.selectedDrivers();
    const original = this.originalDrivers();
    const originalIds = new Set(original.map((d) => d.driverId));

    return current.filter((d) => !originalIds.has(d.driverId)).map((d) => d.driverId);
  });

  /** Drivers a remover */
  readonly driversToUnassign = computed(() => {
    const current = this.selectedDrivers();
    const original = this.originalDrivers();
    const currentIds = new Set(current.map((d) => d.driverId));

    return original.filter((d) => !currentIds.has(d.driverId)).map((d) => d.driverId);
  });

  // ============================================================================
  // FORM
  // ============================================================================

  readonly baseForm = this.fb.group({
    // Boxes
    numberBoxBegin: ['', [Validators.required]],
    numberBoxEnd: ['', [Validators.required]],
    numberCurrent: ['', [Validators.required]],
    headquarterSize: [null as number | null, [Validators.required, Validators.min(1)]],

    // Contacto
    contactName: ['', [Validators.required]],
    contactNumber: ['', [Validators.required]],
  });

  // Convertir el estado del form a signal reactivo
  readonly formStatus = toSignal(this.baseForm.statusChanges, {
    initialValue: this.baseForm.status,
  });

  ngOnInit(): void {
    // Obtener ID de la ruta
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const headquarterId = parseInt(id, 10);
      this.baseId.set(headquarterId);
      this.loadBaseDetails(headquarterId);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de base no válido',
      });
      this.goBack();
    }
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar detalles de la base y poblar el form
   */
  private loadBaseDetails(id: number): void {
    this.loading.set(true);

    this.operationBaseService.getOperationBaseDetail(id).subscribe({
      next: (details) => {
        this.originalBase.set(details);
        this.originalDrivers.set(details.listDriver);

        // Convertir drivers asignados a formato DriverUnassigned para el modal
        const driversAsUnassigned: DriverUnassigned[] = details.listDriver.map((d) => ({
          driverId: d.driverId,
          driverFullName: d.driverName,
          driverPhone: d.driverPhoneNumb,
          driverEmail: d.driverEmail,
          idCity: d.driverCityId,
          idCountry: d.driverCountryId,
          driverCreatedAt: d.driverDateAdd,
        }));

        this.selectedDrivers.set(driversAsUnassigned);

        // Poblar el form con los datos
        this.baseForm.patchValue({
          numberBoxBegin: details.numberBoxBegin,
          numberBoxEnd: details.numberBoxEnd,
          numberCurrent: details.numberCurrent,
          headquarterSize: parseInt(details.headquarterSize, 10),
          contactName: details.contactName,
          contactNumber: details.contactNumber,
        });

        // Actualizar breadcrumb
        this.breadcrumbItems.set([
          { label: 'Driver App', link: '/driver-app' },
          { label: 'Bases de Operaciones', link: '/driver-app/operation-bases' },
          { label: `Editar: ${details.headquarterName}`, link: '' },
        ]);

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading base details:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los detalles de la base',
        });
        this.loading.set(false);
        this.goBack();
      },
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Abrir modal de selección de drivers
   */
  openDriverSelector(): void {
    const base = this.originalBase();
    if (!base) return;

    const cityId = base.locationDriver.cityId;
    const modal = this.driverModal();
    modal.open(cityId, this.selectedDrivers());
  }

  /**
   * Manejar selección de drivers desde modal
   */
  onDriversSelected(drivers: DriverUnassigned[]): void {
    this.selectedDrivers.set(drivers);
  }

  /**
   * Remover un driver de la selección
   */
  removeDriver(driverId: number): void {
    const current = this.selectedDrivers();
    this.selectedDrivers.set(current.filter((d) => d.driverId !== driverId));
  }

  /**
   * Guardar cambios
   */
  save(): void {
    if (!this.canSave()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    const baseId = this.baseId();
    if (!baseId) return;

    const formValue = this.baseForm.value;

    const payload: EditOperationBaseRequest = {
      id: baseId,
      numberCurrent: formValue.numberCurrent!,
      numberBoxBegin: formValue.numberBoxBegin!,
      numberBoxEnd: formValue.numberBoxEnd!,
      contactName: formValue.contactName!,
      contactNumber: formValue.contactNumber!,
      headquarterSize: formValue.headquarterSize!,
      driversToAssign: this.driversToAssign(),
      driversToUnassign: this.driversToUnassign(),
    };

    this.saving.set(true);

    this.operationBaseService.editOperationBase(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Base de operaciones actualizada correctamente',
        });

        // Navegar a detalles
        setTimeout(() => {
          this.router.navigate(['/driver-app/operation-bases/view-details', baseId]);
        }, 1500);
      },
      error: (err) => {
        console.error('Error updating operation base:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar la base de operaciones',
        });
        this.saving.set(false);
      },
    });
  }

  /**
   * Cancelar y volver
   */
  cancel(): void {
    const baseId = this.baseId();
    if (baseId) {
      this.router.navigate(['/driver-app/operation-bases/view-details', baseId]);
    } else {
      this.goBack();
    }
  }

  /**
   * Volver a la lista
   */
  goBack(): void {
    this.router.navigate(['/driver-app/operation-bases']);
  }
}
