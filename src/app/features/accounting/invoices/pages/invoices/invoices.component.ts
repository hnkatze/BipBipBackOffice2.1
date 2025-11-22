import { Component, OnInit, inject, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';

import { BreadcrumbModule } from 'primeng/breadcrumb';
// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorModule } from 'primeng/paginator';

// Models & Services
import {
  Invoice,
  DateFilterOption,
  ReportType,
  ChartDataset,
  convertToChartDataDays,
  convertToChartDataHours,
  convertToChartDataMinutes,
  convertToChartDataDaysOrders,
  convertToChartDataHoursOrders,
  convertToChartDataMinutesOrders
} from '../../models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

// Components
import { InvoiceChartsComponent } from '../../components/invoice-charts/invoice-charts.component';

/**
 * InvoicesComponent - Lista de facturas con filtros y reportes
 *
 * Features:
 * - Tabla con paginación server-side
 * - Filtros por fecha (5 opciones: hora actual, 24hrs, semana, mes, personalizado)
 * - Generación de reportes PDF/Excel
 * - Navegación a vista de detalle
 * - Read-only (no crear/editar facturas)
 */
@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    TagModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ToastModule,
    TooltipModule,
    DatePickerModule,
    SelectModule,
    BreadcrumbModule,
    SkeletonModule,
    PaginatorModule,
    InvoiceChartsComponent
  ],
  templateUrl: './invoices.component.html',
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoicesComponent implements OnInit {
  private readonly invoiceService = inject(InvoiceService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  // Breadcrumb
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  readonly breadcrumbItems: MenuItem[] = [
    { label: 'Contabilidad', routerLink: '/accounting' },
    { label: 'Facturas' }
  ];

  // Signals del servicio
  readonly invoices = this.invoiceService.invoices;
  readonly totalRecords = this.invoiceService.totalRecords;
  readonly totalAmount = this.invoiceService.totalAmount;
  readonly currentPage = this.invoiceService.currentPage;
  readonly pageSize = this.invoiceService.pageSize;
  readonly isLoading = this.invoiceService.isLoading;
  readonly dateFilterOptions = this.invoiceService.dateFilterOptions;
  readonly countries = this.invoiceService.countries;

  // Estado local del componente
  readonly selectedDateFilter = signal<number>(4); // Default: Este mes
  readonly customDateFrom = signal<Date | null>(null);
  readonly customDateTo = signal<Date | null>(null);
  readonly isGeneratingReport = signal<boolean>(false);

  // Estado de gráficos
  readonly showCharts = signal<boolean>(false);
  readonly chartTotalsData = signal<ChartDataset | null>(null);
  readonly chartOrdersData = signal<ChartDataset | null>(null);
  readonly isLoadingCharts = this.invoiceService.isLoadingCharts;

  // Effect para reaccionar a cambios de filtro de fecha
  constructor() {
    // Effect 1: Recargar tabla de facturas cuando cambia el filtro
    effect(() => {
      const filterId = this.selectedDateFilter();
      const customFrom = this.customDateFrom();
      const customTo = this.customDateTo();

      // Calcular rango de fechas según opción seleccionada
      const { dateFrom, dateTo } = this.invoiceService.calculateDateRange(
        filterId,
        customFrom || undefined,
        customTo || undefined
      );

      // Actualizar signals del servicio
      this.invoiceService.dateFrom.set(dateFrom);
      this.invoiceService.dateTo.set(dateTo);

      // Recargar facturas con nuevo rango
      this.loadInvoices();
    });

    // Effect 2: Recargar gráficos cuando cambia el filtro Y están visibles
    effect(() => {
      const filterId = this.selectedDateFilter();
      const customFrom = this.customDateFrom();
      const customTo = this.customDateTo();
      const areChartsVisible = this.showCharts();

      // Solo recargar si los gráficos están visibles
      if (areChartsVisible) {
        this.loadChartData();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Cargar países para mostrar banderas
    this.invoiceService.getCountries().subscribe({
      error: (error) => {
        console.error('Error loading countries:', error);
      }
    });

    // La carga de facturas se hace automáticamente por el effect
  }

  /**
   * Carga la lista de facturas con filtros actuales
   */
  loadInvoices(): void {
    const page = this.currentPage();
    const pageSize = this.pageSize();
    const dateFrom = this.invoiceService.dateFrom();
    const dateTo = this.invoiceService.dateTo();

    this.invoiceService
      .getInvoices(page, pageSize, dateFrom, dateTo)
      .subscribe({
        error: (error) => {
          console.error('Error loading invoices:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar facturas'
          });
        }
      });
  }

  /**
   * Maneja el cambio de página en la tabla
   */
  onPageChange(event: any): void {
    this.invoiceService.currentPage.set(event.first / event.rows);
    this.invoiceService.pageSize.set(event.rows);
    this.loadInvoices();
  }

  /**
   * Maneja el cambio de filtro de fecha
   */
  onDateFilterChange(filterId: number): void {
    this.selectedDateFilter.set(filterId);
    this.invoiceService.currentPage.set(0); // Reset a primera página
    // El effect se encargará de recargar los datos
  }

  /**
   * Maneja el cambio de fechas personalizadas
   */
  onCustomDateChange(): void {
    // Solo recargar si ambas fechas están seleccionadas
    if (this.customDateFrom() && this.customDateTo()) {
      this.selectedDateFilter.set(5); // Activar filtro personalizado
      this.invoiceService.currentPage.set(0);
      // El effect se encargará de recargar los datos
    }
  }

  /**
   * Navega a la vista de detalle de una factura
   */
  viewInvoiceDetail(invoiceId: number): void {
    this.router.navigate(['/accounting/invoices', invoiceId]);
  }

  /**
   * Genera reporte en PDF
   */
  generatePDFReport(): void {
    const dateFrom = this.invoiceService.dateFrom();
    const dateTo = this.invoiceService.dateTo();

    if (!dateFrom || !dateTo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Seleccione un rango de fechas'
      });
      return;
    }

    this.isGeneratingReport.set(true);

    this.invoiceService.generateReport(ReportType.PDF, dateFrom, dateTo).subscribe({
      next: (base64) => {
        this.downloadPDF(base64, 'reporte-detalleFacturas');
        this.isGeneratingReport.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Reporte PDF generado correctamente'
        });
      },
      error: (error) => {
        console.error('Error generating PDF report:', error);
        this.isGeneratingReport.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al generar reporte PDF'
        });
      }
    });
  }

  /**
   * Genera reporte en Excel
   */
  generateExcelReport(): void {
    const dateFrom = this.invoiceService.dateFrom();
    const dateTo = this.invoiceService.dateTo();

    if (!dateFrom || !dateTo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atención',
        detail: 'Seleccione un rango de fechas'
      });
      return;
    }

    this.isGeneratingReport.set(true);

    this.invoiceService.generateReport(ReportType.Excel, dateFrom, dateTo).subscribe({
      next: (base64) => {
        this.downloadExcel(base64, 'reporte-detalleFacturas');
        this.isGeneratingReport.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: 'Reporte Excel generado correctamente'
        });
      },
      error: (error) => {
        console.error('Error generating Excel report:', error);
        this.isGeneratingReport.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al generar reporte Excel'
        });
      }
    });
  }

  /**
   * Descarga un archivo PDF desde base64
   */
  private downloadPDF(base64: string, filename: string): void {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  /**
   * Descarga un archivo Excel desde base64
   */
  private downloadExcel(base64: string, filename: string): void {
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      throw error;
    }
  }

  /**
   * Obtiene la bandera del país mediante lookup
   */
  getCountryFlag(countryId: number): string | null {
    return this.countries().find(c => c.countryId === countryId)?.countryUrlFlag || null;
  }

  /**
   * Formatea la fecha para mostrar en tabla
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Formatea el monto en Lempiras
   */
  formatCurrency(amount: number): string {
    return `L ${amount.toFixed(2)}`;
  }

  /**
   * Toggle para mostrar/ocultar gráficos
   */
  toggleCharts(): void {
    const currentValue = this.showCharts();
    this.showCharts.set(!currentValue);

    // El effect se encargará de cargar los datos automáticamente
  }

  /**
   * Carga los datos de ambos gráficos
   */
  loadChartData(): void {
    const filterId = this.selectedDateFilter();
    const dateFrom = this.invoiceService.dateFrom();
    const dateTo = this.invoiceService.dateTo();

    // Cargar ventas totales
    this.invoiceService.getInvoiceTotals(filterId, dateFrom, dateTo).subscribe({
      next: (data) => {
        // Determinar qué función de conversión usar según el filtro
        let chartData: ChartDataset;
        if (filterId === 1) {
          // Hora actual - formato minutos
          chartData = convertToChartDataMinutes(data, 'Ventas Totales', '#008717');
        } else if (filterId === 2) {
          // Últimas 24 hrs - formato horas
          chartData = convertToChartDataHours(data, 'Ventas Totales', '#008717');
        } else {
          // Semana/Mes/Personalizado - formato días
          chartData = convertToChartDataDays(data, 'Ventas Totales', '#008717');
        }
        this.chartTotalsData.set(chartData);
      },
      error: (error) => {
        console.error('Error loading chart totals:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar gráfico de ventas'
        });
      }
    });

    // Cargar cantidad de órdenes
    this.invoiceService.getQtyInvoices(filterId, dateFrom, dateTo).subscribe({
      next: (data) => {
        // Determinar qué función de conversión usar según el filtro
        let chartData: ChartDataset;
        if (filterId === 1) {
          // Hora actual - formato minutos
          chartData = convertToChartDataMinutesOrders(data, 'Órdenes Totales', '#F8D65D');
        } else if (filterId === 2) {
          // Últimas 24 hrs - formato horas
          chartData = convertToChartDataHoursOrders(data, 'Órdenes Totales', '#F8D65D');
        } else {
          // Semana/Mes/Personalizado - formato días
          chartData = convertToChartDataDaysOrders(data, 'Órdenes Totales', '#F8D65D');
        }
        this.chartOrdersData.set(chartData);
      },
      error: (error) => {
        console.error('Error loading chart orders:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar gráfico de órdenes'
        });
      }
    });
  }
}
