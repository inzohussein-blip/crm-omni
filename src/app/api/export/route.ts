/**
 * OMNI-CRM Export API
 * API endpoints for PDF and Excel export functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  exportService, 
  type ExportConfig, 
  type ExportFormat, 
  type ReportType 
} from '@/lib/export-service';

// ============================================
// TYPES
// ============================================

interface ExportRequest {
  action: 'export' | 'quick_export' | 'preview';
  reportType: ReportType;
  format: ExportFormat;
  title?: string;
  subtitle?: string;
  dateFrom?: string;
  dateTo?: string;
  includeSummary?: boolean;
  includeCharts?: boolean;
  includeDetails?: boolean;
  ibId?: string;
  filters?: Record<string, unknown>;
}

// ============================================
// GET ENDPOINTS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'types':
        return getReportTypes();
      
      case 'formats':
        return getExportFormats();
      
      case 'templates':
        return getReportTemplates();
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: types, formats, or templates',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Export API GET error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * Get available report types
 */
function getReportTypes() {
  const reportTypes: Array<{ type: ReportType; name: string; description: string }> = [
    {
      type: 'transactions',
      name: 'Transactions Report',
      description: 'Complete transaction history including deposits, withdrawals, and transfers',
    },
    {
      type: 'clients',
      name: 'Client Report',
      description: 'Client activity report with KYC status and account information',
    },
    {
      type: 'ib_commissions',
      name: 'IB Commission Report',
      description: 'Introducing Broker commission earnings and breakdown by level',
    },
    {
      type: 'trading_volume',
      name: 'Trading Volume Report',
      description: 'Trading volume analysis with A-Book/B-Book breakdown',
    },
    {
      type: 'book_analytics',
      name: 'Book Analytics Report',
      description: 'A-Book/B-Book analytics with profit and volume comparison',
    },
  ];

  return NextResponse.json({
    success: true,
    data: reportTypes,
  });
}

/**
 * Get available export formats
 */
function getExportFormats() {
  const formats: Array<{ format: ExportFormat; name: string; mimeType: string; extension: string }> = [
    {
      format: 'pdf',
      name: 'PDF Document',
      mimeType: 'application/pdf',
      extension: '.pdf',
    },
    {
      format: 'xlsx',
      name: 'Excel Spreadsheet',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: '.xlsx',
    },
    {
      format: 'csv',
      name: 'CSV File',
      mimeType: 'text/csv',
      extension: '.csv',
    },
  ];

  return NextResponse.json({
    success: true,
    data: formats,
  });
}

/**
 * Get report templates info
 */
function getReportTemplates() {
  const templates = [
    {
      name: 'Transaction Summary',
      reportType: 'transactions',
      description: 'Monthly transaction summary with volume breakdown',
      defaultDateRange: 'last_30_days',
      includesCharts: true,
    },
    {
      name: 'Client Activity',
      reportType: 'clients',
      description: 'Client registration and activity metrics',
      defaultDateRange: 'last_month',
      includesCharts: true,
    },
    {
      name: 'IB Performance',
      reportType: 'ib_commissions',
      description: 'IB performance and commission breakdown',
      defaultDateRange: 'last_month',
      includesCharts: true,
    },
    {
      name: 'Trading Overview',
      reportType: 'trading_volume',
      description: 'Trading volume and performance overview',
      defaultDateRange: 'last_30_days',
      includesCharts: true,
    },
    {
      name: 'A/B Book Analysis',
      reportType: 'book_analytics',
      description: 'A-Book vs B-Book performance analysis',
      defaultDateRange: 'last_month',
      includesCharts: true,
    },
  ];

  return NextResponse.json({
    success: true,
    data: templates,
  });
}

// ============================================
// POST ENDPOINTS
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { action } = body;

    switch (action) {
      case 'export':
        return handleExport(body);
      
      case 'quick_export':
        return handleQuickExport(body);
      
      case 'preview':
        return handlePreview(body);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: export, quick_export, or preview',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Export API POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

/**
 * Handle full export with all options
 */
async function handleExport(body: ExportRequest) {
  // Validate required fields
  if (!body.reportType) {
    return NextResponse.json({
      success: false,
      error: 'Report type is required',
    }, { status: 400 });
  }

  if (!body.format) {
    return NextResponse.json({
      success: false,
      error: 'Export format is required',
    }, { status: 400 });
  }

  // Parse dates
  const dateFrom = body.dateFrom ? new Date(body.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = body.dateTo ? new Date(body.dateTo) : new Date();

  // Validate date range
  if (dateFrom > dateTo) {
    return NextResponse.json({
      success: false,
      error: 'Start date must be before end date',
    }, { status: 400 });
  }

  // Build export config
  const config: ExportConfig = {
    title: body.title || `${body.reportType.replace('_', ' ')} Report`,
    subtitle: body.subtitle,
    format: body.format,
    reportType: body.reportType,
    dateFrom,
    dateTo,
    includeSummary: body.includeSummary ?? true,
    includeCharts: body.includeCharts ?? true,
    includeDetails: body.includeDetails ?? true,
    ibId: body.ibId,
    filters: body.filters,
  };

  // Execute export
  const result = await exportService.exportReport(config);

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: result.error,
    }, { status: 500 });
  }

  // Return file as download
  return new NextResponse(result.data, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.data?.length.toString() || '0',
    },
  });
}

/**
 * Handle quick export with default settings
 */
async function handleQuickExport(body: ExportRequest) {
  if (!body.reportType) {
    return NextResponse.json({
      success: false,
      error: 'Report type is required',
    }, { status: 400 });
  }

  const format = body.format || 'xlsx';
  
  // Parse optional date range
  const dateRange = body.dateFrom && body.dateTo ? {
    from: new Date(body.dateFrom),
    to: new Date(body.dateTo),
  } : undefined;

  // Execute quick export
  const result = await exportService.quickExport(
    body.reportType,
    format,
    dateRange
  );

  if (!result.success) {
    return NextResponse.json({
      success: false,
      error: result.error,
    }, { status: 500 });
  }

  // Return file as download
  return new NextResponse(result.data, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Content-Length': result.data?.length.toString() || '0',
    },
  });
}

/**
 * Handle preview - return data without file generation
 */
async function handlePreview(body: ExportRequest) {
  if (!body.reportType) {
    return NextResponse.json({
      success: false,
      error: 'Report type is required',
    }, { status: 400 });
  }

  // Parse dates
  const dateFrom = body.dateFrom ? new Date(body.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateTo = body.dateTo ? new Date(body.dateTo) : new Date();

  // Build config for preview (always use minimal data)
  const config: ExportConfig = {
    title: body.title || 'Preview',
    format: 'xlsx', // Format doesn't matter for preview
    reportType: body.reportType,
    dateFrom,
    dateTo,
    includeSummary: true,
    includeCharts: false, // No charts in preview
    includeDetails: true,
    ibId: body.ibId,
    filters: body.filters,
  };

  try {
    // Import report service directly for preview
    const { reportService } = await import('@/lib/export-service');
    
    // Generate report data
    let reportData;
    switch (body.reportType) {
      case 'transactions':
        reportData = await (await import('@/lib/reports')).reportService.generateTransactionReport(config);
        break;
      case 'clients':
        reportData = await (await import('@/lib/reports')).reportService.generateClientReport(config);
        break;
      case 'ib_commissions':
        reportData = await (await import('@/lib/reports')).reportService.generateIBCommissionReport({
          ...config,
          ibId: body.ibId,
        });
        break;
      case 'trading_volume':
        reportData = await exportService['generateTradingVolumeReport'](config);
        break;
      case 'book_analytics':
        reportData = await (await import('@/lib/reports')).reportService.generateBookAnalyticsReport(config);
        break;
      default:
        throw new Error(`Unknown report type: ${body.reportType}`);
    }

    // Return preview data
    return NextResponse.json({
      success: true,
      data: {
        metadata: reportData.metadata,
        summary: reportData.summary,
        rowCount: reportData.details.length,
        preview: reportData.details.slice(0, 10), // First 10 rows
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate preview',
    }, { status: 500 });
  }
}
