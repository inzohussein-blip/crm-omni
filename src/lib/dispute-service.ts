/**
 * OMNI-CRM Dispute Management Service
 * Comprehensive dispute management with auto-numbering, evidence handling, status workflow, and resolution tracking
 */

import { db } from '@/lib/db';
import { DisputeCategory, DisputeStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface CreateDisputeData {
  clientId: string;
  againstType: 'broker' | 'staff' | 'ib';
  againstId?: string;
  title: string;
  description: string;
  category: DisputeCategory;
  amount?: number;
  currency?: string;
  initialEvidence?: EvidenceItem[];
}

export interface DisputeFilter {
  status?: DisputeStatus;
  category?: DisputeCategory;
  clientId?: string;
  againstType?: string;
  againstId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface DisputeUpdate {
  status?: DisputeStatus;
  resolution?: string;
  resolutionType?: 'refund' | 'compensation' | 'rejected' | 'resolved' | 'partial_refund';
  resolvedById?: string;
}

export interface CreateMessageData {
  disputeId: string;
  senderId: string;
  senderType: 'client' | 'staff' | 'system';
  content: string;
  attachments?: string[];
  isInternal?: boolean;
}

export interface EvidenceItem {
  id: string;
  type: 'document' | 'image' | 'video' | 'screenshot' | 'email' | 'chat_log' | 'transaction_record' | 'other';
  name: string;
  url: string;
  description?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface DisputeStats {
  total: number;
  open: number;
  inReview: number;
  escalated: number;
  resolved: number;
  closed: number;
  totalAmount: number;
  avgResolutionTime: number; // in hours
  byCategory: Record<string, number>;
  byAgainstType: Record<string, number>;
}

// ============================================
// DISPUTE MANAGER CLASS
// ============================================

export class DisputeManager {
  private static instance: DisputeManager;

  private constructor() {}

  static getInstance(): DisputeManager {
    if (!DisputeManager.instance) {
      DisputeManager.instance = new DisputeManager();
    }
    return DisputeManager.instance;
  }

  // ============================================
  // CASE NUMBER GENERATION
  // ============================================

  /**
   * Generate unique case number in format DSP-XXXXX
   */
  private async generateCaseNumber(): Promise<string> {
    const prefix = 'DSP';
    
    // Get the highest existing case number
    const lastDispute = await db.dispute.findFirst({
      where: {
        caseNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        caseNumber: 'desc',
      },
      select: {
        caseNumber: true,
      },
    });

    let nextNumber = 1;
    
    if (lastDispute) {
      const lastNumber = parseInt(lastDispute.caseNumber.replace(prefix + '-', ''), 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Format: DSP-00001, DSP-00002, etc.
    return `${prefix}-${nextNumber.toString().padStart(5, '0')}`;
  }

  // ============================================
  // DISPUTE CREATION
  // ============================================

  /**
   * Create a new dispute case with auto-numbering
   */
  async createDispute(data: CreateDisputeData) {
    const caseNumber = await this.generateCaseNumber();

    // Create dispute with initial evidence
    const dispute = await db.dispute.create({
      data: {
        caseNumber,
        clientId: data.clientId,
        againstType: data.againstType,
        againstId: data.againstId,
        title: data.title,
        description: data.description,
        category: data.category,
        amount: data.amount,
        currency: data.currency || 'USD',
        evidence: data.initialEvidence ? JSON.stringify(data.initialEvidence) : null,
        status: 'OPEN',
      },
    });

    // Create initial system message
    await db.disputeMessage.create({
      data: {
        disputeId: dispute.id,
        senderId: data.clientId,
        senderType: 'system',
        content: `Dispute case ${caseNumber} has been opened. Category: ${data.category}. ${data.amount ? `Amount: ${data.amount} ${data.currency || 'USD'}.` : ''}`,
        isInternal: false,
      },
    });

    return this.getDisputeById(dispute.id);
  }

  // ============================================
  // DISPUTE RETRIEVAL
  // ============================================

  /**
   * Get dispute by ID with full details
   */
  async getDisputeById(disputeId: string) {
    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!dispute) return null;

    // Get client info
    const client = await db.user.findUnique({
      where: { id: dispute.clientId },
      select: { id: true, name: true, email: true, avatar: true },
    });

    // Get resolver info
    let resolver = null;
    if (dispute.resolvedById) {
      resolver = await db.user.findUnique({
        where: { id: dispute.resolvedById },
        select: { id: true, name: true, email: true, avatar: true },
      });
    }

    // Get against entity info
    let againstEntity = null;
    if (dispute.againstId) {
      againstEntity = await db.user.findUnique({
        where: { id: dispute.againstId },
        select: { id: true, name: true, email: true, avatar: true, userType: true },
      });
    }

    // Get sender info for each message
    const messagesWithSender = await Promise.all(
      dispute.messages.map(async (msg) => {
        const sender = await db.user.findUnique({
          where: { id: msg.senderId },
          select: { id: true, name: true, email: true, avatar: true },
        });
        return {
          ...msg,
          attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
          sender: sender || { id: msg.senderId, name: 'Unknown' },
        };
      })
    );

    return {
      ...dispute,
      evidence: dispute.evidence ? JSON.parse(dispute.evidence) : [],
      client,
      resolver,
      againstEntity,
      messages: messagesWithSender,
    };
  }

  /**
   * Get dispute by case number
   */
  async getDisputeByCaseNumber(caseNumber: string) {
    const dispute = await db.dispute.findUnique({
      where: { caseNumber },
    });
    if (!dispute) return null;
    return this.getDisputeById(dispute.id);
  }

  /**
   * List disputes with filters and pagination
   */
  async listDisputes(
    filter: DisputeFilter = {},
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const where: any = {};

    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.clientId) where.clientId = filter.clientId;
    if (filter.againstType) where.againstType = filter.againstType;
    if (filter.againstId) where.againstId = filter.againstId;

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search } },
        { caseNumber: { contains: filter.search } },
        { description: { contains: filter.search } },
      ];
    }

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    if (filter.minAmount || filter.maxAmount) {
      where.amount = {};
      if (filter.minAmount) where.amount.gte = filter.minAmount;
      if (filter.maxAmount) where.amount.lte = filter.maxAmount;
    }

    const [disputes, total] = await Promise.all([
      db.dispute.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      db.dispute.count({ where }),
    ]);

    // Enrich disputes with client and against entity info
    const enrichedDisputes = await Promise.all(
      disputes.map(async (dispute) => {
        const client = await db.user.findUnique({
          where: { id: dispute.clientId },
          select: { id: true, name: true, email: true, avatar: true },
        });

        let againstEntity = null;
        if (dispute.againstId) {
          againstEntity = await db.user.findUnique({
            where: { id: dispute.againstId },
            select: { id: true, name: true, email: true, avatar: true, userType: true },
          });
        }

        // Calculate resolution time if resolved
        let resolutionTime = null;
        if (dispute.resolvedAt) {
          resolutionTime = Math.round(
            (new Date(dispute.resolvedAt).getTime() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60)
          );
        }

        return {
          ...dispute,
          evidence: dispute.evidence ? JSON.parse(dispute.evidence) : [],
          client,
          againstEntity,
          resolutionTime,
        };
      })
    );

    return {
      disputes: enrichedDisputes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // STATUS WORKFLOW
  // ============================================

  /**
   * Update dispute status with workflow validation
   */
  async updateDispute(disputeId: string, data: DisputeUpdate, actorId?: string) {
    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Validate status transitions
    if (data.status) {
      this.validateStatusTransition(dispute.status as DisputeStatus, data.status);
    }

    const updateData: any = {};

    if (data.status) {
      updateData.status = data.status;

      // Auto-set resolvedAt when status becomes RESOLVED or CLOSED
      if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
        updateData.resolvedAt = new Date();
        if (actorId) {
          updateData.resolvedById = actorId;
        }
      }
    }

    if (data.resolution) updateData.resolution = data.resolution;
    if (data.resolutionType) updateData.resolutionType = data.resolutionType;
    if (data.resolvedById) updateData.resolvedById = data.resolvedById;

    const updatedDispute = await db.dispute.update({
      where: { id: disputeId },
      data: updateData,
    });

    // Create system message for status change
    if (data.status && data.status !== dispute.status) {
      await db.disputeMessage.create({
        data: {
          disputeId,
          senderId: actorId || 'system',
          senderType: 'system',
          content: `Case status changed from ${dispute.status} to ${data.status}.`,
          isInternal: false,
        },
      });
    }

    return this.getDisputeById(updatedDispute.id);
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: DisputeStatus,
    newStatus: DisputeStatus
  ): void {
    const validTransitions: Record<DisputeStatus, DisputeStatus[]> = {
      OPEN: ['IN_REVIEW', 'ESCALATED', 'RESOLVED', 'CLOSED'],
      IN_REVIEW: ['ESCALATED', 'RESOLVED', 'CLOSED', 'OPEN'],
      ESCALATED: ['IN_REVIEW', 'RESOLVED', 'CLOSED'],
      RESOLVED: ['CLOSED', 'OPEN'], // Allow reopening
      CLOSED: ['OPEN'], // Allow reopening
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Escalate dispute
   */
  async escalateDispute(disputeId: string, reason: string, escalatedBy: string) {
    const dispute = await this.getDisputeById(disputeId);
    
    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Update status to ESCALATED
    await this.updateDispute(disputeId, { status: 'ESCALATED' }, escalatedBy);

    // Add internal message about escalation
    await this.addMessage({
      disputeId,
      senderId: escalatedBy,
      senderType: 'staff',
      content: `Case escalated. Reason: ${reason}`,
      isInternal: true,
    });

    return this.getDisputeById(disputeId);
  }

  // ============================================
  // EVIDENCE MANAGEMENT
  // ============================================

  /**
   * Add evidence to a dispute
   */
  async addEvidence(disputeId: string, evidence: EvidenceItem) {
    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const currentEvidence: EvidenceItem[] = dispute.evidence 
      ? JSON.parse(dispute.evidence) 
      : [];

    currentEvidence.push(evidence);

    await db.dispute.update({
      where: { id: disputeId },
      data: {
        evidence: JSON.stringify(currentEvidence),
      },
    });

    // Add message about evidence upload
    await db.disputeMessage.create({
      data: {
        disputeId,
        senderId: evidence.uploadedBy,
        senderType: 'system',
        content: `New evidence added: ${evidence.name} (${evidence.type})`,
        isInternal: false,
      },
    });

    return this.getDisputeById(disputeId);
  }

  /**
   * Remove evidence from a dispute
   */
  async removeEvidence(disputeId: string, evidenceId: string, removedBy: string) {
    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const currentEvidence: EvidenceItem[] = dispute.evidence 
      ? JSON.parse(dispute.evidence) 
      : [];

    const evidenceIndex = currentEvidence.findIndex(e => e.id === evidenceId);
    
    if (evidenceIndex === -1) {
      throw new Error('Evidence not found');
    }

    const removedEvidence = currentEvidence[evidenceIndex];
    currentEvidence.splice(evidenceIndex, 1);

    await db.dispute.update({
      where: { id: disputeId },
      data: {
        evidence: currentEvidence.length > 0 ? JSON.stringify(currentEvidence) : null,
      },
    });

    // Add message about evidence removal
    await db.disputeMessage.create({
      data: {
        disputeId,
        senderId: removedBy,
        senderType: 'system',
        content: `Evidence removed: ${removedEvidence.name}`,
        isInternal: true,
      },
    });

    return this.getDisputeById(disputeId);
  }

  /**
   * Get all evidence for a dispute
   */
  async getEvidence(disputeId: string): Promise<EvidenceItem[]> {
    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
      select: { evidence: true },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    return dispute.evidence ? JSON.parse(dispute.evidence) : [];
  }

  // ============================================
  // MESSAGE THREADING
  // ============================================

  /**
   * Add a message to a dispute
   */
  async addMessage(data: CreateMessageData) {
    const dispute = await db.dispute.findUnique({
      where: { id: data.disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Create message
    const message = await db.disputeMessage.create({
      data: {
        disputeId: data.disputeId,
        senderId: data.senderId,
        senderType: data.senderType,
        content: data.content,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
        isInternal: data.isInternal || false,
      },
    });

    // Auto-change status if client responds and case was resolved/closed
    if (data.senderType === 'client' && !data.isInternal) {
      if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
        await this.updateDispute(data.disputeId, { status: 'OPEN' }, data.senderId);
      }
    }

    return this.getMessageById(message.id);
  }

  /**
   * Get message with sender info
   */
  private async getMessageById(messageId: string) {
    const message = await db.disputeMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) return null;

    const sender = await db.user.findUnique({
      where: { id: message.senderId },
      select: { id: true, name: true, email: true, avatar: true },
    });

    return {
      ...message,
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
      sender: sender || { id: message.senderId, name: 'Unknown' },
    };
  }

  /**
   * Get messages for a dispute
   */
  async getDisputeMessages(disputeId: string, includeInternal: boolean = false) {
    const where: any = { disputeId };
    
    if (!includeInternal) {
      where.isInternal = false;
    }

    const messages = await db.disputeMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Get sender info for each message
    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const sender = await db.user.findUnique({
          where: { id: msg.senderId },
          select: { id: true, name: true, email: true, avatar: true },
        });
        return {
          ...msg,
          attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
          sender: sender || { id: msg.senderId, name: 'Unknown' },
        };
      })
    );

    return messagesWithSender;
  }

  // ============================================
  // RESOLUTION TRACKING
  // ============================================

  /**
   * Resolve a dispute
   */
  async resolveDispute(
    disputeId: string,
    data: {
      resolution: string;
      resolutionType: 'refund' | 'compensation' | 'rejected' | 'resolved' | 'partial_refund';
      refundAmount?: number;
    },
    resolvedBy: string
  ) {
    const dispute = await this.getDisputeById(disputeId);

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    // Update dispute with resolution
    const updated = await this.updateDispute(disputeId, {
      status: 'RESOLVED',
      resolution: data.resolution,
      resolutionType: data.resolutionType,
      resolvedById: resolvedBy,
    }, resolvedBy);

    // Add resolution message
    await db.disputeMessage.create({
      data: {
        disputeId,
        senderId: resolvedBy,
        senderType: 'staff',
        content: `Case resolved. Resolution: ${data.resolutionType}. ${data.resolution}${data.refundAmount ? ` Refund amount: ${data.refundAmount}` : ''}`,
        isInternal: false,
      },
    });

    return updated;
  }

  /**
   * Close a dispute
   */
  async closeDispute(disputeId: string, closedBy: string) {
    return this.updateDispute(disputeId, { status: 'CLOSED' }, closedBy);
  }

  /**
   * Reopen a dispute
   */
  async reopenDispute(disputeId: string, reason: string, reopenedBy: string) {
    const dispute = await this.updateDispute(disputeId, { status: 'OPEN' }, reopenedBy);

    await db.disputeMessage.create({
      data: {
        disputeId,
        senderId: reopenedBy,
        senderType: 'staff',
        content: `Case reopened. Reason: ${reason}`,
        isInternal: true,
      },
    });

    return dispute;
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get dispute statistics
   */
  async getStats(dateFrom?: Date, dateTo?: Date): Promise<DisputeStats> {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      total,
      open,
      inReview,
      escalated,
      resolved,
      closed,
      disputesWithAmount,
      resolvedDisputes,
      categoryCounts,
      againstTypeCounts,
    ] = await Promise.all([
      db.dispute.count({ where }),
      db.dispute.count({ where: { ...where, status: 'OPEN' } }),
      db.dispute.count({ where: { ...where, status: 'IN_REVIEW' } }),
      db.dispute.count({ where: { ...where, status: 'ESCALATED' } }),
      db.dispute.count({ where: { ...where, status: 'RESOLVED' } }),
      db.dispute.count({ where: { ...where, status: 'CLOSED' } }),
      db.dispute.findMany({
        where: { ...where, amount: { not: null } },
        select: { amount: true, currency: true },
      }),
      db.dispute.findMany({
        where: {
          ...where,
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { not: null },
        },
        select: { createdAt: true, resolvedAt: true },
      }),
      db.dispute.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      }),
      db.dispute.groupBy({
        by: ['againstType'],
        where,
        _count: { id: true },
      }),
    ]);

    // Calculate total disputed amount (assuming USD for simplicity)
    const totalAmount = disputesWithAmount.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Calculate average resolution time in hours
    let avgResolutionTime = 0;
    if (resolvedDisputes.length > 0) {
      const totalResolutionTime = resolvedDisputes.reduce((acc, d) => {
        if (d.resolvedAt) {
          return acc + (new Date(d.resolvedAt).getTime() - new Date(d.createdAt).getTime());
        }
        return acc;
      }, 0);
      avgResolutionTime = Math.round(totalResolutionTime / resolvedDisputes.length / (1000 * 60 * 60));
    }

    // Format category counts
    const byCategory: Record<string, number> = {};
    categoryCounts.forEach(c => {
      byCategory[c.category] = c._count.id;
    });

    // Format against type counts
    const byAgainstType: Record<string, number> = {};
    againstTypeCounts.forEach(a => {
      byAgainstType[a.againstType] = a._count.id;
    });

    return {
      total,
      open,
      inReview,
      escalated,
      resolved,
      closed,
      totalAmount,
      avgResolutionTime,
      byCategory,
      byAgainstType,
    };
  }

  /**
   * Get disputes by client
   */
  async getDisputesByClient(clientId: string) {
    return this.listDisputes({ clientId });
  }

  /**
   * Get disputes against an entity (staff/IB)
   */
  async getDisputesAgainst(againstType: string, againstId?: string) {
    return this.listDisputes({ againstType, againstId });
  }

  /**
   * Get high value disputes (amount above threshold)
   */
  async getHighValueDisputes(threshold: number = 10000) {
    return this.listDisputes({ minAmount: threshold }, 1, 50);
  }

  /**
   * Get overdue disputes (open for more than X days without resolution)
   */
  async getOverdueDisputes(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const disputes = await db.dispute.findMany({
      where: {
        status: { in: ['OPEN', 'IN_REVIEW', 'ESCALATED'] },
        createdAt: { lt: cutoffDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Enrich with client info
    return Promise.all(
      disputes.map(async (dispute) => {
        const client = await db.user.findUnique({
          where: { id: dispute.clientId },
          select: { id: true, name: true, email: true, avatar: true },
        });

        const daysOpen = Math.floor(
          (Date.now() - new Date(dispute.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          ...dispute,
          evidence: dispute.evidence ? JSON.parse(dispute.evidence) : [],
          client,
          daysOpen,
        };
      })
    );
  }
}

// Export singleton instance
export const disputeManager = DisputeManager.getInstance();
