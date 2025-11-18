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
   * Calcula el ancho y alto de la tarjeta basado en la posición del media
   * Dimensiones fijas según el layout
   */
  readonly cardWidth = computed(() => {
    const position = this.mediaPosition();

    switch (position) {
      case 'left':
      case 'right':
        // Layouts horizontales (5x8): 427.5px de ancho (del código old)
        return '427.5px';
      case 'top':
      case 'bottom':
        // Layouts verticales (6x4): 169px de ancho (10.5625rem del código old)
        return '169px';
      case 'full':
        // Layout full (7x8): 427.5px de ancho (del código old)
        return '427.5px';
      default:
        return '427.5px';
    }
  });

  /**
   * Altura de la tarjeta basada en la posición del media
   */
  readonly cardHeight = computed(() => {
    const position = this.mediaPosition();

    switch (position) {
      case 'left':
      case 'right':
        // Layouts horizontales (5x8): 292px de alto (del código old)
        return '292px';
      case 'top':
      case 'bottom':
        // Layouts verticales (6x4): altura mínima para que se vea bien (del código old: ~260px aprox)
        return '260px';
      case 'full':
        // Layout full (7x8): 335px de alto (20.9375rem del código old)
        return '335px';
      default:
        return '335px';
    }
  });
}
