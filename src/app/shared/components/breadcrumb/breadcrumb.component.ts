import { Component, input, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbItem } from './breadcrumb.types';

@Component({
  selector: 'app-breadcrumb',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex items-center gap-2 text-sm mb-4">
      @for (item of items(); track item.link; let isLast = $last) {
        @if (!isLast) {
          <a
            (click)="navigateTo(item.link)"
            class="text-primary hover:text-primary-700 cursor-pointer transition-colors"
          >
            {{ item.label }}
          </a>
          <span class="text-surface-400">/</span>
        } @else {
          <span class="text-surface-700 font-medium">{{ item.label }}</span>
        }
      }
    </nav>
  `,
})
export class BreadcrumbComponent {
  items = input.required<BreadcrumbItem[]>();

  private readonly router = inject(Router);

  navigateTo(link: string): void {
    this.router.navigate([link]);
  }
}
