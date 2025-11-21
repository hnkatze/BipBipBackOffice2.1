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
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';

// Services & Models
import { PromoCodeService } from '../../services/promo-code.service';
import { PromoCodeResponse, PromoCodeType, PROMO_CODE_TYPE_OPTIONS } from '../../models';
import { GlobalDataService } from '@core/services/global-data.service';

@Component({
  selector: 'app-promo-codes-list-page',
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
    PaginatorModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './promo-codes-list-page.component.html',
  styleUrl: './promo-codes-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoCodesListPageComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly promoCodes = this.promoCodeService.promoCodes;
  readonly metadata = this.promoCodeService.metadata;
  readonly isLoading = this.promoCodeService.isLoading;

  readonly brands = this.globalDataService.brands;
  readonly channels = this.globalDataService.channels;
  readonly cities = this.globalDataService.cities;

  // Filtros
  readonly searchTermSignal = signal<string>('');
  readonly currentPageSignal = signal<number>(1);
  readonly pageSizeSignal = signal<number>(10);

  // UI State
  readonly selectedPromoCodeIdSignal = signal<number | null>(null);

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
        this.globalDataService.forceRefresh('cities');
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
        this.loadPromoCodes();
      });

    // Cargar data inicial
    this.loadPromoCodes();
  }

  // ============================================================================
  // MÉTODOS - Cargar Data
  // ============================================================================

  loadPromoCodes(): void {
    const page = this.currentPageSignal();
    const pageSize = this.pageSizeSignal();
    const filter = this.searchTermSignal();

    this.promoCodeService.getPromoCodes(page, pageSize, filter || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error) => {
          console.error('Error loading promo codes:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la lista de códigos promocionales'
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
    this.loadPromoCodes();
  }

  // ============================================================================
  // MÉTODOS - Paginación
  // ============================================================================

  onPageChange(event: any): void {
    const page = event.page !== undefined ? event.page + 1 : 1;
    this.currentPageSignal.set(page);
    this.pageSizeSignal.set(event.rows);
    this.loadPromoCodes();
  }

  // ============================================================================
  // MÉTODOS - Navegación
  // ============================================================================

  goToCreate(): void {
    this.router.navigate(['/notification-managements/in-app-promotions/promo-codes/new']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/notification-managements/in-app-promotions/promo-codes/edit', id]);
  }

  // ============================================================================
  // MÉTODOS - Acciones
  // ============================================================================

  toggleStatus(promoCode: PromoCodeResponse): void {
    const newStatus = !promoCode.isActive;
    const action = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas ${action} el código "${promoCode.code}"?`,
      header: 'Confirmar acción',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.promoCodeService.updatePromoCodeStatus(promoCode.id, newStatus)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Código ${newStatus ? 'activado' : 'desactivado'} correctamente`
              });
              this.loadPromoCodes();
            },
            error: (error) => {
              console.error('Error updating status:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo actualizar el estado del código'
              });
            }
          });
      }
    });
  }

  // ============================================================================
  // MÉTODOS - Helpers para Template
  // ============================================================================

  getDiscountTypeLabel(type: PromoCodeType): string {
    return PROMO_CODE_TYPE_OPTIONS.find(opt => opt.value === type)?.label || 'Desconocido';
  }

  getDiscountTypeIcon(type: PromoCodeType): string {
    return PROMO_CODE_TYPE_OPTIONS.find(opt => opt.value === type)?.icon || 'pi pi-tag';
  }

  getFormattedDiscountValue(promoCode: PromoCodeResponse): string {
    switch (promoCode.type) {
      case PromoCodeType.Percentage:
        // Backend devuelve 0.15, multiplicamos por 100 para mostrar 15%
        return `${((promoCode.discountValue || 0) * 100).toFixed(0)}%`;
      case PromoCodeType.FixedDiscount:
        return `L. ${(promoCode.discountValue || 0).toFixed(2)}`;
      case PromoCodeType.FreeShipping:
        return 'Envío Gratis';
      case PromoCodeType.Product:
        return 'Producto Gratis';
      default:
        return '-';
    }
  }

  getBrandNames(brandIds: number[]): string {
    if (!brandIds || brandIds.length === 0) return 'Todas';
    const names = brandIds.map(id => this.brandsMap().get(id)?.name || '?');
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
  }

  getChannelNames(channelIds: number[]): string {
    if (!channelIds || channelIds.length === 0) return 'Todos';
    const names = channelIds.map(id => this.channelsMap().get(id)?.description || '?');
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
  }

  getCityNames(cityIds: number[]): string {
    if (!cityIds || cityIds.length === 0) return 'Todas';
    const names = cityIds.map(id => this.citiesMap().get(id)?.name || '?');
    return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
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

  getDiscountTypeSeverity(type: PromoCodeType): 'info' | 'success' | 'secondary' | 'warn' {
    switch (type) {
      case PromoCodeType.Percentage:
        return 'info';
      case PromoCodeType.FixedDiscount:
        return 'success';
      case PromoCodeType.FreeShipping:
        return 'secondary';
      case PromoCodeType.Product:
        return 'warn';
      default:
        return 'secondary';
    }
  }

  // NOTE: maxUses y currentUses no existen en el modelo actual del API old
  getUsagePercentage(promoCode: PromoCodeResponse): number {
    // if (!promoCode.maxUses) return 0;
    // return (promoCode.currentUses / promoCode.maxUses) * 100;
    return 0; // TODO: Implementar cuando el API lo soporte
  }

  getUsageSeverity(promoCode: PromoCodeResponse): 'success' | 'warn' | 'danger' {
    const percentage = this.getUsagePercentage(promoCode);
    if (percentage < 50) return 'success';
    if (percentage < 80) return 'warn';
    return 'danger';
  }
}
