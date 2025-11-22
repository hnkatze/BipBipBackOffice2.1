import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { type AutomaticAssignment } from '../../../models';

/**
 * AssignmentListTableComponent
 *
 * Displays a table of automatic assignments with driver information
 * Features:
 * - Driver avatar and name
 * - Order details
 * - Location information with flags
 * - Channel tags
 * - Time elapsed indicator
 * - Navigate to order detail
 */
@Component({
  selector: 'app-assignment-list-table',
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    TagModule,
    AvatarModule,
    TooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      <p-table
        [value]="assignments()"
        [loading]="loading()"
        [rows]="pageSize()"
        [first]="first()"
        [totalRecords]="totalRecords()"
        [lazy]="true"
        [paginator]="true"
        [rowsPerPageOptions]="[5, 10, 15, 20]"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} asignaciones"
        (onPage)="onPageChange.emit($event)"
        styleClass="p-datatable-sm"
        responsiveLayout="scroll">

        <!-- Order ID Column -->
        <ng-template pTemplate="header">
          <tr>
            <th>Orden</th>
            <th>Driver</th>
            <th>Canal</th>
            <th>Ubicación</th>
            <th>Fecha</th>
            <th>Tiempo</th>
            <th style="width: 8rem">Acciones</th>
          </tr>
        </ng-template>

        <ng-template pTemplate="body" let-assignment>
          <tr>
            <!-- Order ID -->
            <td>
              <div class="flex flex-col gap-1">
                <div class="font-semibold">{{ assignment.orderId }}</div>
                @if (assignment.postGCOrderId) {
                  <div class="text-sm text-gray-500">
                    PostGC: {{ assignment.postGCOrderId }}
                  </div>
                }
              </div>
            </td>

            <!-- Driver -->
            <td>
              <div class="flex items-center gap-2">
                @if (assignment.imageDriver) {
                  <p-avatar
                    [image]="assignment.imageDriver"
                    shape="circle"
                    size="normal">
                  </p-avatar>
                } @else {
                  <p-avatar
                    [label]="getDriverInitials(assignment.driverName)"
                    shape="circle"
                    size="normal"
                    >
                  </p-avatar>
                }
                <span class="ml-2">{{ assignment.driverName || 'Sin asignar' }}</span>
              </div>
            </td>

            <!-- Channel -->
            <td>
              <p-tag
                [value]="assignment.channelName"
                severity="info">
              </p-tag>
            </td>

            <!-- Location (Country + City) -->
            <td>
              <div class="flex items-center gap-3">
                @if (assignment.countryUrlFlag) {
                  <img
                    [src]="assignment.countryUrlFlag"
                    [alt]="assignment.countryName || ''"
                    class="w-8 h-6 object-cover rounded shadow-sm flex-shrink-0" />
                }
                <div class="flex flex-col gap-1">
                  @if (assignment.countryName) {
                    <div class="font-semibold">{{ assignment.countryName }}</div>
                  }
                  @if (assignment.cityName) {
                    <div class="text-sm text-gray-500">{{ assignment.cityName }}</div>
                  }
                </div>
              </div>
            </td>

            <!-- Date -->
            <td>
              <div class="whitespace-nowrap">
                {{ assignment.dateOrder }}
              </div>
            </td>

            <!-- Time Elapsed -->
            <td>
              <p-tag
                [value]="assignment.timeOrder"
                severity="info">
              </p-tag>
            </td>

            <!-- Actions -->
            <td>
              <p-button
                icon="pi pi-eye"
                [rounded]="true"
                [text]="true"
                severity="secondary"
                pTooltip="Ver detalle de orden"
                tooltipPosition="left"
                (onClick)="viewOrderDetail(assignment.orderId)">
              </p-button>
            </td>
          </tr>
        </ng-template>

        <!-- Empty state -->
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="7" class="text-center p-4">
              <div class="flex flex-col items-center justify-center py-8">
                <i class="pi pi-inbox text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">No se encontraron asignaciones</p>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class AssignmentListTableComponent {
  // Inputs
  readonly assignments = input.required<AutomaticAssignment[]>();
  readonly loading = input<boolean>(false);
  readonly totalRecords = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly first = input<number>(0);

  // Outputs
  readonly onPageChange = output<any>();

  constructor(private router: Router) {}

  /**
   * Get driver initials for avatar
   */
  getDriverInitials(name: string | null): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Navigate to order detail page
   */
  viewOrderDetail(orderId: number): void {
    this.router.navigate(['/sac/order-tracking', orderId]);
  }
}
