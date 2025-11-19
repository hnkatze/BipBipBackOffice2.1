import {
  Component,
  OnInit,
  inject,
  input,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';

import { RestaurantService } from '../../../services/restaurant.service';
import type {
  CoverageZone,
  RESTDeliveriesZone,
  DriverRESTDelZone,
  CreateCoverageZoneRequest,
  UpdateCoverageZoneRequest
} from '../../../models/coverage-zone.model';
import { ZoneDialogComponent } from './zone-dialog/zone-dialog.component';
import { PolygonZoneDialogComponent, type PolygonZoneData } from './polygon-zone-dialog/polygon-zone-dialog.component';
import {
  GoogleMapZonesViewerComponent,
  type MapZone,
  type RestaurantMapMarker
} from '@shared/components';

@Component({
  selector: 'app-coverage-tab',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TableModule,
    TabsModule,
    ZoneDialogComponent,
    PolygonZoneDialogComponent,
    GoogleMapZonesViewerComponent
  ],
  templateUrl: './coverage-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoverageTabComponent implements OnInit {
  private readonly restaurantService = inject(RestaurantService);
  private readonly messageService = inject(MessageService);

  // Input
  readonly restaurantId = input.required<number>();

  // State
  readonly isLoading = signal<boolean>(false);
  readonly showDialog = signal<boolean>(false);
  readonly dialogMode = signal<'create' | 'edit'>('create');
  readonly editingZone = signal<CoverageZone | null>(null);
  readonly selectedZoneType = signal<'restaurant' | 'driver'>('restaurant');
  readonly mapFilter = signal<'all' | 'restaurant' | 'driver'>('all'); // Filter for map display

  // Polygon zone dialog state (DEMO)
  readonly showPolygonDialog = signal<boolean>(false);
  readonly polygonZoneType = signal<'restaurant' | 'driver'>('restaurant');

  // Coverage zones
  readonly restaurantZones = signal<CoverageZone[]>([]);
  readonly driverZones = signal<CoverageZone[]>([]);

  // Restaurant coordinates (from detail)
  readonly restaurantCoords = signal<{ lat: number; lon: number }>({ lat: 14.065070, lon: -87.192136 });

  // Computed
  readonly hasRestaurantZones = computed(() => this.restaurantZones().length > 0);
  readonly hasDriverZones = computed(() => this.driverZones().length > 0);

  // Computed: Convert zones to MapZone format for Mapbox
  readonly restaurantMapZones = computed<MapZone[]>(() =>
    this.restaurantZones().map(zone => ({
      id: zone.zoneId,
      name: zone.zoneName,
      lat: zone.zoneLat,
      lon: zone.zoneLon,
      radius: zone.zoneRadius,
      color: '#fb0021'
    }))
  );

  readonly driverMapZones = computed<MapZone[]>(() =>
    this.driverZones().map(zone => ({
      id: zone.zoneId,
      name: zone.zoneName,
      lat: zone.zoneLat,
      lon: zone.zoneLon,
      radius: zone.zoneRadius,
      color: '#10b981' // Verde (green-500)
    }))
  );

  // Computed: Filtered zones based on mapFilter
  readonly filteredMapZones = computed<MapZone[]>(() => {
    const filter = this.mapFilter();
    const restZones = this.restaurantMapZones();
    const driverZones = this.driverMapZones();

    switch (filter) {
      case 'restaurant':
        return restZones;
      case 'driver':
        return driverZones;
      case 'all':
      default:
        return [...restZones, ...driverZones];
    }
  });

  // Computed: Restaurant marker for map
  readonly restaurantMarker = computed<RestaurantMapMarker>(() => {
    const coords = this.restaurantCoords();
    const detail = this.restaurantService.restaurantDetail();
    return {
      lat: coords.lat,
      lon: coords.lon,
      title: detail?.restName || 'Restaurante',
      icon: detail?.restUrllogo
    };
  });

  ngOnInit(): void {
    this.loadCoverageZones();
  }

  /**
   * Load coverage zones from restaurant detail
   */
  private loadCoverageZones(): void {
    const restId = this.restaurantId();
    this.isLoading.set(true);

    this.restaurantService.getRestaurantDetail(restId).subscribe({
      next: (detail) => {
        if (detail) {
          // Set restaurant coordinates
          this.restaurantCoords.set({
            lat: detail.restLat || 14.065070,
            lon: detail.restLon || -87.192136
          });

          // Convert restaurant zones
          const restZones: CoverageZone[] = (detail.restDeliveriesZones || []).map((zone: RESTDeliveriesZone) => ({
            zoneId: zone.delZoneId,
            zoneName: zone.delZoneName,
            zoneRadius: zone.delZoneRad,
            zoneLat: zone.delZoneLat,
            zoneLon: zone.delZoneLon,
            zoneMinAmount: zone.delMinAmount,
            isRestaurant: true
          }));

          // Convert driver zones
          const driverZones: CoverageZone[] = (detail.driverRestDelZones || []).map((zone: DriverRESTDelZone) => ({
            zoneId: zone.driverId,
            zoneName: zone.driverZoneName,
            zoneRadius: zone.driverRadius,
            zoneLat: zone.driverLatitude,
            zoneLon: zone.driverLongitude,
            zoneMinAmount: zone.driverMinAmount,
            isRestaurant: false
          }));

          this.restaurantZones.set(restZones);
          this.driverZones.set(driverZones);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading coverage zones:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar las zonas de cobertura'
        });
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Open dialog to create zone
   */
  openCreateDialog(zoneType: 'restaurant' | 'driver'): void {
    this.selectedZoneType.set(zoneType);
    this.dialogMode.set('create');
    this.editingZone.set(null);
    this.showDialog.set(true);
  }

  /**
   * Open dialog to edit zone
   */
  openEditDialog(zone: CoverageZone): void {
    this.selectedZoneType.set(zone.isRestaurant ? 'restaurant' : 'driver');
    this.dialogMode.set('edit');
    this.editingZone.set(zone);
    this.showDialog.set(true);
  }

  /**
   * Close dialog
   */
  closeDialog(): void {
    this.showDialog.set(false);
    this.editingZone.set(null);
  }

  /**
   * Handle zone save from dialog
   */
  onZoneSave(data: CreateCoverageZoneRequest | UpdateCoverageZoneRequest): void {
    if (this.dialogMode() === 'create') {
      this.createZone(data as CreateCoverageZoneRequest);
    } else {
      this.updateZone(data as UpdateCoverageZoneRequest);
    }
  }

  /**
   * Create new coverage zone
   */
  private createZone(data: CreateCoverageZoneRequest): void {
    this.restaurantService.createCoverageZone(this.restaurantId(), data).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Zona de cobertura creada correctamente'
        });
        this.closeDialog();
        this.loadCoverageZones();
      },
      error: (error) => {
        console.error('Error creating coverage zone:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo crear la zona de cobertura'
        });
      }
    });
  }

  /**
   * Update existing coverage zone
   */
  private updateZone(data: UpdateCoverageZoneRequest): void {
    const zone = this.editingZone();
    if (!zone) return;

    this.restaurantService.updateCoverageZone(zone.zoneId, this.restaurantId(), data).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Zona de cobertura actualizada correctamente'
        });
        this.closeDialog();
        this.loadCoverageZones();
      },
      error: (error) => {
        console.error('Error updating coverage zone:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo actualizar la zona de cobertura'
        });
      }
    });
  }

  /**
   * Delete coverage zone
   */
  deleteZone(zone: CoverageZone): void {
    this.restaurantService.deleteCoverageZone(zone.zoneId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Zona de cobertura eliminada correctamente'
        });
        this.loadCoverageZones();
      },
      error: (error) => {
        console.error('Error deleting coverage zone:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo eliminar la zona de cobertura'
        });
      }
    });
  }

  /**
   * Format radius for display (show in km if > 1000m)
   */
  formatRadius(radiusInMeters: number): string {
    if (radiusInMeters >= 1000) {
      return `${(radiusInMeters / 1000).toFixed(2)} km`;
    }
    return `${radiusInMeters} m`;
  }

  /**
   * Format coordinates
   */
  formatCoordinates(lat: number, lon: number): string {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }

  /**
   * Handle zone click from map
   */
  onMapZoneClick(zoneId: number): void {
    // Try to find the zone in restaurant zones first
    let zone = this.restaurantZones().find(z => z.zoneId === zoneId);

    // If not found, try driver zones
    if (!zone) {
      zone = this.driverZones().find(z => z.zoneId === zoneId);
    }

    if (zone) {
      this.openEditDialog(zone);
    }
  }

  /**
   * Handle tab change
   */
  onTabChange(event: any): void {
    this.selectedZoneType.set(event.index === 0 ? 'restaurant' : 'driver');
  }

  /**
   * Open polygon zone dialog (DEMO)
   */
  openPolygonZoneDialog(zoneType: 'restaurant' | 'driver'): void {
    this.polygonZoneType.set(zoneType);
    this.showPolygonDialog.set(true);
  }

  /**
   * Close polygon zone dialog
   */
  closePolygonDialog(): void {
    this.showPolygonDialog.set(false);
  }

  /**
   * Handle polygon zone save (DEMO - only logs to console)
   */
  onPolygonZoneSave(data: PolygonZoneData): void {
    // Por ahora solo mostramos un mensaje de éxito
    this.messageService.add({
      severity: 'info',
      summary: 'Demo: Zona con Polígono',
      detail: `Zona "${data.zoneName}" creada (ver consola para detalles)`,
      life: 5000
    });
  }
}
