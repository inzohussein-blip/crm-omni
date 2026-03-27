/**
 * OMNI-CRM IB Commission Engine
 * Multi-level (Tier-5) Commission Calculation System
 * Uses Materialized Path for efficient hierarchy queries
 */

import { db } from '@/lib/db';
import { CommissionStatus } from '@prisma/client';

// ============================================
// TYPES & INTERFACES
// ============================================

interface CommissionConfig {
  level: number;
  percentage: number; // Commission percentage for this level
  maxAmount?: number; // Optional cap per trade
}

interface TradeData {
  tradeId: string;
  clientId: string;
  volume: number; // In lots
  profit: number;
  symbol: string;
  closePrice: number;
  openPrice: number;
}

interface CommissionResult {
  ibId: string;
  level: number;
  amount: number;
  volume: number;
  status: CommissionStatus;
}

// ============================================
// COMMISSION TIERS CONFIGURATION
// ============================================

const COMMISSION_TIERS: CommissionConfig[] = [
  { level: 1, percentage: 10.0, maxAmount: 5000 },  // Direct IB
  { level: 2, percentage: 5.0, maxAmount: 2000 },   // 2nd level
  { level: 3, percentage: 3.0, maxAmount: 1000 },   // 3rd level
  { level: 4, percentage: 1.5, maxAmount: 500 },    // 4th level
  { level: 5, percentage: 0.5, maxAmount: 250 },    // 5th level
];

// Commission per lot (in USD) - can be configured per symbol
const COMMISSION_PER_LOT: Record<string, number> = {
  'DEFAULT': 7.0,    // $7 per lot
  'EURUSD': 7.0,
  'GBPUSD': 7.5,
  'XAUUSD': 10.0,    // Gold
  'BTCUSD': 15.0,    // Bitcoin
};

// ============================================
// COMMISSION SERVICE CLASS
// ============================================

class IBCommissionService {
  /**
   * Calculate and distribute commissions for a trade
   * This is the main entry point for commission calculation
   */
  async calculateTradeCommission(trade: TradeData): Promise<CommissionResult[]> {
    const results: CommissionResult[] = [];

    // Get the IB hierarchy for the client
    const hierarchy = await this.getIBHierarchy(trade.clientId);

    if (hierarchy.length === 0) {
      console.log(`No IB hierarchy found for client ${trade.clientId}`);
      return [];
    }

    // Get commission rate for the symbol
    const commissionPerLot = COMMISSION_PER_LOT[trade.symbol] || COMMISSION_PER_LOT['DEFAULT'];
    const baseCommission = trade.volume * commissionPerLot;

    // Calculate and distribute commissions up the chain
    for (const ibNode of hierarchy) {
      const tier = COMMISSION_TIERS.find(t => t.level === ibNode.level);
      
      if (!tier) continue;
      if (ibNode.level > 5) break; // Max 5 levels

      // Calculate commission for this level
      let commissionAmount = (baseCommission * tier.percentage) / 100;

      // Apply cap if exists
      if (tier.maxAmount && commissionAmount > tier.maxAmount) {
        commissionAmount = tier.maxAmount;
      }

      // Check IB status
      const ibProfile = await db.iBProfile.findUnique({
        where: { id: ibNode.ibProfileId },
      });

      if (!ibProfile || ibProfile.status !== 'ACTIVE') {
        console.log(`IB ${ibNode.ibProfileId} is not active, skipping`);
        continue;
      }

      // Create commission record
      const commission = await db.commission.create({
        data: {
          userId: ibNode.userId,
          sourceType: 'trade',
          sourceId: trade.tradeId,
          clientId: trade.clientId,
          volume: trade.volume,
          amount: commissionAmount,
          currency: 'USD',
          level: ibNode.level,
          status: 'PENDING',
        },
      });

      results.push({
        ibId: ibNode.ibProfileId,
        level: ibNode.level,
        amount: commissionAmount,
        volume: trade.volume,
        status: 'PENDING',
      });

      // Update IB statistics
      await db.iBProfile.update({
        where: { id: ibNode.ibProfileId },
        data: {
          totalCommission: { increment: commissionAmount },
          totalVolume: { increment: trade.volume },
        },
      });
    }

    return results;
  }

  /**
   * Get IB hierarchy using Materialized Path pattern
   * Returns array of IBs from direct to top-level
   */
  private async getIBHierarchy(clientId: string): Promise<Array<{
    userId: string;
    ibProfileId: string;
    level: number;
  }>> {
    const hierarchy: Array<{
      userId: string;
      ibProfileId: string;
      level: number;
    }> = [];

    // Get the direct IB for this client
    const referral = await db.iBReferral.findFirst({
      where: { clientId, status: 'active' },
      include: {
        ib: {
          include: {
            ibProfile: true,
          },
        },
      },
    });

    if (!referral) return [];

    // Add the direct IB (level 1)
    const directIB = referral.ib.ibProfile;
    if (directIB) {
      hierarchy.push({
        userId: referral.ibId,
        ibProfileId: directIB.id,
        level: 1,
      });

      // Traverse up the IB tree using parent relationship
      let currentIB = directIB;
      let level = 2;

      while (currentIB.parentIbId && level <= 5) {
        const parentIB = await db.iBProfile.findUnique({
          where: { id: currentIB.parentIbId },
          include: { user: true },
        });

        if (parentIB) {
          hierarchy.push({
            userId: parentIB.userId,
            ibProfileId: parentIB.id,
            level,
          });
          currentIB = parentIB;
          level++;
        } else {
          break;
        }
      }
    }

    return hierarchy;
  }

  /**
   * Approve pending commissions
   */
  async approveCommission(commissionId: string, approvedBy: string): Promise<void> {
    const commission = await db.commission.findUnique({
      where: { id: commissionId },
    });

    if (!commission || commission.status !== 'PENDING') {
      throw new Error('Commission not found or already processed');
    }

    // Get user's IB wallet
    const wallet = await db.wallet.findFirst({
      where: {
        userId: commission.userId,
        walletType: 'IB',
        currency: commission.currency,
      },
    });

    if (!wallet) {
      throw new Error('IB wallet not found for user');
    }

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      // Update commission status
      await tx.commission.update({
        where: { id: commissionId },
        data: {
          status: 'APPROVED',
          paidAt: new Date(),
          walletId: wallet.id,
        },
      });

      // Credit wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: commission.amount },
          lastBalanceUpdate: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: approvedBy,
          action: 'APPROVE',
          entityType: 'Commission',
          entityId: commissionId,
          newValue: JSON.stringify({
            amount: commission.amount,
            currency: commission.currency,
            walletId: wallet.id,
          }),
          commissionId,
        },
      });
    });
  }

  /**
   * Batch approve commissions
   */
  async batchApproveCommissions(
    commissionIds: string[],
    approvedBy: string
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const id of commissionIds) {
      try {
        await this.approveCommission(id, approvedBy);
        success++;
      } catch (error) {
        console.error(`Failed to approve commission ${id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Get commission statistics for an IB
   */
  async getIBStatistics(ibProfileId: string, period?: { from: Date; to: Date }) {
    const ibProfile = await db.iBProfile.findUnique({
      where: { id: ibProfileId },
      include: { user: true },
    });

    if (!ibProfile) {
      throw new Error('IB Profile not found');
    }

    const whereClause: Record<string, unknown> = {
      userId: ibProfile.userId,
    };

    if (period) {
      whereClause.createdAt = {
        gte: period.from,
        lte: period.to,
      };
    }

    const commissions = await db.commission.aggregate({
      where: whereClause,
      _sum: {
        amount: true,
        volume: true,
      },
      _count: true,
    });

    const byLevel = await db.commission.groupBy({
      by: ['level'],
      where: whereClause,
      _sum: {
        amount: true,
        volume: true,
      },
      _count: true,
    });

    const byStatus = await db.commission.groupBy({
      by: ['status'],
      where: whereClause,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    return {
      ibProfile,
      total: {
        amount: commissions._sum.amount || 0,
        volume: commissions._sum.volume || 0,
        count: commissions._count,
      },
      byLevel: byLevel.map(l => ({
        level: l.level,
        amount: l._sum.amount || 0,
        volume: l._sum.volume || 0,
        count: l._count,
      })),
      byStatus: byStatus.map(s => ({
        status: s.status,
        amount: s._sum.amount || 0,
        count: s._count,
      })),
    };
  }

  /**
   * Get IB tree (downline) for visualization
   */
  async getIBTree(ibProfileId: string, maxDepth: number = 3): Promise<IBTreeNode> {
    const ibProfile = await db.iBProfile.findUnique({
      where: { id: ibProfileId },
      include: { user: true },
    });

    if (!ibProfile) {
      throw new Error('IB Profile not found');
    }

    const node: IBTreeNode = {
      id: ibProfile.id,
      ibCode: ibProfile.ibCode,
      userId: ibProfile.userId,
      userName: ibProfile.user.name,
      totalClients: ibProfile.totalClients,
      totalVolume: ibProfile.totalVolume,
      totalCommission: ibProfile.totalCommission,
      children: [],
    };

    // Recursively get children
    if (maxDepth > 0) {
      const children = await db.iBProfile.findMany({
        where: { parentIbId: ibProfileId },
        include: { user: true },
      });

      for (const child of children) {
        const childNode = await this.getIBTree(child.id, maxDepth - 1);
        node.children.push(childNode);
      }
    }

    return node;
  }
}

// ============================================
// INTERFACES
// ============================================

interface IBTreeNode {
  id: string;
  ibCode: string;
  userId: string;
  userName: string;
  totalClients: number;
  totalVolume: number;
  totalCommission: number;
  children: IBTreeNode[];
}

// Export singleton instance
export const ibCommissionService = new IBCommissionService();

// Export for API usage
export { COMMISSION_TIERS, COMMISSION_PER_LOT };
