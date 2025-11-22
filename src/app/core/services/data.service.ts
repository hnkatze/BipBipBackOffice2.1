import { Injectable, inject, signal, Signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AsyncValue, loading, success, error } from '@core/models/async-value.model';

/**
 * Query Parameters Type
 */
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * DataService - Generic service for HTTP requests
 *
 * Features:
 * - ✅ Hybrid API: Signals (reactive) + Observables (traditional)
 * - ✅ AsyncValue pattern (loading/success/error states)
 * - ✅ Type-safe with generics
 * - ✅ All HTTP methods (GET, POST, PUT, PATCH, DELETE)
 * - ✅ Automatic URL building from environment
 * - ✅ Query params support
 *
 * Usage:
 *
 * // Signal-based API (with AsyncValue states)
 * const routes = this.dataService.get<Route[]>('Access/modules');
 * routes(); // AsyncValue<Route[]>
 *
 * // Observable-based API (traditional)
 * this.dataService.get$<Route[]>('Access/modules').subscribe(...)
 */
@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiURL;

  // ============================================================================
  // SIGNAL-BASED API (Reactive with AsyncValue)
  // ============================================================================

  /**
   * GET request - Signal-based
   *
   * @param path - API path (relative to baseUrl)
   * @param params - Query parameters
   * @returns Signal with AsyncValue<T>
   *
   * @example
   * const users = this.dataService.get<User[]>('users', { role: 'admin' });
   * // In template: @if (isSuccess(users())) { ... }
   */
  get<T>(path: string, params?: QueryParams): Signal<AsyncValue<T>> {
    const state = signal<AsyncValue<T>>(loading());

    this.get$<T>(path, params).subscribe({
      next: (data) => state.set(success(data)),
      error: (err) => state.set(error(err))
    });

    return state.asReadonly();
  }

  /**
   * POST request - Signal-based
   *
   * @param path - API path (relative to baseUrl)
   * @param body - Request body
   * @param params - Query parameters
   * @returns Signal with AsyncValue<T>
   *
   * @example
   * const result = this.dataService.post<User>('users', { name: 'John' });
   */
  post<T>(path: string, body: unknown, params?: QueryParams): Signal<AsyncValue<T>> {
    const state = signal<AsyncValue<T>>(loading());

    this.post$<T>(path, body, params).subscribe({
      next: (data) => state.set(success(data)),
      error: (err) => state.set(error(err))
    });

    return state.asReadonly();
  }

  /**
   * PUT request - Signal-based
   *
   * @param path - API path (relative to baseUrl)
   * @param body - Request body
   * @param params - Query parameters
   * @returns Signal with AsyncValue<T>
   *
   * @example
   * const result = this.dataService.put<User>('users/123', { name: 'Jane' });
   */
  put<T>(path: string, body: unknown, params?: QueryParams): Signal<AsyncValue<T>> {
    const state = signal<AsyncValue<T>>(loading());

    this.put$<T>(path, body, params).subscribe({
      next: (data) => state.set(success(data)),
      error: (err) => state.set(error(err))
    });

    return state.asReadonly();
  }

  /**
   * PATCH request - Signal-based
   *
   * @param path - API path (relative to baseUrl)
   * @param body - Request body (partial update)
   * @param params - Query parameters
   * @returns Signal with AsyncValue<T>
   *
   * @example
   * const result = this.dataService.patch<User>('users/123', { email: 'new@email.com' });
   */
  patch<T>(path: string, body: unknown, params?: QueryParams): Signal<AsyncValue<T>> {
    const state = signal<AsyncValue<T>>(loading());

    this.patch$<T>(path, body, params).subscribe({
      next: (data) => state.set(success(data)),
      error: (err) => state.set(error(err))
    });

    return state.asReadonly();
  }

  /**
   * DELETE request - Signal-based
   *
   * @param path - API path (relative to baseUrl)
   * @param params - Query parameters
   * @returns Signal with AsyncValue<T>
   *
   * @example
   * const result = this.dataService.delete<void>('users/123');
   */
  delete<T>(path: string, params?: QueryParams): Signal<AsyncValue<T>> {
    const state = signal<AsyncValue<T>>(loading());

    this.delete$<T>(path, params).subscribe({
      next: (data) => state.set(success(data)),
      error: (err) => state.set(error(err))
    });

    return state.asReadonly();
  }

  // ============================================================================
  // OBSERVABLE-BASED API (Traditional RxJS)
  // ============================================================================

  /**
   * GET request - Observable-based
   *
   * @param path - API path (relative to baseUrl)
   * @param params - Query parameters
   * @param apiType - Optional: specify which API base URL to use ('apiURL' or 'apiURLReports')
   * @returns Observable<T>
   *
   * @example
   * this.dataService.get$<User[]>('users').subscribe(users => console.log(users));
   * this.dataService.get$<string>('backoffice/report', {}, 'apiURLReports').subscribe(...);
   */
  get$<T>(path: string, params?: QueryParams, apiType: 'apiURL' | 'apiURLReports' = 'apiURL'): Observable<T> {
    const url = this.buildUrl(path, apiType);
    const httpParams = this.buildParams(params);

    return this.http.get<T>(url, { params: httpParams });
  }

  /**
   * POST request - Observable-based
   *
   * @param path - API path (relative to baseUrl)
   * @param body - Request body
   * @param params - Query parameters
   * @returns Observable<T>
   *
   * @example
   * this.dataService.post$<User>('users', { name: 'John' }).subscribe(...);
   */
  post$<T>(path: string, body: unknown, params?: QueryParams): Observable<T> {
    const url = this.buildUrl(path);
    const httpParams = this.buildParams(params);

    return this.http.post<T>(url, body, { params: httpParams });
  }

  /**
   * PUT request - Observable-based
   *
   * @param path - API path (relative to baseUrl)
   * @param body - Request body
   * @param params - Query parameters
   * @returns Observable<T>
   *
   * @example
   * this.dataService.put$<User>('users/123', { name: 'Jane' }).subscribe(...);
   */
  put$<T>(path: string, body: unknown, params?: QueryParams): Observable<T> {
    const url = this.buildUrl(path);
    const httpParams = this.buildParams(params);

    return this.http.put<T>(url, body, { params: httpParams });
  }

  /**
   * PATCH request - Observable-based
   *
   * @param path - API path (relative to baseUrl)
   * @param body - Request body (partial update)
   * @param params - Query parameters
   * @returns Observable<T>
   *
   * @example
   * this.dataService.patch$<User>('users/123', { email: 'new@email.com' }).subscribe(...);
   */
  patch$<T>(path: string, body: unknown, params?: QueryParams): Observable<T> {
    const url = this.buildUrl(path);
    const httpParams = this.buildParams(params);

    return this.http.patch<T>(url, body, { params: httpParams });
  }

  /**
   * DELETE request - Observable-based
   *
   * @param path - API path (relative to baseUrl)
   * @param params - Query parameters
   * @returns Observable<T>
   *
   * @example
   * this.dataService.delete$<void>('users/123').subscribe(...);
   */
  delete$<T>(path: string, params?: QueryParams): Observable<T> {
    const url = this.buildUrl(path);
    const httpParams = this.buildParams(params);

    return this.http.delete<T>(url, { params: httpParams });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Build full URL from path
   * @param apiType - Optional: specify which API base URL to use
   */
  private buildUrl(path: string, apiType: 'apiURL' | 'apiURLReports' = 'apiURL'): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    // Select the appropriate base URL
    const baseUrl = apiType === 'apiURLReports' ? environment.apiURLReports : this.baseUrl;

    // baseUrl already ends with '/' from environment
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Build HttpParams from QueryParams object
   */
  private buildParams(params?: QueryParams): HttpParams {
    if (!params) {
      return new HttpParams();
    }

    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      // Skip undefined and null values
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, String(value));
      }
    });

    return httpParams;
  }
}
