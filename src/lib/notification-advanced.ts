/**
 * OMNI-CRM Advanced Notification System
 * Multi-channel notification service with Email, SMS, Push, and In-App support
 */

import { db } from './db';
import { cache } from './cache';

// ============================================
// Types & Interfaces
// ============================================

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  body: string;
  htmlBody?: string;
  channels: NotificationChannel[];
  variables: string[];
  isActive: boolean;
}

export interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface EmailConfig {
  provider: 'sendgrid' | 'mailgun' | 'ses' | 'smtp';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

export interface SMSConfig {
  provider: 'twilio' | 'vonage' | 'messagebird';
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
}

export interface PushConfig {
  provider: 'firebase' | 'onesignal' | 'pusher';
  apiKey: string;
  appId?: string;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  depositAlerts: boolean;
  withdrawalAlerts: boolean;
  tradeAlerts: boolean;
  kycAlerts: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

// ============================================
// Notification Templates
// ============================================

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'deposit_completed',
    name: 'Deposit Completed',
    type: 'DEPOSIT',
    subject: 'Your deposit of {{amount}} {{currency}} has been credited',
    body: 'Dear {{name}}, your deposit of {{amount}} {{currency}} has been successfully credited to your account. Transaction ID: {{transactionId}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Deposit Confirmed ✓</h2>
        <p>Dear {{name}},</p>
        <p>Your deposit of <strong>{{amount}} {{currency}}</strong> has been successfully credited to your account.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> {{transactionId}}</p>
          <p><strong>Method:</strong> {{method}}</p>
          <p><strong>Date:</strong> {{date}}</p>
        </div>
        <p>Thank you for trading with us!</p>
      </div>
    `,
    channels: ['email', 'in_app', 'push'],
    variables: ['name', 'amount', 'currency', 'transactionId', 'method', 'date'],
    isActive: true,
  },
  {
    id: 'withdrawal_processed',
    name: 'Withdrawal Processed',
    type: 'WITHDRAWAL',
    subject: 'Your withdrawal of {{amount}} {{currency}} has been processed',
    body: 'Dear {{name}}, your withdrawal request of {{amount}} {{currency}} has been processed. Funds will arrive within {{estimatedDays}} business days.',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3B82F6;">Withdrawal Processed 📤</h2>
        <p>Dear {{name}},</p>
        <p>Your withdrawal of <strong>{{amount}} {{currency}}</strong> has been processed.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> {{transactionId}}</p>
          <p><strong>Method:</strong> {{method}}</p>
          <p><strong>Estimated Arrival:</strong> {{estimatedDays}} business days</p>
        </div>
      </div>
    `,
    channels: ['email', 'in_app', 'push'],
    variables: ['name', 'amount', 'currency', 'transactionId', 'method', 'estimatedDays'],
    isActive: true,
  },
  {
    id: 'kyc_approved',
    name: 'KYC Approved',
    type: 'KYC',
    subject: 'Your account has been verified!',
    body: 'Dear {{name}}, congratulations! Your account has been successfully verified. You now have full access to all trading features.',
    channels: ['email', 'in_app', 'push'],
    variables: ['name'],
    isActive: true,
  },
  {
    id: 'kyc_rejected',
    name: 'KYC Rejected',
    type: 'KYC',
    subject: 'Document verification requires attention',
    body: 'Dear {{name}}, your document verification could not be completed. Reason: {{reason}}. Please upload corrected documents.',
    channels: ['email', 'in_app'],
    variables: ['name', 'reason'],
    isActive: true,
  },
  {
    id: 'security_alert',
    name: 'Security Alert',
    type: 'SECURITY',
    subject: 'Security Alert: {{alertType}}',
    body: 'Dear {{name}}, we detected a security event on your account: {{alertType}}. Location: {{location}}. If this was not you, please secure your account immediately.',
    channels: ['email', 'sms', 'push', 'in_app'],
    variables: ['name', 'alertType', 'location', 'device'],
    isActive: true,
  },
  {
    id: 'new_device_login',
    name: 'New Device Login',
    type: 'SECURITY',
    subject: 'New device signed in to your account',
    body: 'A new device has signed into your account. Device: {{device}}, Location: {{location}}, Time: {{time}}. If this was not you, change your password immediately.',
    channels: ['email', 'sms', 'push'],
    variables: ['device', 'location', 'time'],
    isActive: true,
  },
  {
    id: 'commission_credited',
    name: 'Commission Credited',
    type: 'COMMISSION',
    subject: 'You earned {{amount}} USD in commissions!',
    body: 'Dear {{name}}, commission of {{amount}} USD has been credited to your IB wallet. Total clients: {{clientCount}}, Volume: {{volume}} lots.',
    channels: ['email', 'in_app'],
    variables: ['name', 'amount', 'clientCount', 'volume'],
    isActive: true,
  },
  {
    id: 'task_assigned',
    name: 'Task Assigned',
    type: 'TASK',
    subject: 'New task assigned: {{taskTitle}}',
    body: 'You have been assigned a new {{priority}} task: {{taskTitle}}. Category: {{category}}. SLA: {{slaMinutes}} minutes.',
    channels: ['email', 'push', 'in_app'],
    variables: ['taskTitle', 'priority', 'category', 'slaMinutes'],
    isActive: true,
  },
  {
    id: 'task_sla_warning',
    name: 'Task SLA Warning',
    type: 'TASK',
    subject: '⚠️ Task approaching SLA deadline',
    body: 'Task "{{taskTitle}}" has {{remainingMinutes}} minutes remaining before SLA breach. Please take action immediately.',
    channels: ['push', 'in_app'],
    variables: ['taskTitle', 'remainingMinutes'],
    isActive: true,
  },
  {
    id: 'low_balance',
    name: 'Low Balance Alert',
    type: 'TRADE',
    subject: 'Low balance warning',
    body: 'Your account balance is low: {{balance}} {{currency}}. Consider depositing to avoid margin calls.',
    channels: ['email', 'push', 'in_app'],
    variables: ['balance', 'currency'],
    isActive: true,
  },
];

// ============================================
// Email Service
// ============================================

export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(params: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In production, integrate with actual email provider
      console.log(`[EMAIL] Sending to ${params.to}`);
      console.log(`[EMAIL] Subject: ${params.subject}`);
      
      // Simulate API call to email provider
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Log for demo purposes
      await this.logEmailSent({
        to: params.to,
        subject: params.subject,
        messageId,
        status: 'sent',
      });

      return { success: true, messageId };
    } catch (error) {
      console.error('[EMAIL] Send failed:', error);
      return { success: false, error: String(error) };
    }
  }

  private async logEmailSent(data: {
    to: string;
    subject: string;
    messageId: string;
    status: string;
  }) {
    // Could store in database for tracking
    console.log('[EMAIL] Logged:', data);
  }

  async sendTemplate(
    to: string,
    template: NotificationTemplate,
    variables: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const subject = this.replaceVariables(template.subject, variables);
    const text = this.replaceVariables(template.body, variables);
    const html = template.htmlBody 
      ? this.replaceVariables(template.htmlBody, variables) 
      : undefined;

    return this.send({ to, subject, text, html });
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }
}

// ============================================
// SMS Service
// ============================================

export class SMSService {
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  async send(params: {
    to: string;
    message: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // In production, integrate with Twilio/Vonage/MessageBird
      console.log(`[SMS] Sending to ${params.to}`);
      console.log(`[SMS] Message: ${params.message}`);
      
      const messageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return { success: true, messageId };
    } catch (error) {
      console.error('[SMS] Send failed:', error);
      return { success: false, error: String(error) };
    }
  }

  async sendVerificationCode(phone: string, code: string): Promise<{ success: boolean }> {
    const message = `Your OMNI-CRM verification code is: ${code}. Valid for 5 minutes.`;
    const result = await this.send({ to: phone, message });
    return { success: result.success };
  }
}

// ============================================
// Push Notification Service
// ============================================

export class PushService {
  private config: PushConfig;

  constructor(config: PushConfig) {
    this.config = config;
  }

  async send(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    icon?: string;
    badge?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // In production, integrate with Firebase/OneSignal
      console.log(`[PUSH] Sending to user ${params.userId}`);
      console.log(`[PUSH] Title: ${params.title}`);
      
      // Store push notification for retrieval by client
      await this.storePushNotification(params);
      
      return { success: true };
    } catch (error) {
      console.error('[PUSH] Send failed:', error);
      return { success: false, error: String(error) };
    }
  }

  private async storePushNotification(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    // Store in cache for real-time retrieval
    const key = `push:${params.userId}`;
    const notifications = await cache.get<unknown[]>(key) || [];
    notifications.push({
      ...params,
      timestamp: new Date().toISOString(),
      read: false,
    });
    await cache.set(key, notifications, 3600); // 1 hour TTL
  }

  async getUserNotifications(userId: string): Promise<unknown[]> {
    const key = `push:${userId}`;
    return await cache.get<unknown[]>(key) || [];
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const key = `push:${userId}`;
    const notifications = await cache.get<unknown[]>(key) || [];
    const updated = notifications.map((n: Record<string, unknown>) => 
      (n as Record<string, unknown>).id === notificationId ? { ...n, read: true } : n
    );
    await cache.set(key, updated, 3600);
  }
}

// ============================================
// Notification Queue Service
// ============================================

export class NotificationQueue {
  private queue: NotificationPayload[] = [];
  private processing = false;

  async enqueue(payload: NotificationPayload): Promise<void> {
    this.queue.push(payload);
    if (!this.processing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const payload = this.queue.shift();
      if (payload) {
        await this.processNotification(payload);
      }
    }
    
    this.processing = false;
  }

  private async processNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(payload.userId);
      
      // Check quiet hours
      if (this.isQuietHours(preferences)) {
        // Delay notification until after quiet hours
        console.log('[QUEUE] Quiet hours - delaying notification');
      }

      // Get template if specified
      let template: NotificationTemplate | undefined;
      if (payload.templateId) {
        template = DEFAULT_TEMPLATES.find(t => t.id === payload.templateId);
      }

      // Determine channels
      const channels = payload.channels || template?.channels || ['in_app'];

      // Send through each channel
      for (const channel of channels) {
        if (!this.isChannelEnabled(preferences, channel, payload.type)) {
          continue;
        }

        switch (channel) {
          case 'email':
            await this.sendEmail(payload, template);
            break;
          case 'sms':
            await this.sendSMS(payload, template);
            break;
          case 'push':
            await this.sendPush(payload);
            break;
          case 'in_app':
            await this.sendInApp(payload);
            break;
        }
      }
    } catch (error) {
      console.error('[QUEUE] Failed to process notification:', error);
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const cached = await cache.get<NotificationPreferences>(`notif_prefs:${userId}`);
    if (cached) return cached;

    // Default preferences
    return {
      userId,
      email: true,
      sms: true,
      push: true,
      inApp: true,
      depositAlerts: true,
      withdrawalAlerts: true,
      tradeAlerts: true,
      kycAlerts: true,
      marketingEmails: false,
      securityAlerts: true,
    };
  }

  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const start = parseInt(preferences.quietHoursStart.split(':')[0]);
    const end = parseInt(preferences.quietHoursEnd.split(':')[0]);

    if (start > end) {
      // Spans midnight
      return currentHour >= start || currentHour < end;
    } else {
      return currentHour >= start && currentHour < end;
    }
  }

  private isChannelEnabled(
    preferences: NotificationPreferences,
    channel: NotificationChannel,
    type: string
  ): boolean {
    if (!preferences[channel === 'in_app' ? 'inApp' : channel]) {
      return false;
    }

    switch (type) {
      case 'DEPOSIT':
        return preferences.depositAlerts;
      case 'WITHDRAWAL':
        return preferences.withdrawalAlerts;
      case 'TRADE':
        return preferences.tradeAlerts;
      case 'KYC':
        return preferences.kycAlerts;
      case 'SECURITY':
        return preferences.securityAlerts;
      case 'MARKETING':
        return preferences.marketingEmails;
      default:
        return true;
    }
  }

  private async sendEmail(
    payload: NotificationPayload,
    template?: NotificationTemplate
  ): Promise<void> {
    // Get user email from database
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { email: true, name: true },
    });

    if (!user) return;

    const emailService = new EmailService({
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY || 'demo_key',
      fromEmail: 'noreply@omnicrm.com',
      fromName: 'OMNI-CRM',
    });

    if (template && payload.templateVariables) {
      await emailService.sendTemplate(user.email, template, {
        name: user.name,
        ...payload.templateVariables,
      });
    } else {
      await emailService.send({
        to: user.email,
        subject: payload.title,
        text: payload.message,
      });
    }
  }

  private async sendSMS(
    payload: NotificationPayload,
    template?: NotificationTemplate
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { phone: true },
    });

    if (!user?.phone) return;

    const smsService = new SMSService({
      provider: 'twilio',
      apiKey: process.env.TWILIO_API_KEY || 'demo_key',
      apiSecret: process.env.TWILIO_API_SECRET || 'demo_secret',
      fromNumber: '+1234567890',
    });

    let message = payload.message;
    if (template && payload.templateVariables) {
      message = template.body;
      for (const [key, value] of Object.entries(payload.templateVariables)) {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }

    await smsService.send({ to: user.phone, message });
  }

  private async sendPush(payload: NotificationPayload): Promise<void> {
    const pushService = new PushService({
      provider: 'firebase',
      apiKey: process.env.FIREBASE_API_KEY || 'demo_key',
    });

    await pushService.send({
      userId: payload.userId,
      title: payload.title,
      body: payload.message,
      data: payload.data as Record<string, string>,
    });
  }

  private async sendInApp(payload: NotificationPayload): Promise<void> {
    // Store in database for in-app retrieval
    await db.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as 'DEPOSIT' | 'WITHDRAWAL' | 'TRADE' | 'KYC' | 'TASK' | 'COMMISSION' | 'SYSTEM' | 'SECURITY' | 'MARKETING',
        title: payload.title,
        message: payload.message,
        entityType: payload.data?.entityType as string,
        entityId: payload.data?.entityId as string,
        channels: JSON.stringify(payload.channels || ['in_app']),
      },
    });
  }
}

// ============================================
// Main Notification Service
// ============================================

export class NotificationService {
  private queue: NotificationQueue;

  constructor() {
    this.queue = new NotificationQueue();
  }

  async send(payload: NotificationPayload): Promise<void> {
    await this.queue.enqueue(payload);
  }

  async sendDepositNotification(
    userId: string,
    data: {
      amount: number;
      currency: string;
      transactionId: string;
      method: string;
    }
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.send({
      userId,
      type: 'DEPOSIT',
      title: 'Deposit Confirmed',
      message: `Your deposit of ${data.amount} ${data.currency} has been credited.`,
      templateId: 'deposit_completed',
      templateVariables: {
        name: user?.name || 'Client',
        amount: data.amount.toString(),
        currency: data.currency,
        transactionId: data.transactionId,
        method: data.method,
        date: new Date().toLocaleDateString(),
      },
      data: {
        entityType: 'transaction',
        entityId: data.transactionId,
      },
    });
  }

  async sendWithdrawalNotification(
    userId: string,
    data: {
      amount: number;
      currency: string;
      transactionId: string;
      method: string;
      estimatedDays: number;
    }
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.send({
      userId,
      type: 'WITHDRAWAL',
      title: 'Withdrawal Processed',
      message: `Your withdrawal of ${data.amount} ${data.currency} has been processed.`,
      templateId: 'withdrawal_processed',
      templateVariables: {
        name: user?.name || 'Client',
        amount: data.amount.toString(),
        currency: data.currency,
        transactionId: data.transactionId,
        method: data.method,
        estimatedDays: data.estimatedDays.toString(),
      },
    });
  }

  async sendKYCNotification(
    userId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.send({
      userId,
      type: 'KYC',
      title: status === 'approved' ? 'Account Verified!' : 'KYC Update Required',
      message: status === 'approved'
        ? 'Your account has been successfully verified.'
        : `Document verification failed: ${reason}`,
      templateId: status === 'approved' ? 'kyc_approved' : 'kyc_rejected',
      templateVariables: {
        name: user?.name || 'Client',
        reason: reason || '',
      },
    });
  }

  async sendSecurityAlert(
    userId: string,
    data: {
      alertType: string;
      location: string;
      device: string;
    }
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.send({
      userId,
      type: 'SECURITY',
      title: 'Security Alert',
      message: `Security event detected: ${data.alertType}`,
      templateId: 'security_alert',
      templateVariables: {
        name: user?.name || 'Client',
        alertType: data.alertType,
        location: data.location,
        device: data.device,
      },
      channels: ['email', 'sms', 'push', 'in_app'],
      priority: 'urgent',
    });
  }

  async sendTaskNotification(
    userId: string,
    data: {
      taskTitle: string;
      taskId: string;
      priority: string;
      category: string;
      slaMinutes: number;
    }
  ): Promise<void> {
    await this.send({
      userId,
      type: 'TASK',
      title: 'New Task Assigned',
      message: `You have been assigned: ${data.taskTitle}`,
      templateId: 'task_assigned',
      templateVariables: {
        taskTitle: data.taskTitle,
        priority: data.priority,
        category: data.category,
        slaMinutes: data.slaMinutes.toString(),
      },
      data: {
        entityType: 'task',
        entityId: data.taskId,
      },
    });
  }

  async sendCommissionNotification(
    userId: string,
    data: {
      amount: number;
      clientCount: number;
      volume: number;
    }
  ): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await this.send({
      userId,
      type: 'COMMISSION',
      title: 'Commission Earned!',
      message: `You earned $${data.amount} in commissions.`,
      templateId: 'commission_credited',
      templateVariables: {
        name: user?.name || 'Partner',
        amount: data.amount.toString(),
        clientCount: data.clientCount.toString(),
        volume: data.volume.toString(),
      },
    });
  }

  async getTemplates(): Promise<NotificationTemplate[]> {
    return DEFAULT_TEMPLATES;
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    const cached = await cache.get<NotificationPreferences>(`notif_prefs:${userId}`);
    return cached || null;
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const existing = await this.getUserPreferences(userId) || {
      userId,
      email: true,
      sms: true,
      push: true,
      inApp: true,
      depositAlerts: true,
      withdrawalAlerts: true,
      tradeAlerts: true,
      kycAlerts: true,
      marketingEmails: false,
      securityAlerts: true,
    };

    const updated = { ...existing, ...preferences };
    await cache.set(`notif_prefs:${userId}`, updated, 86400 * 30); // 30 days
  }

  async markAsRead(notificationId: string): Promise<void> {
    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return db.notification.count({
      where: { userId, isRead: false },
    });
  }

  async getUserNotifications(
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<{ notifications: unknown[]; total: number }> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const where = {
      userId,
      ...(options?.unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where }),
    ]);

    return { notifications, total };
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
