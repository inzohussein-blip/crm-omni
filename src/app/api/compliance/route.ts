/**
 * OMNI-CRM Compliance API Routes
 * API endpoints for compliance management
 */

import { NextRequest, NextResponse } from 'next/server';
import { complianceManager, ComplianceCheckType } from '@/lib/compliance-service';
import { db } from '@/lib/db';

// ============================================
// GET /api/compliance - Get compliance data
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        return await getStats();

      case 'checks':
        return await getChecks(searchParams);

      case 'check':
        return await getCheck(searchParams.get('checkId'));

      case 'alerts':
        return await getAlerts(searchParams);

      case 'alert':
        return await getAlert(searchParams.get('alertId'));

      case 'user-checks':
        return await getUserChecks(searchParams);

      case 'dashboard':
      default:
        return await getDashboard();
    }
  } catch (error) {
    console.error('Compliance API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/compliance - Create/Execute actions
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-check':
        return await createCheck(body);

      case 'execute-check':
        return await executeCheck(body);

      case 'screen-user':
        return await screenUser(body);

      case 'acknowledge-alert':
        return await acknowledgeAlert(body);

      case 'resolve-alert':
        return await resolveAlert(body);

      case 'run-rechecks':
        return await runRechecks();

      case 'bulk-screen':
        return await bulkScreen(body);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Compliance API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// ACTION HANDLERS
// ============================================

async function getDashboard() {
  const [stats, recentChecks, activeAlerts] = await Promise.all([
    complianceManager.getDashboardStats(),
    complianceManager.getRecentChecks(10),
    complianceManager.getActiveAlerts(10),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      stats,
      recentChecks,
      activeAlerts,
    },
  });
}

async function getStats() {
  const stats = await complianceManager.getDashboardStats();

  return NextResponse.json({
    success: true,
    data: stats,
  });
}

async function getChecks(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const type = searchParams.get('type') as ComplianceCheckType | null;
  const status = searchParams.get('status');
  const userId = searchParams.get('userId');

  const where: any = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [checks, total] = await Promise.all([
    db.complianceCheck.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    db.complianceCheck.count({ where }),
  ]);

  // Fetch user details for each check
  const checksWithUsers = await Promise.all(
    checks.map(async (check) => {
      const user = await db.user.findUnique({
        where: { id: check.userId },
        include: { clientProfile: true },
      });
      return {
        ...check,
        user: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          firstName: user.clientProfile?.firstName,
          lastName: user.clientProfile?.lastName,
          country: user.clientProfile?.country,
        } : null,
      };
    })
  );

  return NextResponse.json({
    success: true,
    data: checksWithUsers,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
  });
}

async function getCheck(checkId: string | null) {
  if (!checkId) {
    return NextResponse.json(
      { success: false, error: 'Check ID required' },
      { status: 400 }
    );
  }

  const check = await db.complianceCheck.findUnique({
    where: { id: checkId },
  });

  if (!check) {
    return NextResponse.json(
      { success: false, error: 'Check not found' },
      { status: 404 }
    );
  }

  // Get user details
  const user = await db.user.findUnique({
    where: { id: check.userId },
    include: { clientProfile: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...check,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        firstName: user.clientProfile?.firstName,
        lastName: user.clientProfile?.lastName,
        country: user.clientProfile?.country,
        riskLevel: user.clientProfile?.riskLevel,
      } : null,
    },
  });
}

async function getAlerts(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');

  const where: any = {};
  if (status) where.status = status;
  if (severity) where.severity = severity;

  const [alerts, total] = await Promise.all([
    db.complianceAlert.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    }),
    db.complianceAlert.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: alerts,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
  });
}

async function getAlert(alertId: string | null) {
  if (!alertId) {
    return NextResponse.json(
      { success: false, error: 'Alert ID required' },
      { status: 400 }
    );
  }

  const alert = await db.complianceAlert.findUnique({
    where: { id: alertId },
  });

  if (!alert) {
    return NextResponse.json(
      { success: false, error: 'Alert not found' },
      { status: 404 }
    );
  }

  // Get related check if exists
  let check = null;
  if (alert.checkId) {
    check = await db.complianceCheck.findUnique({
      where: { id: alert.checkId },
    });
  }

  // Get user details if entity is a user
  let user = null;
  if (alert.entityType === 'user') {
    user = await db.user.findUnique({
      where: { id: alert.entityId },
      include: { clientProfile: true },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...alert,
      check,
      user: user ? {
        id: user.id,
        name: user.name,
        email: user.email,
        firstName: user.clientProfile?.firstName,
        lastName: user.clientProfile?.lastName,
      } : null,
    },
  });
}

async function getUserChecks(searchParams: URLSearchParams) {
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID required' },
      { status: 400 }
    );
  }

  const checks = await db.complianceCheck.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const alerts = await db.complianceAlert.findMany({
    where: {
      entityType: 'user',
      entityId: userId,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: {
      checks,
      alerts,
    },
  });
}

async function createCheck(body: any) {
  const { userId, type, provider, scheduledFor } = body;

  if (!userId || !type) {
    return NextResponse.json(
      { success: false, error: 'User ID and check type required' },
      { status: 400 }
    );
  }

  const result = await complianceManager.createCheck({
    userId,
    type,
    provider,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
  });

  return NextResponse.json({
    success: true,
    data: result,
  });
}

async function executeCheck(body: any) {
  const { checkId } = body;

  if (!checkId) {
    return NextResponse.json(
      { success: false, error: 'Check ID required' },
      { status: 400 }
    );
  }

  const result = await complianceManager.executeCheck(checkId);

  return NextResponse.json({
    success: true,
    data: result,
  });
}

async function screenUser(body: any) {
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID required' },
      { status: 400 }
    );
  }

  // Get user profile
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { clientProfile: true },
  });

  if (!user || !user.clientProfile) {
    return NextResponse.json(
      { success: false, error: 'User profile not found' },
      { status: 404 }
    );
  }

  const result = await complianceManager.screenUser({
    userId: user.id,
    firstName: user.clientProfile.firstName,
    lastName: user.clientProfile.lastName,
    dateOfBirth: user.clientProfile.dateOfBirth || undefined,
    nationality: user.clientProfile.nationality || undefined,
    country: user.clientProfile.country || undefined,
  });

  return NextResponse.json({
    success: true,
    data: result,
  });
}

async function acknowledgeAlert(body: any) {
  const { alertId } = body;

  if (!alertId) {
    return NextResponse.json(
      { success: false, error: 'Alert ID required' },
      { status: 400 }
    );
  }

  await complianceManager.acknowledgeAlert(alertId);

  return NextResponse.json({
    success: true,
    message: 'Alert acknowledged',
  });
}

async function resolveAlert(body: any) {
  const { alertId, resolvedBy, resolution, isFalsePositive } = body;

  if (!alertId || !resolvedBy || !resolution) {
    return NextResponse.json(
      { success: false, error: 'Alert ID, resolved by, and resolution required' },
      { status: 400 }
    );
  }

  await complianceManager.resolveAlert(alertId, resolvedBy, resolution, isFalsePositive);

  return NextResponse.json({
    success: true,
    message: 'Alert resolved',
  });
}

async function runRechecks() {
  const result = await complianceManager.runScheduledRechecks();

  return NextResponse.json({
    success: true,
    data: result,
  });
}

async function bulkScreen(body: any) {
  const { userIds } = body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'User IDs array required' },
      { status: 400 }
    );
  }

  const results = [];
  const errors = [];

  for (const userId of userIds) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { clientProfile: true },
      });

      if (user && user.clientProfile) {
        const result = await complianceManager.screenUser({
          userId: user.id,
          firstName: user.clientProfile.firstName,
          lastName: user.clientProfile.lastName,
          dateOfBirth: user.clientProfile.dateOfBirth || undefined,
          nationality: user.clientProfile.nationality || undefined,
          country: user.clientProfile.country || undefined,
        });
        results.push({ userId, success: true, result });
      } else {
        errors.push({ userId, error: 'User profile not found' });
      }
    } catch (error) {
      errors.push({ userId, error: String(error) });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      results,
      errors,
      totalProcessed: userIds.length,
      successCount: results.length,
      errorCount: errors.length,
    },
  });
}
