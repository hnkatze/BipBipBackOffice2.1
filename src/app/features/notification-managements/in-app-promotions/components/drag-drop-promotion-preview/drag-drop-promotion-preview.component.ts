import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

export interface PromotionPreviewData {
  title: string;
  description: string;
  banner: string;
  prefixBanner: string;
  mediaUrl: string;
  mediaPosition: string;
  promotionType: string;
  actionType: string;
  brandLogo?: string;
  brandName?: string;
  productImage?: string;
  recentlyAdded: boolean;
}

@Component({
  selector: 'app-drag-drop-promotion-preview',
  imports: [CommonModule, CardModule],
  templateUrl: './drag-drop-promotion-preview.component.html',
  styleUrl: './drag-drop-promotion-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DragDropPromotionPreviewComponent {
  // ============================================================================
  // INPUTS
  // ============================================================================

  readonly previewData = input.required<PromotionPreviewData>();

  // ============================================================================
  // COMPUTED
  // ============================================================================

  readonly badgeText = computed(() =>
    this.previewData().recentlyAdded ? 'NUEVO' : 'PROMOCIÓN'
  );

  readonly badgeClass = computed(() =>
    this.previewData().recentlyAdded
      ? 'bg-blue-500 text-white'
      : 'bg-orange-500 text-white'
  );

  readonly formattedBanner = computed(() => {
    const data = this.previewData();
    if (!data.banner) return '';

    // Retornar el banner tal cual viene (sin agregar prefijos automáticos)
    return data.banner;
  });

  readonly hasMedia = computed(() => !!this.previewData().mediaUrl);

  readonly mediaPosition = computed(() => this.previewData().mediaPosition);

  readonly isLayoutTop = computed(() => this.mediaPosition() === 'top');
  readonly isLayoutBottom = computed(() => this.mediaPosition() === 'bottom');
  readonly isLayoutLeft = computed(() => this.mediaPosition() === 'left');
  readonly isLayoutRight = computed(() => this.mediaPosition() === 'right');
  readonly isLayoutFull = computed(() => this.mediaPosition() === 'full');

  // ============================================================================
  // LAYOUT HELPERS
  // ============================================================================

  /**
   * Determina si debe mostrar el contenido principal
   * (en layout full, el media ocupa todo y no hay contenido separado)
   */
  readonly showMainContent = computed(() => !this.isLayoutFull());

  /**
   * Determina la clase de grid según el layout
   */
  readonly gridClass = computed(() => {
    const position = this.mediaPosition();

    if (position === 'top' || position === 'bottom') {
      return 'grid-rows-[auto_1fr]'; // Stack vertical
    }

    if (position === 'left' || position === 'right') {
      return 'grid-cols-2'; // Dos columnas
    }

    return ''; // Full no usa grid
  });

  /**
   * Calcula el ancho de la tarjeta basado en el tipo de promoción
   * Mantiene una altura base de 400px y calcula el ancho según el aspect ratio
   */
  readonly cardWidth = computed(() => {
    const type = this.previewData().promotionType;
    const baseHeight = 400; // altura base en px

    // Calcular ancho basado en la relación de aspecto
    // formato: widthxheight (ej: 6x4 = 6/4 = 1.5 ratio)
    switch (type) {
      case '6x4':
        // 6:4 = 1.5 ratio (más ancho que alto)
        return `${baseHeight * (6 / 4)}px`;
      case '5x8':
        // 5:8 = 0.625 ratio (más alto que ancho)
        return `${baseHeight * (5 / 8)}px`;
      case '7x8':
        // 7:8 = 0.875 ratio (casi cuadrado, un poco más alto)
        return `${baseHeight * (7 / 8)}px`;
      default:
        return '350px';
    }
  });

  /**
   * Altura fija para todas las tarjetas
   */
  readonly cardHeight = computed(() => '400px');
}
