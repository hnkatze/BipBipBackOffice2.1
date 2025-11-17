/**
 * Shared Models
 *
 * Modelos compartidos entre diferentes entidades del módulo
 */

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Metadata de paginación
 */
export interface Metadata {
  page: number;
  perPage: number;
  pageCount: number;
  totalCount: number;
}

/**
 * Metadata vacía por defecto
 */
export const emptyMetadata: Metadata = {
  page: 1,
  perPage: 10,
  pageCount: 0,
  totalCount: 0
};

// ============================================================================
// STATUS
// ============================================================================

/**
 * Update Status Request
 */
export interface UpdateStatusRequest {
  status: boolean;
}
