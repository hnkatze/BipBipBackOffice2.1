/**
 * Utilidades para Push In App
 */

/**
 * Optimiza una imagen: redimensiona y convierte a WebP
 * @param file Archivo de imagen a optimizar
 * @param maxWidth Ancho máximo (default: 800px)
 * @param maxHeight Alto máximo (default: 600px)
 * @param quality Calidad de compresión (default: 0.85)
 * @returns Promise<File> Archivo optimizado
 */
export async function optimizeImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Crear canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('No se pudo crear el blob de la imagen'));
              return;
            }

            // Crear nuevo File con extensión .webp
            const fileName = file.name.replace(/\.[^/.]+$/, '.webp');
            const optimizedFile = new File([blob], fileName, {
              type: 'image/webp',
              lastModified: Date.now()
            });

            resolve(optimizedFile);
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Formatea una fecha para el API (ISO string)
 * @param date Date object o string
 * @returns string en formato ISO
 */
export function formatDateForAPI(date: Date | string | null): string | null {
  if (!date) return null;

  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }

  return date.toISOString();
}

/**
 * Formatea una fecha para el input (YYYY-MM-DD)
 * @param date Date object, string ISO, o null
 * @returns string en formato YYYY-MM-DD o null
 */
export function formatDateForInput(date: Date | string | null): string | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha para mostrar (DD/MM/YYYY)
 * @param date Date object, string ISO, o null
 * @returns string en formato DD/MM/YYYY o '-'
 */
export function formatDateForDisplay(date: Date | string | null): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Valida si una fecha de inicio es válida (no puede ser en el pasado)
 * @param startDate Fecha de inicio
 * @returns boolean
 */
export function isValidStartDate(startDate: Date | string): boolean {
  const date = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date >= today;
}

/**
 * Valida si una fecha de fin es válida (debe ser después de la fecha de inicio)
 * @param startDate Fecha de inicio
 * @param endDate Fecha de fin
 * @returns boolean
 */
export function isValidEndDate(startDate: Date | string, endDate: Date | string): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  return end > start;
}

/**
 * Obtiene el label para el intervalo de banner
 * @param interval BannerInterval enum value
 * @returns string label
 */
export function getBannerIntervalLabel(interval: number): string {
  switch (interval) {
    case 1:
      return 'Cada hora';
    case 24:
      return 'Cada día';
    case 168:
      return 'Cada semana';
    case 720:
      return 'Cada mes';
    default:
      return `Cada ${interval} horas`;
  }
}

/**
 * Valida si un archivo es una imagen válida
 * @param file Archivo a validar
 * @param maxSizeMB Tamaño máximo en MB (default: 5)
 * @returns { valid: boolean, error?: string }
 */
export function validateImageFile(file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'El archivo debe ser una imagen (JPG, PNG o WebP)'
    };
  }

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `El archivo no debe superar los ${maxSizeMB}MB`
    };
  }

  return { valid: true };
}

/**
 * Genera un nombre único para un archivo
 * @param originalName Nombre original del archivo
 * @returns string Nombre único
 */
export function generateUniqueFileName(originalName: string): string {
  const extension = originalName.split('.').pop();
  const uuid = crypto.randomUUID();
  return `${uuid}.${extension}`;
}
