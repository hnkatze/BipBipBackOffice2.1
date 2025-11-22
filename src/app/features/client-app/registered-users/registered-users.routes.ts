import { Routes } from '@angular/router';

export const REGISTERED_USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/registered-users-page/registered-users-page.component')
      .then(m => m.RegisteredUsersPageComponent),
    title: 'Usuarios Registrados'
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/user-detail-page/user-detail-page.component')
      .then(m => m.UserDetailPageComponent),
    title: 'Detalle de Usuario'
  }
];
