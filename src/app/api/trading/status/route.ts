/**
 * Trading Connectivity Status API
 * يعطي حالة اتصال سيرفرات MT4/MT5 بشكل مبسط.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const windowMs = 2 * 60 * 1000; // 2 minutes

    const activeAccounts = await db.tradingAccount.findMany({
      where: { status: 'ACTIVE' },
      select: { lastSyncAt: true },
      take: 2000,
    });

    const recentlySynced = activeAccounts.filter(a => a.lastSyncAt && (now.getTime() - a.lastSyncAt.getTime()) <= windowMs).length;

    // هذه project template لا يفرّق بين MT4 و MT5 في الـ schema
    const mt4Configured = Boolean(process.env.MT4_SERVER || process.env.MT_SERVER);
    const mt5Configured = Boolean(process.env.MT5_SERVER || process.env.MT_SERVER);

    const status = {
      mt4: {
        configured: mt4Configured,
        connected: mt4Configured && (activeAccounts.length === 0 || recentlySynced > 0),
      },
      mt5: {
        configured: mt5Configured,
        connected: mt5Configured && (activeAccounts.length === 0 || recentlySynced > 0),
      },
      meta: {
        activeAccounts: activeAccounts.length,
        recentlySynced,
        checkedAt: now.toISOString(),
      },
    };

    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('Trading status error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get trading status' }, { status: 500 });
  }
}
