import { Component, input, output, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// PrimeNG
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { CurrencyService } from '../../services/currency.service';
import type { Currency, Country, CurrencyCreateRequest } from '../../models/currency.model';
import { emptyCurrency, currencyToCreateRequest, createPartialUpdateRequest } from '../../models/currency.model';

/**
 * CurrencyFormComponent - Formulario para crear/editar monedas
 *
 * Features:
 * ✅ Drawer lateral
 * ✅ Reactive Forms con validaciones
 * ✅ Select de países con flags
 * ✅ Auto-populate de flag y nombre al seleccionar país
 * ✅ Toggle de estado (solo en modo editar)
 * ✅ Solo envía campos modificados en edición
 * ✅ Modo crear y editar
 */
@Component({
  selector: 'app-currency-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    ToggleSwitchModule,
    SelectModule,
    DividerModule,
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
      [header]="isEditMode() ? 'Editar Moneda' : 'Nueva Moneda'"
    >
      <!-- Toast -->
      <p-toast />

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        <!-- Toggle Estado (solo en modo editar) -->
        @if (isEditMode()) {
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label class="block text-sm font-medium mb-1">
                Estado
              </label>
              <p class="text-xs text-gray-500">
                Activa o desactiva esta moneda
              </p>
            </div>
            <p-toggleswitch formControlName="status" />
          </div>
        }

        <!-- Información Básica -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Información Básica
          </h3>

          <!-- País -->
          <div>
            <label for="countryId" class="block text-sm font-medium mb-2">
              País <span class="text-red-500">*</span>
            </label>
            <p-select
              id="countryId"
              formControlName="countryId"
              [options]="countries()"
              optionLabel="countryName"
              optionValue="countryId"
              placeholder="Selecciona un país"
              [filter]="true"
              filterBy="countryName"
              (onChange)="onCountryChange($event)"
              class="w-full"
              [styleClass]="'w-full'"
            >
              <ng-template pTemplate="selectedItem" let-selectedOption>
                @if (selectedOption) {
                  <div class="flex items-center gap-2">
                    <img
                      [src]="selectedOption.countryUrlFlag"
                      [alt]="selectedOption.countryName"
                      class="w-6 h-4 object-cover rounded"
                    />
                    <span>{{ selectedOption.countryName }}</span>
                  </div>
                }
              </ng-template>
              <ng-template pTemplate="item" let-country>
                <div class="flex items-center gap-2">
                  <img
                    [src]="country.countryUrlFlag"
                    [alt]="country.countryName"
                    class="w-6 h-4 object-cover rounded"
                  />
                  <span>{{ country.countryName }}</span>
                </div>
              </ng-template>
            </p-select>
            @if (form.get('countryId')?.invalid && form.get('countryId')?.touched) {
              <small class="text-red-500">El país es requerido</small>
            }
          </div>

          <!-- Nombre de la Moneda -->
          <div>
            <label for="title" class="block text-sm font-medium mb-2">
              Nombre de la Moneda <span class="text-red-500">*</span>
            </label>
            <p-iconfield class="w-full">
              <p-inputicon>
                <i class="pi pi-money-bill"></i>
              </p-inputicon>
              <input
                pInputText
                id="title"
                formControlName="title"
                placeholder="Ej: Lempira"
                class="w-full"
              />
            </p-iconfield>
            @if (form.get('title')?.invalid && form.get('title')?.touched) {
              <small class="text-red-500">El nombre de la moneda es requerido</small>
            }
          </div>

          <!-- Acrónimo -->
          <div>
            <label for="code" class="block text-sm font-medium mb-2">
              Acrónimo <span class="text-red-500">*</span>
            </label>
            <p-iconfield class="w-full">
              <p-inputicon>
                <i class="pi pi-tag"></i>
              </p-inputicon>
              <input
                pInputText
                id="code"
                formControlName="code"
                placeholder="Ej: HNL"
                class="w-full"
                style="text-transform: uppercase;"
              />
            </p-iconfield>
            @if (form.get('code')?.invalid && form.get('code')?.touched) {
              <small class="text-red-500">El acrónimo es requerido</small>
            }
          </div>

          <!-- Símbolo -->
          <div>
            <label for="symbolLeft" class="block text-sm font-medium mb-2">
              Símbolo <span class="text-red-500">*</span>
            </label>
            <p-iconfield class="w-full">
              <p-inputicon>
                <i class="pi pi-dollar"></i>
              </p-inputicon>
              <input
                pInputText
                id="symbolLeft"
                formControlName="symbolLeft"
                placeholder="Ej: L"
                class="w-full"
                maxlength="3"
              />
            </p-iconfield>
            @if (form.get('symbolLeft')?.invalid && form.get('symbolLeft')?.touched) {
              <small class="text-red-500">El símbolo es requerido</small>
            }
          </div>
        </div>

        <p-divider />

        <!-- Botones de acción -->
        <div class="flex gap-4">
          <p-button
            label="Cancelar"
            severity="secondary"
            [outlined]="true"
            (onClick)="handleCancel()"
            type="button"
            class="flex-1"
          />
          <p-button
            [label]="isEditMode() ? 'Guardar Cambios' : 'Crear Moneda'"
            [loading]="isSubmitting()"
            type="submit"
            [disabled]="form.invalid"
            class="flex-1"
          />
        </div>
      </form>
    </p-drawer>
  `
})
export class CurrencyFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly currencyService = inject(CurrencyService);
  private readonly messageService = inject(MessageService);

  // Inputs
  currency = input<Currency | null>(null);

  // Outputs
  onSave = output<void>();
  onCancel = output<void>();

  // Signals
  visible = signal(false);
  isSubmitting = signal(false);
  countries = signal<Country[]>([]);
  originalCurrency = signal<Currency | null>(null);

  // Computed
  isEditMode = signal(false);

  // Form
  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      id: [0],
      name: [''],
      flag: [''],
      title: ['', Validators.required],
      code: ['', Validators.required],
      symbolLeft: ['', Validators.required],
      status: [true],
      countryId: [0, [Validators.required, Validators.min(1)]]
    });

    // Effect para cargar datos cuando cambia la currency
    effect(() => {
      const curr = this.currency();
      if (curr) {
        this.isEditMode.set(true);
        this.originalCurrency.set({ ...curr });
        this.form.patchValue(curr);
      } else {
        this.isEditMode.set(false);
        this.originalCurrency.set(null);
        this.form.reset({
          id: 0,
          name: '',
          flag: '',
          title: '',
          code: '',
          symbolLeft: '',
          status: true,
          countryId: 0
        });
      }
    });
  }

  ngOnInit(): void {
    this.loadCountries();
  }

  loadCountries(): void {
    this.currencyService.getCountries().subscribe({
      next: (countries) => {
        this.countries.set(countries);
      },
      error: (error) => {
        console.error('Error cargando países:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los países',
          life: 3000
        });
      }
    });
  }

  onCountryChange(event: any): void {
    const countryId = event.value;
    const selectedCountry = this.countries().find(c => c.countryId === countryId);

    if (selectedCountry) {
      this.form.patchValue({
        name: selectedCountry.countryName,
        flag: selectedCountry.countryUrlFlag,
        countryId: selectedCountry.countryId
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    if (this.isEditMode()) {
      this.updateCurrency();
    } else {
      this.createCurrency();
    }
  }

  createCurrency(): void {
    const formValue = this.form.value;
    const request: CurrencyCreateRequest = {
      name: formValue.name,
      flag: formValue.flag,
      title: formValue.title,
      code: formValue.code.toUpperCase(),
      symbolLeft: formValue.symbolLeft,
      status: true,
      countryId: formValue.countryId
    };

    this.currencyService.createCurrency(request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Moneda creada correctamente',
          life: 3000
        });
        this.isSubmitting.set(false);
        this.close();
        this.onSave.emit();
      },
      error: (error) => {
        console.error('Error creando moneda:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo crear la moneda',
          life: 3000
        });
        this.isSubmitting.set(false);
      }
    });
  }

  updateCurrency(): void {
    const original = this.originalCurrency();
    if (!original) return;

    const formValue = this.form.value;
    const updated: Currency = {
      ...formValue,
      code: formValue.code.toUpperCase()
    };

    // Solo enviar campos modificados
    const updateRequest = createPartialUpdateRequest(original, updated);

    this.currencyService.updateCurrency(original.id, updateRequest).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Moneda actualizada correctamente',
          life: 3000
        });
        this.isSubmitting.set(false);
        this.close();
        this.onSave.emit();
      },
      error: (error) => {
        console.error('Error actualizando moneda:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar la moneda',
          life: 3000
        });
        this.isSubmitting.set(false);
      }
    });
  }

  open(): void {
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.form.reset();
  }

  onClose(): void {
    this.close();
  }

  handleCancel(): void {
    this.close();
    this.onCancel.emit();
  }
}
