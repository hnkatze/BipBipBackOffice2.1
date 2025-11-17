import { Component, DestroyRef, effect, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';

import { DriverStatus } from '../../models/saao.model';
import { SaaoService } from '../../services/saao.service';
import { DriverLocationService, DriverLocation } from '../../services/driver-location.service';
import { MapComponent, MapMarker } from '@shared/components';

@Component({
  selector: 'app-driver-detail-drawer',
  templateUrl: './driver-detail-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MapComponent]
})
export class DriverDetailDrawerComponent {

  // Dependency Injection
  private saaoService = inject(SaaoService);
  private driverLocationService = inject(DriverLocationService);
  private destroyRef = inject(DestroyRef);

  // Inputs
  driverId = input.required<number>(); // ID del driver seleccionado
  orderId = input<number | null>(null); // ID de la orden seleccionada (opcional)

  // Outputs
  closeDrawer = output<void>();

  // Signals - Driver Status
  driverStatus = signal<DriverStatus>({
    driverId: 0,
    driverCode: '',
    fullname: '',
    cityId: 0,
    isAvailableForAssignment: false,
    isCurrentlyWorking: false,
    status: false,
    hasActivePenalty: false,
  });

  // Signals - Mapa
  showMap = signal<boolean>(false);
  loadingMap = signal<boolean>(false);
  mapMarkers = signal<MapMarker[]>([]);
  driverLocation = signal<DriverLocation | null>(null);
  orderLocation = signal<{ lat: number; lng: number } | null>(null);
  distance = signal<number | null>(null);

  // Suscripción de Firebase para limpieza manual
  private firebaseSubscription: Subscription | null = null;


  /**
   * Obtener el estado del driver
   */
  getDriverStatus(id: number) {
    this.saaoService.getDriverStatus(id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
       next: status => {
        if (status) {
          this.driverStatus.set(status);
        }
        else {
          console.error('No se pudo cargar el estado de driver');
       }
       },
       error: err => {
        console.error('❌ Error al obtener el estado del driver:', err);
       }
    });
  }

  /**
   * Toggle del mapa - Solo carga cuando se presiona el botón
   */
  toggleMap(): void {
    const currentState = this.showMap();

    if (!currentState) {
      // Abrir mapa - Cargar coordenadas
      const currentOrderId = this.orderId();

      if (!currentOrderId) {
        console.warn('No hay orden seleccionada para mostrar en el mapa');
        return;
      }

      this.showMap.set(true);
      this.loadMapData(currentOrderId);
    } else {
      // Cerrar mapa - LIMPIAR SUSCRIPCIÓN DE FIREBASE
      this.cleanupFirebaseSubscription();
      this.showMap.set(false);
      this.mapMarkers.set([]);
      this.distance.set(null);
      this.driverLocation.set(null);
      this.orderLocation.set(null);
    }
  }

  /**
   * Cargar datos del mapa (coordenadas de driver y orden)
   */
  private loadMapData(orderId: number): void {
    this.loadingMap.set(true);
    const driver = this.driverStatus();

    // Cargar coordenadas de la orden desde el API
    this.saaoService.getOrderCoordinates(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orderCoords) => {
          if (orderCoords) {
            // Mapear latitude/longitude del API a lat/lng que esperamos
            const mappedCoords = {
              lat: (orderCoords as any).latitude || orderCoords.lat,
              lng: (orderCoords as any).longitude || orderCoords.lng
            };
            this.orderLocation.set(mappedCoords);

            // Una vez tenemos la orden, cargar ubicación del driver desde Firebase
            this.loadDriverLocation(driver.cityId, driver.driverCode);
          } else {
            console.error('No se pudieron obtener las coordenadas de la orden');
            this.loadingMap.set(false);
          }
        },
        error: (err) => {
          console.error('❌ Error cargando coordenadas de orden:', err);
          this.loadingMap.set(false);
        }
      });
  }

  /**
   * Cargar ubicación del driver desde Firebase Realtime Database
   */
  private loadDriverLocation(cityId: number, driverCode: string): void {
    // Limpiar suscripción anterior si existe
    this.cleanupFirebaseSubscription();

    // Crear nueva suscripción y guardarla para limpieza manual
    this.firebaseSubscription = this.driverLocationService.getDriverLocation(cityId, driverCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (driverCoords) => {
          if (driverCoords) {
            this.driverLocation.set(driverCoords);

            // Actualizar marcadores del mapa
            this.updateMapMarkers();

            // Calcular distancia
            this.calculateDistance();
          } else {
            console.warn('No se encontró la ubicación del driver en tiempo real');
          }
          this.loadingMap.set(false);
        },
        error: (err) => {
          console.error('❌ Error cargando ubicación de driver:', err);
          this.loadingMap.set(false);
        }
      });
  }

  /**
   * Actualizar marcadores del mapa
   */
  private updateMapMarkers(): void {
    const driverLoc = this.driverLocation();
    const orderLoc = this.orderLocation();
    const markers: MapMarker[] = [];

    // Marcador del driver (icono de moto)
    if (driverLoc) {
      markers.push({
        lat: driverLoc.lat,
        lng: driverLoc.lng,
        icon: 'https://i.postimg.cc/PqBmTFRC/casco-de-carreras.png', // Icono de moto
        info: `Driver|${this.driverStatus().fullname}/${this.driverStatus().driverCode}` // Formato: Header|Title/Code
      });
    }

    // Marcador de la orden (icono de pin de entrega)
    if (orderLoc) {
      markers.push({
        lat: orderLoc.lat,
        lng: orderLoc.lng,
        icon: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Icono de ubicación
        info: `Orden|Entrega/Orden #${this.orderId()}` // Formato: Header|Title/Code
      });
    }

    this.mapMarkers.set(markers);
  }

  /**
   * Calcular distancia entre driver y punto de entrega
   */
  private calculateDistance(): void {
    const driverLoc = this.driverLocation();
    const orderLoc = this.orderLocation();

    if (driverLoc && orderLoc) {
      const dist = this.driverLocationService.calculateDistance(
        driverLoc.lat,
        driverLoc.lng,
        orderLoc.lat,
        orderLoc.lng
      );

      this.distance.set(dist);
    }
  }

  /**
   * Limpiar suscripción de Firebase cuando se cierra el mapa
   * Previene memory leaks al desuscribirse manualmente del listener en tiempo real
   */
  private cleanupFirebaseSubscription(): void {
    if (this.firebaseSubscription) {
      this.firebaseSubscription.unsubscribe();
      this.firebaseSubscription = null;
    }
  }

  constructor() {
    // Effect para cargar driver status cuando cambia el driverId
    effect(() => {
      const id = this.driverId();
      if (id) {
        this.getDriverStatus(id);
      }
    },{ allowSignalWrites: true });

    // Cleanup automático cuando el componente se destruye
    this.destroyRef.onDestroy(() => {
      this.cleanupFirebaseSubscription();
    });
  }

}
