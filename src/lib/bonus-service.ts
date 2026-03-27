/**
 * OMNI-CRM Bonus Service
 * Comprehensive Bonus Management System
 * Handles Welcome, Deposit, Reload bonuses with Volume-based unlocking
 */

import { db } from '@/lib/db';
import { BonusType, BonusStatus } from '@prisma/client';
import { auditService } from './audit';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BonusConfig {
  name: string;
  type: BonusType;
  percentage: number;
  maxAmount: number;
  minDeposit?: number;
  volumeMultiplier: number; // Lots required per $1 bonus
  timeLimit?: number; // Days
  isStackable: boolean;
}

export interface CreateBonusParams {
  userId: string;
  name: string;
  type: BonusType;
  amount: number;
  currency?: string;
  volumeRequired?: number;
  timeLimit?: number;
  metadata?: Record<string, unknown>;
  actorId?: string;
  ipAddress?: string;
}

export interface WelcomeBonusParams {
  userId: string;
  depositAmount: number;
  currency?: string;
  actorId?: string;
  ipAddress?: string;
}

export interface DepositBonusParams {
  userId: string;
  depositAmount: number;
  depositId: string;
  currency?: string;
  actorId?: string;
  ipAddress?: string;
}

export interface VolumeUpdateParams {
  userId: string;
  volumeLots: number;
  tradeIds?: string[];
}

export interface BonusSummary {
  id: string;
  name: string;
  type: BonusType;
  amount: number;
  currency: string;
  volumeRequired: number;
  volumeTraded: number;
  progressPercentage: number;
  isUnlocked: boolean;
  status: BonusStatus;
  expiresAt: Date | null;
  daysRemaining: number | null;
  createdAt: Date;
}

export interface UserBonusSummary {
  totalBonusBalance: number;
  activeBonuses: number;
  unlockedBonuses: number;
  pendingVolume: number;
  bonuses: BonusSummary[];
}

// ============================================
// DEFAULT BONUS CONFIGURATIONS
// ============================================

export const DEFAULT_BONUS_CONFIGS: Record<string, BonusConfig> = {
  WELCOME_50: {
    name: 'Welcome Bonus 50%',
    type: 'WELCOME',
    percentage: 50,
    maxAmount: 500,
    minDeposit: 100,
    volumeMultiplier: 0.5, // 0.5 lots per $1
    timeLimit: 90,
    isStackable: false,
  },
  WELCOME_100: {
    name: 'Welcome Bonus 100%',
    type: 'WELCOME',
    percentage: 100,
    maxAmount: 1000,
    minDeposit: 500,
    volumeMultiplier: 0.5,
    timeLimit: 90,
    isStackable: false,
  },
  DEPOSIT_25: {
    name: 'Deposit Bonus 25%',
    type: 'DEPOSIT',
    percentage: 25,
    maxAmount: 2500,
    minDeposit: 200,
    volumeMultiplier: 0.3,
    timeLimit: 60,
    isStackable: true,
  },
  DEPOSIT_50: {
    name: 'Deposit Bonus 50%',
    type: 'DEPOSIT',
    percentage: 50,
    maxAmount: 5000,
    minDeposit: 1000,
    volumeMultiplier: 0.4,
    timeLimit: 60,
    isStackable: true,
  },
  RELOAD_20: {
    name: 'Reload Bonus 20%',
    type: 'RELOAD',
    percentage: 20,
    maxAmount: 1000,
    minDeposit: 100,
    volumeMultiplier: 0.2,
    timeLimit: 30,
    isStackable: true,
  },
  RELOAD_30: {
    name: 'Reload Bonus 30%',
    type: 'RELOAD',
    percentage: 30,
    maxAmount: 2000,
    minDeposit: 500,
    volumeMultiplier: 0.3,
    timeLimit: 30,
    isStackable: true,
  },
  LOYALTY_10: {
    name: 'Loyalty Bonus 10%',
    type: 'LOYALTY',
    percentage: 10,
    maxAmount: 500,
    volumeMultiplier: 0.1,
    timeLimit: 30,
    isStackable: true,
  },
  REFERRAL_50: {
    name: 'Referral Bonus',
    type: 'REFERRAL',
    percentage: 0, // Fixed amount
    maxAmount: 100,
    volumeMultiplier: 0.5,
    timeLimit: 60,
    isStackable: true,
  },
};

// ============================================
// BONUS MANAGER CLASS
// ============================================

class BonusManager {
  private configs: Record<string, BonusConfig>;

  constructor() {
    this.configs = DEFAULT_BONUS_CONFIGS;
  }

  /**
   * Get user's bonus summary
   */
  async getUserBonusSummary(userId: string): Promise<UserBonusSummary> {
    const bonuses = await db.bonus.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const activeBonuses = bonuses.filter((b) => b.status === 'ACTIVE');
    const unlockedBonuses = bonuses.filter((b) => b.isUnlocked);
    const totalBonusBalance = bonuses
      .filter((b) => b.isUnlocked || b.status === 'ACTIVE')
      .reduce((sum, b) => sum + b.amount, 0);

    const pendingVolume = activeBonuses
      .filter((b) => !b.isUnlocked)
      .reduce((sum, b) => sum + Math.max(0, b.volumeRequired - b.volumeTraded), 0);

    return {
      totalBonusBalance,
      activeBonuses: activeBonuses.length,
      unlockedBonuses: unlockedBonuses.length,
      pendingVolume,
      bonuses: bonuses.map(this.formatBonusSummary),
    };
  }

  /**
   * Format bonus for summary display
   */
  private formatBonusSummary(bonus: {
    id: string;
    name: string;
    type: BonusType;
    amount: number;
    currency: string;
    volumeRequired: number;
    volumeTraded: number;
    isUnlocked: boolean;
    status: BonusStatus;
    expiresAt: Date | null;
    createdAt: Date;
  }): BonusSummary {
    const progressPercentage = bonus.volumeRequired > 0
      ? Math.min(100, Math.floor((bonus.volumeTraded / bonus.volumeRequired) * 100))
      : 100;

    const daysRemaining = bonus.expiresAt
      ? Math.max(0, Math.ceil((new Date(bonus.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      id: bonus.id,
      name: bonus.name,
      type: bonus.type,
      amount: bonus.amount,
      currency: bonus.currency,
      volumeRequired: bonus.volumeRequired,
      volumeTraded: bonus.volumeTraded,
      progressPercentage,
      isUnlocked: bonus.isUnlocked,
      status: bonus.status,
      expiresAt: bonus.expiresAt,
      daysRemaining,
      createdAt: bonus.createdAt,
    };
  }

  /**
   * Create a new bonus
   */
  async createBonus(params: CreateBonusParams): Promise<{
    success: boolean;
    bonusId: string;
    bonus: BonusSummary;
  }> {
    const { userId, name, type, amount, currency, volumeRequired, timeLimit, metadata, actorId, ipAddress } = params;

    // Calculate expiration date
    const expiresAt = timeLimit ? new Date(Date.now() + timeLimit * 24 * 60 * 60 * 1000) : null;

    const bonus = await db.$transaction(async (tx) => {
      // Create bonus record
      const newBonus = await tx.bonus.create({
        data: {
          userId,
          name,
          type,
          amount,
          currency: currency || 'USD',
          volumeRequired: volumeRequired || 0,
          volumeTraded: 0,
          isUnlocked: volumeRequired === 0 || volumeRequired === undefined,
          status: 'ACTIVE',
          expiresAt,
        },
      });

      // Create bonus wallet if doesn't exist
      const existingWallet = await tx.wallet.findFirst({
        where: { userId, walletType: 'BONUS', currency: currency || 'USD' },
      });

      if (!existingWallet) {
        await tx.wallet.create({
          data: {
            userId,
            walletType: 'BONUS',
            currency: currency || 'USD',
            balance: 0,
            frozenBalance: 0,
            status: 'ACTIVE',
          },
        });
      }

      // Audit log
      if (actorId) {
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: 'CREATE',
            entityType: 'Bonus',
            entityId: newBonus.id,
            newValue: JSON.stringify({
              name,
              type,
              amount,
              volumeRequired,
              expiresAt,
            }),
            ipAddress,
          },
        });
      }

      return newBonus;
    });

    return {
      success: true,
      bonusId: bonus.id,
      bonus: this.formatBonusSummary(bonus),
    };
  }

  /**
   * Process welcome bonus
   */
  async processWelcomeBonus(params: WelcomeBonusParams): Promise<{
    success: boolean;
    bonusId?: string;
    amount: number;
    message: string;
  }> {
    const { userId, depositAmount, currency, actorId, ipAddress } = params;

    // Check if user already has a welcome bonus
    const existingWelcome = await db.bonus.findFirst({
      where: { userId, type: 'WELCOME', status: { in: ['ACTIVE', 'UNLOCKED'] } },
    });

    if (existingWelcome) {
      return {
        success: false,
        amount: 0,
        message: 'User already has an active welcome bonus',
      };
    }

    // Find the best matching welcome bonus config
    let bestConfig: BonusConfig | null = null;
    for (const config of Object.values(this.configs)) {
      if (config.type !== 'WELCOME') continue;
      if (config.minDeposit && depositAmount < config.minDeposit) continue;
      if (!bestConfig || config.percentage > bestConfig.percentage) {
        bestConfig = config;
      }
    }

    if (!bestConfig) {
      return {
        success: false,
        amount: 0,
        message: 'No eligible welcome bonus found for this deposit amount',
      };
    }

    // Calculate bonus amount
    const bonusAmount = Math.min(
      depositAmount * (bestConfig.percentage / 100),
      bestConfig.maxAmount
    );

    // Calculate volume required
    const volumeRequired = bonusAmount * bestConfig.volumeMultiplier;

    const result = await this.createBonus({
      userId,
      name: bestConfig.name,
      type: 'WELCOME',
      amount: bonusAmount,
      currency,
      volumeRequired,
      timeLimit: bestConfig.timeLimit,
      metadata: { configName: bestConfig.name, depositAmount },
      actorId,
      ipAddress,
    });

    return {
      success: true,
      bonusId: result.bonusId,
      amount: bonusAmount,
      message: `Welcome bonus of $${bonusAmount} credited! Trade ${volumeRequired.toFixed(1)} lots to unlock.`,
    };
  }

  /**
   * Process deposit bonus
   */
  async processDepositBonus(params: DepositBonusParams): Promise<{
    success: boolean;
    bonusId?: string;
    amount: number;
    message: string;
  }> {
    const { userId, depositAmount, depositId, currency, actorId, ipAddress } = params;

    // Find the best matching deposit bonus config
    let bestConfig: BonusConfig | null = null;
    for (const config of Object.values(this.configs)) {
      if (config.type !== 'DEPOSIT') continue;
      if (config.minDeposit && depositAmount < config.minDeposit) continue;
      if (!bestConfig || config.percentage > bestConfig.percentage) {
        bestConfig = config;
      }
    }

    if (!bestConfig) {
      return {
        success: false,
        amount: 0,
        message: 'No eligible deposit bonus found for this deposit amount',
      };
    }

    // Check for existing active deposit bonuses (if not stackable)
    if (!bestConfig.isStackable) {
      const existingDeposit = await db.bonus.findFirst({
        where: { userId, type: 'DEPOSIT', status: 'ACTIVE' },
      });
      if (existingDeposit) {
        return {
          success: false,
          amount: 0,
          message: 'User already has an active deposit bonus',
        };
      }
    }

    // Calculate bonus amount
    const bonusAmount = Math.min(
      depositAmount * (bestConfig.percentage / 100),
      bestConfig.maxAmount
    );

    // Calculate volume required
    const volumeRequired = bonusAmount * bestConfig.volumeMultiplier;

    const result = await this.createBonus({
      userId,
      name: bestConfig.name,
      type: 'DEPOSIT',
      amount: bonusAmount,
      currency,
      volumeRequired,
      timeLimit: bestConfig.timeLimit,
      metadata: { configName: bestConfig.name, depositAmount, depositId },
      actorId,
      ipAddress,
    });

    return {
      success: true,
      bonusId: result.bonusId,
      amount: bonusAmount,
      message: `Deposit bonus of $${bonusAmount} credited! Trade ${volumeRequired.toFixed(1)} lots to unlock.`,
    };
  }

  /**
   * Process reload bonus
   */
  async processReloadBonus(params: DepositBonusParams): Promise<{
    success: boolean;
    bonusId?: string;
    amount: number;
    message: string;
  }> {
    const { userId, depositAmount, depositId, currency, actorId, ipAddress } = params;

    // Find reload bonus config
    let bestConfig: BonusConfig | null = null;
    for (const config of Object.values(this.configs)) {
      if (config.type !== 'RELOAD') continue;
      if (config.minDeposit && depositAmount < config.minDeposit) continue;
      if (!bestConfig || config.percentage > bestConfig.percentage) {
        bestConfig = config;
      }
    }

    if (!bestConfig) {
      return {
        success: false,
        amount: 0,
        message: 'No eligible reload bonus found for this deposit amount',
      };
    }

    // Calculate bonus amount
    const bonusAmount = Math.min(
      depositAmount * (bestConfig.percentage / 100),
      bestConfig.maxAmount
    );

    // Calculate volume required
    const volumeRequired = bonusAmount * bestConfig.volumeMultiplier;

    const result = await this.createBonus({
      userId,
      name: bestConfig.name,
      type: 'RELOAD',
      amount: bonusAmount,
      currency,
      volumeRequired,
      timeLimit: bestConfig.timeLimit,
      metadata: { configName: bestConfig.name, depositAmount, depositId },
      actorId,
      ipAddress,
    });

    return {
      success: true,
      bonusId: result.bonusId,
      amount: bonusAmount,
      message: `Reload bonus of $${bonusAmount} credited! Trade ${volumeRequired.toFixed(1)} lots to unlock.`,
    };
  }

  /**
   * Update bonus progress based on trading volume
   */
  async updateVolumeProgress(params: VolumeUpdateParams): Promise<{
    updated: number;
    unlocked: Array<{ bonusId: string; amount: number }>;
    expired: number;
  }> {
    const { userId, volumeLots } = params;

    const result = await db.$transaction(async (tx) => {
      // Get all active bonuses for the user
      const activeBonuses = await tx.bonus.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          isUnlocked: false,
        },
      });

      const unlocked: Array<{ bonusId: string; amount: number }> = [];
      let updated = 0;

      for (const bonus of activeBonuses) {
        // Update volume traded
        const newVolumeTraded = bonus.volumeTraded + volumeLots;
        const isNowUnlocked = newVolumeTraded >= bonus.volumeRequired;

        await tx.bonus.update({
          where: { id: bonus.id },
          data: {
            volumeTraded: newVolumeTraded,
            isUnlocked: isNowUnlocked,
            unlockedAt: isNowUnlocked ? new Date() : null,
            status: isNowUnlocked ? 'UNLOCKED' : 'ACTIVE',
          },
        });

        updated++;

        if (isNowUnlocked) {
          unlocked.push({ bonusId: bonus.id, amount: bonus.amount });

          // Credit bonus to wallet
          const bonusWallet = await tx.wallet.findFirst({
            where: { userId, walletType: 'BONUS', currency: bonus.currency },
          });

          if (bonusWallet) {
            await tx.wallet.update({
              where: { id: bonusWallet.id },
              data: {
                balance: { increment: bonus.amount },
                lastBalanceUpdate: new Date(),
              },
            });
          }

          // Create notification
          await tx.notification.create({
            data: {
              userId,
              type: 'SYSTEM',
              title: 'Bonus Unlocked!',
              message: `Congratulations! Your ${bonus.name} of $${bonus.amount} has been unlocked and credited to your bonus wallet.`,
              channels: '["in_app","email"]',
            },
          });
        }
      }

      // Handle expired bonuses
      const now = new Date();
      const expiredBonuses = await tx.bonus.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { lt: now },
        },
      });

      for (const bonus of expiredBonuses) {
        await tx.bonus.update({
          where: { id: bonus.id },
          data: { status: 'EXPIRED' },
        });
      }

      return { updated: activeBonuses.length, unlocked, expired: expiredBonuses.length };
    });

    return result;
  }

  /**
   * Check and handle expired bonuses
   */
  async processExpiredBonuses(): Promise<{
    processed: number;
    expiredIds: string[];
  }> {
    const now = new Date();

    const expiredBonuses = await db.bonus.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: now },
        isUnlocked: false,
      },
    });

    const expiredIds: string[] = [];

    for (const bonus of expiredBonuses) {
      await db.$transaction(async (tx) => {
        await tx.bonus.update({
          where: { id: bonus.id },
          data: { status: 'EXPIRED' },
        });

        // Create notification
        await tx.notification.create({
          data: {
            userId: bonus.userId,
            type: 'SYSTEM',
            title: 'Bonus Expired',
            message: `Your ${bonus.name} of $${bonus.amount} has expired without being unlocked.`,
            channels: '["in_app"]',
          },
        });
      });

      expiredIds.push(bonus.id);
    }

    return {
      processed: expiredBonuses.length,
      expiredIds,
    };
  }

  /**
   * Cancel a bonus
   */
  async cancelBonus(
    bonusId: string,
    reason: string,
    actorId: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    const bonus = await db.bonus.findUnique({
      where: { id: bonusId },
    });

    if (!bonus) {
      return { success: false, message: 'Bonus not found' };
    }

    if (bonus.status !== 'ACTIVE') {
      return { success: false, message: 'Only active bonuses can be cancelled' };
    }

    await db.$transaction(async (tx) => {
      await tx.bonus.update({
        where: { id: bonusId },
        data: { status: 'CANCELLED' },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CANCEL',
          entityType: 'Bonus',
          entityId: bonusId,
          newValue: JSON.stringify({ reason }),
          ipAddress,
        },
      });
    });

    return { success: true, message: 'Bonus cancelled successfully' };
  }

  /**
   * Get bonus details
   */
  async getBonusDetails(bonusId: string): Promise<BonusSummary | null> {
    const bonus = await db.bonus.findUnique({
      where: { id: bonusId },
    });

    if (!bonus) return null;

    return this.formatBonusSummary(bonus);
  }

  /**
   * Get all bonus configurations
   */
  getConfigs(): Record<string, BonusConfig> {
    return this.configs;
  }

  /**
   * Get eligible bonuses for a deposit
   */
  getEligibleBonuses(depositAmount: number, type?: BonusType): BonusConfig[] {
    const eligible: BonusConfig[] = [];

    for (const config of Object.values(this.configs)) {
      if (type && config.type !== type) continue;
      if (config.minDeposit && depositAmount < config.minDeposit) continue;
      eligible.push(config);
    }

    return eligible.sort((a, b) => b.percentage - a.percentage);
  }

  /**
   * Calculate bonus statistics for admin dashboard
   */
  async getStatistics(options?: {
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    totalIssued: number;
    totalAmount: number;
    totalUnlocked: number;
    totalExpired: number;
    totalActive: number;
    byType: Record<BonusType, { count: number; amount: number }>;
  }> {
    const where: { createdAt?: { gte: Date; lte: Date } } = {};

    if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {
        ...(options?.dateFrom && { gte: options.dateFrom }),
        ...(options?.dateTo && { lte: options.dateTo }),
      };
    }

    const bonuses = await db.bonus.findMany({ where });

    const stats = {
      totalIssued: bonuses.length,
      totalAmount: bonuses.reduce((sum, b) => sum + b.amount, 0),
      totalUnlocked: bonuses.filter((b) => b.isUnlocked).length,
      totalExpired: bonuses.filter((b) => b.status === 'EXPIRED').length,
      totalActive: bonuses.filter((b) => b.status === 'ACTIVE').length,
      byType: {} as Record<BonusType, { count: number; amount: number }>,
    };

    // Group by type
    for (const bonus of bonuses) {
      if (!stats.byType[bonus.type]) {
        stats.byType[bonus.type] = { count: 0, amount: 0 };
      }
      stats.byType[bonus.type].count++;
      stats.byType[bonus.type].amount += bonus.amount;
    }

    return stats;
  }

  /**
   * Create promotional bonus (admin function)
   */
  async createPromotionalBonus(params: {
    userId: string;
    amount: number;
    name: string;
    volumeRequired?: number;
    timeLimit?: number;
    actorId: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; bonusId?: string; message: string }> {
    const { userId, amount, name, volumeRequired, timeLimit, actorId, ipAddress } = params;

    const result = await this.createBonus({
      userId,
      name,
      type: 'PROMOTIONAL',
      amount,
      volumeRequired: volumeRequired || amount * 0.2, // Default: 0.2 lots per $1
      timeLimit: timeLimit || 30,
      metadata: { createdBy: actorId, promotional: true },
      actorId,
      ipAddress,
    });

    return {
      success: true,
      bonusId: result.bonusId,
      message: `Promotional bonus of $${amount} created successfully`,
    };
  }
}

// Export singleton instance
export const bonusManager = new BonusManager();

// Export class for testing
export { BonusManager };
