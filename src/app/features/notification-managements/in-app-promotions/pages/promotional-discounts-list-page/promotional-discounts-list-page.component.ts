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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';

// Services & Models
import { PromotionalDiscountService } from '../../services/promotional-discount.service';
import { PromotionalDiscountResponse, DiscountType, DISCOUNT_TYPE_OPTIONS } from '../../models/promotional-discount.model';
import { GlobalDataService } from '@core/services/global-data.service';

@Component({
  selector: 'app-promotional-discounts-list-page',
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
    TooltipModule,
    ToggleSwitchModule,
    PaginatorModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './promotional-discounts-list-page.component.html',
  styleUrl: './promotional-discounts-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromotionalDiscountsListPageComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly promotionalDiscountService = inject(PromotionalDiscountService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly promotionalDiscounts = this.promotionalDiscountService.promotionalDiscounts;
  readonly metadata = this.promotionalDiscountService.metadata;
  readonly isLoading = this.promotionalDiscountService.isLoading;

  readonly brands = this.globalDataService.brands;
  readonly channels = this.globalDataService.channels;
  readonly cities = this.globalDataService.citiesShort;

  // Filtros
  readonly searchTermSignal = signal<string>('');
  readonly currentPageSignal = signal<number>(1);
  readonly pageSizeSignal = signal<number>(10);

  // UI State
  readonly selectedDiscountIdSignal = signal<number | null>(null);

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

  readonly channelsMap = computed(() => {
    const channelsArray = this.channels();
    return new Map(channelsArray.map(c => [c.id, c]));
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
      if (this.channels().length === 0) {
        this.globalDataService.forceRefresh('channels');
      }
      if (this.cities().length === 0) {
        this.globalDataService.forceRefresh('citiesShort');
      }
    });

    // Setup search debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(term => {
        this.searchTermSignal.set(term);
        this.currentPageSignal.set(1);
        this.loadPromotionalDiscounts();
      });

    // Cargar data inicial
    this.loadPromotionalDiscounts();
  }

  // ============================================================================
  // MÉTODOS - Cargar Data
  // ============================================================================

  loadPromotionalDiscounts(): void {
    const page = this.currentPageSignal();
    const pageSize = this.pageSizeSignal();
    const filter = this.searchTermSignal();

    this.promotionalDiscountService.getPromotionalDiscounts(page, pageSize, filter || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error) => {
          console.error('Error loading promotional discounts:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la lista de descuentos promocionales'
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
    this.loadPromotionalDiscounts();
  }

  // ============================================================================
  // MÉTODOS - Paginación
  // ============================================================================

  onPageChange(event: any): void {
    const page = event.page !== undefined ? event.page + 1 : 1;
    this.currentPageSignal.set(page);
    this.pageSizeSignal.set(event.rows);
    this.loadPromotionalDiscounts();
  }

  // ============================================================================
  // MÉTODOS - Navegación
  // ============================================================================

  goToCreate(): void {
    this.router.navigate(['/notification-managements/in-app-promotions/promotional-discounts/new']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/notification-managements/in-app-promotions/promotional-discounts/edit', id]);
  }

  // ============================================================================
  // MÉTODOS - Acciones
  // ============================================================================

  onStatusChange(discount: PromotionalDiscountResponse, newStatus: boolean): void {
    this.promotionalDiscountService.updatePromotionalDiscountStatus(discount.id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Descuento ${newStatus ? 'activado' : 'desactivado'} correctamente`
          });
          this.loadPromotionalDiscounts();
        },
        error: (error) => {
          console.error('Error updating status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado del descuento'
          });
          // Recargar para revertir el toggle en caso de error
          this.loadPromotionalDiscounts();
        }
      });
  }

  // ============================================================================
  // MÉTODOS - Helpers para Template
  // ============================================================================

  getDiscountTypeLabel(type: DiscountType): string {
    return DISCOUNT_TYPE_OPTIONS.find(opt => opt.value === type)?.label || type;
  }

  getDiscountTypeIcon(type: DiscountType): string {
    return DISCOUNT_TYPE_OPTIONS.find(opt => opt.value === type)?.icon || 'pi pi-tag';
  }

  getFormattedValue(discount: PromotionalDiscountResponse): string {
    switch (discount.discountType) {
      case DiscountType.DeliveryCost:
        return `L. ${discount.deliveryCost.toFixed(2)}`;
      case DiscountType.FixedDiscount:
        return `L. ${discount.discountValue.toFixed(2)}`;
      case DiscountType.PercentageDiscount:
        return `${discount.discountValue}%`;
      default:
        return '-';
    }
  }

  getBrandName(brandId: number): string {
    return this.brandsMap().get(brandId)?.name || 'Desconocido';
  }

  getChannelName(channelId: number): string {
    return this.channelsMap().get(channelId)?.description || 'Desconocido';
  }

  getCityName(cityId: number): string {
    return this.citiesMap().get(cityId)?.name || 'Desconocido';
  }

  formatDate(date: string): string {
    if (!date) return '-';
    const dateObj = new Date(date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  // Para mostrar solo las primeras 2 marcas/canales/ciudades
  getVisibleItems(items: number[]): number[] {
    return items.slice(0, 2);
  }

  getRemainingCount(items: number[]): number {
    return items.length > 2 ? items.length - 2 : 0;
  }

  // Tooltip con todas las marcas
  getAllBrandsTooltip(brands: number[]): string {
    return brands.map(id => this.getBrandName(id)).join(', ');
  }

  // Tooltip con todos los canales
  getAllChannelsTooltip(channels: number[]): string {
    return channels.map(id => this.getChannelName(id)).join(', ');
  }

  // Tooltip con todas las ciudades
  getAllCitiesTooltip(cities: number[]): string {
    return cities.map(id => this.getCityName(id)).join(', ');
  }
}
