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
      import('./pages/drag-drop-promotion-create-page/drag-drop-promotion-create-page.component').then(
        (m) => m.DragDropPromotionCreatePageComponent
      )
  },
  {
    path: 'drag-drop-promotions/edit/:id',
    loadComponent: () =>
      import('./pages/drag-drop-promotion-edit-page/drag-drop-promotion-edit-page.component').then(
        (m) => m.DragDropPromotionEditPageComponent
      )
  }
];
