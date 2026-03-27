/**
 * Loyalty & Bonus Service
 * Points management, levels, rewards, and bonus handling
 */

import { db } from './db';
import { cache } from './cache';

// ============================================
// Types
// ============================================

export interface LoyaltyAccount {
  id: string;
  userId: string;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  level: number;
  levelName: string;
  nextLevelPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  color: string;
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';
  points: number;
  reason: string;
  source: string;
  createdAt: Date;
}

export interface Bonus {
  id: string;
  userId: string;
  type: 'WELCOME' | 'DEPOSIT' | 'RELOAD' | 'LOYALTY' | 'REFERRAL' | 'PROMOTIONAL';
  amount: number;
  currency: string;
  status: 'PENDING' | 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';
  volumeRequirement: number;
  volumeProgress: number;
  expiresAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
  available: boolean;
  image?: string;
}

// ============================================
// Loyalty Levels Configuration
// ============================================

const LOYALTY_LEVELS: LoyaltyLevel[] = [
  {
    level: 1,
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 999,
    benefits: ['5% trading discount', 'Priority support', 'Monthly newsletter'],
    color: '#CD7F32',
  },
  {
    level: 2,
    name: 'Silver',
    minPoints: 1000,
    maxPoints: 4999,
    benefits: ['10% trading discount', 'Priority support', 'Weekly market analysis', 'Exclusive webinars'],
    color: '#C0C0C0',
  },
  {
    level: 3,
    name: 'Gold',
    minPoints: 5000,
    maxPoints: 19999,
    benefits: ['15% trading discount', 'VIP support', 'Daily market analysis', 'Exclusive events', 'Personal account manager'],
    color: '#FFD700',
  },
  {
    level: 4,
    name: 'Platinum',
    minPoints: 20000,
    maxPoints: 99999,
    benefits: ['20% trading discount', '24/7 VIP support', 'Real-time signals', 'Private events', 'Dedicated account manager', 'Higher leverage'],
    color: '#E5E4E2',
  },
  {
    level: 5,
    name: 'Diamond',
    minPoints: 100000,
    maxPoints: Infinity,
    benefits: ['25% trading discount', '24/7 dedicated support', 'Custom signals', 'VIP trips', 'Personal broker', 'Maximum leverage', 'Exclusive investment opportunities'],
    color: '#B9F2FF',
  },
];

// ============================================
// Rewards Configuration
// ============================================

const REWARDS: Reward[] = [
  { id: 'r1', name: '$10 Trading Credit', description: 'Get $10 credit for trading', pointsCost: 500, category: 'credit', available: true },
  { id: 'r2', name: '$25 Trading Credit', description: 'Get $25 credit for trading', pointsCost: 1000, category: 'credit', available: true },
  { id: 'r3', name: '$50 Trading Credit', description: 'Get $50 credit for trading', pointsCost: 2000, category: 'credit', available: true },
  { id: 'r4', name: 'Free VPS (1 Month)', description: 'Free VPS hosting for automated trading', pointsCost: 1500, category: 'service', available: true },
  { id: 'r5', name: 'Trading Signals (1 Month)', description: 'Premium trading signals', pointsCost: 2000, category: 'service', available: true },
  { id: 'r6', name: '5% Spread Discount', description: 'Reduced spreads for 30 days', pointsCost: 3000, category: 'discount', available: true },
  { id: 'r7', name: '10% Spread Discount', description: 'Reduced spreads for 30 days', pointsCost: 5000, category: 'discount', available: true },
  { id: 'r8', name: 'Exclusive Webinar Access', description: 'Access to premium webinars', pointsCost: 800, category: 'education', available: true },
];

// ============================================
// Loyalty Service
// ============================================

export class LoyaltyService {
  // Get user loyalty account
  async getAccount(userId: string): Promise<LoyaltyAccount | null> {
    const cached = await cache.get<LoyaltyAccount>(`loyalty:${userId}`);
    if (cached) return cached;

    // In production, fetch from database
    const account: LoyaltyAccount = {
      id: `la_${userId}`,
      userId,
      points: 5250,
      totalEarned: 8500,
      totalRedeemed: 3250,
      level: 3,
      levelName: 'Gold',
      nextLevelPoints: 20000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await cache.set(`loyalty:${userId}`, account, 300);
    return account;
  }

  // Award points
  async awardPoints(
    userId: string,
    points: number,
    reason: string,
    source: string
  ): Promise<LoyaltyTransaction> {
    const account = await this.getAccount(userId);
    if (!account) {
      throw new Error('Loyalty account not found');
    }

    // Update points
    const newPoints = account.points + points;
    const newTotal = account.totalEarned + points;
    const newLevel = this.calculateLevel(newPoints);

    // Create transaction
    const transaction: LoyaltyTransaction = {
      id: `lt_${Date.now()}`,
      userId,
      type: 'EARN',
      points,
      reason,
      source,
      createdAt: new Date(),
    };

    // In production, save to database
    console.log(`[LOYALTY] Awarded ${points} points to ${userId} for ${reason}`);

    return transaction;
  }

  // Redeem points for reward
  async redeemReward(userId: string, rewardId: string): Promise<{ success: boolean; message: string }> {
    const account = await this.getAccount(userId);
    const reward = REWARDS.find(r => r.id === rewardId);

    if (!account || !reward) {
      return { success: false, message: 'Account or reward not found' };
    }

    if (account.points < reward.pointsCost) {
      return { success: false, message: 'Insufficient points' };
    }

    // Deduct points
    const newPoints = account.points - reward.pointsCost;

    // Create transaction
    const transaction: LoyaltyTransaction = {
      id: `lt_${Date.now()}`,
      userId,
      type: 'REDEEM',
      points: -reward.pointsCost,
      reason: `Redeemed: ${reward.name}`,
      source: 'redemption',
      createdAt: new Date(),
    };

    console.log(`[LOYALTY] ${userId} redeemed ${reward.name} for ${reward.pointsCost} points`);

    return { success: true, message: `Successfully redeemed ${reward.name}` };
  }

  // Get transaction history
  async getTransactions(userId: string, limit = 20): Promise<LoyaltyTransaction[]> {
    // In production, fetch from database
    return [
      { id: 'lt1', userId, type: 'EARN', points: 100, reason: 'Deposit bonus', source: 'deposit', createdAt: new Date() },
      { id: 'lt2', userId, type: 'EARN', points: 50, reason: 'Trade bonus', source: 'trade', createdAt: new Date() },
      { id: 'lt3', userId, type: 'REDEEM', points: -500, reason: 'Redeemed: $10 Credit', source: 'redemption', createdAt: new Date() },
    ];
  }

  // Get available rewards
  async getRewards(): Promise<Reward[]> {
    return REWARDS;
  }

  // Get levels
  async getLevels(): Promise<LoyaltyLevel[]> {
    return LOYALTY_LEVELS;
  }

  // Calculate level from points
  private calculateLevel(points: number): { level: number; name: string; nextLevel: number } {
    for (let i = LOYALTY_LEVELS.length - 1; i >= 0; i--) {
      if (points >= LOYALTY_LEVELS[i].minPoints) {
        const nextLevel = LOYALTY_LEVELS[i + 1]?.minPoints || Infinity;
        return {
          level: LOYALTY_LEVELS[i].level,
          name: LOYALTY_LEVELS[i].name,
          nextLevel,
        };
      }
    }
    return { level: 1, name: 'Bronze', nextLevel: 1000 };
  }
}

// ============================================
// Bonus Service
// ============================================

export class BonusService {
  // Get user bonuses
  async getBonuses(userId: string): Promise<Bonus[]> {
    // In production, fetch from database
    return [
      {
        id: 'b1',
        userId,
        type: 'WELCOME',
        amount: 100,
        currency: 'USD',
        status: 'ACTIVE',
        volumeRequirement: 10,
        volumeProgress: 3.5,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      },
      {
        id: 'b2',
        userId,
        type: 'DEPOSIT',
        amount: 250,
        currency: 'USD',
        status: 'PENDING',
        volumeRequirement: 25,
        volumeProgress: 0,
        createdAt: new Date(),
      },
    ];
  }

  // Create welcome bonus
  async createWelcomeBonus(userId: string, depositAmount: number): Promise<Bonus> {
    const bonusAmount = depositAmount * 0.5; // 50% welcome bonus
    const volumeRequirement = bonusAmount * 0.1; // 0.1 lots per $1

    const bonus: Bonus = {
      id: `b_${Date.now()}`,
      userId,
      type: 'WELCOME',
      amount: bonusAmount,
      currency: 'USD',
      status: 'PENDING',
      volumeRequirement,
      volumeProgress: 0,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    console.log(`[BONUS] Created welcome bonus of $${bonusAmount} for ${userId}`);
    return bonus;
  }

  // Create deposit bonus
  async createDepositBonus(userId: string, depositAmount: number, bonusPercent: number): Promise<Bonus> {
    const bonusAmount = depositAmount * (bonusPercent / 100);
    const volumeRequirement = bonusAmount * 0.1;

    const bonus: Bonus = {
      id: `b_${Date.now()}`,
      userId,
      type: 'DEPOSIT',
      amount: bonusAmount,
      currency: 'USD',
      status: 'PENDING',
      volumeRequirement,
      volumeProgress: 0,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    return bonus;
  }

  // Update bonus progress
  async updateProgress(bonusId: string, volume: number): Promise<Bonus> {
    // In production, update in database
    console.log(`[BONUS] Updated progress for ${bonusId}: +${volume} lots`);
    
    // Return updated bonus (mock)
    return {
      id: bonusId,
      userId: 'user',
      type: 'WELCOME',
      amount: 100,
      currency: 'USD',
      status: 'ACTIVE',
      volumeRequirement: 10,
      volumeProgress: volume,
      createdAt: new Date(),
    };
  }

  // Get bonus statistics
  async getStats(): Promise<{
    totalBonuses: number;
    activeBonuses: number;
    totalAmount: number;
    avgCompletion: number;
  }> {
    return {
      totalBonuses: 150,
      activeBonuses: 45,
      totalAmount: 25000,
      avgCompletion: 65,
    };
  }
}

// Export singleton instances
export const loyaltyService = new LoyaltyService();
export const bonusService = new BonusService();
