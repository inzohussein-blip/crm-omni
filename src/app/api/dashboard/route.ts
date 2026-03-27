/**
 * OMNI-CRM Dashboard API
 * Real-time statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TaskStatus, TransactionStatus, TransactionType, BookingType } from '@prisma/client';

// ============================================
// GET DASHBOARD STATISTICS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, year
    const dateFrom = getDateFrom(period);
    
    // Run all queries in parallel for performance
    const [
      // Task Statistics
      totalTasks,
      newTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      tasksByCategory,
      tasksByPriority,
      tasksBySource,
      
      // Transaction Statistics
      totalTransactions,
      pendingTransactions,
      totalDeposits,
      totalWithdrawals,
      transactionVolume,
      
      // A-Book/B-Book Analytics
      aBookStats,
      bBookStats,
      
      // User Statistics
      totalClients,
      newClients,
      activeClients,
      pendingKYC,
      
      // IB Statistics
      totalIBs,
      activeIBs,
      totalCommission,
    ] = await Promise.all([
      // Tasks
      db.task.count({ where: { createdAt: { gte: dateFrom } } }),
      db.task.count({ where: { status: 'NEW', createdAt: { gte: dateFrom } } }),
      db.task.count({ where: { status: 'IN_PROGRESS', createdAt: { gte: dateFrom } } }),
      db.task.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] }, createdAt: { gte: dateFrom } } }),
      db.task.count({ where: { slaBreached: true, status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] } } }),
      
      db.task.groupBy({
        by: ['category'],
        where: { createdAt: { gte: dateFrom } },
        _count: { id: true },
      }),
      
      db.task.groupBy({
        by: ['priority'],
        where: { createdAt: { gte: dateFrom } },
        _count: { id: true },
      }),
      
      db.task.groupBy({
        by: ['platformSource'],
        where: { createdAt: { gte: dateFrom } },
        _count: { id: true },
      }),
      
      // Transactions
      db.transaction.count({ where: { createdAt: { gte: dateFrom } } }),
      db.transaction.count({ where: { status: 'PENDING', createdAt: { gte: dateFrom } } }),
      db.transaction.aggregate({
        where: { type: 'DEPOSIT', status: 'COMPLETED', createdAt: { gte: dateFrom } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'COMPLETED', createdAt: { gte: dateFrom } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: dateFrom } },
        _sum: { amount: true },
      }),
      
      // A-Book/B-Book
      db.tradingAccount.aggregate({
        where: { bookingType: 'A_BOOK' },
        _count: { id: true },
        _sum: { totalVolume: true, totalProfit: true },
      }),
      db.tradingAccount.aggregate({
        where: { bookingType: 'B_BOOK' },
        _count: { id: true },
        _sum: { totalVolume: true, totalProfit: true },
      }),
      
      // Users
      db.user.count({ where: { userType: 'CLIENT' } }),
      db.user.count({ where: { userType: 'CLIENT', createdAt: { gte: dateFrom } } }),
      db.user.count({ where: { userType: 'CLIENT', status: 'ACTIVE', lastLoginAt: { gte: dateFrom } } }),
      db.clientProfile.count({ where: { kycStatus: 'PENDING' } }),
      
      // IB
      db.iBProfile.count(),
      db.iBProfile.count({ where: { status: 'ACTIVE' } }),
      db.commission.aggregate({
        where: { status: 'PAID', createdAt: { gte: dateFrom } },
        _sum: { amount: true },
      }),
    ]);
    
    // Calculate SLA performance
    const slaCompliant = await db.task.count({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        slaBreached: false,
        createdAt: { gte: dateFrom },
      },
    });
    
    const slaPerformance = completedTasks > 0 
      ? Math.round((slaCompliant / completedTasks) * 100) 
      : 0;
    
    // Build response
    const dashboard = {
      // Task Overview
      tasks: {
        total: totalTasks,
        byStatus: {
          new: newTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          overdue: overdueTasks,
        },
        byCategory: tasksByCategory.reduce((acc, item) => {
          acc[item.category] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byPriority: tasksByPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        bySource: tasksBySource.reduce((acc, item) => {
          acc[item.platformSource] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        slaPerformance,
      },
      
      // Financial Overview
      transactions: {
        total: totalTransactions,
        pending: pendingTransactions,
        deposits: totalDeposits._sum.amount || 0,
        withdrawals: totalWithdrawals._sum.amount || 0,
        volume: transactionVolume._sum.amount || 0,
        netFlow: (totalDeposits._sum.amount || 0) - (totalWithdrawals._sum.amount || 0),
      },
      
      // A-Book/B-Book Analytics
      bookAnalytics: {
        aBook: {
          accounts: aBookStats._count.id,
          volume: aBookStats._sum.totalVolume || 0,
          profit: aBookStats._sum.totalProfit || 0,
        },
        bBook: {
          accounts: bBookStats._count.id,
          volume: bBookStats._sum.totalVolume || 0,
          profit: bBookStats._sum.totalProfit || 0,
        },
        totalVolume: (aBookStats._sum.totalVolume || 0) + (bBookStats._sum.totalVolume || 0),
      },
      
      // Client Overview
      clients: {
        total: totalClients,
        new: newClients,
        active: activeClients,
        pendingKYC,
      },
      
      // IB Overview
      ib: {
        total: totalIBs,
        active: activeIBs,
        commission: totalCommission._sum.amount || 0,
      },
      
      // Metadata
      meta: {
        period,
        dateFrom: dateFrom.toISOString(),
        dateTo: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    };
    
    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDateFrom(period: string): Date {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return new Date(now.setHours(0, 0, 0, 0));
    case 'yesterday':
      return new Date(now.setDate(now.getDate() - 1));
    case 'week':
      return new Date(now.setDate(now.getDate() - 7));
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1));
    case 'quarter':
      return new Date(now.setMonth(now.getMonth() - 3));
    case 'year':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    default:
      return new Date(now.setHours(0, 0, 0, 0));
  }
}
