import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '@core/services/data.service';
import {
  RegistrationFormListItem,
  RegistrationFormDetail,
  RegistrationFormMetadata,
  RegistrationFormFilters,
  RegistrationFormListResponse,
  RegistrationFormListItemResponse,
  RegistrationFormDetailResponse
} from '../models/registration-form.model';
import { RegistrationFormStatus } from '../models/registration-form-status.enum';

/**
 * Servicio para gestión de formularios de registro de drivers
 *
 * Features:
 * - ✅ Lista paginada con filtros
 * - ✅ Detalle completo
 * - ✅ Aprobar/rechazar solicitudes
 * - ✅ Mapeo automático de respuestas del backend
 */
@Injectable({
  providedIn: 'root'
})
export class RegistrationFormService {
  private readonly dataService = inject(DataService);

  /**
   * Obtener lista de formularios con paginación y filtros
   *
   * @param page - Número de página (base 1)
   * @param pageSize - Cantidad de items por página
   * @param filters - Filtros opcionales (status, search)
   * @returns Observable con data y metadata
   */
  getFormsList(
    page: number,
    pageSize: number,
    filters?: RegistrationFormFilters
  ): Observable<{ data: RegistrationFormListItem[]; metadata: RegistrationFormMetadata }> {
    const params: Record<string, string | number> = {
      pageNumber: page,
      pageSize: pageSize
    };

    // Agregar filtro por status si existe
    if (filters?.status) {
      params['status'] = filters.status;
    }

    // Agregar filtro de búsqueda si existe
    if (filters?.search && filters.search.trim()) {
      params['filter'] = filters.search.trim();
    }

    return this.dataService
      .get$<RegistrationFormListResponse>('DeliveriesForm/DeliveriesFormList', params)
      .pipe(
        map(response => ({
          data: response.data.map(item => this.mapListItem(item)),
          metadata: response.metadata
        }))
      );
  }

  /**
   * Obtener detalle completo de un formulario por ID
   *
   * @param id - ID del formulario
   * @returns Observable con el detalle
   */
  getFormDetail(id: number): Observable<RegistrationFormDetail> {
    return this.dataService
      .get$<RegistrationFormDetailResponse>('DeliveriesForm/ListDetailDeliveriesForm', {
        codDelivFrm: id
      })
      .pipe(map(response => this.mapDetailItem(response)));
  }

  /**
   * Aprobar una solicitud de registro
   *
   * @param id - ID del formulario
   * @returns Observable void
   */
  approveForm(id: number): Observable<void> {
    return this.dataService.post$<void>(`DeliveriesForm/ApproveRequest/${id}`, {});
  }

  /**
   * Rechazar una solicitud de registro
   *
   * @param id - ID del formulario
   * @param comment - Comentario del rechazo (opcional según API)
   * @returns Observable void
   */
  rejectForm(id: number, comment?: string): Observable<void> {
    const body = comment ? { comment } : {};
    return this.dataService.post$<void>(`DeliveriesForm/DenyRequest/${id}`, body);
  }

  // ============================================================================
  // PRIVATE MAPPERS
  // ============================================================================

  /**
   * Mapear item de lista desde el backend
   */
  private mapListItem(item: RegistrationFormListItemResponse): RegistrationFormListItem {
    return {
      id: item.codDeliveryForm,
      applicantName: item.nameApplicant,
      applicantPhone: item.phoneApplicant,
      applicantEmail: item.emailApplicant,
      countryId: item.codCountry,
      countryName: item.nameCountry,
      cityId: item.codCity,
      cityName: item.nameCity,
      requestDate: item.dateRequestApplicant,
      status: item.statusApplicant as RegistrationFormStatus
    };
  }

  /**
   * Mapear detalle desde el backend
   */
  private mapDetailItem(item: RegistrationFormDetailResponse): RegistrationFormDetail {
    return {
      driverNumber: item.numDriver,
      name: item.name,
      assignedBase: item.assignedBase,
      status: item.status as RegistrationFormStatus,
      phone: item.phone,
      email: item.email,
      countryId: item.codCountry,
      countryName: item.nameCountry,
      cityId: item.codCity,
      cityName: item.nameCity,
      registrationDate: item.registrationDate,
      daysOnRecord: item.daysRecords,
      dni: item.dni,
      bloodTypeId: item.codBloodType,
      bloodType: item.bloodType,
      address: item.address,
      bankName: item.nameBank,
      accountType: item.accountType,
      accountOwner: item.accountOwner,
      accountNumber: item.accountNumber,
      dniImageUrl: item.pathDni,
      criminalRecordImageUrl: item.pathcriminalRecord,
      driverLicenseImageUrl: item.pathDriverLicense
    };
  }
}
