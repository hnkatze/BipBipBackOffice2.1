import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem } from 'primeng/api';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { BreadcrumbModule } from 'primeng/breadcrumb';

// Services
import { RegisteredUsersService } from '../../services';
import { AuthService } from '../../../../../core/services/auth.service';

// Tab Components
import { GeneralTabComponent } from '../../components/user-details-drawer/tabs/general-tab/general-tab.component';
import { OrdersTabComponent } from '../../components/user-details-drawer/tabs/orders-tab/orders-tab.component';
import { LoyaltyTabComponent } from '../../components/user-details-drawer/tabs/loyalty-tab/loyalty-tab.component';
import { BipLogsTabComponent } from '../../components/user-details-drawer/tabs/bip-logs-tab/bip-logs-tab.component';
import { IncidentsTabComponent } from '../../components/user-details-drawer/tabs/incidents-tab/incidents-tab.component';
import { GrantBipsTabComponent } from '../../components/user-details-drawer/tabs/grant-bips-tab/grant-bips-tab.component';
import { GrantBenefitsTabComponent } from '../../components/user-details-drawer/tabs/grant-benefits-tab/grant-benefits-tab.component';
import { SpecialPermissionsTabComponent } from '../../components/user-details-drawer/tabs/special-permissions-tab/special-permissions-tab.component';

@Component({
  selector: 'app-user-detail-page',
  templateUrl: './user-detail-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CardModule,
    TabsModule,
    ButtonModule,
    BreadcrumbModule,
    GeneralTabComponent,
    OrdersTabComponent,
    LoyaltyTabComponent,
    BipLogsTabComponent,
    IncidentsTabComponent,
    GrantBipsTabComponent,
    GrantBenefitsTabComponent,
    SpecialPermissionsTabComponent
  ]
})
export class UserDetailPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private authService = inject(AuthService);
  readonly registeredUsersService = inject(RegisteredUsersService);

  // User ID from route
  userId = signal<number | null>(null);

  // User role for access control
  readonly userRole = computed(() => this.authService.getUserRole()?.UserRole ?? '');
  readonly canAccessAdminTabs = computed(() =>
    this.userRole() === 'Administrador' || this.userRole() === 'SSAC'
  );

  // Active tab index
  readonly activeTabIndex = signal('0');

  // Breadcrumb
  breadcrumbs: MenuItem[] = [
    { label: 'Client App', routerLink: '/client-app' },
    { label: 'Usuarios Registrados', routerLink: '/client-app/user-registry' },
    { label: 'Detalle de Usuario' }
  ];

  private refreshSubscription?: Subscription;

  ngOnInit(): void {
    // Get user ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.userId.set(parseInt(id, 10));
    } else {
      // If no ID, redirect back to list
      this.router.navigate(['/client-app/user-registry']);
    }

    // Subscribe to refresh events
    this.refreshSubscription = this.registeredUsersService.refresh$.subscribe(() => {
      // Tabs will handle their own refresh logic
    });
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
  }

  /**
   * Navega de regreso a la lista de usuarios
   */
  goBack(): void {
    this.location.back();
  }
}
