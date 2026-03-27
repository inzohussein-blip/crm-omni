/**
 * OMNI-CRM Hardware ID (HID) Middleware API
 * Device Fingerprint Validation for Staff Access Control
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateHardwareId, verifyHardwareId } from '@/lib/security';
import { auditService } from '@/lib/audit';
import { DeviceStatus } from '@prisma/client';

// ============================================
// DEVICE REGISTRATION & VALIDATION
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'register':
        return await handleDeviceRegistration(params, request);

      case 'validate':
        return await handleDeviceValidation(params, request);

      case 'approve':
        return await handleDeviceApproval(params, request);

      case 'revoke':
        return await handleDeviceRevocation(params, request);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('HID middleware error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Request failed' },
      { status: 500 }
    );
  }
}

// ============================================
// GET DEVICES
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') as DeviceStatus | null;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const devices = await db.device.findMany({
      where,
      orderBy: { lastUsedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

// ============================================
// DEVICE REGISTRATION
// ============================================

async function handleDeviceRegistration(params: Record<string, unknown>, request: NextRequest) {
  const { userId, deviceName, deviceType, osType, browserType, screenResolution, timezone, language, canvas, webgl } = params;

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId is required' },
      { status: 400 }
    );
  }

  // Generate Hardware ID from fingerprint data
  const hardwareId = generateHardwareId({
    deviceName: deviceName as string,
    deviceType: deviceType as string,
    osType: osType as string,
    browserType: browserType as string,
    screenResolution: screenResolution as string,
    timezone: timezone as string,
    language: language as string,
    canvas: canvas as string,
    webgl: webgl as string,
  });

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Check if device already exists
  const existingDevice = await db.device.findUnique({
    where: { hardwareId },
  });

  if (existingDevice) {
    // Update last used
    await db.device.update({
      where: { id: existingDevice.id },
      data: {
        lastUsedAt: new Date(),
        lastIP: ipAddress,
        userAgent,
      },
    });

    if (existingDevice.status === 'APPROVED') {
      return NextResponse.json({
        success: true,
        data: {
          deviceId: existingDevice.id,
          hardwareId: existingDevice.hardwareId,
          status: existingDevice.status,
          message: 'Device recognized and approved',
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Device is not approved for access',
        data: {
          deviceId: existingDevice.id,
          status: existingDevice.status,
        },
      }, { status: 403 });
    }
  }

  // Get user type to determine if approval is needed
  const user = await db.user.findUnique({
    where: { id: userId as string },
  });

  const needsApproval = user?.userType === 'ADMIN' || user?.userType === 'STAFF';

  // Create new device
  const device = await db.device.create({
    data: {
      userId: userId as string,
      hardwareId,
      deviceName: deviceName as string,
      deviceType: deviceType as string,
      osType: osType as string,
      browserType: browserType as string,
      status: needsApproval ? 'PENDING' : 'APPROVED',
      lastUsedAt: new Date(),
      lastIP: ipAddress,
      userAgent,
    },
  });

  // Audit log
  await auditService.log({
    action: 'CREATE',
    entityType: 'Device',
    entityId: device.id,
    newValue: { hardwareId, deviceType, osType },
    context: {
      userId: userId as string,
      ipAddress,
      userAgent,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      deviceId: device.id,
      hardwareId: device.hardwareId,
      status: device.status,
      message: needsApproval
        ? 'Device registered. Awaiting admin approval.'
        : 'Device registered and approved.',
    },
  });
}

// ============================================
// DEVICE VALIDATION (for middleware)
// ============================================

async function handleDeviceValidation(params: Record<string, unknown>, request: NextRequest) {
  const { userId, hardwareId } = params;

  if (!userId || !hardwareId) {
    return NextResponse.json(
      { success: false, error: 'userId and hardwareId are required' },
      { status: 400 }
    );
  }

  const device = await db.device.findFirst({
    where: {
      userId: userId as string,
      hardwareId: hardwareId as string,
    },
  });

  if (!device) {
    return NextResponse.json({
      success: false,
      error: 'Device not registered',
      valid: false,
    }, { status: 403 });
  }

  if (device.status !== 'APPROVED') {
    return NextResponse.json({
      success: false,
      error: `Device status: ${device.status}`,
      valid: false,
      deviceStatus: device.status,
    }, { status: 403 });
  }

  // Update last used
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  await db.device.update({
    where: { id: device.id },
    data: {
      lastUsedAt: new Date(),
      lastIP: ipAddress,
    },
  });

  return NextResponse.json({
    success: true,
    valid: true,
    data: {
      deviceId: device.id,
      lastUsedAt: device.lastUsedAt,
    },
  });
}

// ============================================
// DEVICE APPROVAL (Admin Only)
// ============================================

async function handleDeviceApproval(params: Record<string, unknown>, request: NextRequest) {
  const { deviceId, approvedBy } = params;

  if (!deviceId || !approvedBy) {
    return NextResponse.json(
      { success: false, error: 'deviceId and approvedBy are required' },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  const device = await db.device.update({
    where: { id: deviceId as string },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: approvedBy as string,
    },
  });

  // Audit log
  await auditService.logDeviceAction({
    action: 'DEVICE_APPROVE',
    deviceId: device.id,
    userId: device.userId,
    actorId: approvedBy as string,
    ipAddress,
  });

  return NextResponse.json({
    success: true,
    message: 'Device approved successfully',
    data: device,
  });
}

// ============================================
// DEVICE REVOCATION (Admin Only)
// ============================================

async function handleDeviceRevocation(params: Record<string, unknown>, request: NextRequest) {
  const { deviceId, revokedBy, reason } = params;

  if (!deviceId || !revokedBy) {
    return NextResponse.json(
      { success: false, error: 'deviceId and revokedBy are required' },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  const device = await db.device.update({
    where: { id: deviceId as string },
    data: {
      status: 'REVOKED',
    },
  });

  // Invalidate all sessions for this device
  await db.session.updateMany({
    where: { deviceId: deviceId as string },
    data: { isActive: false },
  });

  // Audit log
  await auditService.logDeviceAction({
    action: 'DEVICE_REVOKE',
    deviceId: device.id,
    userId: device.userId,
    actorId: revokedBy as string,
    ipAddress,
  });

  return NextResponse.json({
    success: true,
    message: 'Device revoked successfully',
    data: device,
  });
}
