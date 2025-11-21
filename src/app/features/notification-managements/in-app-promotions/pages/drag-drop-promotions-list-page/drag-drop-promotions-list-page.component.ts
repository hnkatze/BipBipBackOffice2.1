import { Component, inject, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
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
import { DragDropPromotionService } from '../../services/drag-drop-promotion.service';
import { DragDropPromotionResponse, PromotionType, ActionType, PROMOTION_TYPE_OPTIONS, ACTION_TYPE_OPTIONS } from '../../models';

@Component({
  selector: 'app-drag-drop-promotions-list-page',
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
  templateUrl: './drag-drop-promotions-list-page.component.html',
  styleUrl: './drag-drop-promotions-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DragDropPromotionsListPageComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dragDropPromotionService = inject(DragDropPromotionService);

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly dragDropPromotions = this.dragDropPromotionService.dragDropPromotions;
  readonly metadata = this.dragDropPromotionService.metadata;
  readonly isLoading = this.dragDropPromotionService.isLoading;

  // Filtros
  readonly searchTermSignal = signal<string>('');
  readonly currentPageSignal = signal<number>(1);
  readonly pageSizeSignal = signal<number>(10);

  // UI State
  readonly selectedPromotionIdSignal = signal<number | null>(null);

  // Subject para search con debounce
  private readonly searchSubject = new Subject<string>();

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor() {
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
        this.loadDragDropPromotions();
      });

    // Cargar data inicial
    this.loadDragDropPromotions();
  }

  // ============================================================================
  // MÉTODOS - Cargar Data
  // ============================================================================

  loadDragDropPromotions(): void {
    const page = this.currentPageSignal();
    const pageSize = this.pageSizeSignal();
    const filter = this.searchTermSignal();

    this.dragDropPromotionService.getDragDropPromotions(page, pageSize, filter || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (error) => {
          console.error('Error loading drag & drop promotions:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la lista de promociones'
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
    this.loadDragDropPromotions();
  }

  // ============================================================================
  // MÉTODOS - Paginación
  // ============================================================================

  onPageChange(event: any): void {
    const page = event.page !== undefined ? event.page + 1 : 1;
    this.currentPageSignal.set(page);
    this.pageSizeSignal.set(event.rows);
    this.loadDragDropPromotions();
  }

  // ============================================================================
  // MÉTODOS - Navegación
  // ============================================================================

  goToCreate(): void {
    this.router.navigate(['/notification-managements/in-app-promotions/drag-drop-promotions/new']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/notification-managements/in-app-promotions/drag-drop-promotions/edit', id]);
  }

  // ============================================================================
  // MÉTODOS - Acciones
  // ============================================================================

  toggleStatus(promotion: DragDropPromotionResponse): void {
    const newStatus = !promotion.isActive;
    const action = newStatus ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas ${action} esta promoción?`,
      header: 'Confirmar acción',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: () => {
        this.dragDropPromotionService.updateDragDropPromotionStatus(promotion.id, newStatus)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Promoción ${newStatus ? 'activada' : 'desactivada'} correctamente`
              });
              this.loadDragDropPromotions();
            },
            error: (error) => {
              console.error('Error updating status:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo actualizar el estado de la promoción'
              });
            }
          });
      }
    });
  }

  // ============================================================================
  // MÉTODOS - Helpers para Template
  // ============================================================================

  getPromotionTypeLabel(type: PromotionType): string {
    return PROMOTION_TYPE_OPTIONS.find(opt => opt.value === type)?.label || 'Desconocido';
  }

  getPromotionTypeIcon(type: PromotionType): string {
    return PROMOTION_TYPE_OPTIONS.find(opt => opt.value === type)?.icon || 'pi pi-tag';
  }

  getActionTypeLabel(type: ActionType): string {
    return ACTION_TYPE_OPTIONS.find(opt => opt.value === type)?.label || 'Desconocido';
  }

  getActionTypeIcon(type: ActionType): string {
    return ACTION_TYPE_OPTIONS.find(opt => opt.value === type)?.icon || 'pi pi-tag';
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

  getPromotionTypeSeverity(type: PromotionType): 'info' | 'secondary' {
    return type === PromotionType.Banner ? 'info' : 'secondary';
  }

  getActionTypeSeverity(type: ActionType): 'info' | 'secondary' | 'success' | 'warn' {
    switch (type) {
      case ActionType.Product:
        return 'info';
      case ActionType.Category:
        return 'success';
      case ActionType.ExternalLink:
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
