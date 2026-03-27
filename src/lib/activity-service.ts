/**
 * OMNI-CRM Activity Timeline Service
 * Activity logging and timeline management for tracking system events
 */

import { db } from './db';

// ============================================
// TYPES & INTERFACES
// ============================================

export type ActivityAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW'
  | 'EXPORT'
  | 'IMPORT'
  | 'ASSIGN'
  | 'TRANSFER'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRADE'
  | 'KYC_SUBMIT'
  | 'KYC_APPROVE'
  | 'KYC_REJECT'
  | 'TASK_CREATE'
  | 'TASK_ASSIGN'
  | 'TASK_COMPLETE'
  | 'TICKET_CREATE'
  | 'TICKET_REPLY'
  | 'TICKET_CLOSE'
  | 'COMMISSION_EARN'
  | 'BONUS_AWARD'
  | 'SETTING_CHANGE'
  | 'PASSWORD_CHANGE'
  | 'DEVICE_APPROVE'
  | 'ALERT_TRIGGER'
  | 'CAMPAIGN_SEND'
  | 'DOCUMENT_UPLOAD'
  | 'NOTE_ADD'
  | 'STATUS_CHANGE'
  | 'PRIORITY_CHANGE'
  | 'ESCALATE'
  | 'SYSTEM';

export type ActivityEntityType =
  | 'user'
  | 'client'
  | 'transaction'
  | 'task'
  | 'ticket'
  | 'dispute'
  | 'kyc_document'
  | 'trading_account'
  | 'wallet'
  | 'commission'
  | 'bonus'
  | 'campaign'
  | 'ib_profile'
  | 'referral'
  | 'calendar_event'
  | 'notification'
  | 'device'
  | 'compliance_check'
  | 'audit_log'
  | 'system';

export interface ActivityMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

export interface CreateActivityInput {
  userId?: string;
  userName?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  title: string;
  description?: string;
  metadata?: ActivityMetadata;
  ipAddress?: string;
  userAgent?: string;
  isPublic?: boolean;
}

export interface ActivityFilter {
  userId?: string;
  entityType?: ActivityEntityType;
  entityId?: string;
  action?: ActivityAction;
  dateFrom?: Date;
  dateTo?: Date;
  isPublic?: boolean;
  search?: string;
}

export interface ActivityAggregation {
  date: string;
  count: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
}

export interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  recentActivities: ActivityLogEntry[];
}

export interface ActivityLogEntry {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  description?: string | null;
  metadata?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  isPublic: boolean;
  createdAt: Date;
}

// ============================================
// ACTIVITY LOGGER CLASS
// ============================================

export class ActivityLogger {
  private static instance: ActivityLogger;

  private constructor() {}

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  /**
   * Log a new activity
   */
  async log(input: CreateActivityInput): Promise<ActivityLogEntry> {
    const activity = await db.activityLog.create({
      data: {
        userId: input.userId,
        userName: input.userName,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        title: input.title,
        description: input.description,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        isPublic: input.isPublic ?? true,
      },
    });

    return activity;
  }

  /**
   * Log multiple activities in batch
   */
  async logBatch(activities: CreateActivityInput[]): Promise<number> {
    const result = await db.activityLog.createMany({
      data: activities.map((a) => ({
        userId: a.userId,
        userName: a.userName,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        title: a.title,
        description: a.description,
        metadata: a.metadata ? JSON.stringify(a.metadata) : null,
        ipAddress: a.ipAddress,
        userAgent: a.userAgent,
        isPublic: a.isPublic ?? true,
      })),
    });

    return result.count;
  }

  /**
   * Get activity by ID
   */
  async getById(id: string): Promise<ActivityLogEntry | null> {
    return db.activityLog.findUnique({
      where: { id },
    });
  }

  /**
   * Get activities with filtering and pagination
   */
  async getActivities(
    filter: ActivityFilter = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ activities: ActivityLogEntry[]; total: number }> {
    const where: any = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.entityType) {
      where.entityType = filter.entityType;
    }

    if (filter.entityId) {
      where.entityId = filter.entityId;
    }

    if (filter.action) {
      where.action = filter.action;
    }

    if (filter.isPublic !== undefined) {
      where.isPublic = filter.isPublic;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        where.createdAt.lte = filter.dateTo;
      }
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search } },
        { description: { contains: filter.search } },
        { userName: { contains: filter.search } },
      ];
    }

    const [activities, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.activityLog.count({ where }),
    ]);

    return { activities, total };
  }

  /**
   * Get activities for a specific entity
   */
  async getEntityActivities(
    entityType: ActivityEntityType,
    entityId: string,
    limit: number = 20
  ): Promise<ActivityLogEntry[]> {
    return db.activityLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get activities for a specific user
   */
  async getUserActivities(
    userId: string,
    limit: number = 50
  ): Promise<ActivityLogEntry[]> {
    return db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get activity statistics
   */
  async getStats(dateFrom?: Date, dateTo?: Date): Promise<ActivityStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    const baseWhere: any = {};
    if (dateFrom || dateTo) {
      baseWhere.createdAt = {};
      if (dateFrom) baseWhere.createdAt.gte = dateFrom;
      if (dateTo) baseWhere.createdAt.lte = dateTo;
    }

    const [total, today, thisWeek, thisMonth, byAction, byEntityType, topUsers, recentActivities] = await Promise.all([
      // Total count
      db.activityLog.count({ where: baseWhere }),
      
      // Today count
      db.activityLog.count({
        where: { ...baseWhere, createdAt: { gte: todayStart } },
      }),
      
      // This week count
      db.activityLog.count({
        where: { ...baseWhere, createdAt: { gte: weekStart } },
      }),
      
      // This month count
      db.activityLog.count({
        where: { ...baseWhere, createdAt: { gte: monthStart } },
      }),
      
      // By action
      db.activityLog.groupBy({
        by: ['action'],
        where: baseWhere,
        _count: { action: true },
      }),
      
      // By entity type
      db.activityLog.groupBy({
        by: ['entityType'],
        where: baseWhere,
        _count: { entityType: true },
      }),
      
      // Top users
      db.activityLog.groupBy({
        by: ['userId', 'userName'],
        where: { ...baseWhere, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
      
      // Recent activities
      db.activityLog.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      total,
      today,
      thisWeek,
      thisMonth,
      byAction: byAction.reduce((acc, item) => {
        acc[item.action] = item._count.action;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: byEntityType.reduce((acc, item) => {
        acc[item.entityType] = item._count.entityType;
        return acc;
      }, {} as Record<string, number>),
      topUsers: topUsers.map((u) => ({
        userId: u.userId!,
        userName: u.userName || 'Unknown',
        count: u._count.userId,
      })),
      recentActivities,
    };
  }

  /**
   * Get aggregated activity data by date
   */
  async getAggregation(
    dateFrom: Date,
    dateTo: Date,
    groupBy: 'day' | 'hour' = 'day'
  ): Promise<ActivityAggregation[]> {
    const activities = await db.activityLog.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped = activities.reduce((acc, activity) => {
      const date = new Date(activity.createdAt);
      let key: string;
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else {
        key = `${date.toISOString().split('T')[0]}T${date.getHours().toString().padStart(2, '0')}:00`;
      }

      if (!acc[key]) {
        acc[key] = {
          date: key,
          count: 0,
          byAction: {},
          byEntityType: {},
        };
      }

      acc[key].count++;
      acc[key].byAction[activity.action] = (acc[key].byAction[activity.action] || 0) + 1;
      acc[key].byEntityType[activity.entityType] = (acc[key].byEntityType[activity.entityType] || 0) + 1;

      return acc;
    }, {} as Record<string, ActivityAggregation>);

    return Object.values(grouped);
  }

  /**
   * Delete old activities (data retention)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await db.activityLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Get activity timeline for an entity with formatted output
   */
  async getTimeline(
    entityType?: ActivityEntityType,
    entityId?: string,
    userId?: string,
    limit: number = 50
  ): Promise<ActivityLogEntry[]> {
    const where: any = { isPublic: true };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    return db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

// ============================================
// ACTIVITY TYPE HELPERS
// ============================================

export const ACTIVITY_ICONS: Record<ActivityAction, string> = {
  CREATE: 'plus',
  UPDATE: 'edit',
  DELETE: 'trash',
  APPROVE: 'check-circle',
  REJECT: 'x-circle',
  LOGIN: 'log-in',
  LOGOUT: 'log-out',
  VIEW: 'eye',
  EXPORT: 'download',
  IMPORT: 'upload',
  ASSIGN: 'user-plus',
  TRANSFER: 'arrow-right',
  DEPOSIT: 'arrow-down',
  WITHDRAWAL: 'arrow-up',
  TRADE: 'trending-up',
  KYC_SUBMIT: 'file-text',
  KYC_APPROVE: 'check',
  KYC_REJECT: 'x',
  TASK_CREATE: 'clipboard',
  TASK_ASSIGN: 'user-check',
  TASK_COMPLETE: 'check-square',
  TICKET_CREATE: 'message-square',
  TICKET_REPLY: 'message-circle',
  TICKET_CLOSE: 'archive',
  COMMISSION_EARN: 'dollar-sign',
  BONUS_AWARD: 'gift',
  SETTING_CHANGE: 'settings',
  PASSWORD_CHANGE: 'key',
  DEVICE_APPROVE: 'smartphone',
  ALERT_TRIGGER: 'alert-triangle',
  CAMPAIGN_SEND: 'send',
  DOCUMENT_UPLOAD: 'file-up',
  NOTE_ADD: 'file-plus',
  STATUS_CHANGE: 'refresh-cw',
  PRIORITY_CHANGE: 'flag',
  ESCALATE: 'arrow-up-circle',
  SYSTEM: 'server',
};

export const ACTIVITY_COLORS: Record<ActivityAction, string> = {
  CREATE: '#10b981', // green
  UPDATE: '#3b82f6', // blue
  DELETE: '#ef4444', // red
  APPROVE: '#10b981', // green
  REJECT: '#ef4444', // red
  LOGIN: '#3b82f6', // blue
  LOGOUT: '#6b7280', // gray
  VIEW: '#6b7280', // gray
  EXPORT: '#8b5cf6', // purple
  IMPORT: '#8b5cf6', // purple
  ASSIGN: '#f59e0b', // amber
  TRANSFER: '#06b6d4', // cyan
  DEPOSIT: '#10b981', // green
  WITHDRAWAL: '#f59e0b', // amber
  TRADE: '#3b82f6', // blue
  KYC_SUBMIT: '#f59e0b', // amber
  KYC_APPROVE: '#10b981', // green
  KYC_REJECT: '#ef4444', // red
  TASK_CREATE: '#3b82f6', // blue
  TASK_ASSIGN: '#f59e0b', // amber
  TASK_COMPLETE: '#10b981', // green
  TICKET_CREATE: '#3b82f6', // blue
  TICKET_REPLY: '#06b6d4', // cyan
  TICKET_CLOSE: '#6b7280', // gray
  COMMISSION_EARN: '#10b981', // green
  BONUS_AWARD: '#ec4899', // pink
  SETTING_CHANGE: '#8b5cf6', // purple
  PASSWORD_CHANGE: '#ef4444', // red
  DEVICE_APPROVE: '#10b981', // green
  ALERT_TRIGGER: '#f59e0b', // amber
  CAMPAIGN_SEND: '#06b6d4', // cyan
  DOCUMENT_UPLOAD: '#3b82f6', // blue
  NOTE_ADD: '#8b5cf6', // purple
  STATUS_CHANGE: '#f59e0b', // amber
  PRIORITY_CHANGE: '#ef4444', // red
  ESCALATE: '#ef4444', // red
  SYSTEM: '#6b7280', // gray
};

export const ENTITY_TYPE_LABELS: Record<ActivityEntityType, string> = {
  user: 'User',
  client: 'Client',
  transaction: 'Transaction',
  task: 'Task',
  ticket: 'Ticket',
  dispute: 'Dispute',
  kyc_document: 'KYC Document',
  trading_account: 'Trading Account',
  wallet: 'Wallet',
  commission: 'Commission',
  bonus: 'Bonus',
  campaign: 'Campaign',
  ib_profile: 'IB Profile',
  referral: 'Referral',
  calendar_event: 'Calendar Event',
  notification: 'Notification',
  device: 'Device',
  compliance_check: 'Compliance Check',
  audit_log: 'Audit Log',
  system: 'System',
};

export const ACTION_LABELS: Record<ActivityAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  LOGIN: 'Logged In',
  LOGOUT: 'Logged Out',
  VIEW: 'Viewed',
  EXPORT: 'Exported',
  IMPORT: 'Imported',
  ASSIGN: 'Assigned',
  TRANSFER: 'Transferred',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRADE: 'Trade',
  KYC_SUBMIT: 'KYC Submitted',
  KYC_APPROVE: 'KYC Approved',
  KYC_REJECT: 'KYC Rejected',
  TASK_CREATE: 'Task Created',
  TASK_ASSIGN: 'Task Assigned',
  TASK_COMPLETE: 'Task Completed',
  TICKET_CREATE: 'Ticket Created',
  TICKET_REPLY: 'Ticket Reply',
  TICKET_CLOSE: 'Ticket Closed',
  COMMISSION_EARN: 'Commission Earned',
  BONUS_AWARD: 'Bonus Awarded',
  SETTING_CHANGE: 'Setting Changed',
  PASSWORD_CHANGE: 'Password Changed',
  DEVICE_APPROVE: 'Device Approved',
  ALERT_TRIGGER: 'Alert Triggered',
  CAMPAIGN_SEND: 'Campaign Sent',
  DOCUMENT_UPLOAD: 'Document Uploaded',
  NOTE_ADD: 'Note Added',
  STATUS_CHANGE: 'Status Changed',
  PRIORITY_CHANGE: 'Priority Changed',
  ESCALATE: 'Escalated',
  SYSTEM: 'System Event',
};

/**
 * Helper function to get icon for action
 */
export function getActivityIcon(action: string): string {
  return ACTIVITY_ICONS[action as ActivityAction] || 'activity';
}

/**
 * Helper function to get color for action
 */
export function getActivityColor(action: string): string {
  return ACTIVITY_COLORS[action as ActivityAction] || '#6b7280';
}

/**
 * Helper function to format activity title
 */
export function formatActivityTitle(activity: ActivityLogEntry): string {
  const actionLabel = ACTION_LABELS[activity.action as ActivityAction] || activity.action;
  const entityLabel = ENTITY_TYPE_LABELS[activity.entityType as ActivityEntityType] || activity.entityType;
  return `${actionLabel} ${entityLabel}`;
}

/**
 * Export singleton instance
 */
export const activityLogger = ActivityLogger.getInstance();
