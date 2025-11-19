import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { RegistrationFormStatus, getStatusLabel, getStatusSeverity } from '../../models/registration-form-status.enum';

/**
 * Badge para mostrar el estado de un formulario de registro
 *
 * Usage:
 * ```html
 * <app-registration-form-status-badge [status]="form.status" />
 * ```
 */
@Component({
  selector: 'app-registration-form-status-badge',
  standalone: true,
  imports: [TagModule],
  template: `
    <p-tag
      [value]="label()"
      [severity]="severity()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistrationFormStatusBadgeComponent {
  /** Estado del formulario */
  status = input.required<RegistrationFormStatus>();

  /** Label del estado (computed) */
  label = computed(() => getStatusLabel(this.status()));

  /** Severity de PrimeNG (computed) */
  severity = computed(() => getStatusSeverity(this.status()));
}
