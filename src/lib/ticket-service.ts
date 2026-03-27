/**
 * Ticket Service
 * Support ticket management with auto-assignment and SLA tracking
 */

import { db } from './db';

// ============================================
// Types
// ============================================

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: 'GENERAL' | 'TRADING' | 'DEPOSIT' | 'WITHDRAWAL' | 'KYC' | 'TECHNICAL' | 'ACCOUNT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'WAITING_INTERNAL' | 'RESOLVED' | 'CLOSED';
  clientId: string;
  client?: { name: string; email: string };
  assignedToId?: string;
  assignee?: { name: string; email: string };
  departmentId?: string;
  department?: { name: string };
  slaMinutes: number;
  slaDeadline: Date;
  slaBreached: boolean;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderType: 'CLIENT' | 'STAFF' | 'SYSTEM';
  content: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: Date;
}

export interface TicketDepartment {
  id: string;
  name: string;
  description?: string;
  email: string;
  autoAssign: boolean;
  slaMinutes: number;
  members: string[];
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  slaBreached: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
}

// ============================================
// Ticket Service
// ============================================

export class TicketService {
  private ticketCounter = 1000;

  // Generate ticket number
  private generateTicketNumber(): string {
    this.ticketCounter++;
    return `TKT-${String(this.ticketCounter).padStart(5, '0')}`;
  }

  // Create new ticket
  async createTicket(data: {
    subject: string;
    description: string;
    category: Ticket['category'];
    priority?: Ticket['priority'];
    clientId: string;
    departmentId?: string;
  }): Promise<Ticket> {
    const ticketNumber = this.generateTicketNumber();
    const priority = data.priority || 'MEDIUM';
    const slaMinutes = this.calculateSLA(priority, data.category);

    const ticket: Ticket = {
      id: `t_${Date.now()}`,
      ticketNumber,
      subject: data.subject,
      description: data.description,
      category: data.category,
      priority,
      status: 'OPEN',
      clientId: data.clientId,
      departmentId: data.departmentId,
      slaMinutes,
      slaDeadline: new Date(Date.now() + slaMinutes * 60 * 1000),
      slaBreached: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Auto-assign if department has auto-assign enabled
    if (data.departmentId) {
      const assignee = await this.findAvailableAgent(data.departmentId);
      if (assignee) {
        ticket.assignedToId = assignee.id;
      }
    }

    console.log(`[TICKET] Created ${ticketNumber}: ${data.subject}`);
    return ticket;
  }

  // Get ticket by ID or number
  async getTicket(identifier: string): Promise<Ticket | null> {
    // In production, query from database
    return {
      id: 't_1',
      ticketNumber: 'TKT-01001',
      subject: 'Cannot withdraw funds',
      description: 'I am trying to withdraw but getting an error',
      category: 'WITHDRAWAL',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      clientId: 'client_1',
      client: { name: 'John Doe', email: 'john@example.com' },
      assignedToId: 'agent_1',
      assignee: { name: 'Support Agent', email: 'support@omnicrm.com' },
      slaMinutes: 60,
      slaDeadline: new Date(Date.now() + 30 * 60 * 1000),
      slaBreached: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Update ticket status
  async updateStatus(
    ticketId: string,
    status: Ticket['status'],
    actorId: string
  ): Promise<Ticket> {
    const updates: Partial<Ticket> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'RESOLVED') {
      updates.resolvedAt = new Date();
    } else if (status === 'CLOSED') {
      updates.closedAt = new Date();
    }

    console.log(`[TICKET] Updated ${ticketId} to ${status} by ${actorId}`);
    return this.getTicket(ticketId) as Promise<Ticket>;
  }

  // Assign ticket
  async assignTicket(ticketId: string, agentId: string): Promise<Ticket> {
    console.log(`[TICKET] Assigned ${ticketId} to ${agentId}`);
    return this.getTicket(ticketId) as Promise<Ticket>;
  }

  // Add message to ticket
  async addMessage(data: {
    ticketId: string;
    senderId: string;
    senderName: string;
    senderType: 'CLIENT' | 'STAFF' | 'SYSTEM';
    content: string;
    attachments?: string[];
    isInternal?: boolean;
  }): Promise<TicketMessage> {
    const message: TicketMessage = {
      id: `tm_${Date.now()}`,
      ticketId: data.ticketId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderType: data.senderType,
      content: data.content,
      attachments: data.attachments,
      isInternal: data.isInternal || false,
      createdAt: new Date(),
    };

    // Update ticket status based on sender
    if (data.senderType === 'CLIENT') {
      await this.updateStatus(data.ticketId, 'WAITING_INTERNAL', data.senderId);
    } else if (data.senderType === 'STAFF') {
      await this.updateStatus(data.ticketId, 'WAITING_CUSTOMER', data.senderId);
    }

    console.log(`[TICKET] Added message to ${data.ticketId}`);
    return message;
  }

  // Get ticket messages
  async getMessages(ticketId: string, includeInternal = false): Promise<TicketMessage[]> {
    return [
      {
        id: 'tm1',
        ticketId,
        senderId: 'client_1',
        senderName: 'John Doe',
        senderType: 'CLIENT',
        content: 'I am trying to withdraw but getting an error: Insufficient balance',
        isInternal: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: 'tm2',
        ticketId,
        senderId: 'agent_1',
        senderName: 'Support Team',
        senderType: 'STAFF',
        content: 'Hello John, thank you for contacting us. Let me check your account.',
        isInternal: false,
        createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      },
      {
        id: 'tm3',
        ticketId,
        senderId: 'agent_1',
        senderName: 'Support Team',
        senderType: 'STAFF',
        content: 'I see the issue. Your withdrawal exceeds available balance. You have $500 available but tried to withdraw $1000.',
        isInternal: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    ];
  }

  // Rate ticket
  async rateTicket(ticketId: string, rating: number, feedback: string): Promise<void> {
    console.log(`[TICKET] Rated ${ticketId}: ${rating}/5 - ${feedback}`);
  }

  // Get ticket statistics
  async getStats(): Promise<TicketStats> {
    return {
      total: 156,
      open: 23,
      inProgress: 45,
      resolved: 75,
      slaBreached: 5,
      avgResponseTime: 45, // minutes
      avgResolutionTime: 4.5, // hours
      byPriority: { LOW: 20, MEDIUM: 80, HIGH: 45, URGENT: 11 },
      byCategory: { GENERAL: 30, TRADING: 25, DEPOSIT: 35, WITHDRAWAL: 30, KYC: 20, TECHNICAL: 10, ACCOUNT: 6 },
    };
  }

  // List tickets
  async listTickets(options?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedToId?: string;
    clientId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tickets: Ticket[]; total: number }> {
    // In production, query from database with filters
    return {
      tickets: [],
      total: 0,
    };
  }

  // Calculate SLA based on priority and category
  private calculateSLA(priority: Ticket['priority'], category: Ticket['category']): number {
    const baseSLA: Record<string, number> = {
      URGENT: 30,
      HIGH: 60,
      MEDIUM: 240,
      LOW: 480,
    };

    const categoryModifier: Record<string, number> = {
      WITHDRAWAL: 0.5, // Faster for withdrawals
      DEPOSIT: 0.5,
      TRADING: 0.75,
      KYC: 1.5,
      GENERAL: 1,
      TECHNICAL: 1,
      ACCOUNT: 1,
    };

    return Math.round(baseSLA[priority] * (categoryModifier[category] || 1));
  }

  // Find available agent
  private async findAvailableAgent(departmentId: string): Promise<{ id: string } | null> {
    // In production, find agent with least open tickets
    return { id: 'agent_1' };
  }
}

// Export singleton
export const ticketService = new TicketService();
