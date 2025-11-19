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
      import('./pages/promotional-discount-create-page/promotional-discount-create-page.component').then(
        (m) => m.PromotionalDiscountCreatePageComponent
      )
  },
  {
    path: 'promotional-discounts/edit/:id',
    loadComponent: () =>
      import('./pages/promotional-discount-edit-page/promotional-discount-edit-page.component').then(
        (m) => m.PromotionalDiscountEditPageComponent
      )
  },
  {
    path: 'product-rewards/new',
    loadComponent: () =>
      import('./pages/product-reward-create-page/product-reward-create-page.component').then(
        (m) => m.ProductRewardCreatePageComponent
      )
  },
  {
    path: 'product-rewards/edit/:id',
    loadComponent: () =>
      import('./pages/product-reward-edit-page/product-reward-edit-page.component').then(
        (m) => m.ProductRewardEditPageComponent
      )
  },
  {
    path: 'turn-on-promotions/new',
    loadComponent: () =>
      import('./pages/turn-on-promotion-create-page/turn-on-promotion-create-page.component').then(
        (m) => m.TurnOnPromotionCreatePageComponent
      )
  },
  {
    path: 'turn-on-promotions/edit/:id',
    loadComponent: () =>
      import('./pages/turn-on-promotion-edit-page/turn-on-promotion-edit-page.component').then(
        (m) => m.TurnOnPromotionEditPageComponent
      )
  }
];
