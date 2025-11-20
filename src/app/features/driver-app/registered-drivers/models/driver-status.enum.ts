/**
 * Estados posibles de un driver registrado
 */
export enum DriverStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENALIZED = 'PENALIZED'
}

/**
 * Helper para obtener el label en español del status
 */
export function getDriverStatusLabel(status: boolean, isPenalized?: boolean): string {
  if (isPenalized) {
    return 'Penalizado';
  }
  return status ? 'Activo' : 'Inactivo';
}

/**
 * Tipo de severity para PrimeNG Tag
 */
export type TagSeverity = 'success' | 'danger' | 'warn' | 'info' | 'secondary' | 'contrast';

/**
 * Helper para obtener el severity de PrimeNG según el status
 */
export function getDriverStatusSeverity(status: boolean, isPenalized?: boolean): TagSeverity {
  if (isPenalized) {
    return 'danger' as const;
  }
  return status ? 'success' as const : 'secondary' as const;
}
