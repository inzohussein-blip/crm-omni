/**
 * OMNI-CRM Notifications API
 * In-app and push notification management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NotificationType } from '@prisma/client';

// ============================================
// GET NOTIFICATIONS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get('userId');
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type') as NotificationType | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (isRead !== null) {
      where.isRead = isRead === 'true';
    }
    if (type) {
      where.type = type;
    }

    // Get notifications
    const [notifications, unreadCount, totalCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({
        where: { userId, isRead: false },
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        totalCount,
        hasMore: totalCount > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// ============================================
// CREATE NOTIFICATION
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      userId,
      type,
      title,
      message,
      entityType,
      entityId,
      channels = ['in_app'],
    } = body;

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        title,
        message,
        entityType,
        entityId,
        channels: JSON.stringify(channels),
        emailSent: channels.includes('email'),
        pushSent: channels.includes('push'),
      },
    });

    // Send to WebSocket service for real-time delivery
    try {
      await fetch('http://localhost:3003/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'notification',
          payload: notification,
        }),
      });
    } catch (wsError) {
      console.error('Failed to send WebSocket notification:', wsError);
      // Don't fail the request if WebSocket is unavailable
    }

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// ============================================
// MARK AS READ
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, userId, markAllRead } = body;

    if (markAllRead && userId) {
      // Mark all as read for user
      await db.notification.updateMany({
        where: { userId, isRead: false },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'notificationId is required' },
        { status: 400 }
      );
    }

    // Mark single notification as read
    const notification = await db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
