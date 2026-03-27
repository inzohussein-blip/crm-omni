/**
 * OMNI-CRM Send Notifications API
 * Send notifications via multiple channels
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  NotificationService,
  NotificationQueue,
  NotificationTemplateService,
  initializeDefaultTemplates,
} from '@/lib/notification-advanced';
import { NotificationType } from '@prisma/client';

// Initialize default templates on first request
let templatesInitialized = false;

// ============================================
// SEND NOTIFICATION
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Initialize default templates if not done
    if (!templatesInitialized) {
      await initializeDefaultTemplates();
      templatesInitialized = true;
    }

    const body = await request.json();
    const { action } = body;

    // Handle different actions
    switch (action) {
      case 'send_template':
        return await handleSendTemplate(body);
      
      case 'send_direct':
        return await handleSendDirect(body);
      
      case 'send_bulk':
        return await handleSendBulk(body);
      
      case 'enqueue':
        return await handleEnqueue(body);
      
      case 'process_queue':
        return await handleProcessQueue();
      
      case 'queue_stats':
        return await handleQueueStats();
      
      case 'preview_template':
        return await handlePreviewTemplate(body);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: send_template, send_direct, send_bulk, enqueue, process_queue, queue_stats, or preview_template' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in send notification API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================
// SEND USING TEMPLATE
// ============================================

async function handleSendTemplate(body: {
  userId: string;
  templateName: string;
  variables: Record<string, unknown>;
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
  enqueue?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: string;
}) {
  const { userId, templateName, variables, channels, enqueue, priority, scheduledAt } = body;

  if (!userId || !templateName) {
    return NextResponse.json(
      { success: false, error: 'userId and templateName are required' },
      { status: 400 }
    );
  }

  const result = await NotificationService.sendWithTemplate({
    userId,
    templateName,
    variables: variables || {},
    channels,
    enqueue,
    priority,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
  });

  return NextResponse.json({
    success: result.success,
    data: result.queuedId ? { queuedId: result.queuedId } : undefined,
    error: result.error,
  });
}

// ============================================
// SEND DIRECT NOTIFICATION
// ============================================

async function handleSendDirect(body: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
  entityType?: string;
  entityId?: string;
}) {
  const { userId, type, title, message, channels, entityType, entityId } = body;

  if (!userId || !type || !title || !message) {
    return NextResponse.json(
      { success: false, error: 'userId, type, title, and message are required' },
      { status: 400 }
    );
  }

  // Validate type
  const validTypes: NotificationType[] = [
    'DEPOSIT', 'WITHDRAWAL', 'TRADE', 'KYC', 'TASK', 
    'COMMISSION', 'SYSTEM', 'SECURITY', 'MARKETING'
  ];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  const result = await NotificationService.sendDirect({
    userId,
    type,
    title,
    message,
    channels,
    entityType,
    entityId,
  });

  return NextResponse.json({
    success: result.success,
    error: result.error,
  });
}

// ============================================
// SEND BULK NOTIFICATIONS
// ============================================

async function handleSendBulk(body: {
  userIds: string[];
  templateName: string;
  variables: Record<string, unknown> | Record<string, (userId: string) => Record<string, unknown>>;
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
  enqueue?: boolean;
}) {
  const { userIds, templateName, variables, channels, enqueue } = body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'userIds array is required' },
      { status: 400 }
    );
  }

  if (!templateName) {
    return NextResponse.json(
      { success: false, error: 'templateName is required' },
      { status: 400 }
    );
  }

  const result = await NotificationService.sendBulk({
    userIds,
    templateName,
    variables: typeof variables === 'object' && !Object.keys(variables).length
      ? () => ({})
      : variables as Record<string, unknown>,
    channels,
    enqueue,
  });

  return NextResponse.json({
    success: result.success,
    data: {
      total: result.total,
      queued: result.queued,
      sent: result.sent,
      failed: result.failed,
    },
  });
}

// ============================================
// ENQUEUE NOTIFICATION
// ============================================

async function handleEnqueue(body: {
  userId: string;
  templateName: string;
  variables: Record<string, unknown>;
  channels?: ('email' | 'sms' | 'push' | 'in_app')[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: string;
  maxAttempts?: number;
}) {
  const { userId, templateName, variables, channels, priority, scheduledAt, maxAttempts } = body;

  if (!userId || !templateName) {
    return NextResponse.json(
      { success: false, error: 'userId and templateName are required' },
      { status: 400 }
    );
  }

  const queuedId = NotificationQueue.enqueue({
    userId,
    templateName,
    variables: variables || {},
    channels: channels || ['in_app'],
    priority: priority || 'normal',
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    maxAttempts,
  });

  return NextResponse.json({
    success: true,
    data: { queuedId },
    message: 'Notification enqueued successfully',
  });
}

// ============================================
// PROCESS QUEUE
// ============================================

async function handleProcessQueue() {
  try {
    await NotificationQueue.processNow();
    
    return NextResponse.json({
      success: true,
      message: 'Queue processed',
      stats: NotificationQueue.getStats(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process queue',
    });
  }
}

// ============================================
// GET QUEUE STATS
// ============================================

async function handleQueueStats() {
  return NextResponse.json({
    success: true,
    data: NotificationQueue.getStats(),
  });
}

// ============================================
// PREVIEW TEMPLATE
// ============================================

async function handlePreviewTemplate(body: {
  templateName: string;
  variables: Record<string, unknown>;
  language?: string;
}) {
  const { templateName, variables, language } = body;

  if (!templateName) {
    return NextResponse.json(
      { success: false, error: 'templateName is required' },
      { status: 400 }
    );
  }

  const template = await NotificationTemplateService.getTemplate(templateName, language || 'en');

  if (!template) {
    return NextResponse.json(
      { success: false, error: 'Template not found' },
      { status: 404 }
    );
  }

  const processed = NotificationTemplateService.processTemplate(template, variables || {});

  return NextResponse.json({
    success: true,
    data: {
      original: {
        subject: template.subject,
        title: template.title,
        body: template.body,
        htmlContent: template.htmlContent,
      },
      preview: processed,
      variables: template.variables,
    },
  });
}

// ============================================
// GET QUEUE ITEM STATUS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const queuedId = searchParams.get('queuedId');

    if (action === 'status' && queuedId) {
      const item = NotificationQueue.getItem(queuedId);
      
      if (!item) {
        return NextResponse.json(
          { success: false, error: 'Queue item not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: item,
      });
    }

    if (action === 'stats') {
      return NextResponse.json({
        success: true,
        data: NotificationQueue.getStats(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: status or stats' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in send notification API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
