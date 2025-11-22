import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { DragDropModule } from 'primeng/dragdrop';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';

import { BrandService } from '../../services/brand.service';
import { BrandFormComponent } from '../../components/brand-form/brand-form.component';
import type { Brand } from '../../models/brand.model';
import { BrandStatus } from '../../models/brand.model';

/**
 * BrandsComponent - Componente principal de gestión de marcas
 *
 * Features:
 * ✅ Tabla con PrimeNG
 * ✅ Búsqueda y filtros
 * ✅ Paginación
 * ✅ Tabs: Marcas y Posicionamiento
 * ✅ Confirmaciones con ConfirmationService
 */
@Component({
  selector: 'app-brands',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TabsModule,
    TagModule,
    MenuModule,
    ConfirmDialogModule,
    IconFieldModule,
    InputIconModule,
    ToastModule,
    DragDropModule,
    CardModule,
    SkeletonModule,
    PaginatorModule,
    BrandFormComponent
  ],
  providers: [ConfirmationService, MessageService],
  styles: [`
    :host ::ng-deep {
      /* Estilos para las tarjetas */
      .brand-card {
        opacity: 1;
        transition: all 0.3s ease;
        border-radius: 8px;
      }

      /* Card siendo arrastrada */
      .brand-card.p-draggable-dragging {
        opacity: 0.5;
        transform: scale(0.95);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
      }

      /* Card sobre la cual se puede soltar */
      .brand-card.p-droppable-hover {
        border: 2px dashed var(--primary-color);
        background-color: rgba(var(--primary-color-rgb), 0.1);
      }

      /* Ajustar el p-card dentro para que ocupe todo el espacio */
      .brand-card .p-card {
        height: 100%;
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      /* Hover effect en las tarjetas */
      .brand-card:hover .p-card {
        transform: translateY(-2px);
      }

      /* Cursor durante el drag */
      .p-draggable-dragging {
        cursor: grabbing !important;
      }
    }
  `],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Gestión de Marcas
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          Administra las marcas del sistema
        </p>
      </div>

      <!-- Tabs -->
      <p-tabs value="0">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-list mr-2"></i>
            Marcas
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-sort-amount-up mr-2"></i>
            Posicionamiento
          </p-tab>
        </p-tablist>

        <p-tabpanels>
          <!-- Tab 1: Lista de Marcas -->
          <p-tabpanel value="0">
          <div class="space-y-4">
            <!-- Toolbar -->
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
                    [(ngModel)]="searchTerm"
                    (ngModelChange)="onSearchChange()"
                    placeholder="Buscar marca..."
                    class="w-full"
                  />
                </p-iconfield>
              </div>

              <!-- Filtros de estado -->
              <div class="flex gap-2">
                <p-button
                  [label]="'Activos (' + countActive() + ')'"
                  [outlined]="statusFilter() !== 1"
                  severity="success"
                  size="small"
                  (onClick)="setStatusFilter(1)"
                />
                <p-button
                  [label]="'Inactivos (' + countInactive() + ')'"
                  [outlined]="statusFilter() !== 0"
                  severity="danger"
                  size="small"
                  (onClick)="setStatusFilter(0)"
                />
                <p-button
                  [label]="'Todos (' + allBrands().length + ')'"
                  [outlined]="statusFilter() !== -1"
                  severity="secondary"
                  size="small"
                  (onClick)="setStatusFilter(-1)"
                />
              </div>

              <!-- Botón crear -->
              <p-button
                label="Nueva Marca"
                icon="pi pi-plus"
                (onClick)="openCreateForm()"
              />
            </div>

            <!-- Tabla (Desktop/Tablet) -->
            <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <p-table
                [value]="filteredBrands()"
                [paginator]="true"
                [rows]="10"
                [rowsPerPageOptions]="[5, 10, 20, 50]"
                [loading]="brandService.isLoading()"
                [globalFilterFields]="['name', 'shortName']"
                [pt]="{ root: { class: 'p-datatable-sm' } }"
              >
              <!-- Empty state -->
              <ng-template pTemplate="emptymessage">
                <tr>
                  <td colspan="5" class="text-center py-8">
                    <i class="pi pi-inbox text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600 dark:text-gray-400">
                      No se encontraron marcas
                    </p>
                  </td>
                </tr>
              </ng-template>

              <!-- Header -->
              <ng-template pTemplate="header">
                <tr>
                  <th style="width: 80px">Logo</th>
                  <th pSortableColumn="name">
                    Nombre <p-sortIcon field="name" />
                  </th>
                  <th pSortableColumn="shortName">
                    Nombre Corto <p-sortIcon field="shortName" />
                  </th>
                  <th style="width: 120px" pSortableColumn="position">
                    Posición <p-sortIcon field="position" />
                  </th>
                  <th style="width: 100px">Estado</th>
                  <th style="width: 100px">Acciones</th>
                </tr>
              </ng-template>

              <!-- Body -->
              <ng-template pTemplate="body" let-brand>
                <tr>
                  <!-- Logo -->
                  <td>
                    <img
                      [src]="brand.logoBrand"
                      [alt]="brand.nameBrand"
                      class="w-12 h-12 object-contain rounded"
                    />
                  </td>

                  <!-- Nombre -->
                  <td>
                    <div class="font-semibold">{{ brand.nameBrand }}</div>
                    @if (brand.totalRestaurants) {
                      <div class="text-xs text-gray-500">
                        {{ brand.totalRestaurants }} restaurantes
                      </div>
                    }
                  </td>

                  <!-- Nombre corto -->
                  <td>
                    <span class="font-medium text-gray-700 dark:text-gray-300">
                      {{ brand.shortNameBrand }}
                    </span>
                  </td>

                  <!-- Posición -->
                  <td>
                    <p-tag [value]="'#' + brand.position" severity="secondary" />
                  </td>

                  <!-- Estado -->
                  <td>
                    <p-tag
                      [value]="brand.isActiveBrand ? 'Activo' : 'Inactivo'"
                      [severity]="brand.isActiveBrand ? 'success' : 'danger'"
                    />
                  </td>

                  <!-- Acciones -->
                  <td>
                    <p-button
                      icon="pi pi-ellipsis-v"
                      [text]="true"
                      [rounded]="true"
                      (onClick)="menu.toggle($event); setCurrentBrand(brand)"
                    />
                  </td>
                </tr>
              </ng-template>
              </p-table>
            </div>

            <!-- Cards (Mobile) -->
            <div class="block md:hidden">
              @if (brandService.isLoading()) {
                <!-- Loading Skeleton -->
                <div class="flex flex-col gap-4">
                  @for (item of [1, 2, 3]; track item) {
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                      <p-skeleton width="100%" height="10rem" />
                    </div>
                  }
                </div>
              } @else {
                <!-- Empty State -->
                @if (filteredBrands().length === 0) {
                  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
                    <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <i class="pi pi-inbox text-4xl mb-3"></i>
                      <p class="text-lg font-medium">No se encontraron marcas</p>
                    </div>
                  </div>
                }

                <!-- Cards List -->
                @if (filteredBrands().length > 0) {
                  <div class="flex flex-col gap-4">
                    @for (brand of filteredBrands(); track brand.idBrand) {
                      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                        <!-- Header: Logo + Nombre + Estado -->
                        <div class="flex items-start gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                          <!-- Logo -->
                          <div class="flex-shrink-0">
                            <img
                              [src]="brand.logoBrand"
                              [alt]="brand.nameBrand"
                              class="w-16 h-16 object-contain rounded"
                            />
                          </div>

                          <!-- Nombre + Info -->
                          <div class="flex-1 min-w-0">
                            <div class="font-semibold text-gray-900 dark:text-white">{{ brand.nameBrand }}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ brand.shortNameBrand }}</div>
                            @if (brand.totalRestaurants) {
                              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {{ brand.totalRestaurants }} restaurantes
                              </div>
                            }
                          </div>

                          <!-- Estado -->
                          <div class="flex-shrink-0">
                            <p-tag
                              [value]="brand.isActiveBrand ? 'Activo' : 'Inactivo'"
                              [severity]="brand.isActiveBrand ? 'success' : 'danger'"
                            />
                          </div>
                        </div>

                        <!-- Posición -->
                        <div class="mb-3">
                          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                            Posición
                          </label>
                          <p-tag [value]="'#' + brand.position" severity="secondary" />
                        </div>

                        <!-- Acciones -->
                        <div class="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p-button
                            label="Ver detalles"
                            icon="pi pi-eye"
                            size="small"
                            [outlined]="true"
                            severity="secondary"
                            (onClick)="setCurrentBrand(brand); viewBrand()"
                            styleClass="flex-1"
                          />
                          <p-button
                            label="Editar"
                            icon="pi pi-pencil"
                            size="small"
                            [outlined]="true"
                            severity="info"
                            (onClick)="setCurrentBrand(brand); editBrand()"
                            styleClass="flex-1"
                          />
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>

            <!-- Menu de acciones -->
            <p-menu #menu [model]="menuItems" [popup]="true" />
          </div>
          </p-tabpanel>

          <!-- Tab 2: Posicionamiento -->
          <p-tabpanel value="1">
            <div class="space-y-4">
              <!-- Info banner -->
              <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div class="flex items-start gap-2">
                  <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 mt-0.5"></i>
                  <div class="text-sm text-blue-800 dark:text-blue-200">
                    <p class="font-medium mb-1">Arrastra y suelta las tarjetas para cambiar el orden de visualización</p>
                    <p class="text-xs opacity-80">Los cambios no se guardarán hasta que hagas clic en "Guardar Cambios"</p>
                  </div>
                </div>
              </div>

              <!-- Grid de Marcas -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg min-h-[400px]">
                @for (brand of brandsForPositioning(); track brand.idBrand) {
                  <div
                    class="brand-card cursor-move transition-all duration-200 hover:shadow-lg"
                    pDraggable="brands"
                    (onDragStart)="onDragStart($event, brand)"
                    (onDragEnd)="onDragEnd()"
                    pDroppable="brands"
                    (onDrop)="onDropBrand($event, brand)"
                  >
                    <p-card>
                      <ng-template pTemplate="header">
                        <div class="relative">
                          <img
                            [src]="brand.logoBrand"
                            [alt]="brand.nameBrand"
                            class="w-full h-32 object-contain p-4 bg-white"
                          />
                          <div class="absolute top-2 right-2">
                            <p-tag
                              [value]="brand.position.toString()"
                              [style]="{ 'font-size': '1.2rem', 'font-weight': 'bold' }"
                              severity="info"
                            />
                          </div>
                        </div>
                      </ng-template>

                      <div class="text-center space-y-2">
                        <h3 class="font-semibold text-lg text-gray-900 dark:text-white">
                          {{ brand.nameBrand }}
                        </h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          {{ brand.shortNameBrand }}
                        </p>
                        <div class="flex justify-center gap-2 pt-2">
                          <p-tag
                            [value]="brand.isActiveBrand ? 'Activo' : 'Inactivo'"
                            [severity]="brand.isActiveBrand ? 'success' : 'danger'"
                            styleClass="text-xs"
                          />
                          @if (brand.totalRestaurants) {
                            <p-tag
                              [value]="brand.totalRestaurants + ' comercios'"
                              severity="secondary"
                              styleClass="text-xs"
                            />
                          }
                        </div>
                      </div>
                    </p-card>
                  </div>
                }
              </div>

              <!-- Botón Guardar -->
              <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <p-button
                  label="Guardar Cambios"
                  icon="pi pi-save"
                  [loading]="isSavingPositions()"
                  [disabled]="!hasPositionChanges()"
                  (onClick)="savePositionChanges()"
                  severity="primary"
                />
              </div>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <!-- Toast -->
      <p-toast />

      <!-- Confirm Dialog -->
      <p-confirmDialog />

      <!-- Brand Form Drawer -->
      <app-brand-form
        #brandForm
        [brand]="selectedBrand()"
        (onSave)="onFormSave()"
        (onCancel)="onFormCancel()"
      />
    </div>
  `
})
export class BrandsComponent implements OnInit {
  readonly brandService = inject(BrandService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  @ViewChild('brandForm') brandForm!: BrandFormComponent;

  // Signals
  readonly searchTerm = signal<string>('');
  readonly statusFilter = signal<number>(-1); // -1 = todos, 1 = activos, 0 = inactivos
  readonly currentBrand = signal<Brand | null>(null);
  readonly selectedBrand = signal<Brand | null>(null);

  // Signals for positioning
  readonly brandsForPositioning = signal<Brand[]>([]);
  readonly originalPositions = signal<Brand[]>([]);
  readonly isSavingPositions = signal<boolean>(false);
  draggedBrand: Brand | null = null;

  // Computed
  readonly allBrands = this.brandService.brands;

  readonly filteredBrands = computed(() => {
    let brands = this.allBrands();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    // Filtrar por búsqueda
    if (search) {
      brands = brands.filter(b =>
        b.nameBrand.toLowerCase().includes(search) ||
        b.shortNameBrand.toLowerCase().includes(search)
      );
    }

    // Filtrar por estado
    if (status !== -1) {
      brands = brands.filter(b => b.isActiveBrand === Boolean(status));
    }

    return brands;
  });

  readonly countActive = computed(() =>
    this.allBrands().filter(b => b.isActiveBrand).length
  );

  readonly countInactive = computed(() =>
    this.allBrands().filter(b => !b.isActiveBrand).length
  );

  // Computed para detectar cambios en posicionamiento
  readonly hasPositionChanges = computed(() => {
    const current = this.brandsForPositioning();
    const original = this.originalPositions();

    // Validar que ambos arrays existan y tengan elementos
    if (!current || !original || current.length === 0 || original.length === 0) {
      return false;
    }

    if (current.length !== original.length) return false;

    return current.some((brand, index) =>
      brand.idBrand !== original[index]?.idBrand
    );
  });

  // Menu items
  menuItems: MenuItem[] = [
    {
      label: 'Ver detalles',
      icon: 'pi pi-eye',
      command: () => this.viewBrand()
    },
    {
      label: 'Editar',
      icon: 'pi pi-pencil',
      command: () => this.editBrand()
    },
    {
      separator: true
    },
    {
      label: 'Activar',
      icon: 'pi pi-check-circle',
      command: () => this.toggleBrandStatus(true),
      visible: !this.currentBrand()?.isActiveBrand
    },
    {
      label: 'Desactivar',
      icon: 'pi pi-times-circle',
      command: () => this.toggleBrandStatus(false),
      visible: this.currentBrand()?.isActiveBrand
    }
  ];

  ngOnInit(): void {
    this.loadBrands();
  }

  loadBrands(): void {
    this.brandService.getBrands().subscribe({
      next: (brands) => {
        // Inicializar signals para positioning
        const sortedBrands = [...brands].sort((a, b) => a.position - b.position);
        this.brandsForPositioning.set(sortedBrands);
        this.originalPositions.set(JSON.parse(JSON.stringify(sortedBrands)));
      },
      error: (error) => {
        console.error('Error cargando marcas:', error);
      }
    });
  }

  onSearchChange(): void {
    // El filtrado es reactivo gracias a computed signals
  }

  setStatusFilter(status: number): void {
    this.statusFilter.set(status);
  }

  setCurrentBrand(brand: Brand): void {
    this.currentBrand.set(brand);
  }

  openCreateForm(): void {
    this.selectedBrand.set(null);
    this.brandForm.open();
  }

  viewBrand(): void {
    const brand = this.currentBrand();
    if (!brand) return;
    // TODO: Abrir dialog de vista (implementar más adelante)

  }

  editBrand(): void {
    const brand = this.currentBrand();
    if (!brand) return;
    this.selectedBrand.set(brand);
    this.brandForm.open();
  }

  onFormSave(): void {
    this.loadBrands();
  }

  onFormCancel(): void {
    // El drawer ya se cerró automáticamente
  }

  toggleBrandStatus(newStatus: boolean): void {
    const brand = this.currentBrand();
    if (!brand) return;

    const action = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas ${action} la marca "${brand.nameBrand}"?`,
      header: `Confirmar ${action}`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, ' + action,
      rejectLabel: 'Cancelar',
      accept: () => {
        this.brandService.enableBrand(brand.idBrand, newStatus).subscribe({
          next: () => {
          },
          error: (error) => {
            console.error(`Error al ${action} marca:`, error);
          }
        });
      }
    });
  }

  // Drag & Drop methods
  onDragStart(event: any, brand: Brand): void {
    this.draggedBrand = brand;
  }

  onDragEnd(): void {
    this.draggedBrand = null;
  }

  onDropBrand(event: any, targetBrand: Brand): void {
    if (this.draggedBrand && this.draggedBrand.idBrand !== targetBrand.idBrand) {
      const brands = [...this.brandsForPositioning()];
      const draggedIndex = brands.findIndex(b => b.idBrand === this.draggedBrand!.idBrand);
      const targetIndex = brands.findIndex(b => b.idBrand === targetBrand.idBrand);

      // Intercambiar posiciones
      [brands[draggedIndex], brands[targetIndex]] = [brands[targetIndex], brands[draggedIndex]];

      // Actualizar las posiciones numéricas
      const updatedBrands = brands.map((brand, index) => ({
        ...brand,
        position: index + 1
      }));

      this.brandsForPositioning.set(updatedBrands);
    }
  }

  savePositionChanges(): void{
    this.isSavingPositions.set(true);

    const reorderedBrands = this.brandsForPositioning();
    const positionUpdates = reorderedBrands.map((brand, index) => ({
      idBrand: brand.idBrand,
      positionBrand: index + 1
    }));

    this.brandService.updatePositions(positionUpdates).subscribe({
      next: () => {
        // Actualizar las posiciones en los brands originales
        const updatedBrands = reorderedBrands.map((brand, index) => ({
          ...brand,
          position: index + 1
        }));

        this.brandsForPositioning.set(updatedBrands);
        this.originalPositions.set(JSON.parse(JSON.stringify(updatedBrands)));

        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Posiciones actualizadas correctamente',
          life: 3000
        });
        this.isSavingPositions.set(false);

        // Recargar todas las marcas para actualizar la tabla
        this.loadBrands();
      },
      error: (error) => {
        console.error('Error actualizando posiciones:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron actualizar las posiciones',
          life: 3000
        });

        // Revertir cambios
        this.brandsForPositioning.set([...this.originalPositions()]);
        this.isSavingPositions.set(false);
      }
    });
  }
}
