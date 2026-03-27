/**
 * OMNI-CRM Hardware ID Middleware
 * Mandatory Device Fingerprinting for Staff Access
 * 
 * Security Layer:
 * - Validates device fingerprint against registered devices
 * - Blocks access from unregistered devices
 * - Logs all access attempts
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditService } from '@/lib/audit';
import { verifyHardwareId, generateHardwareId, parseUserAgent, decryptData, encryptData } from '@/lib/security';

// ============================================
// TYPES
// ============================================

interface DeviceValidationResult {
  valid: boolean;
  deviceId?: string;
  error?: string;
  requiresApproval?: boolean;
}

// ============================================
// PUBLIC ROUTES (No HID Required)
// ============================================

const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/public',
  '/api/health',
  '/api/ping',
];

// ============================================
// DEVICE VALIDATION
// ============================================

async function validateDeviceAccess(
  userId: string,
  fingerprint: {
    hardwareId?: string;
    deviceName?: string;
    deviceType?: string;
    osType?: string;
    browserType?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    canvas?: string;
    webgl?: string;
  },
  ipAddress: string,
  userAgent: string
): Promise<DeviceValidationResult> {
  // Get user's registered devices
  const userDevices = await db.device.findMany({
    where: {
      userId,
      status: 'APPROVED',
    },
  });

  // If no devices registered, require device registration
  if (userDevices.length === 0) {
    // Create pending device request
    const generatedHid = generateHardwareId({
      deviceName: fingerprint.deviceName,
      deviceType: fingerprint.deviceType,
      osType: fingerprint.osType,
      browserType: fingerprint.browserType,
      screenResolution: fingerprint.screenResolution,
      timezone: fingerprint.timezone,
      language: fingerprint.language,
      canvas: fingerprint.canvas,
      webgl: fingerprint.webgl,
    });

    const newDevice = await db.device.create({
      data: {
        userId,
        hardwareId: generatedHid,
        deviceName: fingerprint.deviceName,
        deviceType: fingerprint.deviceType,
        osType: fingerprint.osType,
        browserType: fingerprint.browserType,
        status: 'PENDING',
        lastIP: ipAddress,
        userAgent: userAgent,
      },
    });

    return {
      valid: false,
      deviceId: newDevice.id,
      requiresApproval: true,
      error: 'Device not registered. Please wait for admin approval.',
    };
  }

  // Verify fingerprint against registered devices
  for (const device of userDevices) {
    const isValid = verifyHardwareId(device.hardwareId, {
      deviceName: fingerprint.deviceName,
      deviceType: fingerprint.deviceType,
      osType: fingerprint.osType,
      browserType: fingerprint.browserType,
      screenResolution: fingerprint.screenResolution,
      timezone: fingerprint.timezone,
      language: fingerprint.language,
      canvas: fingerprint.canvas,
      webgl: fingerprint.webgl,
    });

    if (isValid) {
      // Update last used
      await db.device.update({
        where: { id: device.id },
        data: {
          lastUsedAt: new Date(),
          lastIP: ipAddress,
          userAgent: userAgent,
        },
      });

      return { valid: true, deviceId: device.id };
    }
  }

  // Check if there's a pending device request
  const pendingDevice = await db.device.findFirst({
    where: {
      userId,
      status: 'PENDING',
    },
  });

  if (pendingDevice) {
    return {
      valid: false,
      deviceId: pendingDevice.id,
      requiresApproval: true,
      error: 'Device registration pending approval.',
    };
  }

  // Unknown device - log suspicious activity
  await auditService.log({
    action: 'SUSPICIOUS_ACTIVITY',
    entityType: 'Device',
    newValue: {
      reason: 'Unknown device access attempt',
      fingerprint,
      ipAddress,
    },
    context: {
      userId,
      ipAddress,
      userAgent,
    },
  });

  return {
    valid: false,
    error: 'Access denied. Device not recognized.',
  };
}

// ============================================
// MIDDLEWARE FUNCTION
// ============================================

export async function hardwareIdMiddleware(
  request: NextRequest,
  userId?: string,
  userType?: string
): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;

  // Skip public routes
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return null;
  }

  // Only apply to staff (ADMIN, STAFF) - not clients or IB
  if (!userId || !userType || !['ADMIN', 'STAFF'].includes(userType)) {
    return null;
  }

  // Get device fingerprint (يدعم payload واحد مُشفّر/مُرمّز Base64)
  let fingerprint: any = {
    hardwareId: request.headers.get('x-hardware-id') || undefined,
    deviceName: request.headers.get('x-device-name') || undefined,
    deviceType: request.headers.get('x-device-type') || undefined,
    osType: request.headers.get('x-os-type') || undefined,
    browserType: request.headers.get('x-browser-type') || undefined,
    screenResolution: request.headers.get('x-screen-resolution') || undefined,
    timezone: request.headers.get('x-timezone') || undefined,
    language: request.headers.get('x-language') || undefined,
    canvas: request.headers.get('x-canvas') || undefined,
    webgl: request.headers.get('x-webgl') || undefined,
  };

  const devicePayload = request.headers.get('x-device-payload');
  if (devicePayload) {
    // 1) base64(JSON)
    try {
      const json = Buffer.from(devicePayload, 'base64').toString('utf8');
      fingerprint = JSON.parse(json);
    } catch {
      // 2) decryptData (AES + double base64)
      try {
        fingerprint = JSON.parse(decryptData(devicePayload));
      } catch {
        // ignore and fallback to per-header fingerprint
      }
    }
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Validate device
  const validation = await validateDeviceAccess(
    userId,
    fingerprint,
    ipAddress,
    userAgent
  );

  if (!validation.valid) {
    // تشفير رسالة الخطأ (Base64 مزدوج + AES) ليتماشى مع سياسة النظام
    return NextResponse.json(
      {
        success: false,
        error: encryptData(validation.error || 'Access denied'),
        requiresDeviceApproval: validation.requiresApproval,
        deviceId: validation.deviceId,
      },
      { status: 403 }
    );
  }

  // Add device ID to request headers for downstream use
  request.headers.set('x-validated-device-id', validation.deviceId || '');

  return null; // Continue with request
}

// ============================================
// DEVICE MANAGEMENT API HELPERS
// ============================================

export async function approveDevice(
  deviceId: string,
  approverId: string,
  ipAddress: string
) {
  const device = await db.device.update({
    where: { id: deviceId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: approverId,
    },
  });

  await auditService.logDeviceAction({
    action: 'DEVICE_APPROVE',
    deviceId,
    userId: device.userId,
    actorId: approverId,
    ipAddress,
  });

  return device;
}

export async function revokeDevice(
  deviceId: string,
  revokerId: string,
  ipAddress: string
) {
  const device = await db.device.update({
    where: { id: deviceId },
    data: {
      status: 'REVOKED',
    },
  });

  await auditService.logDeviceAction({
    action: 'DEVICE_REVOKE',
    deviceId,
    userId: device.userId,
    actorId: revokerId,
    ipAddress,
  });

  return device;
}

export async function getUserDevices(userId: string) {
  return db.device.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
  });
}

export async function getPendingDevices() {
  return db.device.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
