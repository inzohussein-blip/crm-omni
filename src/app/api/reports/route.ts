/**
 * Reports API Routes
 * Handles PDF and Excel report generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { pdfReportGenerator, excelReportGenerator, ReportGenerator } from '@/lib/report-export';

// GET - Get report data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'dashboard';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const period = {
      from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: to ? new Date(to) : new Date(),
    };

    const reportGenerator = new ReportGenerator();
    let data: unknown;

    switch (type) {
      case 'transaction':
        data = await reportGenerator.generateTransactionReport({
          type: 'transaction',
          title: 'Transaction Report',
          period,
        });
        break;

      case 'client':
        data = await reportGenerator.generateClientReport({
          type: 'client',
          title: 'Client Report',
          period,
          includeKYC: true,
          includeTrading: true,
        });
        break;

      case 'ib':
        data = await reportGenerator.generateIBReport({
          type: 'ib',
          title: 'IB Performance Report',
          period,
          includeCommissions: true,
        });
        break;

      case 'abbook':
        data = await reportGenerator.generateABBookReport({
          type: 'abbook',
          title: 'A/B Book Analytics',
          period,
        });
        break;

      default:
        data = await reportGenerator.generateDashboardReport({
          title: 'Dashboard Report',
          period,
        });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// POST - Generate and download report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, type, period, options } = body;

    const reportPeriod = {
      from: period?.from ? new Date(period.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: period?.to ? new Date(period.to) : new Date(),
    };

    let reportConfig: Record<string, unknown> = {
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
      period: reportPeriod,
    };

    // Add type-specific options
    if (options) {
      reportConfig = { ...reportConfig, ...options };
    }

    let content: string;
    let filename: string;
    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'pdf') {
      content = await pdfReportGenerator.generatePDF(reportConfig as Parameters<typeof pdfReportGenerator.generatePDF>[0]);
      filename = `${type}_report_${timestamp}`;
    } else {
      content = await excelReportGenerator.generateExcel(reportConfig as Parameters<typeof excelReportGenerator.generateExcel>[0]);
      filename = `${type}_report_${timestamp}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        content,
        filename,
        format,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
