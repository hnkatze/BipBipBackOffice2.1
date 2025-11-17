import { Component, inject, signal, computed, effect, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';

// Services & Models
import { PushInAppService } from '../../services/push-in-app.service';
import { PushInAppResponse, BannerInterval } from '../../models/push-in-app.model';
import { GlobalDataService } from '@core/services/global-data.service';
import { formatDateForDisplay, getBannerIntervalLabel } from '../../utils/push-in-app.utils';

@Component({
  selector: 'app-push-in-app-list-page',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    BadgeModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    PopoverModule,
    TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './push-in-app-list-page.component.html',
  styleUrl: './push-in-app-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PushInAppListPageComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly pushInAppService = inject(PushInAppService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly pushInApps = this.pushInAppService.pushInApps;
  readonly metadata = this.pushInAppService.metadata;
  readonly isLoading = this.pushInAppService.isLoading;

  readonly brands = this.globalDataService.brands;
  readonly cities = this.globalDataService.citiesShort;

  // Filtros
  readonly searchTermSignal = signal<string>('');
  readonly currentPageSignal = signal<number>(1);
  readonly pageSizeSignal = signal<number>(10);

  // UI State
  readonly selectedPushInAppIdSignal = signal<number | null>(null);

  // Subject para search con debounce
  private readonly searchSubject = new Subject<string>();

  // ============================================================================
  // COMPUTED - Estado derivado
  // ============================================================================

  // Maps para O(1) lookup
  readonly brandsMap = computed(() => {
    const brandsArray = this.brands();
    return new Map(brandsArray.map(b => [b.id, b]));
  });

  readonly citiesMap = computed(() => {
    const citiesArray = this.cities();
    return new Map(citiesArray.map(c => [c.id, c]));
  });

  // ============================================================================
  // CONSTRUCTOR
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

    // Setup search debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(term => {
        this.searchTermSignal.set(term);
        this.currentPageSignal.set(1); // Reset a página 1
        this.loadPushInApps();
      });

    // Cargar data inicial
    this.loadPushInApps();
  }

  // ============================================================================
  // MÉTODOS - Cargar Data
  // ============================================================================

  loadPushInApps(): void {
    const page = this.currentPageSignal();
    const pageSize = this.pageSizeSignal();
    const filter = this.searchTermSignal();

    this.pushInAppService.getPushInApps(page, pageSize, filter || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error) => {
          console.error('Error loading push in apps:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la lista de notificaciones'
          });
        }
      });
  }

  // ============================================================================
  // MÉTODOS - Búsqueda y Filtros
  // ============================================================================

  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  clearFilters(): void {
    this.searchTermSignal.set('');
    this.currentPageSignal.set(1);
    this.loadPushInApps();
  }

  // ============================================================================
  // MÉTODOS - Paginación
  // ============================================================================

  onPageChange(event: any): void {
    this.currentPageSignal.set(event.page + 1); // PrimeNG usa 0-based
    this.pageSizeSignal.set(event.rows);
    this.loadPushInApps();
  }

  // ============================================================================
  // MÉTODOS - Navegación
  // ============================================================================

  goToCreate(): void {
    this.router.navigate(['/notification-managements/push-in-app/new']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/notification-managements/push-in-app/edit', id]);
  }

  // ============================================================================
  // MÉTODOS - Acciones
  // ============================================================================

  toggleStatus(pushInApp: PushInAppResponse): void {
    const newStatus = !pushInApp.isActive;
    const action = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas ${action} esta notificación?`,
      header: 'Confirmar acción',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.pushInAppService.updatePushInAppStatus(pushInApp.id, newStatus)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Notificación ${newStatus ? 'activada' : 'desactivada'} correctamente`
              });
              this.loadPushInApps();
            },
            error: (error) => {
              console.error('Error updating status:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo actualizar el estado de la notificación'
              });
            }
          });
      }
    });
  }

  // ============================================================================
  // MÉTODOS - Helpers para Template
  // ============================================================================

  getBrandName(brandId: number): string {
    return this.brandsMap().get(brandId)?.name || 'Desconocido';
  }

  getBrandLogo(brandId: number): string {
    return this.brandsMap().get(brandId)?.logo || '';
  }

  getCityName(cityId: number): string {
    return this.citiesMap().get(cityId)?.name || 'Desconocido';
  }

  formatDate(date: string): string {
    return formatDateForDisplay(date);
  }

  getIntervalLabel(interval: BannerInterval): string {
    return getBannerIntervalLabel(interval);
  }

  getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  // Para mostrar solo las primeras 2 marcas/ciudades
  getVisibleBrands(brands: number[]): number[] {
    return brands.slice(0, 2);
  }

  getRemainingBrandsCount(brands: number[]): number {
    return brands.length > 2 ? brands.length - 2 : 0;
  }

  getVisibleCities(cities: number[]): number[] {
    return cities.slice(0, 2);
  }

  getRemainingCitiesCount(cities: number[]): number {
    return cities.length > 2 ? cities.length - 2 : 0;
  }

  // Tooltip con todas las marcas
  getAllBrandsTooltip(brands: number[]): string {
    return brands.map(id => this.getBrandName(id)).join(', ');
  }

  // Tooltip con todas las ciudades
  getAllCitiesTooltip(cities: number[]): string {
    return cities.map(id => this.getCityName(id)).join(', ');
  }
}
