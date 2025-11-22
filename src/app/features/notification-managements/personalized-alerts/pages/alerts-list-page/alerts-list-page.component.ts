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
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService, MenuItem } from 'primeng/api';
import { PersonalizedAlertsService } from '../../services';
import { PersonalizedAlert, COMMON_ALERT_ICONS } from '../../models';

@Component({
  selector: 'app-alerts-list-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    CardModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
    BreadcrumbModule,
    IconFieldModule,
    InputIconModule,
    SkeletonModule,
    TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './alerts-list-page.component.html',
  styleUrls: ['./alerts-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsListPageComponent implements OnInit {
  private readonly alertsService = inject(PersonalizedAlertsService);
  private readonly router = inject(Router);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Gest. Notificaciones' },
    { label: 'Alertas Personalizadas' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  readonly alerts = this.alertsService.alerts;
  readonly isLoading = this.alertsService.isLoading;

  readonly searchTerm = signal('');

  readonly filteredAlerts = computed(() => {
    const search = this.searchTerm().toLowerCase();
    if (!search) return this.alerts();

    return this.alerts().filter(
      (alert) =>
        alert.code.toLowerCase().includes(search) ||
        alert.title.toLowerCase().includes(search) ||
        alert.subtitle.toLowerCase().includes(search)
    );
  });

  ngOnInit(): void {
    this.alertsService.loadAlerts();
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  onCreateAlert(): void {
    this.router.navigate(['/notification-managements/custom-alerts/new']);
  }

  onEditAlert(alert: PersonalizedAlert): void {
    this.router.navigate([
      '/notification-managements/custom-alerts/edit',
      alert.code,
    ]);
  }

  onDeleteAlert(alert: PersonalizedAlert): void {
    this.confirmationService.confirm({
      message: `¿Está seguro que desea eliminar la alerta "${alert.code}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.alertsService.deleteAlert(alert.code).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Alerta eliminada exitosamente'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error al eliminar la alerta'
            });
          }
        });
      },
    });
  }

  getIconImage(iconId: string): string {
    const icon = COMMON_ALERT_ICONS.find(i => i.id === iconId);
    return icon?.image || '/alert-custom/info.svg';
  }
}
