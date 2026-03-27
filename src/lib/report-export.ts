/**
 * Report Export Service
 * Generates PDF and Excel reports for OMNI-CRM
 */

import { db } from './db';

// ============================================
// Types
// ============================================

export interface ReportConfig {
  title: string;
  subtitle?: string;
  period: {
    from: Date;
    to: Date;
  };
  currency?: string;
  language?: 'en' | 'ar';
}

export interface TransactionReport extends ReportConfig {
  type: 'transaction';
  userId?: string;
  transactionTypes?: string[];
}

export interface ClientReport extends ReportConfig {
  type: 'client';
  includeKYC?: boolean;
  includeTrading?: boolean;
}

export interface IBReport extends ReportConfig {
  type: 'ib';
  includeCommissions?: boolean;
  includeReferrals?: boolean;
}

export interface ABBookReport extends ReportConfig {
  type: 'abbook';
  bookingType?: 'A_BOOK' | 'B_BOOK' | 'ALL';
}

export type ReportType = TransactionReport | ClientReport | IBReport | ABBookReport;

// ============================================
// Report Data Generators
// ============================================

export class ReportGenerator {
  async generateTransactionReport(config: TransactionReport) {
    const { period, userId, transactionTypes } = config;

    const where: Record<string, unknown> = {
      createdAt: {
        gte: period.from,
        lte: period.to,
      },
    };

    if (userId) where.userId = userId;
    if (transactionTypes && transactionTypes.length > 0) {
      where.type = { in: transactionTypes };
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        fromWallet: { include: { user: { select: { name: true, email: true } } } },
        toWallet: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summaries
    const summary = {
      totalDeposits: transactions
        .filter(t => t.type === 'DEPOSIT' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      totalWithdrawals: transactions
        .filter(t => t.type === 'WITHDRAWAL' && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amount, 0),
      totalFees: transactions.reduce((sum, t) => sum + t.fee, 0),
      pendingCount: transactions.filter(t => t.status === 'PENDING').length,
      completedCount: transactions.filter(t => t.status === 'COMPLETED').length,
      totalCount: transactions.length,
    };

    return {
      config,
      transactions,
      summary,
      generatedAt: new Date(),
    };
  }

  async generateClientReport(config: ClientReport) {
    const { period, includeKYC, includeTrading } = config;

    const where: Record<string, unknown> = {
      createdAt: {
        gte: period.from,
        lte: period.to,
      },
    };

    const clients = await db.user.findMany({
      where: { ...where, userType: 'CLIENT' },
      include: {
        clientProfile: true,
        wallets: true,
        ...(includeTrading && { tradingAccounts: true }),
        ...(includeKYC && { documents: true }),
      },
    });

    // Calculate summaries
    const summary = {
      totalClients: clients.length,
      activeClients: clients.filter(c => c.status === 'ACTIVE').length,
      kycApproved: clients.filter(c => c.clientProfile?.kycStatus === 'APPROVED').length,
      kycPending: clients.filter(c => c.clientProfile?.kycStatus === 'PENDING').length,
      totalBalance: clients.reduce((sum, c) => 
        sum + c.wallets.reduce((ws, w) => ws + w.balance, 0), 0
      ),
    };

    return {
      config,
      clients,
      summary,
      generatedAt: new Date(),
    };
  }

  async generateIBReport(config: IBReport) {
    const { period, includeCommissions, includeReferrals } = config;

    const ibProfiles = await db.iBProfile.findMany({
      where: { createdAt: { gte: period.from, lte: period.to } },
      include: {
        user: { select: { name: true, email: true } },
        ...(includeCommissions && { _count: { select: { commissions: true } } }),
      },
    });

    // Get commissions
    const commissions = includeCommissions 
      ? await db.commission.findMany({
          where: { createdAt: { gte: period.from, lte: period.to } },
        })
      : [];

    // Calculate summaries
    const summary = {
      totalIBs: ibProfiles.length,
      activeIBs: ibProfiles.filter(ib => ib.status === 'ACTIVE').length,
      totalClients: ibProfiles.reduce((sum, ib) => sum + ib.totalClients, 0),
      totalVolume: ibProfiles.reduce((sum, ib) => sum + ib.totalVolume, 0),
      totalCommissions: commissions.reduce((sum, c) => sum + c.amount, 0),
      pendingCommissions: commissions.filter(c => c.status === 'PENDING').length,
    };

    return {
      config,
      ibProfiles,
      commissions,
      summary,
      generatedAt: new Date(),
    };
  }

  async generateABBookReport(config: ABBookReport) {
    const { period, bookingType } = config;

    const where: Record<string, unknown> = {
      createdAt: {
        gte: period.from,
        lte: period.to,
      },
    };

    if (bookingType && bookingType !== 'ALL') {
      where.bookingType = bookingType;
    }

    const tradingAccounts = await db.tradingAccount.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Group by booking type
    const aBookAccounts = tradingAccounts.filter(a => a.bookingType === 'A_BOOK');
    const bBookAccounts = tradingAccounts.filter(a => a.bookingType === 'B_BOOK');

    // Calculate summaries
    const summary = {
      aBook: {
        accounts: aBookAccounts.length,
        totalVolume: aBookAccounts.reduce((sum, a) => sum + a.totalVolume, 0),
        totalProfit: aBookAccounts.reduce((sum, a) => sum + a.totalProfit, 0),
        totalTrades: aBookAccounts.reduce((sum, a) => sum + a.totalTrades, 0),
      },
      bBook: {
        accounts: bBookAccounts.length,
        totalVolume: bBookAccounts.reduce((sum, a) => sum + a.totalVolume, 0),
        totalProfit: bBookAccounts.reduce((sum, a) => sum + a.totalProfit, 0),
        totalTrades: bBookAccounts.reduce((sum, a) => sum + a.totalTrades, 0),
      },
      totalVolume: tradingAccounts.reduce((sum, a) => sum + a.totalVolume, 0),
      totalProfit: tradingAccounts.reduce((sum, a) => sum + a.totalProfit, 0),
    };

    return {
      config,
      tradingAccounts,
      summary,
      generatedAt: new Date(),
    };
  }

  async generateDashboardReport(config: ReportConfig) {
    const { period } = config;

    // Get daily stats
    const dailyStats = await db.dailyStat.findMany({
      where: {
        date: {
          gte: period.from,
          lte: period.to,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get task stats
    const tasks = await db.task.findMany({
      where: {
        createdAt: {
          gte: period.from,
          lte: period.to,
        },
      },
    });

    const summary = {
      totalUsers: dailyStats.reduce((sum, d) => sum + d.newUsers, 0),
      activeUsers: dailyStats.reduce((sum, d) => sum + d.activeUsers, 0),
      totalVolume: dailyStats.reduce((sum, d) => sum + d.totalVolume, 0),
      totalTrades: dailyStats.reduce((sum, d) => sum + d.totalTrades, 0),
      totalDeposits: dailyStats.reduce((sum, d) => sum + d.totalDeposits, 0),
      totalWithdrawals: dailyStats.reduce((sum, d) => sum + d.totalWithdrawals, 0),
      grossRevenue: dailyStats.reduce((sum, d) => sum + d.grossRevenue, 0),
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      slaBreached: tasks.filter(t => t.slaBreached).length,
    };

    return {
      config,
      dailyStats,
      taskStats: {
        total: tasks.length,
        byStatus: this.groupBy(tasks, 'status'),
        byPriority: this.groupBy(tasks, 'priority'),
      },
      summary,
      generatedAt: new Date(),
    };
  }

  private groupBy(array: Record<string, unknown>[], key: string): Record<string, number> {
    return array.reduce((result, item) => {
      const value = String(item[key] || 'unknown');
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {} as Record<string, number>);
  }
}

// ============================================
// PDF Report Generator
// ============================================

export class PDFReportGenerator {
  private reportGenerator: ReportGenerator;

  constructor() {
    this.reportGenerator = new ReportGenerator();
  }

  async generatePDF(reportConfig: ReportType): Promise<string> {
    // In production, use a proper PDF library like PDFKit or react-pdf
    // This is a simplified mock that returns a data URL

    let reportData: unknown;

    switch (reportConfig.type) {
      case 'transaction':
        reportData = await this.reportGenerator.generateTransactionReport(reportConfig);
        break;
      case 'client':
        reportData = await this.reportGenerator.generateClientReport(reportConfig);
        break;
      case 'ib':
        reportData = await this.reportGenerator.generateIBReport(reportConfig);
        break;
      case 'abbook':
        reportData = await this.reportGenerator.generateABBookReport(reportConfig);
        break;
      default:
        reportData = await this.reportGenerator.generateDashboardReport(reportConfig);
    }

    // Generate PDF content (mock - in production use real PDF library)
    const pdfContent = this.buildPDFContent(reportConfig, reportData);
    
    // Return as base64 data URL
    return `data:application/pdf;base64,${Buffer.from(pdfContent).toString('base64')}`;
  }

  private buildPDFContent(config: ReportType, data: unknown): string {
    // Mock PDF content generation
    // In production, use PDFKit, jsPDF, or similar
    return `
      %PDF-1.4
      1 0 obj
      << /Type /Catalog /Pages 2 0 R >>
      endobj
      2 0 obj
      << /Type /Pages /Kids [3 0 R] /Count 1 >>
      endobj
      3 0 obj
      << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
      endobj
      4 0 obj
      << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
      endobj
      5 0 obj
      << /Length 44 >>
      stream
      BT
      /F1 12 Tf
      100 700 Td
      (${config.title}) Tj
      ET
      endstream
      endobj
      xref
      0 6
      0000000000 65535 f 
      0000000009 00000 n 
      0000000058 00000 n 
      0000000115 00000 n 
      0000000266 00000 n 
      0000000333 00000 n 
      trailer
      << /Size 6 /Root 1 0 R >>
      startxref
      425
      %%EOF
    `;
  }

  async downloadPDF(filename: string, content: string): Promise<void> {
    // In browser environment, trigger download
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = content;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// ============================================
// Excel Report Generator
// ============================================

export class ExcelReportGenerator {
  private reportGenerator: ReportGenerator;

  constructor() {
    this.reportGenerator = new ReportGenerator();
  }

  async generateExcel(reportConfig: ReportType): Promise<string> {
    let reportData: unknown;

    switch (reportConfig.type) {
      case 'transaction':
        reportData = await this.reportGenerator.generateTransactionReport(reportConfig);
        break;
      case 'client':
        reportData = await this.reportGenerator.generateClientReport(reportConfig);
        break;
      case 'ib':
        reportData = await this.reportGenerator.generateIBReport(reportConfig);
        break;
      case 'abbook':
        reportData = await this.reportGenerator.generateABBookReport(reportConfig);
        break;
      default:
        reportData = await this.reportGenerator.generateDashboardReport(reportConfig);
    }

    // Generate CSV content (simplified Excel format)
    const csvContent = this.buildCSVContent(reportConfig, reportData);
    
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
  }

  private buildCSVContent(config: ReportType, data: unknown): string {
    const headers: string[] = [];
    const rows: string[][] = [];

    // Add title
    headers.push(`Report: ${config.title}`);
    headers.push(`Period: ${config.period.from.toISOString()} - ${config.period.to.toISOString()}`);
    headers.push('');

    // Add data based on report type
    if (config.type === 'transaction') {
      const txData = data as { transactions: Record<string, unknown>[]; summary: Record<string, unknown> };
      
      headers.push('ID', 'Type', 'Amount', 'Currency', 'Status', 'Payment Method', 'Created At');
      
      txData.transactions.forEach((tx) => {
        rows.push([
          String(tx.id),
          String(tx.type),
          String(tx.amount),
          String(tx.currency),
          String(tx.status),
          String(tx.paymentMethod || ''),
          String(tx.createdAt),
        ]);
      });

      headers.push('');
      headers.push('Summary');
      headers.push(`Total Deposits,${txData.summary.totalDeposits}`);
      headers.push(`Total Withdrawals,${txData.summary.totalWithdrawals}`);
      headers.push(`Total Fees,${txData.summary.totalFees}`);
      headers.push(`Pending,${txData.summary.pendingCount}`);
      headers.push(`Completed,${txData.summary.completedCount}`);
    }

    // Convert to CSV string
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  async downloadExcel(filename: string, content: string): Promise<void> {
    // In browser environment, trigger download
    if (typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = content;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// Export singleton instances
export const pdfReportGenerator = new PDFReportGenerator();
export const excelReportGenerator = new ExcelReportGenerator();
