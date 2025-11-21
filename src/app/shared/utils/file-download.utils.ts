/**
 * File Download Utilities
 *
 * Funciones standalone para convertir base64 a archivos y descargarlos.
 * Soporta PDF, Excel (.xlsx), y otros formatos
 *
 * IMPORTANTE: NO transformamos datos, solo manejamos descarga de archivos.
 */

/**
 * Descarga un archivo desde base64 con el tipo MIME y nombre especificado
 *
 * @param base64 - String base64 (puede incluir prefijo 'data:...;base64,')
 * @param filename - Nombre completo del archivo (con extensión)
 * @param mimeType - Tipo MIME del archivo
 *
 * @example
 * downloadBase64File(base64String, 'reporte-ventas.pdf', 'application/pdf');
 * downloadBase64File(base64String, 'datos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 */
export function downloadBase64File(
  base64: string,
  filename: string,
  mimeType: string
): void {
  const cleaned = cleanBase64(base64);
  const blob = base64ToBlob(cleaned, mimeType);
  triggerDownload(blob, filename);
}

/**
 * Convierte base64 string a PDF y descarga el archivo
 *
 * @param base64 - String base64 (puede incluir prefijo 'data:application/pdf;base64,')
 * @param filename - Nombre del archivo sin extensión
 *
 * @example
 * downloadPDF(base64String, 'reporte-ventas-2024');
 * // Descarga: reporte-ventas-2024.pdf
 */
export function downloadPDF(base64: string, filename: string): void {
  downloadBase64File(base64, `${filename}.pdf`, 'application/pdf');
}

/**
 * Convierte base64 string a Excel (.xlsx) y descarga el archivo
 * Formato moderno de Excel (Office 2007+)
 *
 * @param base64 - String base64
 * @param filename - Nombre del archivo sin extensión
 *
 * @example
 * downloadExcel(base64String, 'reporte-ventas-2024');
 * // Descarga: reporte-ventas-2024.xlsx
 */
export function downloadExcel(base64: string, filename: string): void {
  downloadBase64File(
    base64,
    `${filename}.xlsx`,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

/**
 * Limpia el string base64 removiendo prefijos data URI, comillas y espacios
 *
 * IMPORTANTE: Algunos endpoints del API retornan el base64 envuelto en comillas
 * y con caracteres de espacio/newline que deben ser removidos antes de decodificar.
 *
 * @param base64 - String base64 con o sin prefijo/comillas/espacios
 * @returns String base64 limpio listo para decodificar
 *
 * @example
 * cleanBase64('data:application/pdf;base64,JVBERi0x...')
 * // Retorna: 'JVBERi0x...'
 *
 * cleanBase64('"JVBERi0x..."')
 * // Retorna: 'JVBERi0x...' (sin comillas)
 *
 * cleanBase64('JVBERi0x\n...\r\n')
 * // Retorna: 'JVBERi0x...' (sin espacios)
 */
function cleanBase64(base64: string): string {
  let cleaned = base64.trim();

  // Remove data URI prefix if present (e.g., 'data:application/pdf;base64,')
  if (cleaned.includes(',')) {
    cleaned = cleaned.split(',')[1];
  }

  // Remove surrounding quotes (CRITICAL FIX for API responses)
  // Some endpoints return base64 wrapped in quotes: "UEsDBBQ..."
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove all whitespace characters (spaces, newlines, carriage returns)
  cleaned = cleaned.replace(/[\r\n\s]+/g, '');

  return cleaned;
}

/**
 * Convierte string base64 a Blob
 *
 * @param base64 - String base64 limpio (sin prefijo)
 * @param mimeType - Tipo MIME del archivo
 * @returns Blob con los datos binarios
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Dispara la descarga del archivo en el navegador
 *
 * @param blob - Blob con los datos del archivo
 * @param filename - Nombre completo del archivo (con extensión)
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  // Limpiar URL del objeto para liberar memoria
  window.URL.revokeObjectURL(url);
}
