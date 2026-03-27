/**
 * OMNI-CRM Audit Trail Service
 * Immutable logging for all financial and operational actions
 */

import { db } from './db';
import { AuditLog, Prisma } from '@prisma/client';

// ============================================
// AUDIT LOG TYPES
// ============================================

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'DEVICE_APPROVE'
  | 'DEVICE_REVOKE'
  | 'KYC_SUBMIT'
  | 'KYC_APPROVE'
  | 'KYC_REJECT'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'COMMISSION_CALCULATE'
  | 'COMMISSION_PAY'
  | 'TASK_ASSIGN'
  | 'TASK_STATUS_CHANGE'
  | 'SETTING_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'SUSPICIOUS_ACTIVITY';

export type EntityType = 
  | 'User'
  | 'Device'
  | 'Session'
  | 'Wallet'
  | 'TradingAccount'
  | 'Transaction'
  | 'Commission'
  | 'Task'
  | 'KYCDocument'
  | 'IBProfile'
  | 'ReferralLink'
  | 'Setting';

// ============================================
// AUDIT CONTEXT
// ============================================

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

// ============================================
// AUDIT SERVICE CLASS
// ============================================

class AuditService {
  /**
   * Create an immutable audit log entry
   */
  async log(params: {
    action: AuditAction;
    entityType: EntityType;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    context: AuditContext;
    transactionId?: string;
    commissionId?: string;
    taskId?: string;
  }): Promise<AuditLog> {
    const log = await db.auditLog.create({
      data: {
        userId: params.context.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
        deviceId: params.context.deviceId,
        transactionId: params.transactionId,
        commissionId: params.commissionId,
        taskId: params.taskId,
      },
    });

    return log;
  }

  /**
   * Log user login
   */
  async logLogin(params: {
    userId: string;
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    success: boolean;
  }): Promise<AuditLog> {
    return this.log({
      action: params.success ? 'LOGIN' : 'SUSPICIOUS_ACTIVITY',
      entityType: 'User',
      entityId: params.userId,
      newValue: { success: params.success },
      context: {
        userId: params.userId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        deviceId: params.deviceId,
      },
    });
  }

  /**
   * Log user logout
   */
  async logLogout(params: {
    userId: string;
    ipAddress: string;
    deviceId?: string;
  }): Promise<AuditLog> {
    return this.log({
      action: 'LOGOUT',
      entityType: 'User',
      entityId: params.userId,
      context: {
        userId: params.userId,
        ipAddress: params.ipAddress,
        deviceId: params.deviceId,
      },
    });
  }

  /**
   * Log transaction event
   */
  async logTransaction(params: {
    action: AuditAction;
    transactionId: string;
    userId: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress: string;
  }): Promise<AuditLog> {
    return this.log({
      action: params.action,
      entityType: 'Transaction',
      entityId: params.transactionId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      transactionId: params.transactionId,
      context: {
        userId: params.userId,
        ipAddress: params.ipAddress,
      },
    });
  }

  /**
   * Log task status change
   */
  async logTaskChange(params: {
    taskId: string;
    userId: string;
    oldStatus: string;
    newStatus: string;
    ipAddress: string;
  }): Promise<AuditLog> {
    return this.log({
      action: 'TASK_STATUS_CHANGE',
      entityType: 'Task',
      entityId: params.taskId,
      oldValue: { status: params.oldStatus },
      newValue: { status: params.newStatus },
      taskId: params.taskId,
      context: {
        userId: params.userId,
        ipAddress: params.ipAddress,
      },
    });
  }

  /**
   * Log KYC event
   */
  async logKYC(params: {
    action: 'KYC_SUBMIT' | 'KYC_APPROVE' | 'KYC_REJECT';
    documentId: string;
    userId: string;
    actorId: string;
    reason?: string;
    ipAddress: string;
  }): Promise<AuditLog> {
    return this.log({
      action: params.action,
      entityType: 'KYCDocument',
      entityId: params.documentId,
      newValue: params.reason ? { reason: params.reason } : undefined,
      context: {
        userId: params.actorId,
        ipAddress: params.ipAddress,
      },
    });
  }

  /**
   * Log device approval/revocation
   */
  async logDeviceAction(params: {
    action: 'DEVICE_APPROVE' | 'DEVICE_REVOKE';
    deviceId: string;
    userId: string;
    actorId: string;
    ipAddress: string;
  }): Promise<AuditLog> {
    return this.log({
      action: params.action,
      entityType: 'Device',
      entityId: params.deviceId,
      context: {
        userId: params.actorId,
        ipAddress: params.ipAddress,
      },
    });
  }

  /**
   * Log commission calculation
   */
  async logCommission(params: {
    action: 'COMMISSION_CALCULATE' | 'COMMISSION_PAY';
    commissionId: string;
    userId: string;
    amount: number;
    level: number;
    ipAddress: string;
  }): Promise<AuditLog> {
    return this.log({
      action: params.action,
      entityType: 'Commission',
      entityId: params.commissionId,
      newValue: { amount: params.amount, level: params.level },
      commissionId: params.commissionId,
      context: {
        userId: params.userId,
        ipAddress: params.ipAddress,
      },
    });
  }

  /**
   * Get audit logs for an entity
   */
  async getEntityLogs(
    entityType: EntityType,
    entityId: string,
    options?: { skip?: number; take?: number }
  ): Promise<AuditLog[]> {
    return db.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take || 50,
    });
  }

  /**
   * Get user activity logs
   */
  async getUserLogs(
    userId: string,
    options?: { skip?: number; take?: number }
  ): Promise<AuditLog[]> {
    return db.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take || 50,
    });
  }

  /**
   * Get recent suspicious activities
   */
  async getSuspiciousActivities(hours: number = 24): Promise<AuditLog[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return db.auditLog.findMany({
      where: {
        action: 'SUSPICIOUS_ACTIVITY',
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get transaction audit trail
   */
  async getTransactionTrail(transactionId: string): Promise<AuditLog[]> {
    return db.auditLog.findMany({
      where: {
        OR: [
          { transactionId },
          { 
            AND: [
              { entityType: 'Transaction' },
              { entityId: transactionId }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Search audit logs
   */
  async search(params: {
    userId?: string;
    action?: AuditAction;
    entityType?: EntityType;
    dateFrom?: Date;
    dateTo?: Date;
    skip?: number;
    take?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = params.dateFrom;
      if (params.dateTo) where.createdAt.lte = params.dateTo;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take || 50,
      }),
      db.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}

// Export singleton instance
export const auditService = new AuditService();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format audit log for display
 */
export function formatAuditLog(log: AuditLog): {
  timestamp: string;
  action: string;
  entity: string;
  actor: string;
  changes: string;
} {
  const timestamp = log.createdAt.toISOString();
  const action = log.action;
  const entity = `${log.entityType}${log.entityId ? ` (${log.entityId.substring(0, 8)})` : ''}`;
  const actor = log.userId || 'System';
  
  let changes = '';
  if (log.oldValue || log.newValue) {
    const oldVal = log.oldValue ? JSON.parse(log.oldValue) : null;
    const newVal = log.newValue ? JSON.parse(log.newValue) : null;
    changes = JSON.stringify({ from: oldVal, to: newVal });
  }

  return { timestamp, action, entity, actor, changes };
}
