import { Routes } from '@angular/router';

/**
 * TRANSACTION_REPORTS_ROUTES - Rutas del módulo de Reportes de Transacciones
 */
export const TRANSACTION_REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/transaction-reports-page/transaction-reports-page.component').then(
        (m) => m.TransactionReportsPageComponent
      )
  }
];
