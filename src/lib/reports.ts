/**
 * OMNI-CRM Report Generation Service
 * PDF, Excel, CSV report generation
 */

import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';

export interface ReportConfig {
  title: string;
  subtitle?: string;
  format: ReportFormat;
  dateFrom: Date;
  dateTo: Date;
  filters?: Record<string, unknown>;
  includeCharts?: boolean;
  language?: string;
}

export interface ReportData {
  metadata: {
    title: string;
    generatedAt: Date;
    period: { from: Date; to: Date };
  };
  summary: Record<string, unknown>;
  details: unknown[];
  charts?: Array<{
    type: 'bar' | 'line' | 'pie';
    title: string;
    data: unknown[];
  }>;
}

// ============================================
// REPORT SERVICE CLASS
// ============================================

class ReportService {
  // ============================================
  // TRANSACTION REPORTS
  // ============================================

  /**
   * Generate transaction report
   */
  async generateTransactionReport(config: ReportConfig): Promise<ReportData> {
    const { dateFrom, dateTo, filters } = config;

    // Get transactions
    const whereClause: Record<string, unknown> = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (filters?.type) whereClause.type = filters.type;
    if (filters?.status) whereClause.status = filters.status;
    if (filters?.currency) whereClause.currency = filters.currency;

    const transactions = await db.transaction.findMany({
      where: whereClause,
      include: {
        fromWallet: { include: { user: { select: { name: true, email: true } } } },
        toWallet: { include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const deposits = transactions.filter(t => t.type === 'DEPOSIT');
    const withdrawals = transactions.filter(t => t.type === 'WITHDRAWAL');
    const transfers = transactions.filter(t => t.type === 'INTERNAL_TRANSFER');

    const summary = {
      totalTransactions: transactions.length,
      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      totalTransfers: transfers.length,
      depositVolume: deposits.reduce((sum, t) => sum + t.amount, 0),
      withdrawalVolume: withdrawals.reduce((sum, t) => sum + t.amount, 0),
      netFlow: deposits.reduce((sum, t) => sum + t.amount, 0) - 
                withdrawals.reduce((sum, t) => sum + t.amount, 0),
    };

    // Generate charts
    const charts = config.includeCharts ? [
      {
        type: 'pie' as const,
        title: 'Transaction Distribution',
        data: [
          { name: 'Deposits', value: deposits.length },
          { name: 'Withdrawals', value: withdrawals.length },
          { name: 'Transfers', value: transfers.length },
        ],
      },
      {
        type: 'bar' as const,
        title: 'Volume by Currency',
        data: this.groupByCurrency(transactions),
      },
    ] : undefined;

    return {
      metadata: {
        title: config.title,
        generatedAt: new Date(),
        period: { from: dateFrom, to: dateTo },
      },
      summary,
      details: transactions,
      charts,
    };
  }

  // ============================================
  // CLIENT REPORTS
  // ============================================

  /**
   * Generate client activity report
   */
  async generateClientReport(config: ReportConfig): Promise<ReportData> {
    const { dateFrom, dateTo } = config;

    // Get clients with activity
    const clients = await db.user.findMany({
      where: {
        userType: 'CLIENT',
        createdAt: { lte: dateTo },
      },
      include: {
        clientProfile: true,
        wallets: true,
        accounts: true,
        _count: {
          select: {
            wallets: true,
            accounts: true,
          },
        },
      },
    });

    // Calculate statistics
    const newClients = clients.filter(c => 
      new Date(c.createdAt) >= dateFrom && new Date(c.createdAt) <= dateTo
    );

    const activeClients = clients.filter(c => 
      c.lastLoginAt && new Date(c.lastLoginAt) >= dateFrom
    );

    const kycPending = clients.filter(c => 
      c.clientProfile?.kycStatus === 'PENDING' || c.clientProfile?.kycStatus === 'IN_REVIEW'
    );

    const summary = {
      totalClients: clients.length,
      newClients: newClients.length,
      activeClients: activeClients.length,
      inactiveClients: clients.length - activeClients.length,
      kycPending: kycPending.length,
      kycApproved: clients.filter(c => c.clientProfile?.kycStatus === 'APPROVED').length,
      averageWalletsPerClient: clients.reduce((sum, c) => sum + c._count.wallets, 0) / clients.length || 0,
      averageAccountsPerClient: clients.reduce((sum, c) => sum + c._count.accounts, 0) / clients.length || 0,
    };

    const charts = config.includeCharts ? [
      {
        type: 'pie' as const,
        title: 'KYC Status Distribution',
        data: [
          { name: 'Approved', value: summary.kycApproved as number },
          { name: 'Pending', value: kycPending.length },
          { name: 'Not Started', value: clients.length - (summary.kycApproved as number) - kycPending.length },
        ],
      },
      {
        type: 'bar' as const,
        title: 'Clients by Country',
        data: this.groupByCountry(clients),
      },
    ] : undefined;

    return {
      metadata: {
        title: config.title,
        generatedAt: new Date(),
        period: { from: dateFrom, to: dateTo },
      },
      summary,
      details: clients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt,
        lastLogin: c.lastLoginAt,
        kycStatus: c.clientProfile?.kycStatus,
        riskLevel: c.clientProfile?.riskLevel,
        country: c.clientProfile?.country,
      })),
      charts,
    };
  }

  // ============================================
  // IB COMMISSION REPORTS
  // ============================================

  /**
   * Generate IB commission report
   */
  async generateIBCommissionReport(config: ReportConfig & { ibId?: string }): Promise<ReportData> {
    const { dateFrom, dateTo, ibId } = config;

    const whereClause: Record<string, unknown> = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (ibId) whereClause.userId = ibId;

    const commissions = await db.commission.findMany({
      where: whereClause,
      include: {
        user: {
          include: {
            ibProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by level
    const byLevel = commissions.reduce((acc, c) => {
      acc[c.level] = (acc[c.level] || 0) + c.amount;
      return acc;
    }, {} as Record<number, number>);

    // Group by status
    const byStatus = commissions.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summary = {
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + c.amount, 0),
      totalVolume: commissions.reduce((sum, c) => sum + c.volume, 0),
      pendingAmount: commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0),
      paidAmount: commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0),
      byLevel,
      byStatus,
    };

    const charts = config.includeCharts ? [
      {
        type: 'pie' as const,
        title: 'Commissions by Level',
        data: Object.entries(byLevel).map(([level, amount]) => ({
          name: `Level ${level}`,
          value: amount,
        })),
      },
      {
        type: 'bar' as const,
        title: 'Commission Trend',
        data: this.groupByDate(commissions, 'amount'),
      },
    ] : undefined;

    return {
      metadata: {
        title: config.title,
        generatedAt: new Date(),
        period: { from: dateFrom, to: dateTo },
      },
      summary,
      details: commissions,
      charts,
    };
  }

  // ============================================
  // A-BOOK/B-BOOK REPORTS
  // ============================================

  /**
   * Generate A/B Book analytics report
   */
  async generateBookAnalyticsReport(config: ReportConfig): Promise<ReportData> {
    const { dateFrom, dateTo } = config;

    // Get trading accounts with stats
    const accounts = await db.tradingAccount.findMany({
      where: {
        createdAt: { lte: dateTo },
      },
    });

    const aBookAccounts = accounts.filter(a => a.bookingType === 'A_BOOK');
    const bBookAccounts = accounts.filter(a => a.bookingType === 'B_BOOK');

    // Calculate summary
    const summary = {
      totalAccounts: accounts.length,
      aBook: {
        accounts: aBookAccounts.length,
        totalVolume: aBookAccounts.reduce((sum, a) => sum + a.totalVolume, 0),
        totalProfit: aBookAccounts.reduce((sum, a) => sum + a.totalProfit, 0),
        totalDeposits: aBookAccounts.reduce((sum, a) => sum + a.totalDeposits, 0),
      },
      bBook: {
        accounts: bBookAccounts.length,
        totalVolume: bBookAccounts.reduce((sum, a) => sum + a.totalVolume, 0),
        totalProfit: bBookAccounts.reduce((sum, a) => sum + a.totalProfit, 0),
        totalDeposits: bBookAccounts.reduce((sum, a) => sum + a.totalDeposits, 0),
      },
      netExposure: bBookAccounts.reduce((sum, a) => sum + a.totalProfit, 0),
    };

    const charts = config.includeCharts ? [
      {
        type: 'pie' as const,
        title: 'Account Distribution',
        data: [
          { name: 'A-Book', value: aBookAccounts.length },
          { name: 'B-Book', value: bBookAccounts.length },
        ],
      },
      {
        type: 'bar' as const,
        title: 'Volume Comparison',
        data: [
          { name: 'A-Book', volume: summary.aBook.totalVolume },
          { name: 'B-Book', volume: summary.bBook.totalVolume },
        ],
      },
    ] : undefined;

    return {
      metadata: {
        title: config.title,
        generatedAt: new Date(),
        period: { from: dateFrom, to: dateTo },
      },
      summary,
      details: accounts,
      charts,
    };
  }

  // ============================================
  // EXPORT FORMATS
  // ============================================

  /**
   * Export to CSV
   */
  exportToCSV(data: ReportData): string {
    const details = data.details as Record<string, unknown>[];
    if (details.length === 0) return '';

    const headers = Object.keys(details[0]);
    const rows = details.map(row => 
      headers.map(h => {
        const value = row[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export to JSON
   */
  exportToJSON(data: ReportData): string {
    return JSON.stringify(data, null, 2);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private groupByCurrency(transactions: unknown[]): Array<{ name: string; value: number }> {
    const grouped = (transactions as Array<{ currency: string; amount: number }>).reduce((acc, t) => {
      acc[t.currency] = (acc[t.currency] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }

  private groupByCountry(clients: unknown[]): Array<{ name: string; value: number }> {
    const grouped = (clients as Array<{ clientProfile?: { country?: string } }>).reduce((acc, c) => {
      const country = c.clientProfile?.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }

  private groupByDate(items: unknown[], field: string): Array<{ date: string; value: number }> {
    const grouped = (items as Array<{ createdAt: Date; [key: string]: unknown }>).reduce((acc, item) => {
      const date = new Date(item.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (item[field] as number || 0);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([date, value]) => ({ date, value }));
  }
}

// Export singleton instance
export const reportService = new ReportService();
