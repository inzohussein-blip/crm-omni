/**
 * OMNI-CRM Export Service
 * PDF and Excel export functionality for reports
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { db } from '@/lib/db';
import { reportService, type ReportData, type ReportConfig } from './reports';

// ============================================
// TYPES
// ============================================

export type ExportFormat = 'pdf' | 'xlsx' | 'csv';
export type ReportType = 'transactions' | 'clients' | 'ib_commissions' | 'trading_volume' | 'book_analytics';

export interface ExportConfig {
  title: string;
  subtitle?: string;
  format: ExportFormat;
  reportType: ReportType;
  dateFrom: Date;
  dateTo: Date;
  filters?: Record<string, unknown>;
  includeSummary?: boolean;
  includeCharts?: boolean;
  includeDetails?: boolean;
  ibId?: string;
  language?: string;
}

export interface ExportResult {
  success: boolean;
  data?: Buffer;
  filename: string;
  mimeType: string;
  error?: string;
}

interface ChartData {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: Array<{ name: string; value: number }>;
}

interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown) => string;
}

// ============================================
// PDF EXPORTER CLASS
// ============================================

export class PDFExporter {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageHeight: number;
  private pageWidth: number;
  private margin: number = 20;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
  }

  /**
   * Add header to PDF
   */
  addHeader(title: string, subtitle?: string): void {
    // Logo placeholder - would normally add actual logo
    this.doc.setFontSize(24);
    this.doc.setTextColor(59, 130, 246); // Blue
    this.doc.text('OMNI-CRM', this.margin, this.currentY);
    
    this.currentY += 10;
    
    // Title
    this.doc.setFontSize(18);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(title, this.margin, this.currentY);
    
    // Subtitle
    if (subtitle) {
      this.currentY += 7;
      this.doc.setFontSize(12);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(subtitle, this.margin, this.currentY);
    }
    
    // Generated timestamp
    this.currentY += 7;
    this.doc.setFontSize(10);
    this.doc.setTextColor(150, 150, 150);
    this.doc.text(`Generated: ${new Date().toLocaleString()}`, this.margin, this.currentY);
    
    // Line separator
    this.currentY += 5;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 10;
  }

  /**
   * Add date range section
   */
  addDateRange(from: Date, to: Date): void {
    this.doc.setFontSize(10);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text(
      `Period: ${from.toLocaleDateString()} - ${to.toLocaleDateString()}`,
      this.margin,
      this.currentY
    );
    this.currentY += 10;
  }

  /**
   * Add summary section
   */
  addSummary(summary: Record<string, unknown>, title: string = 'Summary'): void {
    this.checkPageBreak(40);
    
    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;

    const summaryData: Array<[string, string]> = [];
    
    for (const [key, value] of Object.entries(summary)) {
      const formattedKey = this.formatLabel(key);
      let formattedValue: string;
      
      if (typeof value === 'number') {
        formattedValue = value.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
      } else if (value instanceof Date) {
        formattedValue = value.toLocaleDateString();
      } else if (typeof value === 'object') {
        formattedValue = JSON.stringify(value);
      } else {
        formattedValue = String(value);
      }
      
      summaryData.push([formattedKey, formattedValue]);
    }

    autoTable(this.doc, {
      startY: this.currentY,
      head: [],
      body: summaryData,
      theme: 'grid',
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
      },
    });

    this.currentY = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  /**
   * Add table section
   */
  addTable(
    title: string,
    data: Array<Record<string, unknown>>,
    columns: TableColumn[]
  ): void {
    this.checkPageBreak(60);

    this.doc.setFontSize(14);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;

    const headers = columns.map(col => col.header);
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key];
        if (col.format) {
          return col.format(value);
        }
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') {
          return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
        }
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value);
      })
    );

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: rows,
      theme: 'striped',
      margin: { left: this.margin, right: this.margin },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    this.currentY = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  /**
   * Add chart visualization (simple representation)
   */
  addChart(chart: ChartData): void {
    this.checkPageBreak(80);

    this.doc.setFontSize(12);
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(chart.title, this.margin, this.currentY);
    this.currentY += 8;

    const chartWidth = this.pageWidth - 2 * this.margin;
    const chartHeight = 50;
    const startX = this.margin;
    const startY = this.currentY;

    // Draw chart border
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setFillColor(250, 250, 250);
    this.doc.rect(startX, startY, chartWidth, chartHeight, 'FD');

    if (chart.type === 'bar') {
      this.drawBarChart(chart.data, startX, startY, chartWidth, chartHeight);
    } else if (chart.type === 'pie') {
      this.drawPieChart(chart.data, startX + chartWidth + 30, startY + chartHeight / 2);
      // Draw legend next to pie
      this.drawLegend(chart.data, startX, startY, chartHeight);
    } else if (chart.type === 'line') {
      this.drawLineChart(chart.data, startX, startY, chartWidth, chartHeight);
    }

    this.currentY = startY + chartHeight + 15;
  }

  /**
   * Draw bar chart
   */
  private drawBarChart(
    data: Array<{ name: string; value: number }>,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (data.length === 0) return;

    const maxValue = Math.max(...data.map(d => d.value));
    const barWidth = Math.min(30, (width - 20) / data.length - 5);
    const padding = 10;
    const chartAreaHeight = height - 20;

    data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartAreaHeight;
      const barX = x + padding + index * (barWidth + 5);
      const barY = y + height - 10 - barHeight;

      // Draw bar
      const colors = [
        [59, 130, 246],   // Blue
        [16, 185, 129],   // Green
        [245, 158, 11],   // Amber
        [239, 68, 68],    // Red
        [139, 92, 246],   // Purple
      ];
      const color = colors[index % colors.length];
      this.doc.setFillColor(color[0], color[1], color[2]);
      this.doc.rect(barX, barY, barWidth, barHeight, 'F');

      // Draw value on top
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);
      const valueText = item.value.toLocaleString();
      const textWidth = this.doc.getTextWidth(valueText);
      this.doc.text(valueText, barX + (barWidth - textWidth) / 2, barY - 2);

      // Draw label below
      const label = item.name.length > 8 ? item.name.substring(0, 8) + '..' : item.name;
      const labelWidth = this.doc.getTextWidth(label);
      this.doc.text(label, barX + (barWidth - labelWidth) / 2, y + height - 3);
    });
  }

  /**
   * Draw pie chart (simplified)
   */
  private drawPieChart(
    data: Array<{ name: string; value: number }>,
    centerX: number,
    centerY: number
  ): void {
    // Simplified pie representation - actual pie charts are complex in jsPDF
    // This is a visual placeholder
    const radius = 25;
    
    this.doc.setDrawColor(200, 200, 200);
    this.doc.setFillColor(240, 240, 240);
    this.doc.circle(centerX, centerY, radius, 'FD');
    
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Pie Chart', centerX - 12, centerY);
  }

  /**
   * Draw line chart
   */
  private drawLineChart(
    data: Array<{ name: string; value: number }>,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    if (data.length === 0) return;

    const maxValue = Math.max(...data.map(d => d.value));
    const padding = 10;
    const chartAreaWidth = width - 2 * padding;
    const chartAreaHeight = height - 20;
    const stepX = chartAreaWidth / (data.length - 1 || 1);

    // Draw line
    this.doc.setDrawColor(59, 130, 246);
    this.doc.setLineWidth(1);

    data.forEach((item, index) => {
      const pointX = x + padding + index * stepX;
      const pointY = y + height - 10 - (item.value / maxValue) * chartAreaHeight;

      if (index === 0) {
        this.doc.moveTo(pointX, pointY);
      } else {
        this.doc.lineTo(pointX, pointY);
      }

      // Draw point
      this.doc.setFillColor(59, 130, 246);
      this.doc.circle(pointX, pointY, 2, 'F');
    });

    this.doc.stroke();
  }

  /**
   * Draw legend
   */
  private drawLegend(
    data: Array<{ name: string; value: number }>,
    x: number,
    y: number,
    height: number
  ): void {
    const colors = [
      [59, 130, 246],   // Blue
      [16, 185, 129],   // Green
      [245, 158, 11],   // Amber
      [239, 68, 68],    // Red
      [139, 92, 246],   // Purple
    ];

    const itemHeight = Math.min(10, height / data.length);
    let currentY = y + 5;

    data.forEach((item, index) => {
      const color = colors[index % colors.length];
      
      // Color box
      this.doc.setFillColor(color[0], color[1], color[2]);
      this.doc.rect(x + 5, currentY, 6, 6, 'F');
      
      // Label
      this.doc.setFontSize(8);
      this.doc.setTextColor(80, 80, 80);
      const label = `${item.name}: ${item.value.toLocaleString()}`;
      this.doc.text(label, x + 15, currentY + 5);
      
      currentY += itemHeight;
    });
  }

  /**
   * Add footer to all pages
   */
  addFooter(): void {
    const pageCount = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Page number
      this.doc.setFontSize(9);
      this.doc.setTextColor(150, 150, 150);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      
      // Confidential notice
      this.doc.text(
        'Confidential - OMNI-CRM Report',
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  /**
   * Check if page break is needed
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 20) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  /**
   * Format label from camelCase
   */
  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get PDF buffer
   */
  getBuffer(): Buffer {
    return Buffer.from(this.doc.output('arraybuffer'));
  }

  /**
   * Get PDF as base64
   */
  getBase64(): string {
    return this.doc.output('datauristring');
  }

  /**
   * Save PDF
   */
  save(filename: string): void {
    this.doc.save(filename);
  }
}

// ============================================
// EXCEL EXPORTER CLASS
// ============================================

export class ExcelExporter {
  private workbook: XLSX.WorkBook;

  constructor() {
    this.workbook = XLSX.utils.book_new();
  }

  /**
   * Add summary sheet
   */
  addSummarySheet(summary: Record<string, unknown>, title: string = 'Summary'): void {
    const data: Array<{ Field: string; Value: string }> = [];
    
    for (const [key, value] of Object.entries(summary)) {
      const formattedKey = this.formatLabel(key);
      let formattedValue: string;
      
      if (typeof value === 'number') {
        formattedValue = value.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        });
      } else if (value instanceof Date) {
        formattedValue = value.toLocaleDateString();
      } else if (typeof value === 'object' && value !== null) {
        formattedValue = JSON.stringify(value);
      } else {
        formattedValue = String(value ?? '');
      }
      
      data.push({ Field: formattedKey, Value: formattedValue });
    }

    // Add metadata
    data.unshift(
      { Field: 'Report Generated', Value: new Date().toLocaleString() },
      { Field: 'System', Value: 'OMNI-CRM' },
      { Field: '', Value: '' }
    );

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 30 },
      { wch: 50 },
    ];

    XLSX.utils.book_append_sheet(this.workbook, worksheet, title.substring(0, 31));
  }

  /**
   * Add data sheet
   */
  addDataSheet<T extends Record<string, unknown>>(
    title: string,
    data: T[],
    columns?: { key: keyof T; header: string; width?: number }[]
  ): void {
    if (data.length === 0) {
      // Add empty sheet with headers
      const emptyWorksheet = XLSX.utils.aoa_to_sheet([['No data available']]);
      XLSX.utils.book_append_sheet(this.workbook, emptyWorksheet, title.substring(0, 31));
      return;
    }

    let worksheet: XLSX.WorkSheet;

    if (columns && columns.length > 0) {
      // Use specified columns
      const headers = columns.map(col => col.header);
      const rows = data.map(row =>
        columns.map(col => {
          const value = row[col.key];
          return this.formatCellValue(value);
        })
      );

      worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Set column widths
      worksheet['!cols'] = columns.map(col => ({
        wch: col.width || 15,
      }));
    } else {
      // Auto-detect columns from data
      worksheet = XLSX.utils.json_to_sheet(data.map(row => {
        const formatted: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          formatted[this.formatLabel(key)] = this.formatCellValue(value);
        }
        return formatted;
      }));

      // Auto-width columns
      const colWidths = this.calculateColumnWidths(data);
      worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
    }

    XLSX.utils.book_append_sheet(this.workbook, worksheet, title.substring(0, 31));
  }

  /**
   * Add chart data sheet
   */
  addChartDataSheet(charts: ChartData[]): void {
    const chartData: Array<{ 'Chart Title': string; 'Category': string; 'Value': number }> = [];

    charts.forEach(chart => {
      chart.data.forEach(item => {
        chartData.push({
          'Chart Title': chart.title,
          'Category': item.name,
          'Value': item.value,
        });
      });
    });

    if (chartData.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(chartData);
      worksheet['!cols'] = [
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(this.workbook, worksheet, 'Charts Data');
    }
  }

  /**
   * Add pivot-style summary
   */
  addPivotSheet(
    title: string,
    data: Array<Record<string, unknown>>,
    groupBy: string,
    sumField: string
  ): void {
    const pivotMap = new Map<string, number>();

    data.forEach(row => {
      const key = String(row[groupBy] || 'Unknown');
      const value = Number(row[sumField]) || 0;
      pivotMap.set(key, (pivotMap.get(key) || 0) + value);
    });

    const pivotData = Array.from(pivotMap.entries()).map(([key, value]) => ({
      [this.formatLabel(groupBy)]: key,
      [this.formatLabel(sumField)]: value,
    }));

    const worksheet = XLSX.utils.json_to_sheet(pivotData);
    XLSX.utils.book_append_sheet(this.workbook, worksheet, title.substring(0, 31));
  }

  /**
   * Format cell value
   */
  private formatCellValue(value: unknown): string | number | Date {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Calculate column widths
   */
  private calculateColumnWidths(data: Array<Record<string, unknown>>): number[] {
    if (data.length === 0) return [];

    const keys = Object.keys(data[0]);
    return keys.map(key => {
      const maxDataWidth = Math.max(
        key.length,
        ...data.slice(0, 100).map(row => {
          const value = row[key];
          return value ? String(value).length : 0;
        })
      );
      return Math.min(50, Math.max(10, maxDataWidth + 2));
    });
  }

  /**
   * Format label from camelCase
   */
  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get workbook buffer
   */
  getBuffer(): Buffer {
    return Buffer.from(XLSX.write(this.workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * Get as base64
   */
  getBase64(): string {
    const buffer = this.getBuffer();
    return buffer.toString('base64');
  }

  /**
   * Save workbook
   */
  save(filename: string): void {
    XLSX.writeFile(this.workbook, filename);
  }
}

// ============================================
// REPORT TEMPLATES
// ============================================

export class ReportTemplates {
  /**
   * Transaction report columns
   */
  static transactionColumns(): TableColumn[] {
    return [
      { header: 'ID', key: 'id', width: 25, format: (v) => String(v).substring(0, 8) },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Amount', key: 'amount', width: 15, align: 'right', format: (v) => `$${Number(v).toLocaleString()}` },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date', key: 'createdAt', width: 20, format: (v) => new Date(v as string).toLocaleDateString() },
    ];
  }

  /**
   * Client report columns
   */
  static clientColumns(): TableColumn[] {
    return [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'KYC Status', key: 'kycStatus', width: 12 },
      { header: 'Risk Level', key: 'riskLevel', width: 12 },
      { header: 'Country', key: 'country', width: 15 },
      { header: 'Created', key: 'createdAt', width: 15, format: (v) => new Date(v as string).toLocaleDateString() },
    ];
  }

  /**
   * IB Commission report columns
   */
  static ibCommissionColumns(): TableColumn[] {
    return [
      { header: 'ID', key: 'id', width: 25, format: (v) => String(v).substring(0, 8) },
      { header: 'IB User', key: 'userName', width: 20 },
      { header: 'Volume (Lots)', key: 'volume', width: 15, align: 'right' },
      { header: 'Amount', key: 'amount', width: 15, align: 'right', format: (v) => `$${Number(v).toLocaleString()}` },
      { header: 'Level', key: 'level', width: 10 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Date', key: 'createdAt', width: 15, format: (v) => new Date(v as string).toLocaleDateString() },
    ];
  }

  /**
   * Trading volume report columns
   */
  static tradingVolumeColumns(): TableColumn[] {
    return [
      { header: 'Account ID', key: 'mtAccountId', width: 15 },
      { header: 'Account Type', key: 'accountType', width: 15 },
      { header: 'Booking Type', key: 'bookingType', width: 12 },
      { header: 'Total Volume', key: 'totalVolume', width: 15, align: 'right' },
      { header: 'Total Trades', key: 'totalTrades', width: 12, align: 'right' },
      { header: 'Total Profit', key: 'totalProfit', width: 15, align: 'right', format: (v) => `$${Number(v).toLocaleString()}` },
      { header: 'Status', key: 'status', width: 10 },
    ];
  }

  /**
   * Book analytics columns
   */
  static bookAnalyticsColumns(): TableColumn[] {
    return [
      { header: 'Account ID', key: 'mtAccountId', width: 15 },
      { header: 'Booking Type', key: 'bookingType', width: 12 },
      { header: 'Balance', key: 'balance', width: 15, align: 'right', format: (v) => `$${Number(v).toLocaleString()}` },
      { header: 'Equity', key: 'equity', width: 15, align: 'right', format: (v) => `$${Number(v).toLocaleString()}` },
      { header: 'Volume', key: 'totalVolume', width: 15, align: 'right' },
      { header: 'Profit', key: 'totalProfit', width: 15, align: 'right', format: (v) => `$${Number(v).toLocaleString()}` },
    ];
  }
}

// ============================================
// EXPORT SERVICE CLASS
// ============================================

export class ExportService {
  /**
   * Generate and export report
   */
  async exportReport(config: ExportConfig): Promise<ExportResult> {
    try {
      // Generate report data
      let reportData: ReportData;

      switch (config.reportType) {
        case 'transactions':
          reportData = await reportService.generateTransactionReport(config);
          break;
        case 'clients':
          reportData = await reportService.generateClientReport(config);
          break;
        case 'ib_commissions':
          reportData = await reportService.generateIBCommissionReport({
            ...config,
            ibId: config.ibId,
          });
          break;
        case 'trading_volume':
          reportData = await this.generateTradingVolumeReport(config);
          break;
        case 'book_analytics':
          reportData = await reportService.generateBookAnalyticsReport(config);
          break;
        default:
          throw new Error(`Unknown report type: ${config.reportType}`);
      }

      // Export based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `${config.reportType}_report_${timestamp}`;

      switch (config.format) {
        case 'pdf':
          return this.exportToPDF(reportData, config, baseFilename);
        case 'xlsx':
          return this.exportToExcel(reportData, config, baseFilename);
        case 'csv':
          return this.exportToCSV(reportData, baseFilename);
        default:
          throw new Error(`Unknown format: ${config.format}`);
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        mimeType: '',
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export to PDF
   */
  private exportToPDF(
    data: ReportData,
    config: ExportConfig,
    baseFilename: string
  ): ExportResult {
    const exporter = new PDFExporter();

    // Add header
    exporter.addHeader(data.metadata.title, config.subtitle);

    // Add date range
    exporter.addDateRange(data.metadata.period.from, data.metadata.period.to);

    // Add summary
    if (config.includeSummary !== false) {
      exporter.addSummary(data.summary);
    }

    // Add charts
    if (config.includeCharts && data.charts && data.charts.length > 0) {
      data.charts.forEach(chart => {
        exporter.addChart(chart);
      });
    }

    // Add details table
    if (config.includeDetails !== false && data.details.length > 0) {
      const columns = this.getColumnsForReportType(config.reportType);
      exporter.addTable('Details', data.details as Array<Record<string, unknown>>, columns);
    }

    // Add footer
    exporter.addFooter();

    return {
      success: true,
      data: exporter.getBuffer(),
      filename: `${baseFilename}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  /**
   * Export to Excel
   */
  private exportToExcel(
    data: ReportData,
    config: ExportConfig,
    baseFilename: string
  ): ExportResult {
    const exporter = new ExcelExporter();

    // Add summary sheet
    if (config.includeSummary !== false) {
      exporter.addSummarySheet(data.summary);
    }

    // Add chart data sheet
    if (config.includeCharts && data.charts && data.charts.length > 0) {
      exporter.addChartDataSheet(data.charts);
    }

    // Add details sheet
    if (config.includeDetails !== false && data.details.length > 0) {
      const columns = this.getExcelColumnsForReportType(config.reportType);
      exporter.addDataSheet('Details', data.details as Array<Record<string, unknown>>, columns);
    }

    return {
      success: true,
      data: exporter.getBuffer(),
      filename: `${baseFilename}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  /**
   * Export to CSV
   */
  private exportToCSV(data: ReportData, baseFilename: string): ExportResult {
    const csvContent = reportService.exportToCSV(data);
    
    return {
      success: true,
      data: Buffer.from(csvContent),
      filename: `${baseFilename}.csv`,
      mimeType: 'text/csv',
    };
  }

  /**
   * Get columns for report type
   */
  private getColumnsForReportType(reportType: ReportType): TableColumn[] {
    switch (reportType) {
      case 'transactions':
        return ReportTemplates.transactionColumns();
      case 'clients':
        return ReportTemplates.clientColumns();
      case 'ib_commissions':
        return ReportTemplates.ibCommissionColumns();
      case 'trading_volume':
        return ReportTemplates.tradingVolumeColumns();
      case 'book_analytics':
        return ReportTemplates.bookAnalyticsColumns();
      default:
        return [];
    }
  }

  /**
   * Get Excel columns for report type
   */
  private getExcelColumnsForReportType(reportType: ReportType): Array<{ key: string; header: string; width?: number }> {
    const columns = this.getColumnsForReportType(reportType);
    return columns.map(col => ({
      key: col.key,
      header: col.header,
      width: col.width,
    }));
  }

  /**
   * Generate trading volume report
   */
  private async generateTradingVolumeReport(config: ReportConfig): Promise<ReportData> {
    const { dateFrom, dateTo } = config;

    const accounts = await db.tradingAccount.findMany({
      where: {
        createdAt: { lte: dateTo },
        lastSyncAt: { gte: dateFrom },
      },
      orderBy: { totalVolume: 'desc' },
    });

    const summary = {
      totalAccounts: accounts.length,
      totalVolume: accounts.reduce((sum, a) => sum + a.totalVolume, 0),
      totalTrades: accounts.reduce((sum, a) => sum + a.totalTrades, 0),
      totalProfit: accounts.reduce((sum, a) => sum + a.totalProfit, 0),
      averageVolume: accounts.reduce((sum, a) => sum + a.totalVolume, 0) / accounts.length || 0,
      aBookVolume: accounts.filter(a => a.bookingType === 'A_BOOK').reduce((sum, a) => sum + a.totalVolume, 0),
      bBookVolume: accounts.filter(a => a.bookingType === 'B_BOOK').reduce((sum, a) => sum + a.totalVolume, 0),
    };

    const charts = config.includeCharts ? [
      {
        type: 'bar' as const,
        title: 'Volume by Booking Type',
        data: [
          { name: 'A-Book', value: summary.aBookVolume },
          { name: 'B-Book', value: summary.bBookVolume },
        ],
      },
      {
        type: 'pie' as const,
        title: 'Account Distribution',
        data: [
          { name: 'A-Book', value: accounts.filter(a => a.bookingType === 'A_BOOK').length },
          { name: 'B-Book', value: accounts.filter(a => a.bookingType === 'B_BOOK').length },
        ],
      },
    ] : undefined;

    return {
      metadata: {
        title: config.title || 'Trading Volume Report',
        generatedAt: new Date(),
        period: { from: dateFrom, to: dateTo },
      },
      summary,
      details: accounts,
      charts,
    };
  }

  /**
   * Export chart as image
   */
  async exportChartImage(
    chartData: ChartData,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<ExportResult> {
    // Note: For chart image export, you would typically use a library like
    // chart.js with node-canvas or a headless browser
    // This is a placeholder implementation
    
    return {
      success: false,
      filename: '',
      mimeType: '',
      error: 'Chart image export requires additional setup with chart.js and canvas',
    };
  }

  /**
   * Quick export - export without customization
   */
  async quickExport(
    reportType: ReportType,
    format: ExportFormat = 'xlsx',
    dateRange?: { from: Date; to: Date }
  ): Promise<ExportResult> {
    const config: ExportConfig = {
      title: `${reportType.replace('_', ' ').toUpperCase()} Report`,
      format,
      reportType,
      dateFrom: dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: dateRange?.to || new Date(),
      includeSummary: true,
      includeCharts: true,
      includeDetails: true,
    };

    return this.exportReport(config);
  }
}

// ============================================
// EXPORT INSTANCES
// ============================================

export const exportService = new ExportService();
