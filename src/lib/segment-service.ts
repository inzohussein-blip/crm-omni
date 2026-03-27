/**
 * OMNI-CRM Segment Service
 * Audience Segmentation for Marketing Campaigns
 */

import { db } from '@/lib/db';
import type { MarketingSegment, ClientProfile, TradingAccount, User } from '@prisma/client';

// ============================================
// TYPES
// ============================================

export interface SegmentCriteria {
  // Demographics
  countries?: string[];
  nationalities?: string[];
  languages?: string[];
  
  // Account Information
  accountTypes?: string[]; // STANDARD, ECN, ISLAMIC, VIP, DEMO
  bookingTypes?: string[]; // A_BOOK, B_BOOK, HYBRID
  
  // Financial
  depositMin?: number;
  depositMax?: number;
  withdrawalMin?: number;
  withdrawalMax?: number;
  balanceMin?: number;
  balanceMax?: number;
  equityMin?: number;
  equityMax?: number;
  
  // Trading Activity
  volumeMin?: number; // Total volume in lots
  volumeMax?: number;
  tradesMin?: number; // Number of trades
  tradesMax?: number;
  profitMin?: number;
  profitMax?: number;
  
  // Time-based
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastLoginDays?: number; // Active in last X days
  lastTradeDays?: number; // Traded in last X days
  lastDepositDays?: number; // Deposited in last X days
  
  // Compliance
  kycStatus?: string[]; // PENDING, IN_REVIEW, APPROVED, REJECTED
  riskLevel?: string[]; // LOW, MEDIUM, HIGH, VERY_HIGH
  
  // Special Segments
  vipOnly?: boolean;
  hasTraded?: boolean;
  hasDeposited?: boolean;
  hasWithdrawn?: boolean;
  isPep?: boolean; // Politically Exposed Person
  
  // Behavioral
  averageDepositMin?: number;
  averageDepositMax?: number;
  depositFrequency?: 'daily' | 'weekly' | 'monthly' | 'rarely';
  
  // Custom
  customFilters?: CustomFilter[];
}

export interface CustomFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  value: string | number | string[] | number[];
}

export interface SegmentMember {
  userId: string;
  email: string;
  name: string;
  country?: string;
  accountType?: string;
  totalDeposits: number;
  totalVolume: number;
  totalTrades: number;
  lastActivity?: Date;
}

export interface SegmentStats {
  memberCount: number;
  totalDeposits: number;
  totalVolume: number;
  avgDeposit: number;
  topCountries: { country: string; count: number }[];
  accountTypeDistribution: { type: string; count: number }[];
}

// ============================================
// PREDEFINED SEGMENT TEMPLATES
// ============================================

export const SEGMENT_TEMPLATES = {
  VIP_CLIENTS: {
    name: 'VIP Clients',
    description: 'All clients with VIP account type',
    criteria: { accountTypes: ['VIP'] } as SegmentCriteria,
  },
  HIGH_DEPOSITORS: {
    name: 'High Depositors',
    description: 'Clients who deposited more than $10,000',
    criteria: { depositMin: 10000 } as SegmentCriteria,
  },
  ACTIVE_TRADERS: {
    name: 'Active Traders',
    description: 'Clients who traded in the last 30 days',
    criteria: { lastTradeDays: 30, hasTraded: true } as SegmentCriteria,
  },
  INACTIVE_CLIENTS: {
    name: 'Inactive Clients',
    description: 'Clients not active in the last 60 days',
    criteria: { lastLoginDays: 60 } as SegmentCriteria,
  },
  NEW_CLIENTS: {
    name: 'New Clients',
    description: 'Clients registered in the last 7 days',
    criteria: { registrationDateFrom: getDateString(7) } as SegmentCriteria,
  },
  KYC_PENDING: {
    name: 'KYC Pending',
    description: 'Clients with pending KYC verification',
    criteria: { kycStatus: ['PENDING', 'IN_REVIEW'] } as SegmentCriteria,
  },
  HIGH_RISK: {
    name: 'High Risk Clients',
    description: 'Clients with HIGH or VERY_HIGH risk level',
    criteria: { riskLevel: ['HIGH', 'VERY_HIGH'] } as SegmentCriteria,
  },
  NO_TRADES: {
    name: 'Non-Trading Clients',
    description: 'Clients who have never traded',
    criteria: { hasTraded: false, tradesMax: 0 } as SegmentCriteria,
  },
  ISLAMIC_ACCOUNTS: {
    name: 'Islamic Accounts',
    description: 'Clients with Islamic account type',
    criteria: { accountTypes: ['ISLAMIC'] } as SegmentCriteria,
  },
  A_BOOK_CLIENTS: {
    name: 'A-Book Clients',
    description: 'Clients on A-Book execution',
    criteria: { bookingTypes: ['A_BOOK'] } as SegmentCriteria,
  },
};

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// ============================================
// SEGMENT SERVICE CLASS
// ============================================

export class SegmentService {
  /**
   * Create a new segment
   */
  async createSegment(data: {
    name: string;
    description?: string;
    criteria: SegmentCriteria;
  }): Promise<MarketingSegment> {
    // Calculate initial member count
    const memberCount = await this.calculateMemberCount(data.criteria);

    const segment = await db.marketingSegment.create({
      data: {
        name: data.name,
        description: data.description,
        criteria: JSON.stringify(data.criteria),
        memberCount,
        lastCalculated: new Date(),
      },
    });

    return segment;
  }

  /**
   * Update a segment
   */
  async updateSegment(
    segmentId: string,
    data: Partial<{
      name: string;
      description: string;
      criteria: SegmentCriteria;
      isActive: boolean;
    }>
  ): Promise<MarketingSegment> {
    const updateData: Record<string, unknown> = { ...data };
    
    if (data.criteria) {
      updateData.criteria = JSON.stringify(data.criteria);
      updateData.memberCount = await this.calculateMemberCount(data.criteria);
      updateData.lastCalculated = new Date();
    }

    const segment = await db.marketingSegment.update({
      where: { id: segmentId },
      data: updateData,
    });

    return segment;
  }

  /**
   * Delete a segment
   */
  async deleteSegment(segmentId: string): Promise<void> {
    await db.marketingSegment.delete({
      where: { id: segmentId },
    });
  }

  /**
   * Get all segments
   */
  async getSegments(filters?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    segments: MarketingSegment[];
    total: number;
  }> {
    const where: Record<string, unknown> = {};
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [segments, total] = await Promise.all([
      db.marketingSegment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 20,
        skip: filters?.offset || 0,
      }),
      db.marketingSegment.count({ where }),
    ]);

    return { segments, total };
  }

  /**
   * Get segment by ID
   */
  async getSegment(segmentId: string): Promise<MarketingSegment | null> {
    return db.marketingSegment.findUnique({
      where: { id: segmentId },
    });
  }

  /**
   * Get segment members (users matching criteria)
   */
  async getSegmentMembers(
    segmentId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    members: SegmentMember[];
    total: number;
  }> {
    const segment = await db.marketingSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    const criteria = JSON.parse(segment.criteria) as SegmentCriteria;
    return this.getMembersByCriteria(criteria, options);
  }

  /**
   * Get members by criteria
   */
  async getMembersByCriteria(
    criteria: SegmentCriteria,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    members: SegmentMember[];
    total: number;
  }> {
    const users = await db.user.findMany({
      where: {
        userType: 'CLIENT',
        status: 'ACTIVE',
      },
      include: {
        clientProfile: true,
        accounts: true,
      },
    });

    // Apply criteria filters
    let filtered = this.applyFilters(users, criteria);

    const total = filtered.length;

    // Apply pagination
    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    const members: SegmentMember[] = filtered.map(u => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      country: u.clientProfile?.country || undefined,
      accountType: u.clientProfile?.accountType || undefined,
      totalDeposits: u.accounts.reduce((sum, a) => sum + a.totalDeposits, 0),
      totalVolume: u.accounts.reduce((sum, a) => sum + a.totalVolume, 0),
      totalTrades: u.accounts.reduce((sum, a) => sum + a.totalTrades, 0),
      lastActivity: u.lastLoginAt || undefined,
    }));

    return { members, total };
  }

  /**
   * Apply criteria filters to users
   */
  private applyFilters(
    users: Array<User & { clientProfile: ClientProfile | null; accounts: TradingAccount[] }>,
    criteria: SegmentCriteria
  ): Array<User & { clientProfile: ClientProfile | null; accounts: TradingAccount[] }> {
    let filtered = users;

    // Country filter
    if (criteria.countries && criteria.countries.length > 0) {
      filtered = filtered.filter(u =>
        u.clientProfile?.country && criteria.countries!.includes(u.clientProfile.country)
      );
    }

    // Nationality filter
    if (criteria.nationalities && criteria.nationalities.length > 0) {
      filtered = filtered.filter(u =>
        u.clientProfile?.nationality && criteria.nationalities!.includes(u.clientProfile.nationality)
      );
    }

    // Account type filter
    if (criteria.accountTypes && criteria.accountTypes.length > 0) {
      filtered = filtered.filter(u =>
        u.clientProfile?.accountType && criteria.accountTypes!.includes(u.clientProfile.accountType)
      );
    }

    // Booking type filter
    if (criteria.bookingTypes && criteria.bookingTypes.length > 0) {
      filtered = filtered.filter(u =>
        u.clientProfile?.bookingType && criteria.bookingTypes!.includes(u.clientProfile.bookingType)
      );
    }

    // Deposit range filter
    if (criteria.depositMin !== undefined || criteria.depositMax !== undefined) {
      filtered = filtered.filter(u => {
        const totalDeposits = u.accounts.reduce((sum, a) => sum + a.totalDeposits, 0);
        if (criteria.depositMin !== undefined && totalDeposits < criteria.depositMin) return false;
        if (criteria.depositMax !== undefined && totalDeposits > criteria.depositMax) return false;
        return true;
      });
    }

    // Balance range filter
    if (criteria.balanceMin !== undefined || criteria.balanceMax !== undefined) {
      filtered = filtered.filter(u => {
        const balance = u.accounts.reduce((sum, a) => sum + a.balance, 0);
        if (criteria.balanceMin !== undefined && balance < criteria.balanceMin) return false;
        if (criteria.balanceMax !== undefined && balance > criteria.balanceMax) return false;
        return true;
      });
    }

    // Volume range filter
    if (criteria.volumeMin !== undefined || criteria.volumeMax !== undefined) {
      filtered = filtered.filter(u => {
        const volume = u.accounts.reduce((sum, a) => sum + a.totalVolume, 0);
        if (criteria.volumeMin !== undefined && volume < criteria.volumeMin) return false;
        if (criteria.volumeMax !== undefined && volume > criteria.volumeMax) return false;
        return true;
      });
    }

    // Trades range filter
    if (criteria.tradesMin !== undefined || criteria.tradesMax !== undefined) {
      filtered = filtered.filter(u => {
        const trades = u.accounts.reduce((sum, a) => sum + a.totalTrades, 0);
        if (criteria.tradesMin !== undefined && trades < criteria.tradesMin) return false;
        if (criteria.tradesMax !== undefined && trades > criteria.tradesMax) return false;
        return true;
      });
    }

    // Profit range filter
    if (criteria.profitMin !== undefined || criteria.profitMax !== undefined) {
      filtered = filtered.filter(u => {
        const profit = u.accounts.reduce((sum, a) => sum + a.totalProfit, 0);
        if (criteria.profitMin !== undefined && profit < criteria.profitMin) return false;
        if (criteria.profitMax !== undefined && profit > criteria.profitMax) return false;
        return true;
      });
    }

    // KYC status filter
    if (criteria.kycStatus && criteria.kycStatus.length > 0) {
      filtered = filtered.filter(u =>
        u.clientProfile?.kycStatus && criteria.kycStatus!.includes(u.clientProfile.kycStatus)
      );
    }

    // Risk level filter
    if (criteria.riskLevel && criteria.riskLevel.length > 0) {
      filtered = filtered.filter(u =>
        u.clientProfile?.riskLevel && criteria.riskLevel!.includes(u.clientProfile.riskLevel)
      );
    }

    // VIP only filter
    if (criteria.vipOnly) {
      filtered = filtered.filter(u =>
        u.clientProfile?.accountType === 'VIP'
      );
    }

    // Has traded filter
    if (criteria.hasTraded !== undefined) {
      filtered = filtered.filter(u => {
        const hasTrades = u.accounts.some(a => a.totalTrades > 0);
        return criteria.hasTraded ? hasTrades : !hasTrades;
      });
    }

    // Has deposited filter
    if (criteria.hasDeposited !== undefined) {
      filtered = filtered.filter(u => {
        const hasDeposits = u.accounts.some(a => a.totalDeposits > 0);
        return criteria.hasDeposited ? hasDeposits : !hasDeposits;
      });
    }

    // Has withdrawn filter
    if (criteria.hasWithdrawn !== undefined) {
      filtered = filtered.filter(u => {
        const hasWithdrawals = u.accounts.some(a => a.totalWithdrawals > 0);
        return criteria.hasWithdrawn ? hasWithdrawals : !hasWithdrawals;
      });
    }

    // PEP status filter
    if (criteria.isPep !== undefined) {
      filtered = filtered.filter(u =>
        u.clientProfile?.pepStatus === criteria.isPep
      );
    }

    // Registration date filter
    if (criteria.registrationDateFrom || criteria.registrationDateTo) {
      filtered = filtered.filter(u => {
        const createdAt = new Date(u.createdAt);
        if (criteria.registrationDateFrom && createdAt < new Date(criteria.registrationDateFrom)) return false;
        if (criteria.registrationDateTo && createdAt > new Date(criteria.registrationDateTo)) return false;
        return true;
      });
    }

    // Last login days filter
    if (criteria.lastLoginDays !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - criteria.lastLoginDays);
      filtered = filtered.filter(u =>
        u.lastLoginAt && new Date(u.lastLoginAt) >= cutoffDate
      );
    }

    // Average deposit filter
    if (criteria.averageDepositMin !== undefined || criteria.averageDepositMax !== undefined) {
      filtered = filtered.filter(u => {
        const totalDeposits = u.accounts.reduce((sum, a) => sum + a.totalDeposits, 0);
        const depositCount = u.accounts.filter(a => a.totalDeposits > 0).length;
        const avgDeposit = depositCount > 0 ? totalDeposits / depositCount : 0;
        
        if (criteria.averageDepositMin !== undefined && avgDeposit < criteria.averageDepositMin) return false;
        if (criteria.averageDepositMax !== undefined && avgDeposit > criteria.averageDepositMax) return false;
        return true;
      });
    }

    return filtered;
  }

  /**
   * Calculate member count for criteria
   */
  async calculateMemberCount(criteria: SegmentCriteria): Promise<number> {
    const { total } = await this.getMembersByCriteria(criteria);
    return total;
  }

  /**
   * Refresh segment member count
   */
  async refreshSegmentStats(segmentId: string): Promise<MarketingSegment> {
    const segment = await db.marketingSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    const criteria = JSON.parse(segment.criteria) as SegmentCriteria;
    const memberCount = await this.calculateMemberCount(criteria);

    return db.marketingSegment.update({
      where: { id: segmentId },
      data: {
        memberCount,
        lastCalculated: new Date(),
      },
    });
  }

  /**
   * Get segment statistics
   */
  async getSegmentStats(segmentId: string): Promise<SegmentStats> {
    const segment = await db.marketingSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new Error('Segment not found');
    }

    const criteria = JSON.parse(segment.criteria) as SegmentCriteria;
    const { members } = await this.getMembersByCriteria(criteria);

    const totalDeposits = members.reduce((sum, m) => sum + m.totalDeposits, 0);
    const totalVolume = members.reduce((sum, m) => sum + m.totalVolume, 0);
    const avgDeposit = members.length > 0 ? totalDeposits / members.length : 0;

    // Top countries
    const countryCounts = new Map<string, number>();
    members.forEach(m => {
      if (m.country) {
        countryCounts.set(m.country, (countryCounts.get(m.country) || 0) + 1);
      }
    });
    const topCountries = Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Account type distribution
    const accountTypeCounts = new Map<string, number>();
    members.forEach(m => {
      const type = m.accountType || 'UNKNOWN';
      accountTypeCounts.set(type, (accountTypeCounts.get(type) || 0) + 1);
    });
    const accountTypeDistribution = Array.from(accountTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      memberCount: members.length,
      totalDeposits,
      totalVolume,
      avgDeposit,
      topCountries,
      accountTypeDistribution,
    };
  }

  /**
   * Preview segment (get sample members without saving)
   */
  async previewSegment(criteria: SegmentCriteria): Promise<{
    members: SegmentMember[];
    total: number;
    stats: Omit<SegmentStats, 'memberCount'>;
  }> {
    const { members, total } = await this.getMembersByCriteria(criteria, { limit: 50 });

    const totalDeposits = members.reduce((sum, m) => sum + m.totalDeposits, 0);
    const totalVolume = members.reduce((sum, m) => sum + m.totalVolume, 0);
    const avgDeposit = total > 0 ? totalDeposits / total : 0;

    // Top countries
    const countryCounts = new Map<string, number>();
    members.forEach(m => {
      if (m.country) {
        countryCounts.set(m.country, (countryCounts.get(m.country) || 0) + 1);
      }
    });
    const topCountries = Array.from(countryCounts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Account type distribution
    const accountTypeCounts = new Map<string, number>();
    members.forEach(m => {
      const type = m.accountType || 'UNKNOWN';
      accountTypeCounts.set(type, (accountTypeCounts.get(type) || 0) + 1);
    });
    const accountTypeDistribution = Array.from(accountTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      members,
      total,
      stats: {
        totalDeposits,
        totalVolume,
        avgDeposit,
        topCountries,
        accountTypeDistribution,
      },
    };
  }

  /**
   * Create segment from template
   */
  async createFromTemplate(
    templateKey: keyof typeof SEGMENT_TEMPLATES,
    customName?: string
  ): Promise<MarketingSegment> {
    const template = SEGMENT_TEMPLATES[templateKey];
    if (!template) {
      throw new Error('Invalid template key');
    }

    return this.createSegment({
      name: customName || template.name,
      description: template.description,
      criteria: template.criteria,
    });
  }

  /**
   * Get available segment templates
   */
  getTemplates(): Array<{
    key: string;
    name: string;
    description: string;
    criteria: SegmentCriteria;
  }> {
    return Object.entries(SEGMENT_TEMPLATES).map(([key, template]) => ({
      key,
      name: template.name,
      description: template.description,
      criteria: template.criteria,
    }));
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const segmentService = new SegmentService();
