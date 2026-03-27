/**
 * OMNI-CRM IB API
 * Introducing Broker management and commissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ibCommissionService, COMMISSION_TIERS } from '@/lib/ib-commission';
import { IBStatus } from '@prisma/client';

// ============================================
// GET IB DATA
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const ibProfileId = searchParams.get('ibProfileId');
    const period = searchParams.get('period');

    switch (action) {
      case 'statistics':
        if (!ibProfileId) {
          return NextResponse.json(
            { success: false, error: 'ibProfileId is required' },
            { status: 400 }
          );
        }

        let dateRange: { from: Date; to: Date } | undefined;
        if (period) {
          const now = new Date();
          dateRange = {
            from: new Date(now.setDate(now.getDate() - parseInt(period))),
            to: new Date(),
          };
        }

        const stats = await ibCommissionService.getIBStatistics(ibProfileId, dateRange);
        return NextResponse.json({ success: true, data: stats });

      case 'tree':
        if (!ibProfileId) {
          return NextResponse.json(
            { success: false, error: 'ibProfileId is required' },
            { status: 400 }
          );
        }

        const tree = await ibCommissionService.getIBTree(ibProfileId, 3);
        return NextResponse.json({ success: true, data: tree });

      case 'commissions':
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }

        const commissions = await db.commission.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        });
        return NextResponse.json({ success: true, data: commissions });

      case 'list':
        const status = searchParams.get('status') as IBStatus | null;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const where: Record<string, unknown> = {};
        if (status) where.status = status;

        const [ibProfiles, total] = await Promise.all([
          db.iBProfile.findMany({
            where,
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true },
              },
              parentIb: {
                select: { ibCode: true, user: { select: { name: true } } },
              },
              _count: {
                select: { children: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          }),
          db.iBProfile.count({ where }),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            ibProfiles,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
        });

      case 'tiers':
        return NextResponse.json({
          success: true,
          data: {
            tiers: COMMISSION_TIERS,
            description: 'Commission tiers for each level in the IB hierarchy',
          },
        });

      default:
        // Get single IB profile
        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }

        const ibProfile = await db.iBProfile.findUnique({
          where: { userId },
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
            referralLinks: { where: { isActive: true } },
            banners: { where: { isActive: true }, take: 5 },
          },
        });

        if (!ibProfile) {
          return NextResponse.json(
            { success: false, error: 'IB profile not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({ success: true, data: ibProfile });
    }
  } catch (error) {
    console.error('Error fetching IB data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch IB data' },
      { status: 500 }
    );
  }
}

// ============================================
// CREATE/UPDATE IB
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'approve_commission':
        return await handleApproveCommission(params, request);

      case 'batch_approve':
        return await handleBatchApprove(params, request);

      case 'create_referral_link':
        return await handleCreateReferralLink(params);

      case 'register_client':
        return await handleRegisterClient(params);

      case 'approve_ib':
        return await handleApproveIB(params, request);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing IB request:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}

// ============================================
// APPROVE COMMISSION
// ============================================

async function handleApproveCommission(params: Record<string, unknown>, request: NextRequest) {
  const { commissionId, approvedBy } = params;

  if (!commissionId || !approvedBy) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  await ibCommissionService.approveCommission(
    commissionId as string,
    approvedBy as string
  );

  return NextResponse.json({
    success: true,
    message: 'Commission approved successfully',
  });
}

// ============================================
// BATCH APPROVE COMMISSIONS
// ============================================

async function handleBatchApprove(params: Record<string, unknown>, request: NextRequest) {
  const { commissionIds, approvedBy } = params;

  if (!Array.isArray(commissionIds) || !approvedBy) {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }

  const result = await ibCommissionService.batchApproveCommissions(
    commissionIds as string[],
    approvedBy as string
  );

  return NextResponse.json({
    success: true,
    data: result,
  });
}

// ============================================
// CREATE REFERRAL LINK
// ============================================

async function handleCreateReferralLink(params: Record<string, unknown>) {
  const { ibProfileId, name, utmSource, utmMedium, utmCampaign } = params;

  if (!ibProfileId) {
    return NextResponse.json(
      { success: false, error: 'ibProfileId is required' },
      { status: 400 }
    );
  }

  // Generate unique code
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();

  const referralLink = await db.referralLink.create({
    data: {
      ibProfileId: ibProfileId as string,
      code,
      name: name as string,
      utmSource: utmSource as string,
      utmMedium: utmMedium as string,
      utmCampaign: utmCampaign as string,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...referralLink,
      fullUrl: `https://yourbroker.com/register?ref=${code}${utmSource ? `&utm_source=${utmSource}` : ''}`,
    },
  });
}

// ============================================
// REGISTER CLIENT UNDER IB
// ============================================

async function handleRegisterClient(params: Record<string, unknown>) {
  const { clientId, ibCode, referralLinkId, utmSource, utmMedium, utmCampaign } = params;

  if (!clientId || !ibCode) {
    return NextResponse.json(
      { success: false, error: 'clientId and ibCode are required' },
      { status: 400 }
    );
  }

  // Find IB by code
  const ibProfile = await db.iBProfile.findFirst({
    where: { ibCode: ibCode as string, status: 'ACTIVE' },
  });

  if (!ibProfile) {
    return NextResponse.json(
      { success: false, error: 'Invalid or inactive IB code' },
      { status: 400 }
    );
  }

  // Check if client already has a referral
  const existing = await db.iBReferral.findFirst({
    where: { clientId: clientId as string },
  });

  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Client already has a referrer' },
      { status: 400 }
    );
  }

  // Create referral record
  const referral = await db.iBReferral.create({
    data: {
      clientId: clientId as string,
      ibId: ibProfile.userId,
      level: 1,
      status: 'active',
      referralLinkId: referralLinkId as string,
      utmSource: utmSource as string,
      utmMedium: utmMedium as string,
      utmCampaign: utmCampaign as string,
    },
  });

  // Update IB stats
  await db.iBProfile.update({
    where: { id: ibProfile.id },
    data: {
      totalClients: { increment: 1 },
      activeClients: { increment: 1 },
    },
  });

  return NextResponse.json({
    success: true,
    data: referral,
  });
}

// ============================================
// APPROVE IB APPLICATION
// ============================================

async function handleApproveIB(params: Record<string, unknown>, request: NextRequest) {
  const { ibProfileId, approvedBy, parentIbId } = params;

  if (!ibProfileId || !approvedBy) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  // Generate IB code
  const ibCode = 'IB-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const ibProfile = await db.iBProfile.update({
    where: { id: ibProfileId as string },
    data: {
      status: 'ACTIVE',
      ibCode,
      approvedAt: new Date(),
      approvedBy: approvedBy as string,
      parentIbId: parentIbId as string,
    },
  });

  // Create IB wallet
  await db.wallet.create({
    data: {
      userId: ibProfile.userId,
      walletType: 'IB',
      currency: 'USD',
      balance: 0,
      status: 'ACTIVE',
    },
  });

  return NextResponse.json({
    success: true,
    data: ibProfile,
  });
}
