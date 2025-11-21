import { Component, OnInit, signal, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';

// Services
import { CorrelativeService } from '../../services/correlative.service';

/**
 * Página para gestionar el correlativo de planillas
 * Permite ver y actualizar el número correlativo actual
 */
@Component({
  selector: 'app-correlative-page',
  templateUrl: './correlative-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputNumberModule,
    BreadcrumbModule,
    ToastModule
  ],
  providers: [MessageService]
})
export class CorrelativePageComponent implements OnInit {
  // Dependency Injection
  private correlativeService = inject(CorrelativeService);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  // Breadcrumb
  breadcrumbs: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Planillas', routerLink: '/accounting/spreadsheets' },
    { label: 'Correlativo' }
  ];

  // State signals
  correlative = signal<number | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  error = signal<string | null>(null);
  isEditing = signal<boolean>(false);

  // Form control
  correlativeControl = new FormControl<number | null>(null, [
    Validators.required,
    Validators.min(1)
  ]);

  ngOnInit(): void {
    this.loadCorrelative();
  }

  /**
   * Carga el correlativo actual desde el API
   */
  loadCorrelative(): void {
    this.loading.set(true);
    this.error.set(null);

    this.correlativeService.getCorrelative()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.correlative.set(response.correlativoId);
          this.correlativeControl.setValue(response.correlativoId);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('❌ Error cargando correlativo:', err);
          this.error.set('Error al cargar el correlativo. Por favor, intenta de nuevo.');
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el correlativo'
          });
        }
      });
  }

  /**
   * Habilita el modo de edición
   */
  enableEdit(): void {
    this.isEditing.set(true);
    this.correlativeControl.setValue(this.correlative());
  }

  /**
   * Cancela la edición y restaura el valor original
   */
  cancelEdit(): void {
    this.isEditing.set(false);
    this.correlativeControl.setValue(this.correlative());
    this.correlativeControl.markAsUntouched();
  }

  /**
   * Guarda el nuevo valor del correlativo
   */
  saveCorrelative(): void {
    if (this.correlativeControl.invalid) {
      this.correlativeControl.markAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'El correlativo debe ser un número mayor a 0'
      });
      return;
    }

    const newValue = this.correlativeControl.value;
    if (newValue === null || newValue === this.correlative()) {
      this.isEditing.set(false);
      return;
    }

    this.saving.set(true);

    this.correlativeService.updateCorrelative(newValue)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.correlative.set(newValue);
          this.isEditing.set(false);
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Correlativo actualizado correctamente'
          });
        },
        error: (err) => {
          console.error('❌ Error actualizando correlativo:', err);
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo actualizar el correlativo. Por favor, intenta de nuevo.'
          });
        }
      });
  }

  /**
   * Verifica si hay cambios sin guardar
   */
  hasChanges(): boolean {
    return this.correlativeControl.value !== this.correlative();
  }
}
