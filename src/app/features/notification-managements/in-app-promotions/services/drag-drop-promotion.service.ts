/**
 * Drag & Drop Promotion Service
 *
 * Servicio para gestionar promociones drag & drop (banners/videos)
 * con signals para estado reactivo
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';

import {
  DragDropPromotionResponse,
  DragDropPromotionPaginatedResponse,
  CreateDragDropPromotion,
  UpdateDragDropPromotion,
  Metadata,
  emptyMetadata
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DragDropPromotionService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiURL;

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  private readonly dragDropPromotionsSignal = signal<DragDropPromotionResponse[]>([]);
  readonly dragDropPromotions = this.dragDropPromotionsSignal.asReadonly();

  private readonly metadataSignal = signal<Metadata>(emptyMetadata);
  readonly metadata = this.metadataSignal.asReadonly();

  private readonly isLoadingSignal = signal<boolean>(false);
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // ============================================================================
  // MÉTODOS - CRUD
  // ============================================================================

  /**
   * Obtener lista de promociones drag & drop con paginación
   */
  getDragDropPromotions(
    pageNumber: number = 1,
    pageSize: number = 10,
    filter?: string
  ): Observable<DragDropPromotionPaginatedResponse> {
    this.isLoadingSignal.set(true);

    let url = `${this.apiBaseUrl}Incentives/promotions?PageNumber=${pageNumber}&PageSize=${pageSize}`;

    if (filter) {
      url += `&Filter=${encodeURIComponent(filter)}`;
    }

    return this.http.get<DragDropPromotionPaginatedResponse>(url).pipe(
      tap(response => {
        this.dragDropPromotionsSignal.set(response.data);
        this.metadataSignal.set(response.metadata);
        this.isLoadingSignal.set(false);
      })
    );
  }

  /**
   * Obtener una promoción drag & drop por ID
   */
  getDragDropPromotionById(id: number): Observable<DragDropPromotionResponse> {
    return this.http.get<DragDropPromotionResponse>(
      `${this.apiBaseUrl}Incentives/promotions/${id}`
    );
  }

  /**
   * Crear nueva promoción drag & drop
   */
  createDragDropPromotion(data: CreateDragDropPromotion): Observable<DragDropPromotionResponse> {
    return this.http.post<DragDropPromotionResponse>(
      `${this.apiBaseUrl}Incentives/promotions`,
      data
    );
  }

  /**
   * Actualizar promoción drag & drop existente
   */
  updateDragDropPromotion(id: number, data: UpdateDragDropPromotion): Observable<DragDropPromotionResponse> {
    return this.http.put<DragDropPromotionResponse>(
      `${this.apiBaseUrl}Incentives/promotions/${id}`,
      data
    );
  }

  /**
   * Actualizar estado de promoción drag & drop
   */
  updateDragDropPromotionStatus(id: number, status: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.apiBaseUrl}Incentives/promotions/status/${id}?status=${status}`,
      null
    );
  }
}
