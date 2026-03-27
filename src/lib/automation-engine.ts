/**
 * OMNI-CRM Automation Engine
 * Workflow automation and triggers
 */

import { db } from '@/lib/db';
import { TaskStatus, Priority } from '@prisma/client';

// ============================================
// TYPES
// ============================================

type TriggerEvent = 
  | 'DEPOSIT_COMPLETED'
  | 'WITHDRAWAL_REQUESTED'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'TRADE_CLOSED'
  | 'COMMISSION_EARNED'
  | 'TASK_CREATED'
  | 'TASK_OVERDUE'
  | 'ACCOUNT_OPENED'
  | 'HIGH_RISK_DETECTED';

type ActionType =
  | 'CREATE_TASK'
  | 'SEND_NOTIFICATION'
  | 'SEND_EMAIL'
  | 'UPDATE_STATUS'
  | 'ASSIGN_TO'
  | 'TRIGGER_WEBHOOK'
  | 'CALCULATE_COMMISSION'
  | 'UPDATE_RISK_SCORE'
  | 'ADD_TAG'
  | 'LOG_ACTIVITY';

interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

interface WorkflowAction {
  type: ActionType;
  config: Record<string, unknown>;
}

interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  event: TriggerEvent;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  priority: number;
  enabled: boolean;
}

interface TriggerContext {
  event: TriggerEvent;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
}

// ============================================
// AUTOMATION ENGINE CLASS
// ============================================

class AutomationEngine {
  private rules: Map<string, WorkflowRule> = new Map();
  private initialized = false;

  /**
   * Initialize engine with rules from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load default rules
    this.loadDefaultRules();
    
    this.initialized = true;
  }

  /**
   * Load default automation rules
   */
  private loadDefaultRules(): void {
    const defaultRules: WorkflowRule[] = [
      // Large Deposit Alert
      {
        id: 'large_deposit_alert',
        name: 'Large Deposit Alert',
        description: 'Create compliance task for deposits over $10,000',
        event: 'DEPOSIT_COMPLETED',
        conditions: [
          { field: 'amount', operator: 'gte', value: 10000 },
        ],
        actions: [
          {
            type: 'CREATE_TASK',
            config: {
              title: 'Large Deposit Review - {{amount}} {{currency}}',
              category: 'COMPLIANCE',
              priority: 'HIGH',
              description: 'Deposit requires compliance review',
            },
          },
          {
            type: 'SEND_NOTIFICATION',
            config: {
              recipients: ['role:compliance', 'role:finance_manager'],
              title: 'Large Deposit Alert',
              message: 'Deposit of {{amount}} {{currency}} requires review',
            },
          },
        ],
        priority: 100,
        enabled: true,
      },

      // High Risk Client Alert
      {
        id: 'high_risk_alert',
        name: 'High Risk Client Alert',
        description: 'Alert for high risk client activity',
        event: 'HIGH_RISK_DETECTED',
        conditions: [
          { field: 'riskScore', operator: 'gte', value: 80 },
        ],
        actions: [
          {
            type: 'CREATE_TASK',
            config: {
              title: 'High Risk Client Alert - {{clientName}}',
              category: 'COMPLIANCE',
              priority: 'CRITICAL',
            },
          },
          {
            type: 'UPDATE_RISK_SCORE',
            config: {
              adjustment: 10,
              reason: 'Automated risk detection',
            },
          },
        ],
        priority: 90,
        enabled: true,
      },

      // KYC Rejection Follow-up
      {
        id: 'kyc_rejection_followup',
        name: 'KYC Rejection Follow-up',
        description: 'Create follow-up task when KYC is rejected',
        event: 'KYC_REJECTED',
        conditions: [],
        actions: [
          {
            type: 'CREATE_TASK',
            config: {
              title: 'KYC Follow-up - {{clientName}}',
              category: 'KYC_VERIFICATION',
              priority: 'MEDIUM',
              slaMinutes: 1440, // 24 hours
            },
          },
          {
            type: 'SEND_EMAIL',
            config: {
              template: 'kyc_rejection',
              subject: 'Document Verification Update',
            },
          },
        ],
        priority: 80,
        enabled: true,
      },

      // Commission Calculation
      {
        id: 'commission_on_trade',
        name: 'Commission on Trade Close',
        description: 'Calculate IB commission on trade close',
        event: 'TRADE_CLOSED',
        conditions: [
          { field: 'hasIB', operator: 'eq', value: true },
        ],
        actions: [
          {
            type: 'CALCULATE_COMMISSION',
            config: {
              levels: 5,
              immediate: true,
            },
          },
        ],
        priority: 70,
        enabled: true,
      },

      // Task Escalation
      {
        id: 'task_overdue_escalation',
        name: 'Task Overdue Escalation',
        description: 'Escalate overdue tasks',
        event: 'TASK_OVERDUE',
        conditions: [
          { field: 'priority', operator: 'in', value: ['CRITICAL', 'HIGH'] },
        ],
        actions: [
          {
            type: 'UPDATE_STATUS',
            config: {
              status: 'ESCALATED',
            },
          },
          {
            type: 'SEND_NOTIFICATION',
            config: {
              recipients: ['role:team_lead', 'role:manager'],
              title: 'Task Escalated',
              message: 'Task {{taskId}} has been escalated due to SLA breach',
              urgent: true,
            },
          },
        ],
        priority: 95,
        enabled: true,
      },

      // Welcome Email for New Account
      {
        id: 'new_account_welcome',
        name: 'New Account Welcome',
        description: 'Send welcome email for new accounts',
        event: 'ACCOUNT_OPENED',
        conditions: [],
        actions: [
          {
            type: 'SEND_EMAIL',
            config: {
              template: 'welcome',
              subject: 'Welcome to our platform!',
            },
          },
          {
            type: 'ADD_TAG',
            config: {
              tag: 'new_client',
            },
          },
        ],
        priority: 50,
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Trigger an event
   */
  async trigger(context: TriggerContext): Promise<void> {
    await this.initialize();

    // Find matching rules
    const matchingRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled && rule.event === context.event)
      .filter(rule => this.evaluateConditions(rule.conditions, context.data))
      .sort((a, b) => b.priority - a.priority);

    // Execute actions
    for (const rule of matchingRules) {
      try {
        await this.executeActions(rule.actions, context);
        console.log(`[Automation] Executed rule: ${rule.name}`);
      } catch (error) {
        console.error(`[Automation] Failed to execute rule ${rule.name}:`, error);
      }
    }
  }

  /**
   * Evaluate conditions against data
   */
  private evaluateConditions(
    conditions: WorkflowCondition[],
    data: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);
      
      switch (condition.operator) {
        case 'eq':
          return value === condition.value;
        case 'neq':
          return value !== condition.value;
        case 'gt':
          return Number(value) > Number(condition.value);
        case 'gte':
          return Number(value) >= Number(condition.value);
        case 'lt':
          return Number(value) < Number(condition.value);
        case 'lte':
          return Number(value) <= Number(condition.value);
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        default:
          return false;
      }
    });
  }

  /**
   * Execute actions
   */
  private async executeActions(
    actions: WorkflowAction[],
    context: TriggerContext
  ): Promise<void> {
    for (const action of actions) {
      await this.executeAction(action, context);
    }
  }

  /**
   * Execute single action
   */
  private async executeAction(
    action: WorkflowAction,
    context: TriggerContext
  ): Promise<void> {
    const config = this.interpolateConfig(action.config, context.data);

    switch (action.type) {
      case 'CREATE_TASK':
        await this.createTask(config, context);
        break;
      case 'SEND_NOTIFICATION':
        await this.sendNotification(config, context);
        break;
      case 'SEND_EMAIL':
        await this.sendEmail(config, context);
        break;
      case 'UPDATE_STATUS':
        await this.updateStatus(config, context);
        break;
      case 'CALCULATE_COMMISSION':
        await this.calculateCommission(config, context);
        break;
      case 'UPDATE_RISK_SCORE':
        await this.updateRiskScore(config, context);
        break;
      case 'LOG_ACTIVITY':
        console.log(`[Automation] Activity: ${JSON.stringify(config)}`);
        break;
      default:
        console.log(`[Automation] Unknown action type: ${action.type}`);
    }
  }

  // ============================================
  // ACTION IMPLEMENTATIONS
  // ============================================

  private async createTask(config: Record<string, unknown>, context: TriggerContext): Promise<void> {
    await db.task.create({
      data: {
        title: String(config.title),
        description: String(config.description || ''),
        category: config.category as any || 'OTHER',
        priority: config.priority as Priority || 'MEDIUM',
        priorityScore: this.calculatePriorityScore(config.priority as Priority),
        creatorId: context.userId || 'system',
        entityType: context.entityType,
        entityId: context.entityId,
        slaMinutes: Number(config.slaMinutes) || 60,
        slaDeadline: new Date(Date.now() + (Number(config.slaMinutes) || 60) * 60 * 1000),
        status: 'NEW',
      },
    });
  }

  private async sendNotification(config: Record<string, unknown>, context: TriggerContext): Promise<void> {
    // Would integrate with notification service
    console.log(`[Notification] ${config.title}: ${config.message}`);
  }

  private async sendEmail(config: Record<string, unknown>, context: TriggerContext): Promise<void> {
    // Would integrate with email service
    console.log(`[Email] Template: ${config.template}, Subject: ${config.subject}`);
  }

  private async updateStatus(config: Record<string, unknown>, context: TriggerContext): Promise<void> {
    if (context.entityType === 'Task') {
      await db.task.update({
        where: { id: context.entityId },
        data: { status: config.status as TaskStatus },
      });
    }
  }

  private async calculateCommission(config: Record<string, unknown>, context: TriggerContext): Promise<void> {
    // Would call IB commission service
    console.log(`[Commission] Calculating ${config.levels} level commission`);
  }

  private async updateRiskScore(config: Record<string, unknown>, context: TriggerContext): Promise<void> {
    // Would update client risk score
    console.log(`[Risk] Updating risk score: ${config.adjustment}`);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj as unknown);
  }

  private interpolateConfig(
    config: Record<string, unknown>,
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const interpolated: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        interpolated[key] = value.replace(/\{\{(\w+)\}\}/g, (_, field) => {
          return String(data[field] ?? `{{${field}}}`);
        });
      } else {
        interpolated[key] = value;
      }
    }

    return interpolated;
  }

  private calculatePriorityScore(priority: Priority): number {
    const scores: Record<Priority, number> = {
      CRITICAL: 100,
      HIGH: 75,
      MEDIUM: 50,
      LOW: 25,
    };
    return scores[priority] || 50;
  }

  /**
   * Add custom rule
   */
  addRule(rule: WorkflowRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): WorkflowRule[] {
    return Array.from(this.rules.values());
  }
}

// Export singleton instance
export const automationEngine = new AutomationEngine();
