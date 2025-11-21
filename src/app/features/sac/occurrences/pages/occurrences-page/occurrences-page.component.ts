import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import { PaginatorModule } from 'primeng/paginator';
import { MenuItem, MessageService, ConfirmationService } from 'primeng/api';

// Models & Services
import { Occurrence, Solution } from '../../models';
import { OccurrenceService } from '../../services';

// Components
import { SolutionDialogComponent } from '../../components/solution-dialog/solution-dialog.component';
import { EditOccurrenceDialogComponent } from '../../components/edit-occurrence-dialog/edit-occurrence-dialog.component';

@Component({
  selector: 'app-occurrences-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    BreadcrumbModule,
    SkeletonModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    PopoverModule,
    PaginatorModule,
    SolutionDialogComponent,
    EditOccurrenceDialogComponent
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './occurrences-page.component.html',
  styleUrl: './occurrences-page.component.scss'
})
export class OccurrencesPageComponent implements OnInit {
  readonly occurrenceService = inject(OccurrenceService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'SAC', routerLink: '/sac' },
    { label: 'Ocurrencias' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  // Local signals
  readonly searchTerm = signal('');
  readonly rowsPerPage = signal(10);
  readonly selectedSolution = signal<Solution[]>([]);
  readonly selectedOccurrenceId = signal<number>(0);

  // Dialog visibility
  readonly showSolutionDialog = signal(false);
  readonly showEditDialog = signal(false);

  // Computed signals
  readonly isLoading = computed(() => this.occurrenceService.isLoading());
  readonly occurrences = computed(() => this.occurrenceService.occurrences());

  readonly filteredOccurrences = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    if (!search) {
      return this.occurrences();
    }
    return this.occurrences().filter(occ =>
      occ.orderId.toLowerCase().includes(search)
    );
  });

  ngOnInit(): void {
    this.loadOccurrences();
  }

  /**
   * Carga todas las ocurrencias
   */
  loadOccurrences(): void {
    this.occurrenceService.getOccurrences().subscribe({
      error: (error) => {
        console.error('Error al cargar ocurrencias:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las ocurrencias'
        });
      }
    });
  }

  /**
   * Abre el diálogo para ver la solución
   */
  viewSolution(occurrence: Occurrence): void {
    if (occurrence.solution && occurrence.solution.length > 0) {
      this.selectedSolution.set(occurrence.solution);
      this.showSolutionDialog.set(true);
    } else {
      this.messageService.add({
        severity: 'info',
        summary: 'Sin solución',
        detail: 'Esta ocurrencia aún no tiene solución registrada'
      });
    }
  }

  /**
   * Abre el diálogo para editar/agregar solución
   */
  editOccurrence(occurrence: Occurrence): void {
    this.selectedOccurrenceId.set(occurrence.id);
    this.showEditDialog.set(true);
  }

  /**
   * Elimina una ocurrencia con confirmación
   */
  deleteOccurrence(occurrence: Occurrence): void {
    this.confirmationService.confirm({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar la ocurrencia de la orden ${occurrence.orderId}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.occurrenceService.deleteOccurrence(occurrence.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Ocurrencia eliminada correctamente'
            });
          },
          error: (error) => {
            console.error('Error al eliminar ocurrencia:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'No se pudo eliminar la ocurrencia'
            });
          }
        });
      }
    });
  }

  /**
   * Navega al detalle de la orden
   */
  viewOrder(orderId: string): void {
    this.router.navigate(['/sac/order-tracking', orderId]);
  }

  /**
   * Callback cuando se guarda una solución
   */
  onSolutionSaved(): void {
    this.showEditDialog.set(false);
    this.loadOccurrences(); // Recargar para ver la solución actualizada
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Solución guardada correctamente'
    });
  }

  /**
   * Formatea una fecha ISO a formato legible
   */
  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Opciones de paginación
   */
  readonly rowsPerPageOptions = [5, 10, 15, 20];
}
