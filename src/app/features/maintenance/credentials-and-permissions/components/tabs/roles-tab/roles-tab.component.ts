import { Component, ChangeDetectionStrategy, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { PopoverModule } from 'primeng/popover';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { type RoleWithPermissionCount, type RoleFilterCriteria } from '../../../models';
import { RoleService } from '../../../services/role.service';
import { RoleFormComponent } from '../../forms/role-form/role-form.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, takeUntil } from 'rxjs';

/**
 * RolesTabComponent
 *
 * Displays a table of roles with their permissions count
 * Features:
 * - Server-side pagination
 * - Search and filter capabilities
 * - Status management
 * - Responsive design (table on desktop, cards on mobile)
 */
@Component({
  selector: 'app-roles-tab',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    PopoverModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SkeletonModule,
    PaginatorModule,
    RoleFormComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="roles-tab">
      <!-- Search and Filter Section -->
      <div class="mb-6">
        <!-- Search Input -->
        <div class="mb-4">
          <p-iconfield iconPosition="left" class="w-full md:w-96">
            <p-inputicon styleClass="pi pi-search" />
            <input
              pInputText
              type="text"
              [formControl]="searchControl"
              placeholder="Buscar por nombre de rol..."
              class="w-full"
            />
          </p-iconfield>
        </div>

        <!-- Status Filters and Actions -->
        <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <!-- Status Filters -->
          <div class="flex flex-wrap gap-2">
            <p-button
              label="Todos ({{ totalRecords() }})"
              [outlined]="selectedStatus() !== null"
              severity="secondary"
              size="small"
              (onClick)="onStatusFilter(null)"
            />
            <p-button
              label="Activos ({{ activeCount() }})"
              [outlined]="selectedStatus() !== true"
              severity="success"
              size="small"
              (onClick)="onStatusFilter(true)"
            />
            <p-button
              label="Inactivos ({{ inactiveCount() }})"
              [outlined]="selectedStatus() !== false"
              severity="danger"
              size="small"
              (onClick)="onStatusFilter(false)"
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <p-button
              label="Nuevo Rol"
              icon="pi pi-plus"
              size="small"
              (onClick)="onCreateRole()"
            />
          </div>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div class="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <p-table
          [value]="roles()"
          [loading]="loading()"
          [paginator]="true"
          [rows]="pageSize()"
          [totalRecords]="totalRecords()"
          [lazy]="true"
          [rowsPerPageOptions]="[5, 10, 15, 20]"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} roles"
          (onLazyLoad)="onPageChange($event)"
          [pt]="{ root: { class: 'p-datatable-sm' } }"
        >
          <ng-template #header>
            <tr>
              <th>Nombre del Rol</th>
              <th>Descripción</th>
              <th style="width: 8rem">Estado</th>
              <th style="width: 8rem">Acciones</th>
            </tr>
          </ng-template>

          <ng-template #body let-role>
            <tr>
              <!-- Role Name -->
              <td>
                <div class="flex items-center gap-2">
                  <i class="pi pi-key text-primary"></i>
                  <span class="font-semibold">{{ role.roleName }}</span>
                </div>
              </td>

              <!-- Description -->
              <td>
                <span class="text-gray-600">{{ role.roleDescription }}</span>
              </td>

              <!-- Status -->
              <td>
                <p-tag
                  [value]="role.roleActive ? 'Activo' : 'Inactivo'"
                  [severity]="role.roleActive ? 'success' : 'danger'"
                />
              </td>

              <!-- Actions -->
              <td>
                <p-button
                  icon="pi pi-ellipsis-v"
                  [text]="true"
                  [rounded]="true"
                  size="small"
                  (click)="popover.toggle($event)"
                />
                <p-popover #popover>
                  <div class="flex flex-col gap-1 p-1 min-w-[180px]">
                    <button
                      class="flex items-center gap-3 px-3 py-2 text-left hover:surface-hover rounded transition-colors"
                      (click)="onEditRole(role); popover.hide()"
                    >
                      <i class="pi pi-pencil"></i>
                      <span>Editar</span>
                    </button>
                    <div class="border-t my-1"></div>
                    <button
                      class="flex items-center gap-3 px-3 py-2 text-left hover:surface-hover rounded transition-colors"
                      [class.text-red-600]="role.roleActive"
                      [class.text-green-600]="!role.roleActive"
                      (click)="onToggleStatus(role); popover.hide()"
                    >
                      <i class="pi" [class.pi-ban]="role.roleActive" [class.pi-check]="!role.roleActive"></i>
                      <span>{{ role.roleActive ? 'Desactivar' : 'Activar' }}</span>
                    </button>
                  </div>
                </p-popover>
              </td>
            </tr>
          </ng-template>

          <ng-template #emptymessage>
            <tr>
              <td colspan="4" class="text-center py-8">
                <div class="flex flex-col items-center gap-3">
                  <i class="pi pi-key text-4xl text-gray-400"></i>
                  <span class="text-gray-600">No se encontraron roles</span>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Mobile Cards View -->
      <div class="block md:hidden">
        @if (loading()) {
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
          @if (roles().length === 0) {
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
              <div class="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <i class="pi pi-key text-4xl mb-3"></i>
                <p class="text-lg font-medium">No se encontraron roles</p>
              </div>
            </div>
          }

          <!-- Cards List -->
          @if (roles().length > 0) {
            <div class="flex flex-col gap-4">
              @for (role of roles(); track role.roleId) {
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                  <!-- Header: Icono + Nombre + Estado -->
                  <div class="flex items-start gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <!-- Icon -->
                    <div class="flex-shrink-0">
                      <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                        <i class="pi pi-key text-primary-600 dark:text-primary-400"></i>
                      </div>
                    </div>

                    <!-- Nombre -->
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-gray-900 dark:text-white">{{ role.roleName }}</div>
                    </div>

                    <!-- Estado -->
                    <div class="flex-shrink-0">
                      <p-tag
                        [value]="role.roleActive ? 'Activo' : 'Inactivo'"
                        [severity]="role.roleActive ? 'success' : 'danger'"
                      />
                    </div>
                  </div>

                  <!-- Descripción -->
                  <div class="mb-3">
                    <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
                      Descripción
                    </label>
                    <span class="text-sm text-gray-900 dark:text-white">{{ role.roleDescription }}</span>
                  </div>

                  <!-- Acciones -->
                  <div class="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p-button
                      label="Editar"
                      icon="pi pi-pencil"
                      size="small"
                      [outlined]="true"
                      severity="secondary"
                      (onClick)="onEditRole(role)"
                      styleClass="flex-1"
                    />
                    <p-button
                      [label]="role.roleActive ? 'Desactivar' : 'Activar'"
                      [icon]="role.roleActive ? 'pi pi-ban' : 'pi pi-check'"
                      size="small"
                      [outlined]="true"
                      [severity]="role.roleActive ? 'danger' : 'success'"
                      (onClick)="onToggleStatus(role)"
                      styleClass="flex-1"
                    />
                  </div>
                </div>
              }
            </div>

            <!-- Paginador Mobile -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mt-4">
              <p-paginator
                [rows]="pageSize()"
                [totalRecords]="totalRecords()"
                [first]="currentPage() * pageSize()"
                [rowsPerPageOptions]="[5, 10, 15, 20]"
                [showCurrentPageReport]="true"
                currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords}"
                (onPageChange)="onPageChange($event)"
              />
            </div>
          }
        }
      </div>

      <!-- Role Form Drawer -->
      @if (isRoleFormOpen()) {
        <app-role-form
          [role]="selectedRoleForEdit()"
          (formClosed)="onRoleFormClose($event)"
        />
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .roles-tab {
      width: 100%;
    }
  `]
})
export class RolesTabComponent implements OnDestroy {
  private readonly roleService = inject(RoleService);
  private readonly destroy$ = new Subject<void>();

  // Form controls
  readonly searchControl = new FormControl<string>('');

  // Use service signals
  readonly roles = this.roleService.roles;
  readonly loading = this.roleService.isLoading;
  readonly totalRecords = this.roleService.totalRecords;
  readonly activeCount = this.roleService.totalActive;
  readonly inactiveCount = this.roleService.totalInactive;
  readonly pageSize = this.roleService.pageSize;
  readonly currentPage = this.roleService.currentPage;
  readonly selectedStatus = signal<boolean | null>(null);

  // Role form state
  readonly isRoleFormOpen = signal(false);
  readonly selectedRoleForEdit = signal<RoleWithPermissionCount | null>(null);

  constructor() {
    // Setup search with debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadRoles();
      });

    // Load initial data
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load roles with current filters
   */
  private loadRoles(): void {
    const criteria: RoleFilterCriteria = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      roleActive: this.selectedStatus() ?? undefined,
      search: this.searchControl.value || undefined
    };

    this.roleService.getRoles(criteria).subscribe({
      error: (error) => {
        console.error('Error loading roles:', error);
        // TODO: Show error message to user
      }
    });
  }

  /**
   * Handle status filter change
   */
  onStatusFilter(status: boolean | null): void {
    this.selectedStatus.set(status);
    this.currentPage.set(0);
    this.loadRoles();
  }

  /**
   * Handle page change
   */
  onPageChange(event: any): void {
    this.currentPage.set(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.loadRoles();
  }

  /**
   * Load more for mobile
   */
  loadMore(): void {
    this.currentPage.update(p => p + 1);
    this.loadRoles();
  }

  /**
   * Action handlers
   */
  onCreateRole(): void {
    this.selectedRoleForEdit.set(null);
    this.isRoleFormOpen.set(true);
  }

  onEditRole(role: RoleWithPermissionCount): void {
    this.selectedRoleForEdit.set(role);
    this.isRoleFormOpen.set(true);
  }

  onToggleStatus(role: RoleWithPermissionCount): void {
    const newStatus = !role.roleActive;

    this.roleService.toggleRoleStatus(role.roleId, newStatus).subscribe({
      next: () => {
        // TODO: Show success message to user
      },
      error: (error) => {
        console.error('Error toggling status:', error);
        // TODO: Show error message to user
      }
    });
  }

  /**
   * Handle role form close
   */
  onRoleFormClose(success: boolean): void {
    this.isRoleFormOpen.set(false);
    this.selectedRoleForEdit.set(null);

    // Reload roles if form was submitted successfully
    if (success) {
      this.loadRoles();
    }
  }
}
