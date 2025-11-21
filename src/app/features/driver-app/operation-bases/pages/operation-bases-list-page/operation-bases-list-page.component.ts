import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Shared Components
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/breadcrumb';
import { GoogleMapComponent } from '@shared/components/google-map/google-map.component';
import { GoogleMapMarker, MapCenter } from '@shared/components/google-map/google-map.types';

// Feature Components
import { OperationBasesFilterSidebarComponent } from '../../components/operation-bases-filter-sidebar/operation-bases-filter-sidebar.component';

// Models and Services
import { OperationBaseService } from '../../services/operation-base.service';
import {
  OperationBase,
  OperationBaseFilters,
} from '../../models/operation-base.model';

/**
 * Página principal de Bases de Operaciones
 *
 * Features:
 * - Tabs para alternar entre Vista de Mapa y Vista de Tabla
 * - Mapa con marcadores de todas las bases (Google Maps)
 * - Tabla paginada con búsqueda
 * - Filtros laterales (país, ciudad, marca)
 * - Panel lateral en vista de mapa con lista de bases
 */
@Component({
  selector: 'app-operation-bases-list-page',
  imports: [
    CommonModule,
    FormsModule,
    TabsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SkeletonModule,
    CardModule,
    ToastModule,
    BreadcrumbComponent,
    GoogleMapComponent,
    OperationBasesFilterSidebarComponent,
  ],
  templateUrl: './operation-bases-list-page.component.html',
  styleUrls: ['./operation-bases-list-page.component.scss'],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationBasesListPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly operationBaseService = inject(OperationBaseService);
  private readonly messageService = inject(MessageService);

  // ============================================================================
  // SIGNALS
  // ============================================================================

  /** Vista activa (mapa o tabla) */
  readonly viewMode = signal<'map' | 'table'>('map');

  /** Loading states */
  readonly loading = signal(false);

  /** Datos de las bases */
  readonly operationBases = signal<OperationBase[]>([]);

  /** Filtros activos */
  readonly currentFilters = signal<OperationBaseFilters>({});

  /** Búsqueda */
  readonly searchTerm = signal('');
  private searchSubject = new Subject<string>();

  /** Paginación (solo para tabla) */
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalCount = signal(0);

  /** Sidebar de filtros */
  readonly filterSidebarVisible = signal(false);

  /** Breadcrumb */
  readonly breadcrumbItems = signal<BreadcrumbItem[]>([
    { label: 'Driver App', link: '/driver-app' },
    { label: 'Bases de Operaciones', link: '' },
  ]);

  /** Índice del tab activo (0 = mapa, 1 = tabla) */
  readonly activeTabIndex = signal(0);

  /** Centro del mapa para pan/zoom programático */
  readonly centerMapOn = signal<MapCenter | null>(null);

  /** Término de búsqueda para filtro local del panel lateral */
  readonly sidebarSearchTerm = signal('');

  // ============================================================================
  // COMPUTED SIGNALS
  // ============================================================================

  /**
   * Bases filtradas para el panel lateral (filtro local por nombre o dirección)
   */
  readonly filteredOperationBases = computed<OperationBase[]>(() => {
    const bases = this.operationBases();
    const search = this.sidebarSearchTerm().toLowerCase().trim();

    if (!search) {
      return bases;
    }

    return bases.filter(
      (base) =>
        base.headquarterName.toLowerCase().includes(search) ||
        base.headquarterAddress.toLowerCase().includes(search) ||
        base.headquarterAcronym.toLowerCase().includes(search)
    );
  });

  /**
   * Marcadores para el mapa de Google Maps
   */
  readonly mapMarkers = computed<GoogleMapMarker[]>(() => {
    return this.operationBases().map((base) => ({
      id: base.codHeadquarter.toString(),
      lat: base.headquarterLatitude,
      lng: base.headquarterLongitude,
      icon: base.pathLogoHeadquarter,
      title: base.headquarterName,
      info: base.headquarterAddress,
      badgeValue: base.pedidoPorHora,
    }));
  });

  constructor() {
    // Setup search debounce
    this.searchSubject
      .pipe(
        debounceTime(900),
        distinctUntilChanged(),
        takeUntilDestroyed()
      )
      .subscribe((term) => {
        this.searchTerm.set(term);
        this.currentPage.set(1); // Reset to page 1

        // Recargar datos según el modo
        if (this.viewMode() === 'map') {
          this.loadDataForMap();
        } else {
          // Para tabla, forzar recarga manual ya que cambio de searchTerm no dispara onLazyLoad
          this.loadDataForTable();
        }
      });
  }

  ngOnInit(): void {
    // Solo cargar para mapa, la tabla se carga automáticamente con lazy loading
    if (this.viewMode() === 'map') {
      this.loadDataForMap();
    }
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Cargar datos para la vista de mapa (sin paginación)
   */
  private loadDataForMap(): void {
    this.loading.set(true);

    this.operationBaseService
      .getOperationBases(this.currentFilters(), this.searchTerm())
      .subscribe({
        next: (bases) => {
          this.operationBases.set(bases);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading operation bases:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las bases de operaciones',
          });
          this.loading.set(false);
        },
      });
  }

  /**
   * Cargar datos para la vista de tabla (con paginación)
   */
  private loadDataForTable(): void {
    this.loading.set(true);

    this.operationBaseService
      .getOperationBasesPaginated(
        this.currentPage(),
        this.pageSize(),
        this.currentFilters(),
        this.searchTerm()
      )
      .subscribe({
        next: (response) => {
          this.operationBases.set(response.records);
          this.totalCount.set(response.metadata.totalCount);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading operation bases:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar las bases de operaciones',
          });
          this.loading.set(false);
        },
      });
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Manejar cambio de tab
   */
  onTabChange(event: any): void {
    const tabValue = parseInt(event.value || '0');
    this.activeTabIndex.set(tabValue);
    const newMode = tabValue === 0 ? 'map' : 'table';
    this.viewMode.set(newMode);
    this.currentPage.set(1); // Reset pagination

    // Solo cargar datos manualmente para la vista de mapa
    // La tabla con lazy loading se encarga de cargar sus propios datos via onLazyLoad
    if (newMode === 'map') {
      this.loadDataForMap();
    }
  }

  /**
   * Manejar cambio en búsqueda
   */
  onSearchChange(value: string): void {
    this.searchSubject.next(value);
  }

  /**
   * Manejar cambio de página en la tabla
   */
  onPageChange(event: any): void {
    // PrimeNG envía 'first' (índice del primer registro) y 'rows' (registros por página)
    // Calculamos el número de página: page = (first / rows) + 1
    const rows = event.rows || 10;
    const first = event.first || 0;
    const page = Math.floor(first / rows) + 1;

    this.currentPage.set(page);
    this.pageSize.set(rows);
    this.loadDataForTable();
  }

  /**
   * Manejar aplicación de filtros
   */
  onFiltersApply(filters: OperationBaseFilters): void {
    this.currentFilters.set(filters);
    this.currentPage.set(1); // Reset pagination

    // Recargar datos según el modo
    if (this.viewMode() === 'map') {
      this.loadDataForMap();
    } else {
      // Para tabla, forzar recarga manual ya que cambio de filtros no dispara onLazyLoad
      this.loadDataForTable();
    }
  }

  /**
   * Manejar click en marcador del mapa
   */
  onMarkerClick(markerId: string): void {
    // Navegar a detalles de la base
    this.router.navigate([
      '/driver-app/operation-bases/view-details',
      markerId,
    ]);
  }

  /**
   * Enfocar mapa en una base específica (click en panel lateral)
   */
  focusOnBase(base: OperationBase): void {
    // Centrar el mapa en la ubicación de la base con zoom de 16
    this.centerMapOn.set({
      lat: base.headquarterLatitude,
      lng: base.headquarterLongitude,
      zoom: 16,
    });
  }

  /**
   * Ver detalles de una base
   */
  viewDetails(headquarterId: number): void {
    this.router.navigate([
      '/driver-app/operation-bases/view-details',
      headquarterId,
    ]);
  }

  /**
   * Abrir sidebar de filtros
   */
  openFilters(): void {
    this.filterSidebarVisible.set(true);
  }

  /**
   * Navegar a la página de crear base
   */
  createBase(): void {
    this.router.navigate(['/driver-app/operation-bases/create']);
  }

  /**
   * Track by para optimizar rendering de la tabla
   */
  trackByHeadquarterId(_index: number, base: OperationBase): number {
    return base.codHeadquarter;
  }
}
