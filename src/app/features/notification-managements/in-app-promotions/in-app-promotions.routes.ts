import { Routes } from '@angular/router';

export const IN_APP_PROMOTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/in-app-promotions-main-page/in-app-promotions-main-page.component').then(
        (m) => m.InAppPromotionsMainPageComponent
      )
  }
];
