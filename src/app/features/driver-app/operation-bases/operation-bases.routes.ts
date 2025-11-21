import { Routes } from '@angular/router';

/**
 * Rutas del módulo de Bases de Operaciones
 */
export const OPERATION_BASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import(
        './pages/operation-bases-list-page/operation-bases-list-page.component'
      ).then((m) => m.OperationBasesListPageComponent),
    title: 'Bases de Operaciones',
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/operation-base-create-page/operation-base-create-page.component').then(
        (m) => m.OperationBaseCreatePageComponent
      ),
    title: 'Crear Base de Operaciones',
  },
  {
    path: 'view-details/:id',
    loadComponent: () =>
      import('./pages/operation-base-detail-page/operation-base-detail-page.component').then(
        (m) => m.OperationBaseDetailPageComponent
      ),
    title: 'Detalle de Base',
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('./pages/operation-base-edit-page/operation-base-edit-page.component').then(
        (m) => m.OperationBaseEditPageComponent
      ),
    title: 'Editar Base de Operaciones',
  },
];
