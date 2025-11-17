import { Routes } from '@angular/router';

/**
 * NOTIFICATION_MANAGEMENTS_ROUTES
 *
 * Rutas consolidadas del módulo de Gestión de Notificaciones
 *
 * Este módulo agrupa todas las funcionalidades relacionadas con
 * la gestión y configuración de notificaciones:
 * - Payment Methods (Métodos de Pago) ✅
 * - Target Audience (Público Objetivo) ✅
 * - Loyalty Program (Programa de Lealtad) ✅
 * - Personalized Alerts (Alertas Personalizadas) ✅
 * - App Link (Enlaces Dinámicos) ✅
 * - Products in Promotions (Productos en Promoción) ✅
 * - Push In App (Notificaciones Push In App) ✅
 * - In-App Promotions (Promociones en App) 🚧
 */
export const NOTIFICATION_MANAGEMENTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'payment-methods',
    pathMatch: 'full'
  },
  {
    path: 'payment-methods',
    loadChildren: () => import('./payment-methods/payment-methods.routes').then(m => m.PAYMENT_METHODS_ROUTES),
    title: 'Métodos de Pago'
  },
  {
    path: 'objective-public',
    loadChildren: () => import('./target-audience/target-audience.routes').then(m => m.TARGET_AUDIENCE_ROUTES),
    title: 'Público Objetivo'
  },
  {
    path: 'loyalty-program',
    loadChildren: () => import('./loyalty-program/loyalty-program.routes').then(m => m.LOYALTY_PROGRAM_ROUTES),
    title: 'Programa de Lealtad'
  },
  {
    path: 'custom-alerts',
    loadChildren: () => import('./personalized-alerts/personalized-alerts.routes').then(m => m.PERSONALIZED_ALERTS_ROUTES),
    title: 'Alertas Personalizadas'
  },
  {
    path: 'app-link',
    loadChildren: () => import('./app-link/app-link.routes').then(m => m.APP_LINK_ROUTES),
    title: 'App Link'
  },
  {
    path: 'products-in-promotions',
    loadChildren: () => import('./products-in-promotions/products-in-promotions.routes').then(m => m.PRODUCTS_IN_PROMOTIONS_ROUTES),
    title: 'Productos en Promoción'
  },
  {
    path: 'push-in-app',
    loadChildren: () => import('./push-in-app/push-in-app.routes').then(m => m.PUSH_IN_APP_ROUTES),
    title: 'Push In App'
  },
  {
    path: 'in-app-promotions',
    loadChildren: () => import('./in-app-promotions/in-app-promotions.routes').then(m => m.IN_APP_PROMOTIONS_ROUTES),
    title: 'Promociones en App'
  }
];
