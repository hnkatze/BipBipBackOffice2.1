import { Routes } from '@angular/router';

/**
 * Rutas del módulo Registration Forms
 */
export const REGISTRATION_FORMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/registration-forms-list-page/registration-forms-list-page.component').then(
        (m) => m.RegistrationFormsListPageComponent
      ),
    title: 'Formularios de Registro'
  }
];
