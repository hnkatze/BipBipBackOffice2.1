import { Routes } from '@angular/router';

/**
 * SPREADSHEETS_ROUTES - Rutas del módulo de Planillas (Spreadsheets)
 *
 * Este archivo agrupa todas las rutas de los submódulos de Planillas:
 * - Correlative (Correlativo) ✅
 * - By Base Operations (Por Base de Operaciones) ✅
 * - Orders by Delivery (Comandas por Delivery) - TODO
 * - Settlements Delivery (Liquidaciones Delivery) - TODO
 * - Settlements Store (Liquidación Restaurante) - TODO
 * - Food Deliveries (Alimentación Deliveries) - TODO
 * - Driver Payments (Pagos a Drivers) - TODO
 * - Payroll Adjustment (Ajuste de Planilla) - TODO
 * - Premiaciones (Awards) - TODO
 */
export const SPREADSHEETS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'planilla-correlativo',
    pathMatch: 'full'
  },
  {
    path: 'planilla-correlativo',
    loadComponent: () => import('./correlative/pages/correlative-page/correlative-page.component')
      .then(m => m.CorrelativePageComponent),
    title: 'Planilla Correlativo'
  },
  {
    path: 'planilla-base-operaciones',
    loadComponent: () => import('./by-base-operations/pages/by-base-operations-page/by-base-operations-page.component')
      .then(m => m.ByBaseOperationsPageComponent),
    title: 'Planilla por Base de Operaciones'
  }
  // TODO: Agregar más submódulos de planillas aquí
];
