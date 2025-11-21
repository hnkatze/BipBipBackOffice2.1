import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { MenuItem } from 'primeng/api';

import { ChannelService } from '../../services/channel.service';
import { ChannelListUI } from '../../models/channel.model';
import { ChannelFormComponent } from '../../components/channel-form/channel-form.component';

/**
 * ChannelsPageComponent
 *
 * Página principal para la gestión de canales de comunicación
 * - Lista de canales en tabla PrimeNG
 * - Filtro por estado (Todos/Activos/Inactivos)
 * - Búsqueda por nombre
 * - Toggle para activar/desactivar
 * - Botones de editar en cada fila
 */
@Component({
  selector: 'app-channels-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    TagModule,
    ToggleSwitchModule,
    ToastModule,
    BreadcrumbModule,
    SkeletonModule,
    TooltipModule,
    PaginatorModule,
    ChannelFormComponent
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './channels-page.component.html'
})
export class ChannelsPageComponent implements OnInit {
  readonly channelService = inject(ChannelService);
  private readonly messageService = inject(MessageService);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'App Cliente', url: '/client-app' },
    { label: 'Canales', url: '/client-app/channels' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', url: '/' };

  // Local state
  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly selectedChannelId = signal<number | null>(null);
  readonly showFormModal = signal(false);

  // Computed filtered channels
  readonly filteredChannels = computed(() => {
    const channels = this.channelService.channels();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    return channels.filter(channel => {
      // Filter by search term
      const matchesSearch = channel.descriptionChannel.toLowerCase().includes(search) ||
                          channel.typeChannel.toLowerCase().includes(search);

      // Filter by status
      const matchesStatus = status === 'all' ||
                          (status === 'active' && channel.isActiveChannel) ||
                          (status === 'inactive' && !channel.isActiveChannel);

      return matchesSearch && matchesStatus;
    });
  });

  // Channel service signals
  readonly isLoading = this.channelService.isLoading;

  ngOnInit(): void {
    this.loadChannels();
  }

  /**
   * Load channels from API
   */
  loadChannels(): void {
    this.channelService.getChannelList().subscribe({
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los canales'
        });
        console.error('Error loading channels:', error);
      }
    });
  }

  /**
   * Set status filter
   */
  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
  }

  /**
   * Open form modal for new channel
   */
  openNewChannelModal(): void {
    this.selectedChannelId.set(null);
    this.showFormModal.set(true);
  }

  /**
   * Open form modal for editing channel
   */
  editChannel(channel: ChannelListUI): void {
    this.selectedChannelId.set(channel.idChannel);
    this.showFormModal.set(true);
  }

  /**
   * Toggle channel active status
   */
  toggleChannelStatus(channel: ChannelListUI): void {
    // TODO: Implement API call to update channel status
    // For now, just update the local state
    const updatedChannels = this.channelService.channels().map(c =>
      c.idChannel === channel.idChannel
        ? { ...c, isActiveChannel: !c.isActiveChannel }
        : c
    );
    this.channelService.channels.set(updatedChannels);

    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: `Canal ${channel.isActiveChannel ? 'desactivado' : 'activado'} correctamente`
    });
  }

  /**
   * Handle visibility change from drawer
   */
  onDrawerVisibilityChange(visible: boolean): void {
    if (!visible) {
      this.showFormModal.set(false);
      this.selectedChannelId.set(null);
    }
  }

  /**
   * Handle form save
   */
  handleFormSave(): void {
    this.showFormModal.set(false);
    this.selectedChannelId.set(null);
    this.loadChannels();
  }

  /**
   * Get brand names as comma-separated string
   */
  getBrandNames(channel: ChannelListUI): string {
    return channel.brandsList
      .filter(b => b.isSelected)
      .map(b => b.brandName)
      .join(', ') || 'Sin marcas';
  }

  /**
   * Check if channel has selected brands
   */
  hasSelectedBrands(channel: ChannelListUI): boolean {
    return channel.brandsList.some(b => b.isSelected);
  }

  /**
   * Get severity for status tag
   */
  getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  /**
   * Get status label
   */
  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }
}
