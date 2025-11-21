import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  output,
  ChangeDetectionStrategy,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// PrimeNG
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

// Services
import { SaaoService } from '../../services/saao.service';

// Models
import {
  DriverOption,
  StoreOption,
  SaaoReportParams,
  CityOption,
  DriverStatus
} from '../../models/saao.model';

@Component({
  selector: 'app-saao-filters',
  templateUrl: './saao-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    DatePickerModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    TagModule,
    IconFieldModule,
    InputIconModule
  ]
})
export class SaaoFiltersComponent implements OnInit {
  // Dependency Injection
  private saaoService = inject(SaaoService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  // Outputs
  filtersApplied = output<SaaoReportParams>();
  filtersCleared = output<void>();

  // State signals - Ciudades
  cities = signal<CityOption[]>([]);
  loadingCities = signal<boolean>(false);

  // State signals - Drivers y Stores (filtros opcionales)
  drivers = signal<DriverOption[]>([]);
  stores = signal<StoreOption[]>([]);
  loadingDrivers = signal<boolean>(false);
  loadingStores = signal<boolean>(false);

  // Búsqueda de driver
  searchDriverId = signal<string>('');
  searchedDriver = signal<DriverStatus | null>(null);
  searchingDriver = signal<boolean>(false);
  driverNotFound = signal<boolean>(false);

  // Drivers activos por restaurante
  activeDriversCount = signal<number | null>(null);
  loadingActiveDrivers = signal<boolean>(false);

  // Form unificado (obligatorios + opcionales)
  filtersForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
    this.loadCities();
  }

  /**
   * Inicializar formulario UNIFICADO
   * Ciudad y Rango de Fechas son OBLIGATORIOS
   */
  private initializeForm(): void {
    const today = new Date();

    this.filtersForm = this.fb.group({
      // Filtros OBLIGATORIOS
      cityId: [null, Validators.required],
      dateRange: [[today, today], Validators.required], // Rango de fechas (date from - date to)

      // Filtros OPCIONALES
      driverId: [null],
      storeId: [null],
      orderIds: [''] // String que se convertirá a array
    });

    // Escuchar cambios en cityId para cargar drivers/stores
    this.filtersForm.get('cityId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(cityId => {
        if (cityId) {

          this.loadFilterDataForCity(cityId);

          // Limpiar filtros opcionales cuando cambia la ciudad
          this.filtersForm.patchValue({
            driverId: null,
            storeId: null
          }, { emitEvent: false });

          // Limpiar contador de drivers activos
          this.activeDriversCount.set(null);
        } else {
          // Si no hay ciudad, limpiar opcionales
          this.drivers.set([]);
          this.stores.set([]);
          this.activeDriversCount.set(null);
        }
      });

    // Escuchar cambios en storeId para cargar drivers activos
    this.filtersForm.get('storeId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(storeId => {
        if (storeId) {
          this.loadActiveDriversForStore(storeId);
        } else {
          this.activeDriversCount.set(null);
        }
      });
  }

  /**
   * Cargar ciudades desde el API
   */
  private loadCities(): void {
    this.loadingCities.set(true);

    this.saaoService.getCities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cities: CityOption[]) => {
          this.cities.set(cities);
          this.loadingCities.set(false);
        },
        error: error => {
          console.error('❌ Error cargando ciudades:', error);
          this.loadingCities.set(false);
        }
      });
  }

  /**
   * Cargar drivers y stores según la ciudad seleccionada
   */
  private loadFilterDataForCity(cityId: number): void {
    if (!cityId) {
      console.warn('⚠️ No hay ciudad seleccionada para cargar filtros');
      return;
    }

    // Cargar drivers y stores para la ciudad seleccionada

    // Cargar drivers por ciudad
    this.loadingDrivers.set(true);
    this.saaoService.getDriversByCity(cityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: drivers => {
          this.drivers.set(drivers);
          this.loadingDrivers.set(false);
        },
        error: error => {
          console.error('❌ Error cargando drivers:', error);
          this.drivers.set([]);
          this.loadingDrivers.set(false);
        }
      });

    // Cargar stores por ciudad
    this.loadingStores.set(true);
    this.saaoService.getStoresByCity(cityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: stores => {
          this.stores.set(stores);
          this.loadingStores.set(false);
        },
        error: error => {
          console.error('❌ Error cargando stores:', error);
          this.stores.set([]);
          this.loadingStores.set(false);
        }
      });
  }

  /**
   * Aplicar filtros completos (obligatorios + opcionales)
   */
  applyFilters(): void {
    // Validar que los campos obligatorios estén llenos
    if (this.filtersForm.invalid) {
      console.warn('⚠️ Formulario inválido. Ciudad y rango de fechas son obligatorios.');
      this.filtersForm.markAllAsTouched();
      return;
    }

    const formValue = this.filtersForm.value;

    // Formatear el rango de fechas
    let dateFrom = '';
    let dateTo = '';

    if (formValue.dateRange && Array.isArray(formValue.dateRange) && formValue.dateRange.length === 2) {
      const [startDate, endDate] = formValue.dateRange;
      if (startDate instanceof Date) {
        dateFrom = this.formatDateToYYYYMMDD(startDate);
      }
      if (endDate instanceof Date) {
        dateTo = this.formatDateToYYYYMMDD(endDate);
      }
    }

    // Validar que tengamos ciudad y rango de fechas
    if (!formValue.cityId || !dateFrom || !dateTo) {
      console.error('❌ Ciudad y rango de fechas son obligatorios');
      return;
    }

    // Parsear orderIds de string a array de números
    let orderIds: number[] | undefined;
    if (formValue.orderIds && formValue.orderIds.trim() !== '') {
      const orderIdsStr = formValue.orderIds.trim();
      orderIds = orderIdsStr
        .split(',')
        .map((id: string) => parseInt(id.trim(), 10))
        .filter((id: number) => !isNaN(id));
    }

    const params: SaaoReportParams = {
      cityId: formValue.cityId,
      dateFrom: dateFrom,
      dateTo: dateTo,
      driverId: formValue.driverId || undefined,
      storeId: formValue.storeId || undefined,
      orderIds: orderIds && orderIds.length > 0 ? orderIds : undefined
    };

    this.filtersApplied.emit(params);
  }

  /**
   * Limpiar TODOS los filtros y resetear a estado inicial
   */
  clearFilters(): void {
    const today = new Date();

    // Resetear formulario completo
    this.filtersForm.reset({
      cityId: null,
      dateRange: [today, today],
      driverId: null,
      storeId: null,
      orderIds: ''
    });

    // Limpiar opcionales
    this.drivers.set([]);
    this.stores.set([]);

    // Emitir evento de limpieza
    this.filtersCleared.emit();
  }

  /**
   * Formatear fecha a YYYY-MM-DD (formato requerido por el API)
   */
  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Cargar drivers activos para un restaurante específico
   */
  private loadActiveDriversForStore(storeId: number): void {
    if (!storeId) {
      this.activeDriversCount.set(null);
      return;
    }

    this.loadingActiveDrivers.set(true);
    this.saaoService.getActiveDriversByStore(storeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.activeDriversCount.set(response.activeDrivers);
          this.loadingActiveDrivers.set(false);
        },
        error: error => {
          console.error('❌ Error cargando drivers activos:', error);
          this.activeDriversCount.set(null);
          this.loadingActiveDrivers.set(false);
        }
      });
  }

  /**
   * Buscar driver por ID
   * Llama al API para obtener el estado actual del driver
   */
  searchDriver(): void {
    const driverId = parseInt(this.searchDriverId());

    // Validar que sea un número válido
    if (isNaN(driverId) || driverId <= 0) {
      this.driverNotFound.set(true);
      this.searchedDriver.set(null);
      return;
    }

    this.searchingDriver.set(true);
    this.driverNotFound.set(false);
    this.searchedDriver.set(null);

    this.saaoService.getDriverStatus(driverId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (driverData) => {
          if (driverData) {
            this.searchedDriver.set(driverData);
            this.driverNotFound.set(false);

            // Auto-aplicar filtros con el driver encontrado
            this.applyDriverFilter(driverId, driverData);
          } else {
            this.driverNotFound.set(true);
            this.searchedDriver.set(null);
          }
          this.searchingDriver.set(false);
        },
        error: (err) => {
          console.error('🔥 Error buscando driver:', err);
          this.searchingDriver.set(false);
          this.driverNotFound.set(true);
          this.searchedDriver.set(null);
        }
      });
  }

  /**
   * Aplicar filtro automáticamente cuando se encuentra un driver
   */
  private applyDriverFilter(driverId: number, driver: DriverStatus): void {
    if (!driver) return;

    // Obtener fecha actual
    const today = new Date();
    const formattedDate = this.formatDateToYYYYMMDD(today);

    // Actualizar el formulario con cityId del driver y rango de fecha (hoy - hoy)
    this.filtersForm.patchValue({
      cityId: driver.cityId,
      dateRange: [today, today],
      driverId: driverId
    }, { emitEvent: false }); // No emitir eventos para evitar loops

    // Cargar datos de la ciudad
    this.loadFilterDataForCity(driver.cityId);

    // Aplicar los filtros automáticamente
    const params: SaaoReportParams = {
      cityId: driver.cityId,
      dateFrom: formattedDate,
      dateTo: formattedDate,
      driverId: driverId
    };

    this.filtersApplied.emit(params);
  }

  /**
   * Limpiar búsqueda de driver
   */
  clearDriverSearch(): void {
    this.searchDriverId.set('');
    this.searchedDriver.set(null);
    this.driverNotFound.set(false);
    this.searchingDriver.set(false);
  }
}
