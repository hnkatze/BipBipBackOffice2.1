import { Component, signal, output, ChangeDetectionStrategy } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-driver-unpenalize-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './driver-unpenalize-dialog.component.html',
})
export class DriverUnpenalizeDialogComponent {
  visible = signal(false);
  driverId = signal<number>(0);
  driverName = signal<string>('');
  loading = signal(false);

  confirm = output<number>();

  open(id: number, name: string): void {
    this.driverId.set(id);
    this.driverName.set(name);
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.loading.set(false);
  }

  onConfirm(): void {
    this.loading.set(true);
    this.confirm.emit(this.driverId());
  }
}
