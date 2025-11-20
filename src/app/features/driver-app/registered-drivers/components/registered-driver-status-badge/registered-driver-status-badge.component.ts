import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Tag } from 'primeng/tag';
import { getDriverStatusLabel, getDriverStatusSeverity } from '../../models/driver-status.enum';

/**
 * Badge para mostrar el status de un driver registrado
 *
 * Usage:
 * ```html
 * <app-registered-driver-status-badge
 *   [status]="driver.status"
 *   [isPenalized]="driver.isPenalized"
 * />
 * ```
 */
@Component({
  selector: 'app-registered-driver-status-badge',
  standalone: true,
  imports: [Tag],
  template: `
    <p-tag
      [value]="label()"
      [severity]="severity()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisteredDriverStatusBadgeComponent {
  /** Status del driver (true = activo, false = inactivo) */
  status = input.required<boolean>();

  /** Si el driver está penalizado */
  isPenalized = input<boolean>(false);

  /** Label computed basado en el status */
  label = computed(() => getDriverStatusLabel(this.status(), this.isPenalized()));

  /** Severity computed basado en el status */
  severity = computed(() => getDriverStatusSeverity(this.status(), this.isPenalized()));
}
