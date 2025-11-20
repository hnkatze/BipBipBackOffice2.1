import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DatePipe } from '@angular/common';
import { PenaltyHistoryItem } from '../../models/registered-driver.model';

/**
 * Dialog para mostrar detalles completos de una penalización
 *
 * Features:
 * - Muestra todos los detalles de la penalización
 * - Modal fullscreen responsive
 * - Cierre con botón o máscara
 */
@Component({
  selector: 'app-penalty-details-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './penalty-details-dialog.component.html',
})
export class PenaltyDetailsDialogComponent {
  visible = signal(false);
  penalty = signal<PenaltyHistoryItem | null>(null);

  /**
   * Abrir el diálogo con los detalles de la penalización
   */
  open(penalty: PenaltyHistoryItem): void {
    this.penalty.set(penalty);
    this.visible.set(true);
  }

  /**
   * Cerrar el diálogo
   */
  close(): void {
    this.visible.set(false);
  }
}
