import { Routes } from '@angular/router';

/**
 * Rutas del módulo Driver App
 */
export const DRIVER_APP_ROUTES: Routes = [
  {
    path: 'registration-forms',
    loadChildren: () =>
      import('./registration-forms/registration-forms.routes').then((m) => m.REGISTRATION_FORMS_ROUTES),
    title: 'Formularios de Registro'
  },
  {
    path: 'registered-users-drivers',
    loadChildren: () =>
      import('./registered-drivers/registered-drivers.routes').then((m) => m.REGISTERED_DRIVERS_ROUTES),
    title: 'Drivers Registrados'
  }
  // TODO: Agregar más sub-módulos de Driver App aquí
];
