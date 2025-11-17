import { Routes } from '@angular/router';

export const PUSH_IN_APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/push-in-app-list-page/push-in-app-list-page.component').then(
        (m) => m.PushInAppListPageComponent
      )
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/push-in-app-form-page/push-in-app-form-page.component').then(
        (m) => m.PushInAppFormPageComponent
      )
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/push-in-app-form-page/push-in-app-form-page.component').then(
        (m) => m.PushInAppFormPageComponent
      )
  }
];
