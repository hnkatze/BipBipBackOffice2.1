import { Routes } from '@angular/router';

export const REGISTERED_DRIVERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/registered-drivers-list-page/registered-drivers-list-page.component').then(
        (m) => m.RegisteredDriversListPageComponent
      )
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/driver-detail-page/driver-detail-page.component').then(
        (m) => m.DriverDetailPageComponent
      ),
    title: 'Detalle del Driver'
  }
];
