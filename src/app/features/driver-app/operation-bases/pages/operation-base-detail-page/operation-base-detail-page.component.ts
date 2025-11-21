import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Shared Components
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';

// Models and Services
import { OperationBaseService } from '../../services/operation-base.service';
import { OperationBaseDetail } from '../../models/operation-base.model';

/**
 * Página para ver detalles completos de una base de operaciones
 *
 * Features:
 * - Información completa de la base
 * - Lista de drivers asignados
 * - Información de boxes
 * - Información de contacto
 * - Botón para editar
 */
@Component({
  selector: 'app-operation-base-detail-page',
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    SkeletonModule,
    ChipModule,
    TagModule,
    ToastModule,
    BreadcrumbComponent,
  ],
  templateUrl: './operation-base-detail-page.component.html',
  styleUrls: ['./operation-base-detail-page.component.scss'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationBaseDetailPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly operationBaseService = inject(OperationBaseService);
  private readonly messageService = inject(MessageService);

  // ============================================================================
  // SIGNALS
  // ============================================================================

  /** Loading state */
  readonly loading = signal(false);

  /** Detalles de la base */
  readonly baseDetails = signal<OperationBaseDetail | null>(null);

  /** ID de la base */
  readonly baseId = signal<number | null>(null);

  /** Breadcrumb */
  readonly breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Bases de Operaciones', link: '/driver-app/operation-bases' },
    { label: 'Detalle', link: '' },
  ]);

  ngOnInit(): void {
    // Obtener ID de la ruta
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const headquarterId = parseInt(id, 10);
      this.baseId.set(headquarterId);
      this.loadBaseDetails(headquarterId);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ID de base no válido',
      });
      this.goBack();
    }
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar detalles de la base
   */
  private loadBaseDetails(id: number): void {
    this.loading.set(true);

    this.operationBaseService.getOperationBaseDetail(id).subscribe({
      next: (details) => {
        this.baseDetails.set(details);
        // Actualizar breadcrumb con nombre de la base
        this.breadcrumbItems.set([
          { label: 'Driver App', link: '/driver-app' },
          { label: 'Bases de Operaciones', link: '/driver-app/operation-bases' },
          { label: details.headquarterName, link: '' },
        ]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading base details:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los detalles de la base',
        });
        this.loading.set(false);
      },
    });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Navegar a la página de edición
   */
  editBase(): void {
    const id = this.baseId();
    if (id) {
      this.router.navigate(['/driver-app/operation-bases/edit', id]);
    }
  }

  /**
   * Volver a la lista
   */
  goBack(): void {
    this.router.navigate(['/driver-app/operation-bases']);
  }
}
