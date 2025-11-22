import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { MenuItem, MessageService } from 'primeng/api';

import { LoyaltyService } from '../../services';
import { LoyaltyLevel } from '../../models';

@Component({
  selector: 'app-loyalty-levels-page',
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    CardModule,
    ProgressSpinnerModule,
    BreadcrumbModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ToastModule,
    TooltipModule,
    PaginatorModule
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loyalty-levels-page.component.html',
  styleUrl: './loyalty-levels-page.component.scss'
})
export class LoyaltyLevelsPageComponent implements OnInit {
  private readonly loyaltyService = inject(LoyaltyService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Gest. Notificaciones', routerLink: '/notification-managements' },
    { label: 'Programa de Lealtad' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  // Expose service signals to template
  readonly loyaltyLevels = this.loyaltyService.loyaltyLevels;
  readonly isLoading = this.loyaltyService.isLoading;
  readonly maxLevel = this.loyaltyService.maxLevel;

  // Search filter
  readonly searchText = signal('');

  // Filtered levels (computed from search)
  readonly filteredLevels = signal<LoyaltyLevel[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Load loyalty levels
   */
  loadData(): void {
    this.loyaltyService.loadLoyaltyLevels();
  }

  /**
   * Handle search input
   */
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchText.set(value);
    this.filterLevels();
  }

  /**
   * Filter levels based on search text
   */
  private filterLevels(): void {
    const levels = this.loyaltyLevels();
    const search = this.searchText();

    if (!search) {
      this.filteredLevels.set(levels);
      return;
    }

    const filtered = levels.filter(level =>
      level.loyaltyLevelName.toLowerCase().includes(search) ||
      level.minPointsLevel.toString().includes(search) ||
      level.maxPointsLevel.toString().includes(search)
    );

    this.filteredLevels.set(filtered);
  }

  /**
   * Navigate to create new level
   */
  onCreate(): void {
    const maxLvl = this.maxLevel();
    const maxPoints = maxLvl ? maxLvl.maxPointsLevel : 0;
    this.router.navigate([
      '/notification-managements/loyalty-program/detail',
      maxPoints
    ]);
  }

  /**
   * Navigate to edit level
   */
  onEdit(level: LoyaltyLevel): void {
    this.router.navigate([
      '/notification-managements/loyalty-program/detail',
      level.minPointsLevel,
      level.maxPointsLevel,
      level.idLoyaltyLevel
    ]);
  }

  /**
   * Toggle level status
   */
  onToggleStatus(level: LoyaltyLevel): void {
    const newStatus = !level.isActive;

    this.loyaltyService.updateLevelStatus(level.idLoyaltyLevel, newStatus)
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: `Nivel ${newStatus ? 'activado' : 'desactivado'} correctamente`
          });
          this.loadData();
        },
        error: (error: unknown) => {
          console.error('Error updating level status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el estado del nivel'
          });
        }
      });
  }

  /**
   * Get status label
   */
  getStatusLabel(isActive: boolean): string {
    return isActive ? 'ACTIVO' : 'INACTIVO';
  }

  /**
   * Get status severity for tag
   */
  getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  /**
   * Get icon class based on icon name
   */
  getIconClass(iconName: string): string {
    // Map icon names to PrimeIcons or custom classes
    const iconMap: Record<string, string> = {
      'bronze-medal': 'pi pi-circle-fill',
      'silver-medal': 'pi pi-circle-fill',
      'gold-medal': 'pi pi-circle-fill',
      'diamond-medal': 'pi pi-star-fill',
      'platinum-medal': 'pi pi-star-fill'
    };

    return iconMap[iconName] || 'pi pi-circle-fill';
  }

  /**
   * Get benefits summary string
   */
  getBenefitsSummary(level: LoyaltyLevel): string {
    if (!level.loyaltyItemsWalletList || level.loyaltyItemsWalletList.length === 0) {
      return 'Sin beneficios';
    }

    const count = level.loyaltyItemsWalletList.length;
    return `${count} beneficio${count > 1 ? 's' : ''}`;
  }
}
