/**
 * Marketing Service
 * Campaign management, email templates, and analytics
 */

import { db } from './db';
import { cache } from './cache';

// ============================================
// Types
// ============================================

export interface Campaign {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
  subject?: string;
  content: string;
  htmlContent?: string;
  targetSegment?: string;
  targetCriteria?: Record<string, unknown>;
  scheduledAt?: Date;
  sentAt?: Date;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  textContent: string;
  htmlContent: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  criteria: Record<string, unknown>;
  memberCount: number;
  createdAt: Date;
}

// ============================================
// Campaign Manager
// ============================================

export class CampaignManager {
  // Create new campaign
  async createCampaign(data: {
    name: string;
    type: Campaign['type'];
    subject?: string;
    content: string;
    htmlContent?: string;
    targetSegment?: string;
    targetCriteria?: Record<string, unknown>;
    scheduledAt?: Date;
    createdBy: string;
  }): Promise<Campaign> {
    // Calculate target audience size
    let totalRecipients = 0;
    if (data.targetSegment) {
      const segment = await this.getSegment(data.targetSegment);
      totalRecipients = segment?.memberCount || 0;
    } else if (data.targetCriteria) {
      totalRecipients = await this.countMatchingUsers(data.targetCriteria);
    }

    const campaign = await db.marketingCampaign.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        subject: data.subject,
        content: data.content,
        htmlContent: data.htmlContent,
        targetSegment: data.targetSegment,
        targetCriteria: data.targetCriteria ? JSON.stringify(data.targetCriteria) : null,
        scheduledAt: data.scheduledAt,
        totalRecipients,
        sentCount: 0,
        openCount: 0,
        clickCount: 0,
        bounceCount: 0,
        unsubscribeCount: 0,
        createdBy: data.createdBy,
      },
    });

    return this.formatCampaign(campaign);
  }

  // Update campaign
  async updateCampaign(
    campaignId: string,
    data: Partial<{
      name: string;
      subject: string;
      content: string;
      htmlContent: string;
      targetSegment: string;
      targetCriteria: Record<string, unknown>;
      scheduledAt: Date;
    }>
  ): Promise<Campaign> {
    const campaign = await db.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        ...data,
        targetCriteria: data.targetCriteria ? JSON.stringify(data.targetCriteria) : undefined,
        updatedAt: new Date(),
      },
    });

    return this.formatCampaign(campaign);
  }

  // Send campaign
  async sendCampaign(campaignId: string): Promise<{ success: boolean; sentCount: number }> {
    const campaign = await db.marketingCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Update status
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' },
    });

    // Get recipients
    let recipients: string[] = [];
    if (campaign.targetSegment) {
      recipients = await this.getSegmentMembers(campaign.targetSegment);
    } else if (campaign.targetCriteria) {
      recipients = await this.getMatchingUsers(JSON.parse(campaign.targetCriteria));
    }

    // Simulate sending (in production, use email/SMS service)
    let sentCount = 0;
    for (const recipient of recipients) {
      // Send email/SMS/push based on campaign type
      const sent = await this.sendToRecipient(campaign, recipient);
      if (sent) sentCount++;
    }

    // Update campaign
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentCount,
      },
    });

    return { success: true, sentCount };
  }

  // Schedule campaign
  async scheduleCampaign(campaignId: string, scheduledAt: Date): Promise<void> {
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SCHEDULED',
        scheduledAt,
      },
    });
  }

  // Cancel campaign
  async cancelCampaign(campaignId: string): Promise<void> {
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });
  }

  // Track open
  async trackOpen(campaignId: string): Promise<void> {
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { openCount: { increment: 1 } },
    });
  }

  // Track click
  async trackClick(campaignId: string): Promise<void> {
    await db.marketingCampaign.update({
      where: { id: campaignId },
      data: { clickCount: { increment: 1 } },
    });
  }

  // Get campaign stats
  async getStats(): Promise<CampaignStats> {
    const cached = await cache.get<CampaignStats>('campaign_stats');
    if (cached) return cached;

    const campaigns = await db.marketingCampaign.findMany();

    const stats: CampaignStats = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'SENT' || c.status === 'SENDING').length,
      totalSent: campaigns.reduce((sum, c) => sum + c.sentCount, 0),
      avgOpenRate: this.calculateAverage(campaigns.map(c => 
        c.sentCount > 0 ? (c.openCount / c.sentCount) * 100 : 0
      )),
      avgClickRate: this.calculateAverage(campaigns.map(c => 
        c.sentCount > 0 ? (c.clickCount / c.sentCount) * 100 : 0
      )),
      avgBounceRate: this.calculateAverage(campaigns.map(c => 
        c.sentCount > 0 ? (c.bounceCount / c.sentCount) * 100 : 0
      )),
      byType: this.groupBy(campaigns, 'type'),
      byStatus: this.groupBy(campaigns, 'status'),
    };

    await cache.set('campaign_stats', stats, 300); // 5 min cache
    return stats;
  }

  // List campaigns
  async listCampaigns(options?: {
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ campaigns: Campaign[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;

    const [campaigns, total] = await Promise.all([
      db.marketingCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      db.marketingCampaign.count({ where }),
    ]);

    return {
      campaigns: campaigns.map(this.formatCampaign),
      total,
    };
  }

  // Get campaign by ID
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    const campaign = await db.marketingCampaign.findUnique({
      where: { id: campaignId },
    });
    return campaign ? this.formatCampaign(campaign) : null;
  }

  // Helper: Format campaign from DB
  private formatCampaign = (c: Record<string, unknown>): Campaign => ({
    id: c.id as string,
    name: c.name as string,
    type: c.type as Campaign['type'],
    status: c.status as Campaign['status'],
    subject: c.subject as string | undefined,
    content: c.content as string,
    htmlContent: c.htmlContent as string | undefined,
    targetSegment: c.targetSegment as string | undefined,
    targetCriteria: c.targetCriteria ? JSON.parse(c.targetCriteria as string) : undefined,
    scheduledAt: c.scheduledAt as Date | undefined,
    sentAt: c.sentAt as Date | undefined,
    totalRecipients: c.totalRecipients as number,
    sentCount: c.sentCount as number,
    openCount: c.openCount as number,
    clickCount: c.clickCount as number,
    bounceCount: c.bounceCount as number,
    unsubscribeCount: c.unsubscribeCount as number,
    createdBy: c.createdBy as string,
    createdAt: c.createdAt as Date,
    updatedAt: c.updatedAt as Date,
  });

  // Helper: Send to recipient
  private async sendToRecipient(campaign: Record<string, unknown>, recipient: string): Promise<boolean> {
    // In production, integrate with email/SMS service
    console.log(`[MARKETING] Sending ${campaign.type} to ${recipient}`);
    return true;
  }

  // Helper: Get segment
  private async getSegment(segmentId: string): Promise<Segment | null> {
    // In production, query from database
    return {
      id: segmentId,
      name: 'VIP Clients',
      criteria: { vip: true },
      memberCount: 150,
      createdAt: new Date(),
    };
  }

  // Helper: Get segment members
  private async getSegmentMembers(segmentId: string): Promise<string[]> {
    // In production, query users matching segment criteria
    return ['user1@example.com', 'user2@example.com'];
  }

  // Helper: Get matching users
  private async getMatchingUsers(criteria: Record<string, unknown>): Promise<string[]> {
    // In production, query users matching criteria
    return ['user1@example.com', 'user2@example.com'];
  }

  // Helper: Count matching users
  private async countMatchingUsers(criteria: Record<string, unknown>): Promise<number> {
    // In production, count users matching criteria
    return 100;
  }

  // Helper: Calculate average
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  // Helper: Group by
  private groupBy(array: Record<string, unknown>[], key: string): Record<string, number> {
    return array.reduce((result, item) => {
      const value = String(item[key] || 'unknown');
      result[value] = (result[value] || 0) + 1;
      return result;
    }, {} as Record<string, number>);
  }
}

// ============================================
// Email Template Manager
// ============================================

export class EmailTemplateManager {
  private templates: EmailTemplate[] = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to OMNI-CRM!',
      textContent: 'Dear {{name}}, welcome to OMNI-CRM!',
      htmlContent: '<h1>Welcome {{name}}!</h1><p>Thank you for joining OMNI-CRM.</p>',
      variables: ['name'],
      category: 'onboarding',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'deposit_confirm',
      name: 'Deposit Confirmation',
      subject: 'Your deposit has been credited',
      textContent: 'Dear {{name}}, your deposit of {{amount}} {{currency}} has been credited.',
      htmlContent: '<h1>Deposit Confirmed</h1><p>{{amount}} {{currency}} credited to your account.</p>',
      variables: ['name', 'amount', 'currency'],
      category: 'transactions',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'kyc_approved',
      name: 'KYC Approved',
      subject: 'Your account has been verified',
      textContent: 'Dear {{name}}, your account has been verified successfully.',
      htmlContent: '<h1>Account Verified</h1><p>You now have full access to all features.</p>',
      variables: ['name'],
      category: 'compliance',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'monthly_report',
      name: 'Monthly Report',
      subject: 'Your Monthly Trading Report',
      textContent: 'Dear {{name}}, here is your monthly trading report.',
      htmlContent: '<h1>Monthly Report</h1><p>Volume: {{volume}} lots</p><p>P/L: {{profit}}</p>',
      variables: ['name', 'volume', 'profit'],
      category: 'reports',
      isActive: true,
      createdAt: new Date(),
    },
  ];

  async listTemplates(): Promise<EmailTemplate[]> {
    return this.templates;
  }

  async getTemplate(id: string): Promise<EmailTemplate | null> {
    return this.templates.find(t => t.id === id) || null;
  }

  async renderTemplate(
    templateId: string,
    variables: Record<string, string>
  ): Promise<{ subject: string; text: string; html: string }> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return {
      subject: this.replaceVariables(template.subject, variables),
      text: this.replaceVariables(template.textContent, variables),
      html: this.replaceVariables(template.htmlContent, variables),
    };
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }
}

// Export singleton instances
export const campaignManager = new CampaignManager();
export const emailTemplateManager = new EmailTemplateManager();
