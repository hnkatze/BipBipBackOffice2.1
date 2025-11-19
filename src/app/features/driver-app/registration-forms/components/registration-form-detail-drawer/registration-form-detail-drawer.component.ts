import { Component, ChangeDetectionStrategy, signal, output, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { RegistrationFormService } from '../../services/registration-form.service';
import { RegistrationFormDetail, RegistrationFormDocument } from '../../models/registration-form.model';
import { RegistrationFormStatusBadgeComponent } from '../registration-form-status-badge/registration-form-status-badge.component';

/**
 * Drawer full-screen para mostrar detalles completos de un formulario
 *
 * Usage:
 * ```html
 * <app-registration-form-detail-drawer
 *   #detailDrawer
 *   (approved)="handleApprove($event)"
 *   (rejected)="handleReject($event)"
 *   (closed)="handleClose()"
 * />
 * ```
 *
 * ```typescript
 * // Abrir drawer
 * this.detailDrawer().open(formId);
 * ```
 */
@Component({
  selector: 'app-registration-form-detail-drawer',
  standalone: true,
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    SkeletonModule,
    RegistrationFormStatusBadgeComponent
  ],
  templateUrl: './registration-form-detail-drawer.component.html',
  styleUrl: './registration-form-detail-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationFormDetailDrawerComponent {
  private readonly formService = inject(RegistrationFormService);

  /** Visibilidad del drawer */
  visible = signal(false);

  /** ID del formulario actual */
  currentFormId = signal<number | null>(null);

  /** Detalle del formulario */
  formDetail = signal<RegistrationFormDetail | null>(null);

  /** Loading state */
  loading = signal(false);

  /** Evento cuando se aprueba */
  approved = output<number>();

  /** Evento cuando se cierra */
  closed = output<void>();

  /** Documentos para la galería (computed) */
  documents = computed<RegistrationFormDocument[]>(() => {
    const detail = this.formDetail();
    if (!detail) return [];

    const docs: RegistrationFormDocument[] = [];

    if (detail.dniImageUrl) {
      docs.push({
        title: 'DNI',
        itemImageSrc: detail.dniImageUrl,
        thumbnailImageSrc: detail.dniImageUrl,
        alt: 'Documento Nacional de Identidad'
      });
    }

    if (detail.criminalRecordImageUrl) {
      docs.push({
        title: 'Antecedentes Penales',
        itemImageSrc: detail.criminalRecordImageUrl,
        thumbnailImageSrc: detail.criminalRecordImageUrl,
        alt: 'Antecedentes Penales'
      });
    }

    if (detail.driverLicenseImageUrl) {
      docs.push({
        title: 'Licencia de Conducir',
        itemImageSrc: detail.driverLicenseImageUrl,
        thumbnailImageSrc: detail.driverLicenseImageUrl,
        alt: 'Licencia de Conducir'
      });
    }

    return docs;
  });

  /** Responsive options para la galería */
  responsiveOptions = [
    {
      breakpoint: '1024px',
      numVisible: 3
    },
    {
      breakpoint: '768px',
      numVisible: 2
    },
    {
      breakpoint: '560px',
      numVisible: 1
    }
  ];

  constructor() {
    // Effect: cargar datos cuando cambia el ID y el drawer está visible
    effect(() => {
      const id = this.currentFormId();
      const isVisible = this.visible();

      if (id && isVisible) {
        this.loadDetail(id);
      }
    });
  }

  /**
   * Abrir el drawer con un ID específico
   */
  open(formId: number): void {
    this.currentFormId.set(formId);
    this.visible.set(true);
  }

  /**
   * Cerrar el drawer
   */
  close(): void {
    this.visible.set(false);
    this.currentFormId.set(null);
    this.formDetail.set(null);
    this.closed.emit();
  }

  /**
   * Cargar detalle del formulario
   */
  private loadDetail(id: number): void {
    this.loading.set(true);

    this.formService.getFormDetail(id).subscribe({
      next: (detail) => {
        this.formDetail.set(detail);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading detail:', err);
        this.loading.set(false);
        // TODO: Mostrar mensaje de error
      }
    });
  }

  /**
   * Aprobar formulario
   */
  approveForm(): void {
    const id = this.currentFormId();
    if (id) {
      this.approved.emit(id);
      this.close();
    }
  }

  /**
   * Abrir preview de imagen en nueva pestaña
   */
  openImagePreview(doc: RegistrationFormDocument): void {
    window.open(doc.itemImageSrc, '_blank');
  }

  /**
   * Descargar documento
   */
  downloadDocument(url: string): void {
    window.open(url, '_blank');
  }
}
