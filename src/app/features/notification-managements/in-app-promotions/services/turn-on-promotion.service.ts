import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TurnOnPromotionResponse,
  CreateTurnOnPromotion,
  UpdateTurnOnPromotion,
  TurnOnPromotionPaginatedResponse,
  TurnOnAvailabilityResponse,
  TargetAudienceSummary,
  TurnOnCampaignType
} from '../models';
import { environment } from '@environments/environment';

/**
 * Servicio para gestionar Turn On Promotions
 */
@Injectable({
  providedIn: 'root'
})
export class TurnOnPromotionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiURL}Incentives`;

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Obtiene todas las promociones Turn On
   */
  getTurnOnPromotions(): Observable<TurnOnPromotionResponse[]> {
    return this.http.get<TurnOnPromotionResponse[]>(`${this.apiUrl}/turnOnPromotions`);
  }

  /**
   * Obtiene promociones Turn On paginadas
   */
  getTurnOnPromotionsPaginated(
    page: number = 1,
    pageSize: number = 10
  ): Observable<TurnOnPromotionPaginatedResponse> {
    return this.http.get<TurnOnPromotionPaginatedResponse>(
      `${this.apiUrl}/turnOnPromotions?page=${page}&pageSize=${pageSize}`
    );
  }

  /**
   * Obtiene una promoción Turn On por ID
   */
  getTurnOnPromotionById(id: number): Observable<TurnOnPromotionResponse> {
    return this.http.get<TurnOnPromotionResponse>(`${this.apiUrl}/turnOnPromotions/${id}`);
  }

  /**
   * Crea una nueva promoción Turn On
   */
  createTurnOnPromotion(data: CreateTurnOnPromotion): Observable<TurnOnPromotionResponse> {
    return this.http.post<TurnOnPromotionResponse>(`${this.apiUrl}`, data);
  }

  /**
   * Actualiza una promoción Turn On existente
   */
  updateTurnOnPromotion(id: number, data: UpdateTurnOnPromotion): Observable<TurnOnPromotionResponse> {
    return this.http.put<TurnOnPromotionResponse>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Elimina una promoción Turn On
   */
  deleteTurnOnPromotion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/turnOnPromotions/${id}`);
  }

  // ============================================================================
  // AVAILABILITY & CAMPAIGN MANAGEMENT
  // ============================================================================

  /**
   * Verifica disponibilidad para crear una campaña Turn On
   * (si ya existe una campaña activa de descuento automático)
   */
  checkTurnOnAvailability(): Observable<TurnOnAvailabilityResponse> {
    return this.http.get<TurnOnAvailabilityResponse>(`${this.apiUrl}/turnOn/availability`);
  }

  /**
   * Verifica disponibilidad para crear una campaña Turn On by PromoCode
   * (si ya existe una campaña activa con código promocional)
   */
  checkTurnOnByPromocodeAvailability(): Observable<TurnOnAvailabilityResponse> {
    return this.http.get<TurnOnAvailabilityResponse>(`${this.apiUrl}/turnOnByPromocode/availability`);
  }

  /**
   * Elimina una campaña activa por tipo
   * @param type 1 = turnOn (descuento), 2 = turnOnByPromocode (con código)
   */
  deleteActiveCampaign(type: TurnOnCampaignType): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/turnOnCampaigns?type=${type}`);
  }

  // ============================================================================
  // TARGET AUDIENCE (PÚBLICO OBJETIVO)
  // ============================================================================

  /**
   * Obtiene la lista de públicos objetivo disponibles
   */
  getTargetAudienceSummary(): Observable<TargetAudienceSummary[]> {
    return this.http.get<TargetAudienceSummary[]>(`${environment.apiURL}TargetPublic/TargetAudienceSummary`);
  }

  // ============================================================================
  // PROMO CODES (para Turn On by PromoCode)
  // ============================================================================

  /**
   * Obtiene códigos promocionales filtrados por marcas
   * @param brands Array de IDs de marcas
   */
  getPromoCodesByBrands(brands: number[]): Observable<any[]> {
    const brandsParam = brands.join(',');
    return this.http.get<any[]>(`${this.apiUrl}/promoCodes/brands?brands=${brandsParam}`);
  }
}
