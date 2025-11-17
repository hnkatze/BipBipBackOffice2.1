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
import { ProductRewardService } from '../../services/product-reward.service';
import { ProductRewardResponse, RewardType, REWARD_TYPE_OPTIONS } from '../../models/product-reward.model';
import { GlobalDataService } from '@core/services/global-data.service';

@Component({
  selector: 'app-product-rewards-list-page',
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
  templateUrl: './product-rewards-list-page.component.html',
  styleUrl: './product-rewards-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductRewardsListPageComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly productRewardService = inject(ProductRewardService);
  private readonly globalDataService = inject(GlobalDataService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly productRewards = this.productRewardService.productRewards;
  readonly metadata = this.productRewardService.metadata;
  readonly isLoading = this.productRewardService.isLoading;

  readonly brands = this.globalDataService.brands;
  readonly channels = this.globalDataService.channels;

  // Filtros
  readonly searchTermSignal = signal<string>('');
  readonly currentPageSignal = signal<number>(1);
  readonly pageSizeSignal = signal<number>(10);

  // UI State
  readonly selectedRewardIdSignal = signal<number | null>(null);

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
        this.loadProductRewards();
      });

    // Cargar data inicial
    this.loadProductRewards();
  }

  // ============================================================================
  // MÉTODOS - Cargar Data
  // ============================================================================

  loadProductRewards(): void {
    const page = this.currentPageSignal();
    const pageSize = this.pageSizeSignal();
    const filter = this.searchTermSignal();

    this.productRewardService.getProductRewards(page, pageSize, filter || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error) => {
          console.error('Error loading product rewards:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la lista de regalías por producto'
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
    this.loadProductRewards();
  }

  // ============================================================================
  // MÉTODOS - Paginación
  // ============================================================================

  onPageChange(event: any): void {
    const page = event.page !== undefined ? event.page + 1 : 1;
    this.currentPageSignal.set(page);
    this.pageSizeSignal.set(event.rows);
    this.loadProductRewards();
  }

  // ============================================================================
  // MÉTODOS - Navegación
  // ============================================================================

  goToCreate(): void {
    this.router.navigate(['/notification-managements/in-app-promotions/product-rewards/new']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/notification-managements/in-app-promotions/product-rewards/edit', id]);
  }

  // ============================================================================
  // MÉTODOS - Acciones
  // ============================================================================

  toggleStatus(reward: ProductRewardResponse): void {
    const newStatus = !reward.isActive;
    const action = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas ${action} esta regalía?`,
      header: 'Confirmar acción',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.productRewardService.updateProductRewardStatus(reward.id, newStatus)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Regalía ${newStatus ? 'activada' : 'desactivada'} correctamente`
              });
              this.loadProductRewards();
            },
            error: (error) => {
              console.error('Error updating status:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo actualizar el estado de la regalía'
              });
            }
          });
      }
    });
  }

  // ============================================================================
  // MÉTODOS - Helpers para Template
  // ============================================================================

  getRewardTypeLabel(type: RewardType): string {
    return REWARD_TYPE_OPTIONS.find(opt => opt.value === type)?.label || 'Desconocido';
  }

  getRewardTypeIcon(type: RewardType): string {
    return REWARD_TYPE_OPTIONS.find(opt => opt.value === type)?.icon || 'pi pi-tag';
  }

  getBrandName(brandId: number): string {
    return this.brandsMap().get(brandId)?.name || 'Desconocido';
  }

  getBrandLogo(brandId: number): string {
    return this.brandsMap().get(brandId)?.logo || '';
  }

  getChannelName(channelId: number | null | undefined): string {
    if (!channelId) return '';
    return this.channelsMap().get(channelId)?.description || 'Desconocido';
  }

  getTriggerTypeLabel(triggerId: number): string {
    switch (triggerId) {
      case 1:
        return 'Por Producto';
      case 2:
        return 'Por Marca y Canal';
      case 3:
        return 'Por Marca';
      default:
        return 'Desconocido';
    }
  }

  getTriggerTypeIcon(triggerId: number): string {
    switch (triggerId) {
      case 1:
        return 'pi pi-box';
      case 2:
        return 'pi pi-building';
      case 3:
        return 'pi pi-tag';
      default:
        return 'pi pi-question-circle';
    }
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
}
