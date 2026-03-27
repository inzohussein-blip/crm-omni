/**
 * OMNI-CRM Loyalty API Endpoints
 * Handles loyalty program operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { loyaltyEngine } from '@/lib/loyalty-service';
import { LoyaltyTransactionType } from '@prisma/client';

// ============================================
// GET /api/loyalty - Get loyalty account and data
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'summary';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'summary':
        const account = await loyaltyEngine.getOrCreateAccount(userId);
        return NextResponse.json({ success: true, data: account });

      case 'rewards':
        const rewards = await loyaltyEngine.getAvailableRewards(userId);
        return NextResponse.json({ success: true, data: rewards });

      case 'transactions':
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const type = searchParams.get('type') as LoyaltyTransactionType | null;

        const transactions = await loyaltyEngine.getTransactionHistory(userId, {
          limit,
          offset,
          type: type || undefined,
        });
        return NextResponse.json({ success: true, data: transactions });

      case 'levels':
        const levels = loyaltyEngine.getLevels();
        return NextResponse.json({ success: true, data: levels });

      case 'leaderboard':
        const leaderboardLimit = parseInt(searchParams.get('limit') || '10');
        const period = (searchParams.get('period') || 'all') as 'all' | 'month' | 'week';
        const leaderboard = await loyaltyEngine.getLeaderboard({
          limit: leaderboardLimit,
          period,
        });
        return NextResponse.json({ success: true, data: leaderboard });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Loyalty API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/loyalty - Award or redeem points
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, ...params } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'award':
        if (!params.points || params.points <= 0) {
          return NextResponse.json(
            { success: false, error: 'points must be greater than 0' },
            { status: 400 }
          );
        }
        const awardResult = await loyaltyEngine.awardPoints({
          userId,
          points: params.points,
          sourceType: params.sourceType || 'bonus',
          sourceId: params.sourceId,
          metadata: params.metadata,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: awardResult });

      case 'earn-deposit':
        if (!params.amount || !params.transactionId) {
          return NextResponse.json(
            { success: false, error: 'amount and transactionId are required' },
            { status: 400 }
          );
        }
        const depositResult = await loyaltyEngine.earnFromDeposit(
          userId,
          params.amount,
          params.transactionId,
          params.programConfig
        );
        return NextResponse.json({ success: true, data: depositResult });

      case 'earn-trade':
        if (!params.tradeCount || !params.volumeLots) {
          return NextResponse.json(
            { success: false, error: 'tradeCount and volumeLots are required' },
            { status: 400 }
          );
        }
        const tradeResult = await loyaltyEngine.earnFromTrade(
          userId,
          params.tradeCount,
          params.volumeLots,
          params.tradeIds || [],
          params.programConfig
        );
        return NextResponse.json({ success: true, data: tradeResult });

      case 'redeem':
        if (!params.points || !params.rewardId) {
          return NextResponse.json(
            { success: false, error: 'points and rewardId are required' },
            { status: 400 }
          );
        }
        const redeemResult = await loyaltyEngine.redeemPoints({
          userId,
          points: params.points,
          rewardId: params.rewardId,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: redeemResult });

      case 'referral':
        if (!params.referrerId || !params.refereeId || !params.referralProgramId) {
          return NextResponse.json(
            { success: false, error: 'referrerId, refereeId, and referralProgramId are required' },
            { status: 400 }
          );
        }
        const referralResult = await loyaltyEngine.processReferralReward({
          referrerId: params.referrerId,
          refereeId: params.refereeId,
          referralProgramId: params.referralProgramId,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: referralResult });

      case 'adjust':
        if (!params.points || !params.reason || !params.actorId) {
          return NextResponse.json(
            { success: false, error: 'points, reason, and actorId are required' },
            { status: 400 }
          );
        }
        const adjustResult = await loyaltyEngine.adjustPoints(
          userId,
          params.points,
          params.reason,
          params.actorId,
          params.ipAddress
        );
        return NextResponse.json({ success: true, data: adjustResult });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Loyalty API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
