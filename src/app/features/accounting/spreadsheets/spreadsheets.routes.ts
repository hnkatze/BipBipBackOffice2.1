import { Routes } from '@angular/router';

/**
 * SPREADSHEETS_ROUTES - Rutas del módulo de Planillas (Spreadsheets)
 *
 * Este archivo agrupa todas las rutas de los submódulos de Planillas:
 * - Correlative (Correlativo) ✅
 * - By Base Operations (Por Base de Operaciones) ✅
 * - Orders by Delivery (Comandas por Delivery) ✅
 * - Settlements Delivery (Liquidaciones Delivery) ✅
 * - Settlements Store (Liquidación Restaurante) ✅
 * - Food Deliveries (Alimentación Deliveries) ✅
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
  },
  {
    path: 'reporte-comandas-delivery',
    loadComponent: () => import('./orders-by-delivery/pages/orders-by-delivery-page/orders-by-delivery-page.component')
      .then(m => m.OrdersByDeliveryPageComponent),
    title: 'Comandas por Delivery'
  },
  {
    path: 'reporte-liquidaciones-delivery',
    loadComponent: () => import('./settlements-delivery/pages/settlements-delivery-page/settlements-delivery-page.component')
      .then(m => m.SettlementsDeliveryPageComponent),
    title: 'Liquidaciones Delivery'
  },
  {
    path: 'liquidacion-restaurante',
    loadComponent: () => import('./settlements-store/pages/settlements-store-page/settlements-store-page.component')
      .then(m => m.SettlementsStorePageComponent),
    title: 'Liquidación Restaurante'
  },
  {
    path: 'reporte-alimentacion-deliveries',
    loadComponent: () => import('./food-deliveries/pages/food-deliveries-page/food-deliveries-page.component')
      .then(m => m.FoodDeliveriesPageComponent),
    title: 'Alimentación Deliveries'
  }
  // TODO: Agregar más submódulos de planillas aquí
];
