import { Routes } from '@angular/router';

export const IN_APP_PROMOTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/in-app-promotions-main-page/in-app-promotions-main-page.component').then(
        (m) => m.InAppPromotionsMainPageComponent
      )
  },
  {
    path: 'drag-drop-promotions/new',
    loadComponent: () =>
      import('./pages/drag-drop-promotion-form-page/drag-drop-promotion-form-page.component').then(
        (m) => m.DragDropPromotionFormPageComponent
      )
  },
  {
    path: 'drag-drop-promotions/edit/:id',
    loadComponent: () =>
      import('./pages/drag-drop-promotion-form-page/drag-drop-promotion-form-page.component').then(
        (m) => m.DragDropPromotionFormPageComponent
      )
  },
  {
    path: 'promo-codes/new',
    loadComponent: () =>
      import('./pages/promo-code-form-page/promo-code-form-page.component').then(
        (m) => m.PromoCodeFormPageComponent
      )
  },
  {
    path: 'promo-codes/edit/:id',
    loadComponent: () =>
      import('./pages/promo-code-form-page/promo-code-form-page.component').then(
        (m) => m.PromoCodeFormPageComponent
      )
  },
  {
    path: 'promotional-discounts/new',
    loadComponent: () =>
      import('./pages/promotional-discount-form-page/promotional-discount-form-page.component').then(
        (m) => m.PromotionalDiscountFormPageComponent
      )
  },
  {
    path: 'promotional-discounts/edit/:id',
    loadComponent: () =>
      import('./pages/promotional-discount-form-page/promotional-discount-form-page.component').then(
        (m) => m.PromotionalDiscountFormPageComponent
      )
  },
  {
    path: 'product-rewards/new',
    loadComponent: () =>
      import('./pages/product-reward-form-page/product-reward-form-page.component').then(
        (m) => m.ProductRewardFormPageComponent
      )
  },
  {
    path: 'product-rewards/edit/:id',
    loadComponent: () =>
      import('./pages/product-reward-form-page/product-reward-form-page.component').then(
        (m) => m.ProductRewardFormPageComponent
      )
  },
  {
    path: 'turn-on-promotions/new',
    loadComponent: () =>
      import('./pages/turn-on-promotion-form-page/turn-on-promotion-form-page.component').then(
        (m) => m.TurnOnPromotionFormPageComponent
      )
  },
  {
    path: 'turn-on-promotions/edit/:id',
    loadComponent: () =>
      import('./pages/turn-on-promotion-form-page/turn-on-promotion-form-page.component').then(
        (m) => m.TurnOnPromotionFormPageComponent
      )
  }
];
