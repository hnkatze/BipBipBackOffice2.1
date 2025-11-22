import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DrawerModule } from 'primeng/drawer';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { PaginatorModule } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';
import { AppLinkService } from '../../services';
import { DynamicLinkProduct, STATUS_FILTER_OPTIONS } from '../../models';
import { AppLinkFormComponent } from '../../components';

@Component({
  selector: 'app-app-links-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    ToggleSwitchModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    DrawerModule,
    BreadcrumbModule,
    PaginatorModule,
    SkeletonModule,
    AppLinkFormComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './app-links-list-page.component.html',
  styleUrls: ['./app-links-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLinksListPageComponent implements OnInit {
  private readonly appLinkService = inject(AppLinkService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Gestión de Notificaciones', routerLink: '/notification-management' },
    { label: 'App Links' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  readonly appLinks = this.appLinkService.appLinks;
  readonly pagination = this.appLinkService.pagination;
  readonly isLoading = this.appLinkService.isLoading;

  readonly statusFilterOptions = STATUS_FILTER_OPTIONS;

  readonly searchTerm = signal('');
  readonly statusFilter = signal<boolean | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);

  // Drawer state
  readonly drawerVisible = signal(false);
  readonly selectedAppLink = signal<DynamicLinkProduct | null>(null);

  private readonly searchSubject = new Subject<string>();

  readonly pageSizeOptions = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '15', value: 15 },
    { label: '20', value: 20 },
  ];

  ngOnInit(): void {
    this.setupSearchDebounce();
    // Note: loadData() is not called here because lazy table will trigger onLazyLoad automatically
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((search) => {
        this.searchTerm.set(search);
        this.page.set(1);
        this.loadData();
      });
  }

  private loadData(): void {
    this.appLinkService.loadAppLinks({
      page: this.page(),
      pageSize: this.pageSize(),
      status: this.statusFilter(),
      search: this.searchTerm(),
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onStatusFilterChange(): void {
    this.page.set(1);
    this.loadData();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    // Calculate page from event.first (0-based index) and event.rows (page size)
    const page = Math.floor((event.first || 0) / (event.rows || 10)) + 1;
    const pageSize = event.rows || 10;

    this.page.set(page);
    this.pageSize.set(pageSize);
    this.loadData();
  }

  onPageChange(event: any): void {
    const page = Math.floor((event.first || 0) / (event.rows || 10)) + 1;
    const pageSize = event.rows || 10;

    this.page.set(page);
    this.pageSize.set(pageSize);
    this.loadData();
  }

  onCreateAppLink(): void {
    this.selectedAppLink.set(null);
    this.drawerVisible.set(true);
  }

  onEditAppLink(appLink: DynamicLinkProduct): void {
    this.selectedAppLink.set(appLink);
    this.drawerVisible.set(true);
  }

  onDrawerClose(): void {
    this.drawerVisible.set(false);
    this.selectedAppLink.set(null);
  }

  onFormSave(): void {
    this.drawerVisible.set(false);
    this.selectedAppLink.set(null);
    this.loadData();
  }

  onToggleStatus(appLink: DynamicLinkProduct, event: boolean): void {
    const newStatus = event;
    this.appLinkService.changeStatus(appLink.dynamicLinkXProductId, newStatus).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: `App link ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cambiar el estado del app link',
        });
      },
    });
  }

  async onCopyDeepLink(appLink: DynamicLinkProduct): Promise<void> {
    try {
      await navigator.clipboard.writeText(appLink.deepLink);
      this.messageService.add({
        severity: 'success',
        summary: 'Copiado',
        detail: 'Enlace copiado al portapapeles',
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo copiar el enlace',
      });
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
