import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PaginatorModule } from 'primeng/paginator';
import { PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { MenuItem, MessageService } from 'primeng/api';

// Services & Models
import { ProductsInPromotionsService } from '../../services';
import { ProductInPromotion } from '../../models';
import { ProductTagPositionUtils } from '../../utils';

// Core
import { GlobalDataService } from '@core/services/global-data.service';
import { Brand } from '@core/models/global-data.model';

@Component({
  selector: 'app-products-list-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    DialogModule,
    TagModule,
    TooltipModule,
    BreadcrumbModule,
    IconFieldModule,
    InputIconModule,
    ProgressSpinnerModule,
    PaginatorModule,
    PopoverModule,
    SkeletonModule
  ],
  providers: [MessageService],
  templateUrl: './products-list-page.component.html',
  styleUrls: ['./products-list-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListPageComponent implements OnInit {
  private readonly service = inject(ProductsInPromotionsService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly globalData = inject(GlobalDataService);
  private readonly destroyRef = inject(DestroyRef);

  // Breadcrumb
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Gest. Notificaciones' },
    { label: 'Productos en Promoción' }
  ];
  readonly home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };

  // Búsqueda
  readonly searchControl = new FormControl<string>('');
  readonly searchTerm = signal<string>('');

  // Paginación
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);

  // Estado
  readonly isLoadingProducts = signal(false);
  readonly isLoadingBrands = signal(false);
  readonly showDeleteDialog = signal(false);
  readonly productToDelete = signal<ProductInPromotion | null>(null);
  readonly isDeleting = signal(false);

  // Brands desde global data
  readonly brandsList = this.globalData.brands;
  readonly isLoadingBrandsGlobal = this.globalData.isLoadingBrands;

  // Productos desde el servicio
  readonly allProducts = this.service.products;

  // Computed: Loading general
  readonly isLoading = computed(() =>
    this.isLoadingProducts() || this.isLoadingBrands()
  );

  // Computed: Productos filtrados por búsqueda
  readonly filteredProducts = computed(() => {
    const products = this.allProducts();
    const search = this.searchTerm().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter(product =>
      product.productId.toLowerCase().includes(search) ||
      product.text.toLowerCase().includes(search) ||
      product.position.toLowerCase().includes(search) ||
      this.getPositionLabel(product.position).toLowerCase().includes(search) ||
      this.getBrandName(product.brandId).toLowerCase().includes(search)
    );
  });

  // Computed: Total de registros filtrados
  readonly totalRecords = computed(() => this.filteredProducts().length);

  // Computed: Total de productos (sin filtrar)
  readonly totalProducts = computed(() => this.allProducts().length);

  // Computed: Productos paginados
  readonly paginatedProducts = computed(() => {
    const filtered = this.filteredProducts();
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });

  ngOnInit(): void {
    this.loadBrands();
    this.setupSearchDebounce();
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(value => {
        this.searchTerm.set(value || '');
        this.pageIndex.set(0); // Reset a primera página al buscar
      });
  }

  /**
   * Carga las marcas si no están cargadas
   */
  private loadBrands(): void {
    // Si ya hay marcas, cargar productos directamente
    if (this.brandsList().length > 0) {
      this.loadProducts();
      return;
    }

    // Si no hay marcas, cargarlas primero
    this.isLoadingBrands.set(true);
    this.globalData.forceRefresh('brands');

    // Esperar a que terminen de cargar las marcas
    const checkBrands = setInterval(() => {
      if (!this.isLoadingBrandsGlobal()) {
        clearInterval(checkBrands);
        this.isLoadingBrands.set(false);
        this.loadProducts();
      }
    }, 100);
  }

  /**
   * Carga la lista de productos desde el backend
   */
  loadProducts(): void {
    this.isLoadingProducts.set(true);

    this.service.getProductsInPromotions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this.service.updateLocalProductsList(products);
          this.isLoadingProducts.set(false);
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar los productos en promoción'
          });
          this.isLoadingProducts.set(false);
        }
      });
  }

  /**
   * Navega al formulario de creación
   */
  createNewProduct(): void {
    this.router.navigate(['/notification-managements/products-in-promotions/new']);
  }

  /**
   * Navega al formulario de edición
   */
  editProduct(product: ProductInPromotion): void {
    this.router.navigate([
      '/notification-managements/products-in-promotions/edit',
      product.productId,
      product.brandId
    ]);
  }

  /**
   * Abre el diálogo de confirmación para eliminar
   */
  openDeleteDialog(product: ProductInPromotion): void {
    this.productToDelete.set(product);
    this.showDeleteDialog.set(true);
  }

  /**
   * Confirma y ejecuta la eliminación
   */
  confirmDelete(): void {
    const product = this.productToDelete();
    if (!product) return;

    this.isDeleting.set(true);

    this.service.deleteProductInPromotion(product.productId, product.brandId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Producto eliminado correctamente'
          });
          // Optimistic update: remover de la lista local
          this.service.removeProductFromLocalList(product.productId, product.brandId);
          this.closeDeleteDialog();
        },
        error: (error) => {
          console.error('Error deleting product:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al eliminar el producto'
          });
          this.isDeleting.set(false);
        }
      });
  }

  /**
   * Cierra el diálogo de eliminación
   */
  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.isDeleting.set(false);
    this.productToDelete.set(null);
  }

  /**
   * Maneja el cambio de página
   */
  onPageChange(event: any): void {
    this.pageIndex.set(event.first / event.rows);
    this.pageSize.set(event.rows);
  }

  /**
   * Obtiene el nombre de una marca
   */
  getBrandName(brandId: string): string {
    const brand = this.brandsList().find(b => b.id.toString() === brandId);
    return brand ? brand.name : `Marca ${brandId}`;
  }

  /**
   * Obtiene el logo de una marca
   */
  getBrandLogo(brandId: string): string {
    const brand = this.brandsList().find(b => b.id.toString() === brandId);
    return brand?.logo || '';
  }

  /**
   * Obtiene el label de una posición
   */
  getPositionLabel(position: string): string {
    return ProductTagPositionUtils.getPositionLabel(position);
  }

  /**
   * Obtiene el icono de una posición
   */
  getPositionIcon(position: string): string {
    return ProductTagPositionUtils.getPositionIcon(position);
  }

  /**
   * Maneja errores de carga de imágenes
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/assets/brand/default-logo.svg';
    }
  }

  /**
   * Refresca la lista de productos
   */
  refreshProducts(): void {
    this.loadProducts();
  }
}
