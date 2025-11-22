import { Routes } from '@angular/router';

/**
 * ACCOUNTING_ROUTES - Rutas consolidadas del módulo de Contabilidad
 *
 * Este archivo agrupa todas las rutas de los submódulos de Contabilidad:
 * - Companies (Empresas) ✅
 * - Document Types (Tipos de Documento) ✅
 * - Emission Points (Puntos de Emisión) ✅
 * - Establishments (Establecimientos) ✅
 * - Fiscal Correlatives (Correlativos Fiscales) ✅
 * - Invoices (Facturas) ✅
 * - Reports (Reportes) ✅
 * - Settlements (Liquidaciones) ✅
 * - Spreadsheets (Planillas) ✅
 * - Transaction Reports (Reportes de Transacciones) ✅
 *
 * Estructura:
 * /accounting/companies -> CompaniesComponent
 * /accounting/document-types -> DocumentTypesComponent
 * /accounting/emission-points -> EmissionPointsComponent
 * /accounting/establishments -> EstablishmentsComponent
 * /accounting/transaction-reports -> TransactionReportsPageComponent
 * ...etc
 *
 * IMPORTANTE: Las rutas deben mantener la nomenclatura original del backend
 * para que coincidan con los permisos que se reciben en el login.
 */
export const ACCOUNTING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'companies',
    pathMatch: 'full'
  },
  {
    path: 'companies',
    loadChildren: () => import('./companies/companies.routes').then(m => m.COMPANIES_ROUTES),
    title: 'Empresas'
  },
  {
    path: 'document-types',
    loadChildren: () => import('./document-types/document-types.routes').then(m => m.DOCUMENT_TYPES_ROUTES),
    title: 'Tipos de Documento'
  },
  {
    path: 'emission-points',
    loadChildren: () => import('./emission-points/emission-points.routes').then(m => m.EMISSION_POINTS_ROUTES),
    title: 'Puntos de Emisión'
  },
  {
    path: 'establishments',
    loadChildren: () => import('./establishments/establishments.routes').then(m => m.ESTABLISHMENTS_ROUTES),
    title: 'Establecimientos'
  },
  {
    path: 'fiscal-correlatives',
    loadChildren: () => import('./fiscal-correlatives/fiscal-correlatives.routes').then(m => m.FISCAL_CORRELATIVES_ROUTES),
    title: 'Correlativos Fiscales'
  },
  {
    path: 'invoices',
    loadChildren: () => import('./invoices/invoices.routes').then(m => m.INVOICES_ROUTES),
    title: 'Facturas'
  },
  {
    path: 'reports',
    loadChildren: () => import('./reports/reports.routes').then(m => m.REPORTS_ROUTES),
    title: 'Reportes'
  },
  {
    path: 'settlements',
    loadChildren: () => import('./settlements/settlements.routes').then(m => m.SETTLEMENTS_ROUTES),
    title: 'Liquidaciones'
  },
  {
    path: 'spreadsheets',
    loadChildren: () => import('./spreadsheets/spreadsheets.routes').then(m => m.SPREADSHEETS_ROUTES),
    title: 'Planillas'
  },
  {
    path: 'transaction-reports',
    loadChildren: () => import('./transaction-reports/transaction-reports.routes').then(m => m.TRANSACTION_REPORTS_ROUTES),
    title: 'Reportes de Transacciones'
  }
  // TODO: Agregar más submódulos de contabilidad aquí
];
