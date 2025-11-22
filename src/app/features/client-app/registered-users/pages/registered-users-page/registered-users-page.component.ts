import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { TableModule } from 'primeng/table';
import { MessageService, MenuItem } from 'primeng/api';

import { RegisteredUsersService } from '../../services';
import { RegisteredUserRecord, RegisteredUsersFilters } from '../../models';
import { FiltersSidebarComponent } from '../../components/filters-sidebar/filters-sidebar.component';

@Component({
  selector: 'app-registered-users-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    ToastModule,
    BreadcrumbModule,
    SkeletonModule,
    PaginatorModule,
    MenuModule,
    TooltipModule,
    PopoverModule,
    TableModule,
    FiltersSidebarComponent
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registered-users-page.component.html'
})
export class RegisteredUsersPageComponent implements OnInit {
  readonly registeredUsersService = inject(RegisteredUsersService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive' | 'blocked'>('all');
  readonly showFiltersDrawer = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  // Advanced filters
  readonly dateFrom = signal<string | null>(null);
  readonly dateTo = signal<string | null>(null);
  readonly selectedCountries = signal<number[]>([]);
  readonly selectedCities = signal<number[]>([]);

  readonly users = computed(() => this.registeredUsersService.users());
  readonly metadata = computed(() => this.registeredUsersService.metadata());
  readonly isLoading = computed(() => this.registeredUsersService.isLoading());

  readonly hasActiveFilters = computed(() => {
    return this.dateFrom() !== null ||
           this.dateTo() !== null ||
           this.selectedCountries().length > 0 ||
           this.selectedCities().length > 0;
  });

  breadcrumbItems: MenuItem[] = [
    { label: 'Client App' },
    { label: 'Usuarios Registrados' }
  ];

  home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    const filters: Partial<RegisteredUsersFilters> = {
      status: this.statusFilter(),
      filter: this.searchTerm(),
      from: this.dateFrom(),
      to: this.dateTo(),
      countries: this.selectedCountries(),
      cities: this.selectedCities(),
      pageNumber: this.currentPage(),
      pageSize: this.pageSize()
    };

    this.registeredUsersService.getRegisteredUsers(filters).subscribe({
      error: (error) => {
        console.error('Error loading users:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los usuarios registrados'
        });
      }
    });
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive' | 'blocked'): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onSearchChange(): void {
    this.currentPage.set(1);
    this.loadUsers();
  }

  openFiltersDrawer(): void {
    this.showFiltersDrawer.set(true);
  }

  onFiltersApplied(filters: {
    from: string | null;
    to: string | null;
    countries: number[];
    cities: number[];
  }): void {
    this.dateFrom.set(filters.from);
    this.dateTo.set(filters.to);
    this.selectedCountries.set(filters.countries);
    this.selectedCities.set(filters.cities);
    this.currentPage.set(1);
    this.loadUsers();
  }

  clearAllFilters(): void {
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.selectedCountries.set([]);
    this.selectedCities.set([]);
    this.currentPage.set(1);
    this.loadUsers();
  }

  onPageChange(event: any): void {
    this.currentPage.set(event.page + 1);
    this.pageSize.set(event.rows);
    this.loadUsers();
  }

  getUserActions(user: RegisteredUserRecord): MenuItem[] {
    return [
      {
        label: 'Ver Detalles',
        icon: 'pi pi-eye',
        command: () => this.viewUserDetails(user)
      },
      {
        separator: true
      },
      {
        label: user.isBlocked ? 'Despenalizar' : 'Penalizar',
        icon: user.isBlocked ? 'pi pi-unlock' : 'pi pi-ban',
        command: () => this.togglePenalize(user)
      }
    ];
  }

  viewUserDetails(user: RegisteredUserRecord): void {
    this.router.navigate(['/client-app/user-registry', user.customerId]);
  }

  togglePenalize(user: RegisteredUserRecord): void {
    // Placeholder - will be implemented in next phase
    const action = user.isBlocked ? 'despenalizar' : 'penalizar';
    this.messageService.add({
      severity: 'info',
      summary: 'Próximamente',
      detail: `Función de ${action} a ${user.customerFullName} estará disponible pronto`
    });
  }

  getStatusLabel(isActive: boolean, isBlocked: boolean): string {
    if (isBlocked) return 'Penalizado';
    return isActive ? 'Activo' : 'Inactivo';
  }

  getStatusSeverity(isActive: boolean, isBlocked: boolean): 'success' | 'danger' | 'warn' {
    if (isBlocked) return 'warn';
    return isActive ? 'success' : 'danger';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
}
