import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-image-preview-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-preview-dialog.component.html',
  styleUrl: './image-preview-dialog.component.scss',
})
export class ImagePreviewDialogComponent {
  visible = signal(false);
  imageUrl = signal<string>('');
  imageName = signal<string>('Imagen');

  open(url: string, name: string = 'Imagen'): void {
    this.imageUrl.set(url);
    this.imageName.set(name);
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
  }

  downloadImage(): void {
    const url = this.imageUrl();
    if (!url) return;

    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${this.imageName()}.jpg`;
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch((error) => {
        console.error('Error al descargar la imagen:', error);
      });
  }
}
