import { Routes } from '@angular/router';

// Registered drivers routes
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
  },
  {
    path: ':id/penalties-history',
    loadComponent: () =>
      import('./pages/driver-penalties-history-page/driver-penalties-history-page.component').then(
        (m) => m.DriverPenaltiesHistoryPageComponent
      ),
    title: 'Historial de Penalizaciones'
  },
  {
    path: ':id/orders-history',
    loadComponent: () =>
      import('./pages/driver-orders-history-page/driver-orders-history-page.component').then(
        (m) => m.DriverOrdersHistoryPageComponent
      ),
    title: 'Historial de Pedidos'
  }
];
