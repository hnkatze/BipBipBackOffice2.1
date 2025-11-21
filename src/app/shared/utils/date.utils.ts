/**
 * Date Utilities
 *
 * Funciones standalone para formatear fechas
 */

/**
 * Formatea una fecha a string con el formato especificado
 *
 * @param date - Fecha a formatear (Date o string)
 * @param format - Formato deseado (por defecto 'yyyy-MM-dd')
 * @returns String con la fecha formateada
 *
 * @example
 * formatDate(new Date('2024-12-25'), 'yyyy-MM-dd') // '2024-12-25'
 * formatDate(new Date('2024-12-25'), 'dd/MM/yyyy') // '25/12/2024'
 * formatDate(new Date('2024-12-25'), 'dd-MM-yyyy') // '25-12-2024'
 */
export function formatDate(date: Date | string, format = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (!(d instanceof Date) || isNaN(d.getTime())) {
    throw new Error('Invalid date provided');
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('yyyy', String(year))
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Convierte una fecha a formato ISO string (yyyy-MM-dd)
 *
 * @param date - Fecha a convertir
 * @returns String en formato yyyy-MM-dd
 *
 * @example
 * toISODateString(new Date('2024-12-25')) // '2024-12-25'
 */
export function toISODateString(date: Date | string): string {
  return formatDate(date, 'yyyy-MM-dd');
}

/**
 * Convierte una fecha a formato legible en español (dd/MM/yyyy)
 *
 * @param date - Fecha a convertir
 * @returns String en formato dd/MM/yyyy
 *
 * @example
 * toDisplayDate(new Date('2024-12-25')) // '25/12/2024'
 */
export function toDisplayDate(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy');
}
