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
import { DrawerModule } from 'primeng/drawer';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService, MenuItem } from 'primeng/api';

import { TipService } from '../../services/tip.service';
import { TipList } from '../../models';
import { TipFormComponent } from '../../components/tip-form/tip-form.component';

@Component({
  selector: 'app-tips-page',
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
    DrawerModule,
    PaginatorModule,
    TipFormComponent
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tips-page.component.html'
})
export class TipsPageComponent implements OnInit {
  readonly tipService = inject(TipService);
  private readonly messageService = inject(MessageService);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  readonly selectedTipId = signal<number | null>(null);
  readonly showFormDrawer = signal(false);

  readonly isLoading = computed(() => this.tipService.isLoading());

  readonly filteredTips = computed(() => {
    const tips = this.tipService.tips();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    return tips.filter(tip => {
      const matchesSearch = tip.nameCountry.toLowerCase().includes(search) ||
                          tip.idCountry.toString().includes(search);
      const matchesStatus = status === 'all' ||
                          (status === 'active' && tip.isActiveTip) ||
                          (status === 'inactive' && !tip.isActiveTip);
      return matchesSearch && matchesStatus;
    });
  });

  breadcrumbItems: MenuItem[] = [
    { label: 'Client App' },
    { label: 'Propinas' }
  ];

  home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  ngOnInit(): void {
    this.loadTips();
  }

  loadTips(): void {
    this.tipService.getTipList().subscribe({
      error: (error) => {
        console.error('Error loading tips:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar las configuraciones de propinas'
        });
      }
    });
  }

  setStatusFilter(status: 'all' | 'active' | 'inactive'): void {
    this.statusFilter.set(status);
  }

  editTip(tip: TipList): void {
    this.selectedTipId.set(tip.idCountry);
    this.showFormDrawer.set(true);
  }

  onDrawerVisibilityChange(visible: boolean): void {
    if (!visible) {
      this.showFormDrawer.set(false);
      this.selectedTipId.set(null);
    }
  }

  handleFormSave(): void {
    this.loadTips();
  }

  toggleTipStatus(tip: TipList): void {
    // La funcionalidad de toggle se maneja en el drawer
    this.editTip(tip);
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Activo' : 'Inactivo';
  }

  getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }
}
