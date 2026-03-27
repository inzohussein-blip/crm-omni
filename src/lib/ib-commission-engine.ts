/**
 * OMNI-CRM IB Commission Engine
 * Multi-level Commission System (5 Tiers) with Materialized Path
 * 
 * Algorithm:
 * - Uses Materialized Path pattern for efficient tree traversal
 * - Calculates commissions instantly on trade close
 * - Supports up to 5 levels of IB hierarchy
 */

import { db } from '@/lib/db';
import { auditService } from '@/lib/audit';

// ============================================
// TYPES
// ============================================

interface CommissionCalculation {
  ibId: string;
  ibUserId: string;
  level: number;
  rate: number;
  amount: number;
  volume: number;
  sourceId: string;
  sourceType: string;
  clientId: string;
}

interface TradeData {
  tradeId: string;
  clientId: string;
  accountId: string;
  symbol: string;
  volume: number; // in lots
  profit: number;
  closePrice: number;
  openPrice: number;
  commission: number; // MT commission
  swap: number;
}

interface CommissionPlan {
  levels: {
    level: number;
    rate: number; // percentage or fixed per lot
    type: 'PERCENTAGE' | 'FIXED';
  }[];
}

// ============================================
// DEFAULT COMMISSION PLAN
// ============================================

const DEFAULT_COMMISSION_PLAN: CommissionPlan = {
  levels: [
    { level: 1, rate: 0.5, type: 'PERCENTAGE' },  // Direct IB
    { level: 2, rate: 0.25, type: 'PERCENTAGE' }, // 2nd level
    { level: 3, rate: 0.15, type: 'PERCENTAGE' }, // 3rd level
    { level: 4, rate: 0.075, type: 'PERCENTAGE' }, // 4th level
    { level: 5, rate: 0.025, type: 'PERCENTAGE' }, // 5th level
  ],
};

// ============================================
// IB COMMISSION ENGINE CLASS
// ============================================

class IBEcommissionEngine {
  /**
   * Get IB hierarchy using Materialized Path
   * Returns all IBs in the upline chain
   */
  async getIBHierarchy(clientId: string): Promise<CommissionCalculation[]> {
    // Find the client's referring IB
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

    if (!referral || !referral.ib.ibProfile) {
      return [];
    }

    // Get the full upline using Materialized Path
    const upline = await this.getUplineIBs(referral.ib.ibProfile.id);
    
    return upline.map((ib, index) => ({
      ibId: ib.id,
      ibUserId: ib.userId,
      level: index + 1,
      rate: 0,
      amount: 0,
      volume: 0,
      sourceId: '',
      sourceType: 'trade',
      clientId,
    }));
  }

  /**
   * Get upline IBs using Materialized Path
   * Efficient tree traversal without recursive queries
   */
  async getUplineIBs(ibProfileId: string): Promise<any[]> {
    // Get the current IB profile
    const currentIB = await db.ibProfile.findUnique({
      where: { id: ibProfileId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!currentIB) {
      return [];
    }

    const upline: any[] = [currentIB];

    // Traverse up the tree using parentIbId
    let currentParentId = currentIB.parentIbId;
    let level = 1;

    while (currentParentId && level < 5) {
      const parentIB = await db.ibProfile.findUnique({
        where: { id: currentParentId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!parentIB) break;

      upline.push(parentIB);
      currentParentId = parentIB.parentIbId;
      level++;
    }

    return upline;
  }

  /**
   * Calculate commissions for a closed trade
   * Called instantly when MT4/MT5 sends trade close event
   */
  async calculateTradeCommission(
    trade: TradeData,
    plan: CommissionPlan = DEFAULT_COMMISSION_PLAN
  ): Promise<CommissionCalculation[]> {
    // Get IB hierarchy for the client
    const hierarchy = await this.getIBHierarchy(trade.clientId);

    if (hierarchy.length === 0) {
      return [];
    }

    const calculations: CommissionCalculation[] = [];

    for (const ib of hierarchy) {
      const levelConfig = plan.levels.find(l => l.level === ib.level);
      
      if (!levelConfig) continue;

      // Calculate commission amount
      let amount: number;
      
      if (levelConfig.type === 'PERCENTAGE') {
        // Percentage of spread/profit or MT commission
        amount = Math.abs(trade.commission) * (levelConfig.rate / 100);
      } else {
        // Fixed per lot
        amount = trade.volume * levelConfig.rate;
      }

      calculations.push({
        ...ib,
        rate: levelConfig.rate,
        amount,
        volume: trade.volume,
        sourceId: trade.tradeId,
        sourceType: 'trade',
        clientId: trade.clientId,
      });
    }

    return calculations;
  }

  /**
   * Process and distribute commissions
   * Atomic transaction with audit trail
   */
  async processCommissions(
    calculations: CommissionCalculation[],
    context: { ipAddress: string; actorId: string }
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      for (const calc of calculations) {
        // Create commission record
        const commission = await tx.commission.create({
          data: {
            userId: calc.ibUserId,
            sourceType: calc.sourceType,
            sourceId: calc.sourceId,
            clientId: calc.clientId,
            volume: calc.volume,
            amount: calc.amount,
            currency: 'USD',
            level: calc.level,
            status: 'APPROVED',
          },
        });

        // Get or create IB wallet
        let wallet = await tx.wallet.findFirst({
          where: {
            userId: calc.ibUserId,
            walletType: 'IB',
            currency: 'USD',
          },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId: calc.ibUserId,
              walletType: 'IB',
              currency: 'USD',
              balance: 0,
              status: 'ACTIVE',
            },
          });
        }

        // Update wallet balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: calc.amount },
            lastBalanceUpdate: new Date(),
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: calc.ibUserId,
            toWalletId: wallet.id,
            type: 'COMMISSION',
            amount: calc.amount,
            currency: 'USD',
            fee: 0,
            netAmount: calc.amount,
            status: 'COMPLETED',
            description: `Level ${calc.level} commission from trade ${calc.sourceId}`,
            processedAt: new Date(),
          },
        });

        // Update IB profile stats
        await tx.ibProfile.update({
          where: { id: calc.ibId },
          data: {
            totalCommission: { increment: calc.amount },
            totalVolume: { increment: calc.volume },
          },
        });

        // Audit log
        await auditService.logCommission({
          action: 'COMMISSION_CALCULATE',
          commissionId: commission.id,
          userId: calc.ibUserId,
          amount: calc.amount,
          level: calc.level,
          ipAddress: context.ipAddress,
        });
      }
    });
  }

  /**
   * Get IB performance statistics
   */
  async getIBPerformance(ibUserId: string, period: { from: Date; to: Date }) {
    const commissions = await db.commission.findMany({
      where: {
        userId: ibUserId,
        createdAt: {
          gte: period.from,
          lte: period.to,
        },
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);
    const totalVolume = commissions.reduce((sum, c) => sum + c.volume, 0);

    // Group by level
    const byLevel = commissions.reduce((acc, c) => {
      if (!acc[c.level]) {
        acc[c.level] = { count: 0, amount: 0, volume: 0 };
      }
      acc[c.level].count++;
      acc[c.level].amount += c.amount;
      acc[c.level].volume += c.volume;
      return acc;
    }, {} as Record<number, { count: number; amount: number; volume: number }>);

    // Get referrals
    const referrals = await db.iBReferral.count({
      where: {
        ibId: ibUserId,
        createdAt: {
          gte: period.from,
          lte: period.to,
        },
      },
    });

    return {
      totalCommission,
      totalVolume,
      tradesCount: commissions.length,
      referralsCount: referrals,
      byLevel,
    };
  }

  /**
   * Get IB network tree (downline)
   */
  async getIBNetwork(ibProfileId: string, maxDepth: number = 5): Promise<any> {
    const tree: any = {
      id: ibProfileId,
      children: [],
      level: 0,
    };

    await this.buildNetworkTree(tree, maxDepth, 0);

    return tree;
  }

  /**
   * Recursively build network tree
   */
  private async buildNetworkTree(node: any, maxDepth: number, currentDepth: number): Promise<void> {
    if (currentDepth >= maxDepth) return;

    const children = await db.ibProfile.findMany({
      where: { parentIbId: node.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    for (const child of children) {
      const childNode = {
        id: child.id,
        userId: child.userId,
        name: child.user.name,
        email: child.user.email,
        ibCode: child.ibCode,
        totalClients: child.totalClients,
        totalCommission: child.totalCommission,
        level: currentDepth + 1,
        children: [],
      };

      node.children.push(childNode);
      await this.buildNetworkTree(childNode, maxDepth, currentDepth + 1);
    }
  }
}

// Export singleton instance
export const ibCommissionEngine = new IBEcommissionEngine();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Register new client referral
 */
export async function registerClientReferral(
  clientId: string,
  ibCode: string,
  utmParams?: { source?: string; medium?: string; campaign?: string }
): Promise<void> {
  // Find IB by code
  const ibProfile = await db.ibProfile.findUnique({
    where: { ibCode },
  });

  if (!ibProfile) {
    throw new Error('Invalid IB code');
  }

  // Check if already referred
  const existingReferral = await db.iBReferral.findUnique({
    where: { clientId },
  });

  if (existingReferral) {
    throw new Error('Client already referred');
  }

  // Create referral
  await db.iBReferral.create({
    data: {
      clientId,
      ibId: ibProfile.userId,
      level: 1,
      status: 'active',
      utmSource: utmParams?.source,
      utmMedium: utmParams?.medium,
      utmCampaign: utmParams?.campaign,
    },
  });

  // Update IB stats
  await db.ibProfile.update({
    where: { id: ibProfile.id },
    data: {
      totalClients: { increment: 1 },
    },
  });
}
