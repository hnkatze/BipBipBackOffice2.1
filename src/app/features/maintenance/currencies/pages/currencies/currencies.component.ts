import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';

import { CurrencyService } from '../../services/currency.service';
import { CurrencyFormComponent } from '../../components/currency-form/currency-form.component';
import type { Currency } from '../../models/currency.model';
import { debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * CurrenciesComponent - Componente principal de gestión de monedas y países
 *
 * Features:
 * ✅ Tabla con PrimeNG
 * ✅ Búsqueda con debounce (2 segundos)
 * ✅ Filtros por estado
 * ✅ Paginación server-side
 * ✅ CRUD operations
 * ✅ Confirmaciones con ConfirmationService
 */
@Component({
  selector: 'app-currencies',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    MenuModule,
    ConfirmDialogModule,
    IconFieldModule,
    InputIconModule,
    ToastModule,
    SkeletonModule,
    PaginatorModule,
    CurrencyFormComponent
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestión de Monedas y Países
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Administra las monedas y países del sistema
        </p>
      </div>

      <!-- Toolbar -->
      <div class="space-y-4 mb-6">
        <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <!-- Búsqueda -->
          <div class="flex-1 w-full md:w-auto">
            <p-iconfield class="w-full">
              <p-inputicon>
                <i class="pi pi-search"></i>
              </p-inputicon>
              <input
                pInputText
                type="text"
                [formControl]="searchControl"
                placeholder="Buscar por país o moneda..."
                class="w-full"
              />
            </p-iconfield>
          </div>

          <!-- Filtros de estado -->
          <div class="flex gap-2">
            <p-button
              [label]="'Activos (' + countActive() + ')'"
              [outlined]="statusFilter() !== 'true'"
              severity="success"
              size="small"
              (onClick)="setStatusFilter('true')"
            />
            <p-button
              [label]="'Inactivos (' + countInactive() + ')'"
              [outlined]="statusFilter() !== 'false'"
              severity="danger"
              size="small"
              (onClick)="setStatusFilter('false')"
            />
            <p-button
              [label]="'Todos (' + countTotal() + ')'"
              [outlined]="statusFilter() !== ''"
              severity="secondary"
              size="small"
              (onClick)="setStatusFilter('')"
            />
          </div>

          <!-- Botón crear -->
          <p-button
            label="Nueva Moneda"
            icon="pi pi-plus"
            (onClick)="openCreateForm()"
          />
        </div>
      </div>

      <!-- Tabla (Desktop/Tablet) -->
      <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <p-table
          [value]="currencies()"
          [loading]="currencyService.isLoading()"
          [paginator]="true"
          [rows]="pageSize()"
          [totalRecords]="totalRecords()"
          [lazy]="true"
          (onLazyLoad)="onLazyLoad($event)"
          [rowsPerPageOptions]="[5, 10, 15, 20]"
          [pt]="{ root: { class: 'p-datatable-sm' } }"
        >
          <!-- Empty state -->
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="text-center py-8">
                <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-600 dark:text-gray-400">
                  No se encontraron monedas
                </p>
              </td>
            </tr>
          </ng-template>

          <!-- Header -->
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 200px">País</th>
              <th>Moneda</th>
              <th style="width: 120px">Acrónimo</th>
              <th style="width: 100px">Símbolo</th>
              <th style="width: 100px">Estado</th>
              <th style="width: 100px">Acciones</th>
            </tr>
          </ng-template>

          <!-- Body -->
          <ng-template pTemplate="body" let-currency>
            <tr>
              <!-- País con Flag -->
              <td>
                <div class="flex items-center gap-2">
                  <img
                    [src]="currency.flag"
                    [alt]="currency.name"
                    class="w-6 h-4 object-cover rounded"
                  />
                  <span class="font-medium">{{ currency.name }}</span>
                </div>
              </td>

              <!-- Moneda -->
              <td>
                <span class="font-medium text-gray-700 dark:text-gray-300">
                  {{ currency.title }}
                </span>
              </td>

              <!-- Acrónimo -->
              <td>
                <span class="font-mono font-semibold text-gray-900 dark:text-white">
                  {{ currency.code }}
                </span>
              </td>

              <!-- Símbolo -->
              <td>
                <span class="font-mono font-bold text-lg text-gray-900 dark:text-white">
                  {{ currency.symbolLeft }}
                </span>
              </td>

              <!-- Estado -->
              <td>
                <p-tag
                  [value]="currency.status ? 'Activo' : 'Inactivo'"
                  [severity]="currency.status ? 'success' : 'danger'"
                />
              </td>

              <!-- Acciones -->
              <td>
                <p-button
                  icon="pi pi-ellipsis-v"
                  [text]="true"
                  [rounded]="true"
                  (onClick)="menu.toggle($event); setCurrentCurrency(currency)"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Mobile Cards -->
      <div class="block md:hidden">
        @if (currencyService.isLoading()) {
          <div class="flex flex-col gap-4">
            @for (item of [1, 2, 3]; track item) {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <p-skeleton width="100%" height="10rem" />
              </div>
            }
          </div>
        } @else {
          @if (currencies().length === 0) {
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
              <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <i class="pi pi-inbox text-4xl mb-3"></i>
                <p class="text-lg font-medium">No se encontraron monedas</p>
              </div>
            </div>
          }
          @if (currencies().length > 0) {
            <div class="flex flex-col gap-4">
              @for (currency of currencies(); track currency.id) {
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <!-- Header: País con bandera + Estado -->
                  <div class="flex items-start gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <img
                        [src]="currency.flag"
                        [alt]="currency.name"
                        class="w-8 h-6 object-cover rounded flex-shrink-0"
                      />
                      <div class="font-semibold text-gray-900 dark:text-white">{{ currency.name }}</div>
                    </div>
                    <div class="flex-shrink-0">
                      <p-tag
                        [value]="currency.status ? 'Activo' : 'Inactivo'"
                        [severity]="currency.status ? 'success' : 'danger'"
                      />
                    </div>
                  </div>

                  <!-- Información de la moneda -->
                  <div class="space-y-3 mb-3">
                    <!-- Nombre de la moneda -->
                    <div>
                      <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Moneda</label>
                      <div class="font-medium text-gray-900 dark:text-white">{{ currency.title }}</div>
                    </div>

                    <!-- Código y Símbolo en grid -->
                    <div class="grid grid-cols-2 gap-3">
                      <div>
                        <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Código</label>
                        <div class="font-mono font-semibold text-gray-900 dark:text-white">{{ currency.code }}</div>
                      </div>
                      <div>
                        <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Símbolo</label>
                        <div class="font-mono font-bold text-xl text-gray-900 dark:text-white">{{ currency.symbolLeft }}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Acciones -->
                  <div class="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p-button
                      label="Editar"
                      icon="pi pi-pencil"
                      size="small"
                      [outlined]="true"
                      severity="info"
                      (onClick)="setCurrentCurrency(currency); editCurrency()"
                      styleClass="flex-1"
                    />
                    @if (currency.status) {
                      <p-button
                        label="Desactivar"
                        icon="pi pi-times-circle"
                        size="small"
                        [outlined]="true"
                        severity="danger"
                        (onClick)="setCurrentCurrency(currency); toggleCurrencyStatus(false)"
                        styleClass="flex-1"
                      />
                    } @else {
                      <p-button
                        label="Activar"
                        icon="pi pi-check-circle"
                        size="small"
                        [outlined]="true"
                        severity="success"
                        (onClick)="setCurrentCurrency(currency); toggleCurrencyStatus(true)"
                        styleClass="flex-1"
                      />
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Paginador Mobile -->
            <div class="mt-4">
              <p-paginator
                [first]="(currentPage() - 1) * pageSize()"
                [rows]="pageSize()"
                [totalRecords]="totalRecords()"
                [rowsPerPageOptions]="[5, 10, 15, 20]"
                (onPageChange)="onLazyLoad({first: $event.first, rows: $event.rows})"
              />
            </div>
          }
        }
      </div>

      <!-- Menu de acciones -->
      <p-menu #menu [model]="menuItems" [popup]="true" />

      <!-- Toast -->
      <p-toast />

      <!-- Confirm Dialog -->
      <p-confirmDialog />

      <!-- Currency Form Drawer -->
      <app-currency-form
        #currencyForm
        [currency]="selectedCurrency()"
        (onSave)="onFormSave()"
        (onCancel)="onFormCancel()"
      />
    </div>
  `
})
export class CurrenciesComponent implements OnInit {
  readonly currencyService = inject(CurrencyService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild('currencyForm') currencyForm!: CurrencyFormComponent;

  // Signals
  readonly searchControl = new FormControl<string>('');
  readonly statusFilter = signal<string>(''); // '' = todos, 'true' = activos, 'false' = inactivos
  readonly currentCurrency = signal<Currency | null>(null);
  readonly selectedCurrency = signal<Currency | null>(null);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);

  // Computed
  readonly currencies = this.currencyService.currencies;
  readonly metadata = this.currencyService.metadata;

  readonly countActive = computed(() => this.metadata().totalActive);
  readonly countInactive = computed(() => this.metadata().totalInactive);
  readonly countTotal = computed(() => this.metadata().totalCount);
  readonly totalRecords = computed(() => {
    const status = this.statusFilter();
    if (status === 'true') return this.countActive();
    if (status === 'false') return this.countInactive();
    return this.countTotal();
  });

  // Menu items
  menuItems: MenuItem[] = [
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => this.editCurrency()
    },
    {
      separator: true
    },
    {
      label: 'Activar',
      icon: 'pi pi-check-circle',
      command: () => this.toggleCurrencyStatus(true),
      visible: !this.currentCurrency()?.status
    },
    {
      label: 'Desactivar',
      icon: 'pi pi-times-circle',
      command: () => this.toggleCurrencyStatus(false),
      visible: this.currentCurrency()?.status
    }
  ];

  ngOnInit(): void {
    this.loadCurrencies();

    // Búsqueda con debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(2000),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage.set(1);
        this.loadCurrencies();
      });
  }

  loadCurrencies(): void {
    const page = this.currentPage();
    const pageSize = this.pageSize();
    const status = this.statusFilter();
    const search = this.searchControl.value?.trim() || '';

    this.currencyService.getCurrencies(page, pageSize, status, search).subscribe({
      next: () => {
        // Los datos ya se actualizan en el service vía signals
      },
      error: (error) => {
        console.error('Error cargando monedas:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las monedas',
          life: 3000
        });
      }
    });
  }

  onLazyLoad(event: any): void {
    const page = (event.first / event.rows) + 1;
    const pageSize = event.rows;

    this.currentPage.set(page);
    this.pageSize.set(pageSize);
    this.loadCurrencies();
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadCurrencies();
  }

  setCurrentCurrency(currency: Currency): void {
    this.currentCurrency.set(currency);
  }

  openCreateForm(): void {
    this.selectedCurrency.set(null);
    this.currencyForm.open();
  }

  editCurrency(): void {
    const currency = this.currentCurrency();
    if (!currency) return;
    this.selectedCurrency.set(currency);
    this.currencyForm.open();
  }

  onFormSave(): void {
    this.loadCurrencies();
  }

  onFormCancel(): void {
    // El drawer ya se cerró automáticamente
  }

  toggleCurrencyStatus(newStatus: boolean): void {
    const currency = this.currentCurrency();
    if (!currency) return;

    const action = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas ${action} la moneda "${currency.title}" (${currency.code})?`,
      header: `Confirmar ${action}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, ' + action,
      rejectLabel: 'Cancelar',
      accept: () => {
        this.currencyService.toggleStatus(currency.id, newStatus).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `Moneda ${action}da exitosamente`,
              life: 3000
            });
            this.loadCurrencies();
          },
          error: (error) => {
            console.error(`Error al ${action} moneda:`, error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `No se pudo ${action} la moneda`,
              life: 3000
            });
          }
        });
      }
    });
  }
}
