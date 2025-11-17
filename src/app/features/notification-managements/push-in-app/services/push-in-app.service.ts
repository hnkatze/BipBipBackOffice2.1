import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  PushInApp,
  PushInAppResponse,
  PushInAppPaginatedResponse,
  CreatePushInApp,
  UpdatePushInApp,
  Metadata,
  emptyMetadata
} from '../models';

/**
 * Push In App Service - Modernizado con Signals
 *
 * Maneja la gestión de notificaciones push in-app (banners programados)
 *
 * Features:
 * - Signals para estado reactivo
 * - CRUD completo
 * - Upload de imágenes a S3 con presigned URLs
 * - Paginación y filtros
 * - Toggle de estado (activo/inactivo)
 */
@Injectable({
  providedIn: 'root'
})
export class PushInAppService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiURL;
  private readonly s3Bucket = environment.s3BuckedBrands;

  // ============================================================================
  // SIGNALS - Estado Reactivo
  // ============================================================================

  readonly pushInAppsSignal = signal<PushInAppResponse[]>([]);
  readonly pushInApps = this.pushInAppsSignal.asReadonly();

  readonly metadataSignal = signal<Metadata>(emptyMetadata);
  readonly metadata = this.metadataSignal.asReadonly();

  readonly isLoadingSignal = signal<boolean>(false);
  readonly isLoading = this.isLoadingSignal.asReadonly();

  // ============================================================================
  // PUBLIC METHODS - CRUD
  // ============================================================================

  /**
   * Obtener lista paginada de push in app
   */
  getPushInApps(pageNumber: number = 1, pageSize: number = 10, filter?: string): Observable<PushInAppPaginatedResponse> {
    this.isLoadingSignal.set(true);

    let httpParams = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    if (filter) {
      httpParams = httpParams.set('filter', filter);
    }

    return this.http
      .get<PushInAppPaginatedResponse>(`${this.apiBaseUrl}PushInApps`, { params: httpParams })
      .pipe(
        tap(response => {
          this.pushInAppsSignal.set(response.data);
          this.metadataSignal.set(response.metadata);
          this.isLoadingSignal.set(false);
        })
      );
  }

  /**
   * Obtener un push in app por ID
   */
  getPushInAppById(id: number): Observable<PushInApp> {
    return this.http.get<PushInApp>(`${this.apiBaseUrl}PushInApps/${id}`);
  }

  /**
   * Crear nuevo push in app
   */
  createPushInApp(data: CreatePushInApp): Observable<PushInApp> {
    return this.http.post<PushInApp>(`${this.apiBaseUrl}PushInApps`, data);
  }

  /**
   * Actualizar push in app existente
   */
  updatePushInApp(id: number, data: UpdatePushInApp): Observable<PushInApp> {
    return this.http.patch<PushInApp>(`${this.apiBaseUrl}PushInApps/${id}`, data);
  }

  /**
   * Actualizar estado (activo/inactivo)
   */
  updatePushInAppStatus(id: number, status: boolean): Observable<void> {
    return this.http.patch<void>(`${this.apiBaseUrl}PushInApps/${id}/status?status=${status}`, {});
  }

  /**
   * Refrescar la lista completa
   */
  loadPushInApps(pageNumber: number = 1, pageSize: number = 10, filter?: string): void {
    this.getPushInApps(pageNumber, pageSize, filter).subscribe({
      error: (error) => console.error('Error loading push in apps:', error)
    });
  }

  // ============================================================================
  // IMAGE UPLOAD TO S3
  // ============================================================================

  /**
   * Upload completo de imagen: Obtiene presigned URL y sube a S3
   * @returns Observable con la URL final de la imagen en S3
   */
  uploadImage(file: File): Observable<string> {
    const name = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${name}.${fileExtension}`;

    return new Observable<string>((observer) => {
      // 1. Obtener presigned URL
      this.http
        .post<{ presignedUrl: string; url: string }>(
          `${this.s3Bucket}/BackOfficeMedia`,
          {
            image_posgc: fileName,
            folder: 'pushInApp'
          }
        )
        .subscribe({
          next: (response) => {
            // 2. Upload a S3 usando presigned URL
            this.uploadToS3(response.presignedUrl, file).subscribe({
              next: () => {
                observer.next(response.url);
                observer.complete();
              },
              error: (error) => observer.error(error)
            });
          },
          error: (error) => observer.error(error)
        });
    });
  }

  /**
   * Upload directo a S3 usando presigned URL
   * @private
   */
  private uploadToS3(presignedUrl: string, file: File): Observable<void> {
    const headers = new HttpHeaders({
      'Content-Type': file.type
    });

    return this.http.put<void>(presignedUrl, file, { headers });
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Limpiar todos los datos
   */
  clearAll(): void {
    this.pushInAppsSignal.set([]);
    this.metadataSignal.set(emptyMetadata);
    this.isLoadingSignal.set(false);
  }
}
