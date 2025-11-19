import {
  Component,
  OnInit,
  inject,
  input,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { RestaurantService } from '../../../services/restaurant.service';
import { GlobalDataService } from '@core/services/global-data.service';
import type {
  RestaurantConfig,
  CreateConfigRequest,
  UpdateConfigRequest,
  ScheduleConfig,
  DriverRadiusConfig,
  PaymentConfig
} from '../../../models/restaurant-config.model';

@Component({
  selector: 'app-config-tab',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    TableModule,
    DialogModule,
    SelectModule,
    ToggleSwitchModule,
    TooltipModule
  ],
  templateUrl: './config-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigTabComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly restaurantService = inject(RestaurantService);
  private readonly globalDataService = inject(GlobalDataService);
  private readonly messageService = inject(MessageService);

  // Input
  readonly restaurantId = input.required<number>();

  // State
  readonly isSaving = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly hasExistingConfig = signal<boolean>(false);

  // Dialog states
  readonly showScheduleDialog = signal<boolean>(false);
  readonly showDriverRadiusDialog = signal<boolean>(false);
  readonly showPaymentDialog = signal<boolean>(false);

  // Sub-configurations (stored separately for read-only display)
  readonly scheduleConfigs = signal<ScheduleConfig[]>([]);
  readonly driverRadiusConfigs = signal<DriverRadiusConfig[]>([]);
  readonly paymentConfigs = signal<PaymentConfig[]>([]);

  // Global data references
  readonly channels = this.globalDataService.channels;
  readonly paymentMethods = this.globalDataService.paymentMethods;

  // Form
  form!: FormGroup;

  // Dialog forms
  scheduleDialogForm!: FormGroup;
  driverRadiusDialogForm!: FormGroup;
  paymentDialogForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.initDialogForms();
    this.loadConfig();
    this.loadGlobalData();
  }

  /**
   * Initialize dialog forms
   */
  private initDialogForms(): void {
    // Schedule config dialog form
    this.scheduleDialogForm = this.fb.group({
      channelId: [null, Validators.required],
      time: [30, [Validators.required, Validators.min(1)]],
      active: [true]
    });

    // Driver radius config dialog form
    this.driverRadiusDialogForm = this.fb.group({
      channelId: [null, Validators.required],
      radius: [6000, [Validators.required, Validators.min(1)]],
      typeRadius: ['R', Validators.required]
    });

    // Payment config dialog form
    this.paymentDialogForm = this.fb.group({
      channelId: [null, Validators.required],
      paymentMethodId: [null, Validators.required],
      maxOrders: [0, [Validators.required, Validators.min(0)]],
      cashAmount: [1, [Validators.required, Validators.min(0)]]
    });
  }

  /**
   * Load global data (channels and payment methods) if not already loaded
   */
  private loadGlobalData(): void {
    if (this.channels().length === 0) {
      this.globalDataService.forceRefresh('channels');
    }
    if (this.paymentMethods().length === 0) {
      this.globalDataService.forceRefresh('paymentMethods');
    }
  }

  /**
   * Initialize form with validators
   */
  private initForm(): void {
    this.form = this.fb.group({
      // General Information
      restaurantCode: [''],
      neighborhood: [''],
      preparingTime: [0, [Validators.min(0)]],
      active: [true],
      publish: [true],

      // Order Configuration
      cantMultiOrder: [1, [Validators.required, Validators.min(1)]],
      minNextOrder: [0, [Validators.required, Validators.min(0)]],
      maxProducts: [20, [Validators.required, Validators.min(1)]],
      orderMaxAwaitTime: [30, [Validators.required, Validators.min(1)]],

      // Payment Configuration
      allowBipPay: [false],
      codePosGCBPay: [''],

      // Delivery Configuration
      radioClientDelivery1: [5, [Validators.required, Validators.min(0)]],
      radioClientDelivery2: [10, [Validators.required, Validators.min(0)]],
      expressShippingValue: [0, [Validators.required, Validators.min(0)]],
      expressFeeDriver: [0, [Validators.required, Validators.min(0)]],

      // Advanced Features
      enableSignalService: [false],
      applyDynamicValue: [false],
      dynamicValueCustomer: [0, [Validators.min(0)]],
      dynamicValueDriver: [0, [Validators.min(0)]],
      bPayDev: [false]
    });
  }

  /**
   * Load restaurant configurations
   */
  private loadConfig(): void {
    const restId = this.restaurantId();
    this.isLoading.set(true);

    this.restaurantService.getRestaurantConfigs(restId).subscribe({
      next: (config) => {
        if (config) {
          this.hasExistingConfig.set(true);
          this.form.patchValue(config);

          // Load sub-configurations
          this.scheduleConfigs.set(config.scheduleConfigs || []);
          this.driverRadiusConfigs.set(config.driverRadiusConfigs || []);
          this.paymentConfigs.set(config.paymentConfigs || []);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading configurations:', error);
        // If 404, it means no config exists yet (this is OK)
        if (error.status === 404) {
          this.hasExistingConfig.set(false);
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar la configuración'
          });
        }
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertencia',
        detail: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.isSaving.set(true);
    const formValue = this.form.value;

    if (this.hasExistingConfig()) {
      this.updateConfig(formValue);
    } else {
      this.createConfig(formValue);
    }
  }

  /**
   * Create new configuration
   */
  private createConfig(formValue: any): void {
    const request: CreateConfigRequest = this.buildConfigRequest(formValue);

    this.restaurantService.createRestaurantConfigs(this.restaurantId(), request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Configuración creada correctamente'
        });
        this.hasExistingConfig.set(true);
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('Error creating configuration:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo crear la configuración'
        });
        this.isSaving.set(false);
      }
    });
  }

  /**
   * Update existing configuration
   */
  private updateConfig(formValue: any): void {
    const request: UpdateConfigRequest = this.buildConfigRequest(formValue);

    this.restaurantService.updateRestaurantConfigs(this.restaurantId(), request).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Configuración actualizada correctamente'
        });
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('Error updating configuration:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'No se pudo actualizar la configuración'
        });
        this.isSaving.set(false);
      }
    });
  }

  /**
   * Build configuration request from form values
   */
  private buildConfigRequest(formValue: any): CreateConfigRequest | UpdateConfigRequest {
    return {
      // General Information
      restaurantCode: formValue.restaurantCode || undefined,
      neighborhood: formValue.neighborhood || undefined,
      preparingTime: formValue.preparingTime || 0,
      active: formValue.active,
      publish: formValue.publish,

      // Order Configuration
      cantMultiOrder: formValue.cantMultiOrder,
      minNextOrder: formValue.minNextOrder,
      maxProducts: formValue.maxProducts,
      orderMaxAwaitTime: formValue.orderMaxAwaitTime,

      // Payment Configuration
      allowBipPay: formValue.allowBipPay,
      codePosGCBPay: formValue.codePosGCBPay || undefined,

      // Delivery Configuration
      radioClientDelivery1: formValue.radioClientDelivery1,
      radioClientDelivery2: formValue.radioClientDelivery2,
      expressShippingValue: formValue.expressShippingValue,
      expressFeeDriver: formValue.expressFeeDriver,

      // Advanced Features
      enableSignalService: formValue.enableSignalService,
      applyDynamicValue: formValue.applyDynamicValue,
      dynamicValueCustomer: formValue.dynamicValueCustomer,
      dynamicValueDriver: formValue.dynamicValueDriver,
      bPayDev: formValue.bPayDev,

      // Sub-configurations (send existing arrays back)
      scheduleConfigs: this.scheduleConfigs(),
      driverRadiusConfigs: this.driverRadiusConfigs(),
      paymentConfigs: this.paymentConfigs()
    };
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (field.hasError('min')) {
      const min = field.errors?.['min']?.min;
      return `El valor mínimo es ${min}`;
    }

    return '';
  }

  /**
   * Get channel name by ID
   */
  getChannelName(channelId: number): string {
    const channel = this.channels().find(c => c.id === channelId);
    return channel?.description || `Canal ${channelId}`;
  }

  /**
   * Get payment method name by ID
   */
  getPaymentMethodName(paymentMethodId: number): string {
    const method = this.paymentMethods().find(pm => pm.id === paymentMethodId);
    return method?.name || `Método ${paymentMethodId}`;
  }

  /**
   * Toggle schedule config active status
   */
  toggleScheduleConfigActive(index: number, newValue: boolean): void {
    const currentConfigs = this.scheduleConfigs();
    const updatedConfigs = currentConfigs.map((config, i) =>
      i === index ? { ...config, active: newValue } : config
    );
    this.scheduleConfigs.set(updatedConfigs);
  }

  /**
   * Delete schedule config
   */
  deleteScheduleConfig(index: number): void {
    const currentConfigs = this.scheduleConfigs();
    this.scheduleConfigs.set(currentConfigs.filter((_, i) => i !== index));
  }

  /**
   * Delete driver radius config
   */
  deleteDriverRadiusConfig(index: number): void {
    const currentConfigs = this.driverRadiusConfigs();
    this.driverRadiusConfigs.set(currentConfigs.filter((_, i) => i !== index));
  }

  /**
   * Delete payment config
   */
  deletePaymentConfig(index: number): void {
    const currentConfigs = this.paymentConfigs();
    this.paymentConfigs.set(currentConfigs.filter((_, i) => i !== index));
  }

  /**
   * Open schedule dialog
   */
  openScheduleDialog(): void {
    this.showScheduleDialog.set(true);
  }

  /**
   * Close schedule dialog
   */
  closeScheduleDialog(): void {
    this.showScheduleDialog.set(false);
  }

  /**
   * Add new schedule config
   */
  onScheduleDialogSave(): void {
    if (this.scheduleDialogForm.invalid) {
      this.scheduleDialogForm.markAllAsTouched();
      return;
    }

    const newConfig: ScheduleConfig = {
      storeId: this.restaurantId(),
      channelId: this.scheduleDialogForm.value.channelId,
      time: this.scheduleDialogForm.value.time,
      active: this.scheduleDialogForm.value.active
    };

    this.scheduleConfigs.update(configs => [...configs, newConfig]);
    this.scheduleDialogForm.reset({ time: 30, active: true });
    this.closeScheduleDialog();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Configuración de tiempo agregada'
    });
  }

  /**
   * Open driver radius dialog
   */
  openDriverRadiusDialog(): void {
    this.showDriverRadiusDialog.set(true);
  }

  /**
   * Close driver radius dialog
   */
  closeDriverRadiusDialog(): void {
    this.showDriverRadiusDialog.set(false);
  }

  /**
   * Add new driver radius config
   */
  onDriverRadiusDialogSave(): void {
    if (this.driverRadiusDialogForm.invalid) {
      this.driverRadiusDialogForm.markAllAsTouched();
      return;
    }

    const newConfig: DriverRadiusConfig = {
      storeId: this.restaurantId(),
      channelId: this.driverRadiusDialogForm.value.channelId,
      radius: this.driverRadiusDialogForm.value.radius,
      typeRadius: this.driverRadiusDialogForm.value.typeRadius
    };

    this.driverRadiusConfigs.update(configs => [...configs, newConfig]);
    this.driverRadiusDialogForm.reset({ radius: 6000, typeRadius: 'R' });
    this.closeDriverRadiusDialog();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Configuración de radio agregada'
    });
  }

  /**
   * Open payment dialog
   */
  openPaymentDialog(): void {
    this.showPaymentDialog.set(true);
  }

  /**
   * Close payment dialog
   */
  closePaymentDialog(): void {
    this.showPaymentDialog.set(false);
  }

  /**
   * Add new payment config
   */
  onPaymentDialogSave(): void {
    if (this.paymentDialogForm.invalid) {
      this.paymentDialogForm.markAllAsTouched();
      return;
    }

    const newConfig: PaymentConfig = {
      storeId: this.restaurantId(),
      channelId: this.paymentDialogForm.value.channelId,
      paymentMethodId: this.paymentDialogForm.value.paymentMethodId,
      maxOrders: this.paymentDialogForm.value.maxOrders,
      cashAmount: this.paymentDialogForm.value.cashAmount
    };

    this.paymentConfigs.update(configs => [...configs, newConfig]);
    this.paymentDialogForm.reset({ maxOrders: 0, cashAmount: 1 });
    this.closePaymentDialog();
    this.messageService.add({
      severity: 'success',
      summary: 'Éxito',
      detail: 'Configuración de pago agregada'
    });
  }
}
