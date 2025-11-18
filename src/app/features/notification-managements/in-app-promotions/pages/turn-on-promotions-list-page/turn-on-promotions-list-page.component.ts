import { Component, inject, signal, computed, DestroyRef, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService, ConfirmationService } from 'primeng/api';

// Services & Models
import { TurnOnPromotionService } from '../../services/turn-on-promotion.service';
import { TurnOnPromotionResponse, TurnOnDiscountType } from '../../models';

@Component({
  selector: 'app-turn-on-promotions-list-page',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './turn-on-promotions-list-page.component.html',
  styleUrl: './turn-on-promotions-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TurnOnPromotionsListPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly turnOnService = inject(TurnOnPromotionService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly isLoading = signal<boolean>(false);
  readonly promotions = signal<TurnOnPromotionResponse[]>([]);
  readonly searchTerm = signal<string>('');

  // Expose enum to template
  readonly TurnOnDiscountType = TurnOnDiscountType;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly filteredPromotions = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const promos = this.promotions();

    if (!search) {
      return promos;
    }

    return promos.filter(promo => {
      const criteriaName = (promo.criteriaName || '').toLowerCase();
      const typeLabel = this.getDiscountTypeLabel(promo).toLowerCase();
      const valueStr = this.getDiscountValue(promo).toLowerCase();
      const promocodeName = (promo.promocodeName || '').toLowerCase();

      return criteriaName.includes(search) ||
             typeLabel.includes(search) ||
             valueStr.includes(search) ||
             promocodeName.includes(search);
    });
  });

  readonly hasPromotions = computed(() => this.promotions().length > 0);
  readonly hasFilteredResults = computed(() => this.filteredPromotions().length > 0);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnInit(): void {
    this.loadPromotions();
  }

  // ============================================================================
  // MÉTODOS - Load Data
  // ============================================================================

  loadPromotions(): void {
    this.isLoading.set(true);

    this.turnOnService.getTurnOnPromotions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (promotions) => {
          this.promotions.set(promotions);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading turn on promotions:', error);
          this.isLoading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar las promociones Turn On'
          });
        }
      });
  }

  // ============================================================================
  // MÉTODOS - Search
  // ============================================================================

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  // ============================================================================
  // MÉTODOS - Helpers
  // ============================================================================

  getDiscountTypeLabel(promotion: TurnOnPromotionResponse): string {
    if (promotion.promocodeRequired !== null) {
      return 'Código Promocional';
    }

    if (promotion.type === TurnOnDiscountType.PercentageDiscount) {
      return 'Descuento Porcentual';
    } else if (promotion.type === TurnOnDiscountType.FixedDiscount) {
      return 'Descuento Fijo';
    }

    return 'N/A';
  }

  getDiscountValue(promotion: TurnOnPromotionResponse): string {
    if (promotion.promocodeRequired !== null) {
      return promotion.promocodeName || 'N/A';
    }

    if (promotion.type === TurnOnDiscountType.PercentageDiscount) {
      return `${(promotion.value * 100).toFixed(0)}%`;
    } else if (promotion.type === TurnOnDiscountType.FixedDiscount) {
      return `L ${promotion.value.toFixed(2)}`;
    }

    return 'N/A';
  }

  getMinimumPurchase(promotion: TurnOnPromotionResponse): string {
    if (promotion.constraints?.minimumPurchase?.value) {
      return `L ${promotion.constraints.minimumPurchase.value.toFixed(2)}`;
    }
    return 'N/A';
  }

  getStatusSeverity(isActive?: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  getStatusLabel(isActive?: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  // ============================================================================
  // MÉTODOS - Navegación
  // ============================================================================

  onCreateNew(): void {
    this.router.navigate(['/notification-managements/in-app-promotions/turn-on-promotions/new']);
  }

  onEdit(promotion: TurnOnPromotionResponse): void {
    this.router.navigate(['/notification-managements/in-app-promotions/turn-on-promotions/edit', promotion.id]);
  }

  onDelete(promotion: TurnOnPromotionResponse): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar esta promoción Turn On?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletePromotion(promotion.id);
      }
    });
  }

  private deletePromotion(id: number): void {
    this.turnOnService.deleteTurnOnPromotion(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Promoción Turn On eliminada correctamente'
          });
          this.loadPromotions();
        },
        error: (error) => {
          console.error('Error deleting turn on promotion:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar la promoción Turn On'
          });
        }
      });
  }
}
