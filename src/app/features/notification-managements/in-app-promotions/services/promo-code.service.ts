/**
 * Promo Code Service
 *
 * Servicio para gestionar códigos promocionales
 * con signals para estado reactivo
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';

import {
  PromoCodeResponse,
  PromoCodePaginatedResponse,
  CreatePromoCode,
  UpdatePromoCode,
  Metadata,
  emptyMetadata
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class PromoCodeService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiURL;

  // ============================================================================
  // SIGNALS - Estado
  // ============================================================================

  private readonly promoCodesSignal = signal<PromoCodeResponse[]>([]);
  readonly promoCodes = this.promoCodesSignal.asReadonly();

  private readonly metadataSignal = signal<Metadata>(emptyMetadata);
  readonly metadata = this.metadataSignal.asReadonly();

  private readonly isLoadingSignal = signal<boolean>(false);
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // ============================================================================
  // MÉTODOS - CRUD
  // ============================================================================

  /**
   * Obtener lista de códigos promocionales con paginación
   */
  getPromoCodes(
    pageNumber: number = 1,
    pageSize: number = 10,
    filter?: string
  ): Observable<PromoCodePaginatedResponse> {
    this.isLoadingSignal.set(true);

    let url = `${this.apiBaseUrl}Incentives/promocodes/list?PageNumber=${pageNumber}&PageSize=${pageSize}`;

    if (filter) {
      url += `&Filter=${encodeURIComponent(filter)}`;
    }

    return this.http.get<PromoCodePaginatedResponse>(url).pipe(
      tap(response => {
        this.promoCodesSignal.set(response.data);
        this.metadataSignal.set(response.metadata);
        this.isLoadingSignal.set(false);
      })
    );
  }

  /**
   * Obtener un código promocional por ID
   */
  getPromoCodeById(id: number): Observable<PromoCodeResponse> {
    return this.http.get<PromoCodeResponse>(
      `${this.apiBaseUrl}Incentives/promoCodes/${id}`
    );
  }

  /**
   * Crear nuevo código promocional
   */
  createPromoCode(data: CreatePromoCode): Observable<PromoCodeResponse> {
    return this.http.post<PromoCodeResponse>(
      `${this.apiBaseUrl}Incentives/promoCodes`,
      data
    );
  }

  /**
   * Actualizar código promocional existente
   */
  updatePromoCode(id: number, data: UpdatePromoCode): Observable<PromoCodeResponse> {
    return this.http.put<PromoCodeResponse>(
      `${this.apiBaseUrl}Incentives/promoCodes/${id}`,
      data
    );
  }

  /**
   * Actualizar estado de código promocional
   */
  updatePromoCodeStatus(id: number, status: boolean): Observable<void> {
    return this.http.patch<void>(
      `${this.apiBaseUrl}Incentives/promoCodes/status/${id}?status=${status}`,
      null
    );
  }
}
