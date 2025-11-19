/**
 * Estados posibles de un formulario de registro de driver
 */
export enum RegistrationFormStatus {
  /** Enviado / Pendiente */
  PENDING = 'E',

  /** Rechazado */
  REJECTED = 'R',

  /** Aprobado */
  APPROVED = 'A'
}

/**
 * Helper para obtener el label del status
 */
export function getStatusLabel(status: RegistrationFormStatus): string {
  switch (status) {
    case RegistrationFormStatus.PENDING:
      return 'Pendiente';
    case RegistrationFormStatus.APPROVED:
      return 'Aprobado';
    case RegistrationFormStatus.REJECTED:
      return 'Rechazado';
    default:
      return 'Desconocido';
  }
}

/**
 * Tipo de severity para PrimeNG Tag
 */
export type TagSeverity = 'success' | 'danger' | 'warn' | 'info' | 'secondary' | 'contrast';

/**
 * Helper para obtener el severity de PrimeNG según el status
 */
export function getStatusSeverity(status: RegistrationFormStatus): TagSeverity {
  switch (status) {
    case RegistrationFormStatus.PENDING:
      return 'warn' as const;
    case RegistrationFormStatus.APPROVED:
      return 'success' as const;
    case RegistrationFormStatus.REJECTED:
      return 'danger' as const;
    default:
      return 'info' as const;
  }
}
