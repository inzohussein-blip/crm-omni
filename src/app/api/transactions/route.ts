/**
 * OMNI-CRM Transactions API
 * Secure Transaction Management with Encryption
 */

import { NextRequest, NextResponse } from 'next/server';
import { walletService } from '@/lib/wallet-service';
import { parseSecureRequest, secureResponse } from '@/lib/security';

// ============================================
// GET TRANSACTIONS LIST
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (userId) where.userId = userId;
    if (type) where.type = type;
    if (status) where.status = status;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    
    const [transactions, total] = await Promise.all([
      walletService['db'].transaction.findMany({
        where,
        include: {
          fromWallet: {
            select: { id: true, walletType: true, currency: true },
          },
          toWallet: {
            select: { id: true, walletType: true, currency: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      walletService['db'].transaction.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// We need to import db for direct queries
import { db } from '@/lib/db';

// Update the service reference
(walletService as any).db = db;
