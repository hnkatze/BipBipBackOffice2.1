import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG
import { TabsModule } from 'primeng/tabs';

// Components
import { PromotionalDiscountsListPageComponent } from '../promotional-discounts-list-page/promotional-discounts-list-page.component';
import { ProductRewardsListPageComponent } from '../product-rewards-list-page/product-rewards-list-page.component';
import { DragDropPromotionsListPageComponent } from '../drag-drop-promotions-list-page/drag-drop-promotions-list-page.component';
import { PromoCodesListPageComponent } from '../promo-codes-list-page/promo-codes-list-page.component';
import { TurnOnPromotionsListPageComponent } from '../turn-on-promotions-list-page/turn-on-promotions-list-page.component';

@Component({
  selector: 'app-in-app-promotions-main-page',
  imports: [
    CommonModule,
    TabsModule,
    PromotionalDiscountsListPageComponent,
    ProductRewardsListPageComponent,
    DragDropPromotionsListPageComponent,
    PromoCodesListPageComponent,
    TurnOnPromotionsListPageComponent
  ],
  templateUrl: './in-app-promotions-main-page.component.html',
  styleUrl: './in-app-promotions-main-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InAppPromotionsMainPageComponent {
  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  readonly activeTabSignal = signal<number>(0);

  // ============================================================================
  // MÉTODOS - Tab Management
  // ============================================================================

  onTabChange(event: any): void {
    this.activeTabSignal.set(event.index);
  }
}
