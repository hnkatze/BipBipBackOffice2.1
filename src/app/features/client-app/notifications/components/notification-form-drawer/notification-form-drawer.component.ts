import { Component, ChangeDetectionStrategy, signal, computed, inject, effect, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { RadioButton } from 'primeng/radiobutton';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { DividerModule } from 'primeng/divider';

import { NotificationService } from '../../services';
import { LaunchType, PushTypeEnum, DAYS_OF_WEEK, HOUR_OPTIONS, PUSH_TYPE_OPTIONS } from '../../models';
import { NotificationPreviewComponent } from '../notification-preview/notification-preview.component';
import { SmsAuthorizationDialogComponent } from '../sms-authorization-dialog/sms-authorization-dialog.component';

@Component({
  selector: 'app-notification-form-drawer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    RadioButton,
    CheckboxModule,
    DatePickerModule,
    MultiSelectModule,
    DividerModule,
    NotificationPreviewComponent,
    SmsAuthorizationDialogComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification-form-drawer.component.html',
  styleUrl: './notification-form-drawer.component.scss'
})
export class NotificationFormDrawerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notificationService = inject(NotificationService);

  // Inputs
  readonly notificationId = input<number | null>(null);

  // Outputs
  readonly onSave = output<void>();
  readonly onCancel = output<void>();

  // Two-way binding
  readonly visibleModel = model<boolean>(false);

  // State
  readonly isEditMode = computed(() => !!this.notificationId());
  readonly isSaving = signal(false);
  readonly showAuthDialog = signal(false);
  readonly createdNotificationId = signal<number | null>(null);

  // Form
  notificationForm!: FormGroup;

  // Enums and options
  readonly LaunchType = LaunchType;
  readonly PushTypeEnum = PushTypeEnum;
  readonly DAYS_OF_WEEK = DAYS_OF_WEEK;
  readonly HOUR_OPTIONS = HOUR_OPTIONS;
  readonly PUSH_TYPE_OPTIONS = PUSH_TYPE_OPTIONS;
  readonly minDate = new Date();

  // Target audiences from API
  readonly targetAudiences = computed(() =>
    this.notificationService.targetAudiences().map(ta => ({
      label: ta.name,
      value: ta.id
    }))
  );

  // Computed for launch type based on checkboxes (now using signals)
  readonly selectedLaunchType = computed(() => {
    if (!this.scheduleSend()) {
      return LaunchType.ONE_HOT; // Immediate
    } else if (this.isRecurrent()) {
      return LaunchType.RECURRENT; // Recurrent
    } else {
      return LaunchType.SCHEDULE; // Simple schedule
    }
  });

  // Signals for UI state (updated via form valueChanges)
  readonly scheduleSend = signal(false);
  readonly isRecurrent = signal(false);
  readonly hasEndDate = signal(false);

  // Computed header
  readonly header = computed(() => {
    return this.isEditMode() ? 'Editar Notificación' : 'Nueva Notificación';
  });

  // Preview values (reactive to form changes)
  readonly previewTitle = signal<string>('');
  readonly previewMessage = signal<string>('');
  readonly previewImageUrl = signal<string>('');
  readonly previewType = signal<PushTypeEnum>(PushTypeEnum.ALERT);
  readonly previewActionUrl = signal<string>('');

  constructor() {
    this.initializeForm();

    // Watch for notification ID changes
    effect(() => {
      const id = this.notificationId();
      if (id) {
        this.loadNotification(id);
      } else {
        this.resetForm();
      }
    });

    // Load target audiences when drawer opens
    effect(() => {
      if (this.visibleModel()) {
        this.loadTargetAudiences();
      }
    });

    // Update validators based on launch type
    effect(() => {
      const launchType = this.selectedLaunchType();
      this.updateValidators(launchType);
    });
  }

  initializeForm(): void {
    this.notificationForm = this.fb.group({
      // Información de la notificación
      name: ['', [Validators.required, Validators.maxLength(100)]],
      targets: [[], Validators.required],
      type: [PushTypeEnum.ALERT, Validators.required],

      // Contenido de la notificación
      title: ['', [Validators.required, Validators.maxLength(100)]],
      message: ['', [Validators.required, Validators.maxLength(500)]],

      // Configuración de envío
      scheduleSend: [false], // Checkbox: Programar envío
      isRecurrent: [false], // Checkbox: Notificación recurrente

      // Programada simple
      scheduleDateTime: [null], // Date + Time picker

      // Recurrente
      recurrentDays: [[]],
      recurrentHour: [null],
      hasEndDate: [false], // Checkbox: Establecer fecha límite
      recurrentEndDate: [null],

      // Optional fields
      imageUrl: [''],
      actionUrl: ['']
    });

    // Subscribe to form changes for preview
    this.notificationForm.valueChanges.subscribe(values => {
      this.previewTitle.set(values.title || '');
      this.previewMessage.set(values.message || '');
      this.previewImageUrl.set(values.imageUrl || '');
      this.previewType.set(values.type || PushTypeEnum.ALERT);
      this.previewActionUrl.set(values.actionUrl || '');
    });

    // Watch for scheduleSend changes
    this.notificationForm.get('scheduleSend')?.valueChanges.subscribe(scheduleSend => {
      this.scheduleSend.set(scheduleSend);
      this.updateScheduleValidators(scheduleSend, this.notificationForm.get('isRecurrent')?.value);
    });

    // Watch for isRecurrent changes
    this.notificationForm.get('isRecurrent')?.valueChanges.subscribe(isRecurrent => {
      this.isRecurrent.set(isRecurrent);
      this.updateScheduleValidators(this.notificationForm.get('scheduleSend')?.value, isRecurrent);
    });

    // Watch for hasEndDate changes
    this.notificationForm.get('hasEndDate')?.valueChanges.subscribe(hasEndDate => {
      this.hasEndDate.set(hasEndDate);
      const recurrentEndDate = this.notificationForm.get('recurrentEndDate');
      if (hasEndDate) {
        recurrentEndDate?.setValidators([Validators.required]);
      } else {
        recurrentEndDate?.clearValidators();
      }
      recurrentEndDate?.updateValueAndValidity();
    });
  }

  updateScheduleValidators(scheduleSend: boolean, isRecurrent: boolean): void {
    const scheduleDateTime = this.notificationForm.get('scheduleDateTime');
    const recurrentDays = this.notificationForm.get('recurrentDays');
    const recurrentHour = this.notificationForm.get('recurrentHour');

    // Clear all validators first
    scheduleDateTime?.clearValidators();
    recurrentDays?.clearValidators();
    recurrentHour?.clearValidators();

    if (scheduleSend) {
      if (isRecurrent) {
        // Recurrent: require days and hour
        recurrentDays?.setValidators([Validators.required, Validators.minLength(1)]);
        recurrentHour?.setValidators([Validators.required]);
      } else {
        // Simple schedule: require date+time
        scheduleDateTime?.setValidators([Validators.required]);
      }
    }
    // If not scheduleSend, no validators (immediate send)

    // Update validity
    scheduleDateTime?.updateValueAndValidity();
    recurrentDays?.updateValueAndValidity();
    recurrentHour?.updateValueAndValidity();
  }

  updateValidators(launchType: LaunchType): void {
    // Keep for compatibility but now handled by updateScheduleValidators
  }

  loadTargetAudiences(): void {
    this.notificationService.getTargetAudiences().subscribe();
  }

  loadNotification(id: number): void {
    // TODO: Implement load notification by ID
  }

  resetForm(): void {
    this.notificationForm.reset({
      type: PushTypeEnum.ALERT,
      targets: [],
      scheduleSend: false,
      isRecurrent: false,
      hasEndDate: false,
      recurrentDays: []
    });
    this.previewTitle.set('');
    this.previewMessage.set('');
    this.previewImageUrl.set('');
    this.previewType.set(PushTypeEnum.ALERT);
    this.previewActionUrl.set('');
  }

  onSubmit(): void {
    if (this.notificationForm.invalid) {
      this.notificationForm.markAllAsTouched();
      return;
    }

    const formValue = this.notificationForm.getRawValue();
    this.isSaving.set(true);

    // Build push structure based on form data
    const pushData = this.buildPushData(formValue);

    const request = this.isEditMode()
      ? this.notificationService.updateNotification(this.notificationId()!, pushData)
      : this.notificationService.createNotification(pushData);

    request.subscribe({
      next: (response: any) => {
        this.isSaving.set(false);

        // If it's a ONE_HOT notification, show authorization dialog
        if (formValue.launchType === LaunchType.ONE_HOT) {
          this.createdNotificationId.set(response.idPush || response.id);
          this.visibleModel.set(false); // Close drawer first
          setTimeout(() => {
            this.showAuthDialog.set(true); // Then open SMS dialog
          }, 300);
        } else {
          // For scheduled/recurrent, close drawer and emit save event
          this.visibleModel.set(false);
          this.onSave.emit();
        }
      },
      error: (err) => {
        console.error('Error saving notification:', err);
        this.isSaving.set(false);
      }
    });
  }

  buildPushData(formValue: any): any {
    // Determine launch type from checkboxes
    const launchType = this.selectedLaunchType();

    const pushData: any = {
      name: formValue.name,
      criteria: formValue.targets, // Array de IDs numéricos
      type: formValue.type,
      pushMetadata: {
        title: formValue.title,
        body: formValue.message
      },
      launchType: launchType,
      oneHot: { send: launchType === LaunchType.ONE_HOT },
      schedule: null,
      recurrent: null
    };

    // Add optional fields
    if (formValue.imageUrl) {
      pushData.pushMetadata.imageUrl = formValue.imageUrl;
    }
    if (formValue.actionUrl) {
      pushData.pushMetadata.actionUrl = formValue.actionUrl;
    }

    // Add launch configuration based on type
    if (launchType === LaunchType.SCHEDULE) {
      pushData.schedule = {
        dateSchedule: this.formatDateTimeFromPicker(formValue.scheduleDateTime)
      };
    } else if (launchType === LaunchType.RECURRENT) {
      pushData.recurrent = {
        frequency: formValue.recurrentDays.join(','), // "0,1,2"
        frequencyHour: formValue.recurrentHour,
        dateFrom: this.formatDate(new Date()),
        dateTo: formValue.hasEndDate && formValue.recurrentEndDate
          ? this.formatDate(formValue.recurrentEndDate)
          : null
      };
    }

    return pushData;
  }

  /**
   * Format date+time from DatePicker to "YYYY-MM-DD HH:MM:SS"
   */
  private formatDateTimeFromPicker(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:00`;
  }

  /**
   * Format date to "YYYY-MM-DD"
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  closeDrawer(): void {
    this.visibleModel.set(false);
    this.onCancel.emit();
  }

  // Form field helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.notificationForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.notificationForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
      if (field.errors['minlength']) return `Debe seleccionar al menos ${field.errors['minlength'].requiredLength} opción`;
    }
    return '';
  }

  /**
   * Authorization dialog handlers
   */
  onAuthorizationSuccess(): void {
    this.showAuthDialog.set(false);
    this.onSave.emit();
  }

  onAuthorizationCancel(): void {
    this.showAuthDialog.set(false);
    // Notification was created but not sent
    this.onSave.emit();
  }
}
