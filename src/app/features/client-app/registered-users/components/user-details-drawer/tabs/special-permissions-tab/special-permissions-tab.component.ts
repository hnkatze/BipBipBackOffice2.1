import { Component, ChangeDetectionStrategy, input, signal, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { Subscription } from 'rxjs';

import { RegisteredUsersService } from '../../../../services';
import { City, Brand, Store, SpecialPermission, CreateSpecialPermissionForm } from '../../../../models';

@Component({
  selector: 'app-special-permissions-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    SelectModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    TableModule,
    InputNumberModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './special-permissions-tab.component.html',
  styleUrl: './special-permissions-tab.component.scss'
})
export class SpecialPermissionsTabComponent implements OnDestroy {
  readonly userId = input.required<number>();

  private readonly fb = inject(FormBuilder);
  private readonly registeredUsersService = inject(RegisteredUsersService);

  readonly isLoadingPermissions = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorPermissions = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);
  readonly successForm = signal<string | null>(null);

  readonly permissions = signal<SpecialPermission[] | null>(null);
  readonly cities = signal<City[]>([]);
  readonly brands = signal<Brand[]>([]);
  readonly stores = signal<Store[]>([]);

  readonly permissionForm = signal<FormGroup>(
    this.fb.group({
      cityId: [null, Validators.required],
      brandId: [null, Validators.required],
      storeId: [null, Validators.required],
      quantityOrders: [0, [Validators.required, Validators.min(0)]],
      cashSpent: [0, [Validators.required, Validators.min(0)]]
    })
  );

  private refreshSubscription?: Subscription;

  constructor() {
    // Load data when userId changes
    effect(() => {
      const id = this.userId();
      if (id) {
        this.loadPermissions();
        this.loadCities();
      }
    });

    // Subscribe to refresh events
    this.refreshSubscription = this.registeredUsersService.refresh$.subscribe(() => {
      this.loadPermissions();
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  private loadPermissions(): void {
    const customerId = this.userId();
    if (!customerId) return;

    this.isLoadingPermissions.set(true);
    this.errorPermissions.set(null);

    this.registeredUsersService.getSpecialPermissions(customerId).subscribe({
      next: (permissions) => {
        this.permissions.set(permissions);
        this.isLoadingPermissions.set(false);
      },
      error: (err) => {
        this.errorPermissions.set('Error al cargar los permisos especiales');
        this.isLoadingPermissions.set(false);
        console.error('Error loading special permissions:', err);
      }
    });
  }

  private loadCities(): void {
    this.registeredUsersService.getAllCities().subscribe({
      next: (cities) => {
        this.cities.set(cities);
      },
      error: (err) => {
        console.error('Error loading cities:', err);
      }
    });
  }

  onCityChange(): void {
    const cityId = this.permissionForm().get('cityId')?.value;
    if (!cityId) return;

    // Reset dependent fields
    this.permissionForm().patchValue({ brandId: null, storeId: null });
    this.stores.set([]);

    // Load brands for selected city
    this.registeredUsersService.getBrands().subscribe({
      next: (brands) => {
        this.brands.set(brands);
      },
      error: (err) => {
        console.error('Error loading brands:', err);
      }
    });
  }

  onBrandChange(): void {
    const cityId = this.permissionForm().get('cityId')?.value;
    const brandId = this.permissionForm().get('brandId')?.value;
    if (!cityId || !brandId) return;

    // Reset store field
    this.permissionForm().patchValue({ storeId: null });

    // Load stores for selected brand and city
    this.registeredUsersService.getStores(brandId, cityId).subscribe({
      next: (stores) => {
        this.stores.set(stores);
      },
      error: (err) => {
        console.error('Error loading stores:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.permissionForm().invalid) {
      this.permissionForm().markAllAsTouched();
      return;
    }

    const customerId = this.userId();
    if (!customerId) return;

    this.isSubmitting.set(true);
    this.errorForm.set(null);
    this.successForm.set(null);

    const formValue = this.permissionForm().value;
    const data: CreateSpecialPermissionForm = {
      customerId,
      storeId: formValue.storeId,
      quantityOrders: formValue.quantityOrders,
      cashSpent: formValue.cashSpent
    };

    this.registeredUsersService.createSpecialPermission(data).subscribe({
      next: () => {
        this.successForm.set('Permiso especial creado correctamente');
        this.isSubmitting.set(false);
        this.resetForm();
        this.loadPermissions();
      },
      error: (err) => {
        this.errorForm.set('Error al crear el permiso especial');
        this.isSubmitting.set(false);
        console.error('Error creating special permission:', err);
      }
    });
  }

  deletePermission(storeId: number): void {
    const customerId = this.userId();
    if (!customerId) return;

    if (!confirm('¿Está seguro de eliminar este permiso especial?')) {
      return;
    }

    this.registeredUsersService.deleteSpecialPermission(customerId, storeId).subscribe({
      next: () => {
        this.successForm.set('Permiso especial eliminado correctamente');
        this.loadPermissions();
      },
      error: (err) => {
        this.errorForm.set('Error al eliminar el permiso especial');
        console.error('Error deleting special permission:', err);
      }
    });
  }

  resetForm(): void {
    this.permissionForm().reset();
    this.brands.set([]);
    this.stores.set([]);
    this.errorForm.set(null);
    this.successForm.set(null);
  }

  /**
   * Formatea un valor numérico como moneda con el prefijo "L. "
   */
  formatCurrency(value: number): string {
    return `L. ${value.toFixed(2)}`;
  }
}
