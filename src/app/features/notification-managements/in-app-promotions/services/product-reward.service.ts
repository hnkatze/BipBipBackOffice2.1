import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  ProductReward,
  ProductRewardResponse,
  ProductRewardPaginatedResponse,
  CreateProductReward,
  UpdateProductReward,
  Metadata,
  emptyMetadata
} from '../models';

/**
 * Product Reward Service - Modernizado con Signals
 *
 * Maneja regalías/recompensas automáticas por compra de productos
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
export class ProductRewardService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiURL;

  // ============================================================================
  // SIGNALS - Estado Reactivo
  // ============================================================================

  readonly productRewardsSignal = signal<ProductRewardResponse[]>([]);
  readonly productRewards = this.productRewardsSignal.asReadonly();

  readonly metadataSignal = signal<Metadata>(emptyMetadata);
  readonly metadata = this.metadataSignal.asReadonly();

  readonly isLoadingSignal = signal<boolean>(false);
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // ============================================================================
  // PUBLIC METHODS - CRUD
  // ============================================================================

  /**
   * Obtener lista paginada de regalías por producto
   */
  getProductRewards(
    pageNumber: number = 1,
    pageSize: number = 10,
    filter?: string
  ): Observable<ProductRewardPaginatedResponse> {
    this.isLoadingSignal.set(true);

    let httpParams = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (filter) {
      httpParams = httpParams.set('filter', filter);
    }

    return this.http
      .get<ProductRewardPaginatedResponse>(
        `${this.apiBaseUrl}Incentives/rewards`,
        { params: httpParams }
      )
      .pipe(
        tap(response => {
          this.productRewardsSignal.set(response.data);
          this.metadataSignal.set(response.metadata);
          this.isLoadingSignal.set(false);
        })
      );
  }

  /**
   * Obtener una regalía por ID
   */
  getProductRewardById(id: number): Observable<ProductReward> {
    return this.http.get<ProductReward>(
      `${this.apiBaseUrl}Incentives/rewards/${id}`
    );
  }

  /**
   * Crear nueva regalía por producto
   */
  createProductReward(data: CreateProductReward): Observable<ProductReward> {
    return this.http.post<ProductReward>(
      `${this.apiBaseUrl}Incentives/rewards`,
      data
    );
  }

  /**
   * Actualizar regalía por producto existente
   */
  updateProductReward(
    id: number,
    data: UpdateProductReward
  ): Observable<ProductReward> {
    return this.http.put<ProductReward>(
      `${this.apiBaseUrl}Incentives/rewards/${id}`,
      data
    );
  }

  /**
   * Actualizar estado (activo/inactivo)
   */
  updateProductRewardStatus(id: number, status: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.apiBaseUrl}Incentives/rewards/status/${id}?status=${status}`,
      {}
    );
  }

  /**
   * Refrescar la lista completa
   */
  loadProductRewards(
    pageNumber: number = 1,
    pageSize: number = 10,
    filter?: string
  ): void {
    this.getProductRewards(pageNumber, pageSize, filter).subscribe({
      error: (error) => console.error('Error loading product rewards:', error)
    });
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Limpiar todos los datos
   */
  clearAll(): void {
    this.productRewardsSignal.set([]);
    this.metadataSignal.set(emptyMetadata);
    this.isLoadingSignal.set(false);
  }
}
