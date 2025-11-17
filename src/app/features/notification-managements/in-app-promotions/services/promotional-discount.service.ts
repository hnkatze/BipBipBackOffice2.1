import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  PromotionalDiscount,
  PromotionalDiscountResponse,
  PromotionalDiscountPaginatedResponse,
  CreatePromotionalDiscount,
  UpdatePromotionalDiscount,
  Metadata,
  emptyMetadata
} from '../models';

/**
 * Promotional Discount Service - Modernizado con Signals
 *
 * Maneja descuentos promocionales automáticos aplicados globalmente
 *
 * Features:
 * - Signals para estado reactivo
 * - CRUD completo
 * - Paginación y filtros
 * - Toggle de estado (activo/inactivo)
 */
@Injectable({
  providedIn: 'root'
})
export class PromotionalDiscountService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiURL;

  // ============================================================================
  // SIGNALS - Estado Reactivo
  // ============================================================================

  readonly promotionalDiscountsSignal = signal<PromotionalDiscountResponse[]>([]);
  readonly promotionalDiscounts = this.promotionalDiscountsSignal.asReadonly();

  readonly metadataSignal = signal<Metadata>(emptyMetadata);
  readonly metadata = this.metadataSignal.asReadonly();

  readonly isLoadingSignal = signal<boolean>(false);
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // ============================================================================
  // PUBLIC METHODS - CRUD
  // ============================================================================

  /**
   * Obtener lista paginada de descuentos promocionales
   */
  getPromotionalDiscounts(
    pageNumber: number = 1,
    pageSize: number = 10,
    filter?: string
  ): Observable<PromotionalDiscountPaginatedResponse> {
    this.isLoadingSignal.set(true);

    let httpParams = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (filter) {
      httpParams = httpParams.set('filter', filter);
    }

    return this.http
      .get<PromotionalDiscountPaginatedResponse>(
        `${this.apiBaseUrl}Incentives/promotional-discounts`,
        { params: httpParams }
      )
      .pipe(
        tap(response => {
          this.promotionalDiscountsSignal.set(response.data);
          this.metadataSignal.set(response.metadata);
          this.isLoadingSignal.set(false);
        })
      );
  }

  /**
   * Obtener un descuento promocional por ID
   */
  getPromotionalDiscountById(id: number): Observable<PromotionalDiscount> {
    return this.http.get<PromotionalDiscount>(
      `${this.apiBaseUrl}Incentives/promotional-discounts/${id}`
    );
  }

  /**
   * Crear nuevo descuento promocional
   */
  createPromotionalDiscount(data: CreatePromotionalDiscount): Observable<PromotionalDiscount> {
    return this.http.post<PromotionalDiscount>(
      `${this.apiBaseUrl}Incentives/promotional-discounts`,
      data
    );
  }

  /**
   * Actualizar descuento promocional existente
   */
  updatePromotionalDiscount(
    id: number,
    data: UpdatePromotionalDiscount
  ): Observable<PromotionalDiscount> {
    return this.http.put<PromotionalDiscount>(
      `${this.apiBaseUrl}Incentives/promotional-discounts/${id}`,
      data
    );
  }

  /**
   * Actualizar estado (activo/inactivo)
   */
  updatePromotionalDiscountStatus(id: number, status: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.apiBaseUrl}Incentives/promotional-discounts/status/${id}?status=${status}`,
      {}
    );
  }

  /**
   * Refrescar la lista completa
   */
  loadPromotionalDiscounts(
    pageNumber: number = 1,
    pageSize: number = 10,
    filter?: string
  ): void {
    this.getPromotionalDiscounts(pageNumber, pageSize, filter).subscribe({
      error: (error) => console.error('Error loading promotional discounts:', error)
    });
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Limpiar todos los datos
   */
  clearAll(): void {
    this.promotionalDiscountsSignal.set([]);
    this.metadataSignal.set(emptyMetadata);
    this.isLoadingSignal.set(false);
  }
}
