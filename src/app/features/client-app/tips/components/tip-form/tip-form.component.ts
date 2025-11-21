import { Component, ChangeDetectionStrategy, signal, input, output, inject, OnInit, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButton } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { TipService } from '../../services/tip.service';
import { TipDetail, TipPayload } from '../../models';

@Component({
  selector: 'app-tip-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DrawerModule,
    ButtonModule,
    InputNumberModule,
    ToggleSwitchModule,
    RadioButton,
    TooltipModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tip-form.component.html'
})
export class TipFormComponent implements OnInit {
  readonly visible = input.required<boolean>();
  readonly tipId = input<number | null>(null);
  readonly visibleChange = output<boolean>();
  readonly onSave = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly tipService = inject(TipService);
  private readonly messageService = inject(MessageService);

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly tipCountry = signal<string>('');
  readonly tipCurrency = signal<string>('');
  readonly currencySymbol = signal<string>('');

  visibleModel = false;
  tipForm!: FormGroup;

  constructor() {
    this.initForm();

    effect(() => {
      const isVisible = this.visible();
      const id = this.tipId();

      untracked(() => {
        this.visibleModel = isVisible;

        if (isVisible && id) {
          this.loadTipData(id);
        } else if (isVisible && !id) {
          this.resetForm();
        }
      });
    });
  }

  ngOnInit(): void {
    // Watch for custom tips toggle changes
    this.tipForm.get('isCustomizedTips')?.valueChanges.subscribe(value => {
      const minAmountControl = this.tipForm.get('valueMinAmount');
      if (value) {
        minAmountControl?.enable();
      } else {
        minAmountControl?.disable();
        minAmountControl?.setValue(0);
      }
    });

    // Watch for default tips toggle changes
    this.tipForm.get('tipDefault')?.valueChanges.subscribe(value => {
      if (value) {
        this.defaultTips.enable();
      } else {
        this.defaultTips.disable();
      }
    });
  }

  private initForm(): void {
    this.tipForm = this.fb.group({
      isActiveTip: [true],
      isCustomizedTips: [false],
      valueMinAmount: [{ value: 0, disabled: true }, [Validators.min(0)]],
      tipDefault: [false],
      defaultTips: this.fb.array([])
    });

    // Disable default tips array initially
    this.defaultTips.disable();
  }

  private createDefaultTipControl(): FormGroup {
    return this.fb.group({
      value: [0, [Validators.min(0)]],
      isPublish: [false]
    });
  }

  get defaultTips(): FormArray {
    return this.tipForm.get('defaultTips') as FormArray;
  }

  private loadTipData(idCountry: number): void {
    this.isLoading.set(true);

    this.tipService.getTipById(idCountry).subscribe({
      next: (tip) => {
        this.tipCountry.set(tip.nameCountry);
        this.tipCurrency.set(`${tip.symbCurrency} ${tip.titleCurrency}`);
        this.currencySymbol.set(tip.symbCurrency);
        this.patchFormWithTip(tip);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading tip:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo cargar la configuración'
        });
        this.isLoading.set(false);
      }
    });
  }

  private patchFormWithTip(tip: TipDetail): void {
    // Patch basic fields
    this.tipForm.patchValue({
      isActiveTip: true, // Se determina por si tiene propinas configuradas
      isCustomizedTips: tip.isCustomizedTips,
      valueMinAmount: parseFloat(tip.valueMinAmount) || 0,
      tipDefault: tip.tipDefault
    });

    // Clear and rebuild default tips array
    this.defaultTips.clear();
    if (tip.tipDefVal && tip.tipDefVal.length > 0) {
      tip.tipDefVal.forEach((tipVal) => {
        this.defaultTips.push(this.fb.group({
          value: [tipVal.valTip || 0, [Validators.min(0)]],
          isPublish: [tipVal.activeTip || false]
        }));
      });
    }
  }

  private resetForm(): void {
    this.tipForm.reset({
      isActiveTip: true,
      isCustomizedTips: false,
      valueMinAmount: 0,
      tipDefault: false
    });

    // Clear default tips array
    this.defaultTips.clear();

    this.tipCountry.set('');
    this.tipCurrency.set('');
    this.currencySymbol.set('');
  }

  onSubmit(): void {
    if (this.tipForm.invalid) {
      this.tipForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos requeridos'
      });
      return;
    }

    const idCountry = this.tipId();
    if (!idCountry) return;

    this.isSaving.set(true);

    // Prepare payload
    const formValue = this.tipForm.getRawValue();
    const payload: TipPayload = {
      addTip: formValue.isCustomizedTips,
      minTip: formValue.valueMinAmount || 0,
      addTipDefault: formValue.tipDefault,
      maxTips: formValue.defaultTips.map((tip: any) => ({
        maxTip: tip.value || 0,
        isPublish: tip.isPublish
      }))
    };

    this.tipService.updateTip(idCountry, payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Configuración actualizada correctamente'
        });
        this.isSaving.set(false);
        this.closeDrawer();
        this.onSave.emit();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar la configuración'
        });
        console.error('Error updating tip:', error);
        this.isSaving.set(false);
      }
    });
  }

  closeDrawer(): void {
    this.visibleModel = false;
    this.visibleChange.emit(false);
    this.resetForm();
  }

  onVisibleChange(visible: boolean): void {
    this.visibleModel = visible;
    this.visibleChange.emit(visible);
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.tipForm.get(controlName);
    return !!(control && control.hasError(errorName) && (control.dirty || control.touched));
  }

  addDefaultTip(): void {
    const newTip = this.createDefaultTipControl();
    this.defaultTips.push(newTip);
  }

  removeDefaultTip(index: number): void {
    this.defaultTips.removeAt(index);
  }
}
