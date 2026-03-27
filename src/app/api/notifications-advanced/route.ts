/**
 * Advanced Notifications API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notification-advanced';

// GET - Fetch user notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo_user';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const action = searchParams.get('action');

    // Handle different actions
    switch (action) {
      case 'unread_count':
        const count = await notificationService.getUnreadCount(userId);
        return NextResponse.json({ success: true, data: { count } });

      case 'preferences':
        const preferences = await notificationService.getUserPreferences(userId);
        return NextResponse.json({ success: true, data: preferences });

      case 'templates':
        const templates = await notificationService.getTemplates();
        return NextResponse.json({ success: true, data: templates });

      default:
        const { notifications, total } = await notificationService.getUserNotifications(userId, {
          limit,
          offset,
          unreadOnly,
        });
        return NextResponse.json({
          success: true,
          data: { notifications, total, limit, offset },
        });
    }
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST - Send notification or mark as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, notificationId, preferences, ...data } = body;

    switch (action) {
      case 'mark_read':
        await notificationService.markAsRead(notificationId);
        return NextResponse.json({ success: true, message: 'Marked as read' });

      case 'mark_all_read':
        await notificationService.markAllAsRead(userId);
        return NextResponse.json({ success: true, message: 'All marked as read' });

      case 'update_preferences':
        await notificationService.updateUserPreferences(userId, preferences);
        return NextResponse.json({ success: true, message: 'Preferences updated' });

      case 'send_deposit':
        await notificationService.sendDepositNotification(userId, data);
        return NextResponse.json({ success: true, message: 'Deposit notification sent' });

      case 'send_withdrawal':
        await notificationService.sendWithdrawalNotification(userId, data);
        return NextResponse.json({ success: true, message: 'Withdrawal notification sent' });

      case 'send_kyc':
        await notificationService.sendKYCNotification(userId, data.status, data.reason);
        return NextResponse.json({ success: true, message: 'KYC notification sent' });

      case 'send_security':
        await notificationService.sendSecurityAlert(userId, data);
        return NextResponse.json({ success: true, message: 'Security alert sent' });

      case 'send_task':
        await notificationService.sendTaskNotification(userId, data);
        return NextResponse.json({ success: true, message: 'Task notification sent' });

      case 'send_commission':
        await notificationService.sendCommissionNotification(userId, data);
        return NextResponse.json({ success: true, message: 'Commission notification sent' });

      default:
        // Generic send
        await notificationService.send({
          userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data,
          channels: data.channels,
          priority: data.priority,
        });
        return NextResponse.json({ success: true, message: 'Notification sent' });
    }
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

// PUT - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    await notificationService.updateUserPreferences(userId, preferences);
    return NextResponse.json({ success: true, message: 'Preferences updated' });
  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
