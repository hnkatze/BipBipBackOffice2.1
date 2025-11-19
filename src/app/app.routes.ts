import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Auth routes (sin layout, sin guard)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent)
  },

  // Protected routes (con layout y guard)
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadChildren: () => import('./features/home/home.routes').then(m => m.HOME_ROUTES)
      },
      // Mantenimiento (Maintenance)
      {
        path: 'maintenance',
        loadChildren: () => import('./features/maintenance/maintenance.routes').then(m => m.MAINTENANCE_ROUTES)
      },
      // Contabilidad (Accounting)
      {
        path: 'accounting',
        loadChildren: () => import('./features/accounting/accounting.routes').then(m => m.ACCOUNTING_ROUTES)
      },
      // Contingencias (Contingencies)
      {
        path: 'contingencies',
        loadChildren: () => import('./features/contingencies/contingencies.routes').then(m => m.CONTINGENCIES_ROUTES)
      },
      // Reportes (Reports) - Nota: backend usa /report (sin 's')
      {
        path: 'report',
        loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES)
      },
      // Restaurantes (Restaurants)
      {
        path: 'restaurants',
        loadChildren: () => import('./features/restaurants/restaurants.routes').then(m => m.RESTAURANTS_ROUTES)
      },
      // App Cliente (Client App)
      {
        path: 'client-app',
        loadChildren: () => import('./features/client-app/client-app.routes').then(m => m.CLIENT_APP_ROUTES)
      },
      // SAC (Servicio de Atención al Cliente)
      {
        path: 'sac',
        loadChildren: () => import('./features/sac/sac.routes').then(m => m.SAC_ROUTES)
      },
      // Gestión de Notificaciones (Notification Management)
      {
        path: 'notification-managements',
        loadChildren: () => import('./features/notification-managements/notification-managements.routes').then(m => m.NOTIFICATION_MANAGEMENTS_ROUTES)
      },
      // Dashboards
      {
        path: 'dashboards',
        loadChildren: () => import('./features/dashboards/dashboards.routes').then(m => m.DASHBOARDS_ROUTES)
      },
      // Driver App
      {
        path: 'driver-app',
        loadChildren: () => import('./features/driver-app/driver-app.routes').then(m => m.DRIVER_APP_ROUTES)
      }
      // TODO: Agregar más módulos padre aquí
    ]
  },

  // Catch all - redirect to home
  {
    path: '**',
    redirectTo: ''
  }
];
