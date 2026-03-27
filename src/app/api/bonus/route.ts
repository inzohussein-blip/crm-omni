/**
 * OMNI-CRM Bonus API Endpoints
 * Handles bonus management operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { bonusManager } from '@/lib/bonus-service';
import { BonusType } from '@prisma/client';

// ============================================
// GET /api/bonus - Get bonus data
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'summary';

    switch (action) {
      case 'summary':
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }
        const summary = await bonusManager.getUserBonusSummary(userId);
        return NextResponse.json({ success: true, data: summary });

      case 'details':
        const bonusId = searchParams.get('bonusId');
        if (!bonusId) {
          return NextResponse.json(
            { success: false, error: 'bonusId is required' },
            { status: 400 }
          );
        }
        const details = await bonusManager.getBonusDetails(bonusId);
        if (!details) {
          return NextResponse.json(
            { success: false, error: 'Bonus not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: details });

      case 'configs':
        const configs = bonusManager.getConfigs();
        return NextResponse.json({ success: true, data: configs });

      case 'eligible':
        const depositAmount = parseFloat(searchParams.get('depositAmount') || '0');
        const type = searchParams.get('type') as BonusType | null;
        if (depositAmount <= 0) {
          return NextResponse.json(
            { success: false, error: 'depositAmount must be greater than 0' },
            { status: 400 }
          );
        }
        const eligible = bonusManager.getEligibleBonuses(depositAmount, type || undefined);
        return NextResponse.json({ success: true, data: eligible });

      case 'statistics':
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const stats = await bonusManager.getStatistics({
          dateFrom: dateFrom ? new Date(dateFrom) : undefined,
          dateTo: dateTo ? new Date(dateTo) : undefined,
        });
        return NextResponse.json({ success: true, data: stats });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Bonus API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/bonus - Create and manage bonuses
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, ...params } = body;

    switch (action) {
      case 'create':
        if (!userId || !params.name || !params.type || !params.amount) {
          return NextResponse.json(
            { success: false, error: 'userId, name, type, and amount are required' },
            { status: 400 }
          );
        }
        const createResult = await bonusManager.createBonus({
          userId,
          name: params.name,
          type: params.type,
          amount: params.amount,
          currency: params.currency,
          volumeRequired: params.volumeRequired,
          timeLimit: params.timeLimit,
          metadata: params.metadata,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: createResult });

      case 'welcome':
        if (!userId || !params.depositAmount) {
          return NextResponse.json(
            { success: false, error: 'userId and depositAmount are required' },
            { status: 400 }
          );
        }
        const welcomeResult = await bonusManager.processWelcomeBonus({
          userId,
          depositAmount: params.depositAmount,
          currency: params.currency,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: welcomeResult });

      case 'deposit':
        if (!userId || !params.depositAmount || !params.depositId) {
          return NextResponse.json(
            { success: false, error: 'userId, depositAmount, and depositId are required' },
            { status: 400 }
          );
        }
        const depositResult = await bonusManager.processDepositBonus({
          userId,
          depositAmount: params.depositAmount,
          depositId: params.depositId,
          currency: params.currency,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: depositResult });

      case 'reload':
        if (!userId || !params.depositAmount || !params.depositId) {
          return NextResponse.json(
            { success: false, error: 'userId, depositAmount, and depositId are required' },
            { status: 400 }
          );
        }
        const reloadResult = await bonusManager.processReloadBonus({
          userId,
          depositAmount: params.depositAmount,
          depositId: params.depositId,
          currency: params.currency,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: reloadResult });

      case 'volume-update':
        if (!userId || !params.volumeLots) {
          return NextResponse.json(
            { success: false, error: 'userId and volumeLots are required' },
            { status: 400 }
          );
        }
        const volumeResult = await bonusManager.updateVolumeProgress({
          userId,
          volumeLots: params.volumeLots,
          tradeIds: params.tradeIds,
        });
        return NextResponse.json({ success: true, data: volumeResult });

      case 'cancel':
        if (!params.bonusId || !params.reason || !params.actorId) {
          return NextResponse.json(
            { success: false, error: 'bonusId, reason, and actorId are required' },
            { status: 400 }
          );
        }
        const cancelResult = await bonusManager.cancelBonus(
          params.bonusId,
          params.reason,
          params.actorId,
          params.ipAddress
        );
        return NextResponse.json({ success: true, data: cancelResult });

      case 'promotional':
        if (!userId || !params.amount || !params.name || !params.actorId) {
          return NextResponse.json(
            { success: false, error: 'userId, amount, name, and actorId are required' },
            { status: 400 }
          );
        }
        const promoResult = await bonusManager.createPromotionalBonus({
          userId,
          amount: params.amount,
          name: params.name,
          volumeRequired: params.volumeRequired,
          timeLimit: params.timeLimit,
          actorId: params.actorId,
          ipAddress: params.ipAddress,
        });
        return NextResponse.json({ success: true, data: promoResult });

      case 'process-expired':
        const expiredResult = await bonusManager.processExpiredBonuses();
        return NextResponse.json({ success: true, data: expiredResult });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Bonus API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
