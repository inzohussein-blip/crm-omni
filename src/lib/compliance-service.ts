/**
 * OMNI-CRM Compliance Service
 * Comprehensive compliance management for forex brokerage
 */

import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type ComplianceCheckType = 'KYC' | 'AML' | 'PEP' | 'SANCTIONS' | 'ADVERSE_MEDIA' | 'DOCUMENT_VERIFICATION';
export type ComplianceCheckStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'false_positive';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface WatchlistMatch {
  source: string;
  name: string;
  matchScore: number;
  matchType: 'exact' | 'partial' | 'phonetic';
  details: {
    listType: string;
    country?: string;
    dateOfBirth?: string;
    aliases?: string[];
    program?: string;
  };
}

export interface ComplianceCheckResult {
  status: ComplianceCheckStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  matches: WatchlistMatch[];
  recommendations: string[];
  provider: string;
  externalRef: string;
  validUntil?: Date;
}

export interface ScreeningRequest {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  nationality?: string;
  country?: string;
  documentNumber?: string;
}

export interface ComplianceDashboardStats {
  totalChecks: number;
  pendingChecks: number;
  completedChecks: number;
  failedChecks: number;
  highRiskClients: number;
  activeAlerts: number;
  criticalAlerts: number;
  checksByType: Record<ComplianceCheckType, number>;
  checksByStatus: Record<ComplianceCheckStatus, number>;
  amlStats: {
    pepCount: number;
    sanctionsCount: number;
    adverseMediaCount: number;
  };
  kycStats: {
    pending: number;
    approved: number;
    rejected: number;
    inReview: number;
  };
}

// ============================================
// MOCK WATCHLIST DATA
// ============================================

const MOCK_WATCHLISTS = {
  OFAC: {
    name: 'OFAC Sanctions',
    type: 'sanctions',
    entries: [
      { name: 'JOHN DOE SMITH', country: 'IR', program: 'Global Terrorism' },
      { name: 'IVAN PETROV', country: 'RU', program: 'Cyber-Related Designations' },
    ],
  },
  UN_SANCTIONS: {
    name: 'UN Security Council Sanctions',
    type: 'sanctions',
    entries: [
      { name: 'MOHAMMAD ALI', country: 'AF', program: 'Taliban' },
    ],
  },
  PEP_LIST: {
    name: 'Politically Exposed Persons',
    type: 'pep',
    entries: [
      { name: 'ALEXANDER PUTIN', country: 'RU', program: 'Senior Government Official' },
      { name: 'DONALD TRUMP', country: 'US', program: 'Former Head of State' },
    ],
  },
  ADVERSE_MEDIA: {
    name: 'Adverse Media',
    type: 'adverse_media',
    entries: [
      { name: 'BERNIE MADOFF', country: 'US', program: 'Financial Fraud' },
    ],
  },
};

// ============================================
// COMPLIANCE MANAGER CLASS
// ============================================

export class ComplianceManager {
  private scheduledChecks: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new compliance check
   */
  async createCheck(params: {
    userId: string;
    type: ComplianceCheckType;
    provider?: string;
    scheduledFor?: Date;
  }): Promise<{ checkId: string; status: ComplianceCheckStatus }> {
    const check = await db.complianceCheck.create({
      data: {
        userId: params.userId,
        type: params.type,
        provider: params.provider || 'INTERNAL',
        status: 'PENDING',
        riskScore: 0,
        riskLevel: 'LOW',
      },
    });

    // If scheduled, set up the timer
    if (params.scheduledFor) {
      this.scheduleCheck(check.id, params.scheduledFor);
    }

    return { checkId: check.id, status: 'PENDING' };
  }

  /**
   * Schedule a compliance check for future execution
   */
  scheduleCheck(checkId: string, scheduledFor: Date): void {
    const delay = scheduledFor.getTime() - Date.now();
    if (delay > 0) {
      const timer = setTimeout(() => {
        this.executeCheck(checkId);
        this.scheduledChecks.delete(checkId);
      }, delay);
      this.scheduledChecks.set(checkId, timer);
    }
  }

  /**
   * Cancel a scheduled check
   */
  cancelScheduledCheck(checkId: string): boolean {
    const timer = this.scheduledChecks.get(checkId);
    if (timer) {
      clearTimeout(timer);
      this.scheduledChecks.delete(checkId);
      return true;
    }
    return false;
  }

  /**
   * Execute a compliance check
   */
  async executeCheck(checkId: string): Promise<ComplianceCheckResult> {
    // Get the check
    const check = await db.complianceCheck.findUnique({
      where: { id: checkId },
      include: {
        userId: true,
      },
    });

    if (!check) {
      throw new Error('Check not found');
    }

    // Update status to in progress
    await db.complianceCheck.update({
      where: { id: checkId },
      data: { status: 'IN_PROGRESS' },
    });

    // Get user profile for screening
    const user = await db.user.findUnique({
      where: { id: check.userId },
      include: { clientProfile: true },
    });

    if (!user || !user.clientProfile) {
      await db.complianceCheck.update({
        where: { id: checkId },
        data: { status: 'FAILED' },
      });
      throw new Error('User profile not found');
    }

    let result: ComplianceCheckResult;

    // Execute based on check type
    switch (check.type) {
      case 'AML':
        result = await this.performAMLCheck({
          userId: user.id,
          firstName: user.clientProfile.firstName,
          lastName: user.clientProfile.lastName,
          dateOfBirth: user.clientProfile.dateOfBirth || undefined,
          nationality: user.clientProfile.nationality || undefined,
          country: user.clientProfile.country || undefined,
        });
        break;
      case 'PEP':
        result = await this.performPEPCheck({
          userId: user.id,
          firstName: user.clientProfile.firstName,
          lastName: user.clientProfile.lastName,
          dateOfBirth: user.clientProfile.dateOfBirth || undefined,
          nationality: user.clientProfile.nationality || undefined,
        });
        break;
      case 'SANCTIONS':
        result = await this.performSanctionsCheck({
          userId: user.id,
          firstName: user.clientProfile.firstName,
          lastName: user.clientProfile.lastName,
          dateOfBirth: user.clientProfile.dateOfBirth || undefined,
          nationality: user.clientProfile.nationality || undefined,
        });
        break;
      case 'ADVERSE_MEDIA':
        result = await this.performAdverseMediaCheck({
          userId: user.id,
          firstName: user.clientProfile.firstName,
          lastName: user.clientProfile.lastName,
        });
        break;
      case 'KYC':
        result = await this.performKYCCheck(user.id);
        break;
      case 'DOCUMENT_VERIFICATION':
        result = await this.performDocumentVerification(user.id);
        break;
      default:
        result = {
          status: 'FAILED',
          riskScore: 0,
          riskLevel: 'LOW',
          matches: [],
          recommendations: ['Unknown check type'],
          provider: 'INTERNAL',
          externalRef: `INT-${Date.now()}`,
        };
    }

    // Update check with results
    await db.complianceCheck.update({
      where: { id: checkId },
      data: {
        status: result.status,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        result: JSON.stringify(result),
        matches: JSON.stringify(result.matches),
        externalRef: result.externalRef,
        validUntil: result.validUntil,
      },
    });

    // Generate alerts for high risk matches
    if (result.matches.length > 0 && result.riskLevel !== 'LOW') {
      await this.generateAlerts(checkId, result.matches, user.id);
    }

    return result;
  }

  /**
   * Perform AML (Anti-Money Laundering) check
   */
  async performAMLCheck(params: ScreeningRequest): Promise<ComplianceCheckResult> {
    const matches: WatchlistMatch[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    // Screen against all watchlists
    for (const [key, list] of Object.entries(MOCK_WATCHLISTS)) {
      const fullName = `${params.firstName} ${params.lastName}`.toUpperCase();
      
      for (const entry of list.entries) {
        const matchScore = this.calculateMatchScore(fullName, entry.name);
        
        if (matchScore >= 70) {
          matches.push({
            source: list.name,
            name: entry.name,
            matchScore,
            matchType: matchScore >= 90 ? 'exact' : matchScore >= 80 ? 'partial' : 'phonetic',
            details: {
              listType: list.type,
              country: entry.country,
              program: entry.program,
            },
          });
        }
      }
    }

    // Calculate risk score
    riskScore = this.calculateRiskScore(matches);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Generate recommendations
    if (matches.length > 0) {
      recommendations.push('Enhanced due diligence required');
      if (riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH') {
        recommendations.push('Senior management approval recommended');
        recommendations.push('Consider restricting account activities');
      }
    } else {
      recommendations.push('No matches found - standard monitoring applies');
    }

    return {
      status: 'COMPLETED',
      riskScore,
      riskLevel,
      matches,
      recommendations,
      provider: 'COMPLYADVANTAGE',
      externalRef: `AML-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    };
  }

  /**
   * Perform PEP (Politically Exposed Person) check
   */
  async performPEPCheck(params: ScreeningRequest): Promise<ComplianceCheckResult> {
    const matches: WatchlistMatch[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    const fullName = `${params.firstName} ${params.lastName}`.toUpperCase();
    const pepList = MOCK_WATCHLISTS.PEP_LIST;

    for (const entry of pepList.entries) {
      const matchScore = this.calculateMatchScore(fullName, entry.name);
      
      if (matchScore >= 70) {
        matches.push({
          source: pepList.name,
          name: entry.name,
          matchScore,
          matchType: matchScore >= 90 ? 'exact' : matchScore >= 80 ? 'partial' : 'phonetic',
          details: {
            listType: 'pep',
            country: entry.country,
            program: entry.program,
          },
        });
      }
    }

    // PEP match adds significant risk
    if (matches.length > 0) {
      riskScore = Math.min(100, 60 + matches.length * 10);
      recommendations.push('Client identified as PEP - enhanced due diligence mandatory');
      recommendations.push('Document source of funds');
      recommendations.push('Obtain senior management approval for account opening');
      recommendations.push('Implement enhanced transaction monitoring');
    } else {
      riskScore = 10;
      recommendations.push('No PEP matches found');
    }

    return {
      status: 'COMPLETED',
      riskScore,
      riskLevel: this.determineRiskLevel(riskScore),
      matches,
      recommendations,
      provider: 'WORLD-CHECK',
      externalRef: `PEP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  }

  /**
   * Perform Sanctions check
   */
  async performSanctionsCheck(params: ScreeningRequest): Promise<ComplianceCheckResult> {
    const matches: WatchlistMatch[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    const fullName = `${params.firstName} ${params.lastName}`.toUpperCase();
    
    // Check OFAC
    for (const entry of MOCK_WATCHLISTS.OFAC.entries) {
      const matchScore = this.calculateMatchScore(fullName, entry.name);
      if (matchScore >= 70) {
        matches.push({
          source: 'OFAC Sanctions',
          name: entry.name,
          matchScore,
          matchType: matchScore >= 90 ? 'exact' : matchScore >= 80 ? 'partial' : 'phonetic',
          details: {
            listType: 'sanctions',
            country: entry.country,
            program: entry.program,
          },
        });
      }
    }

    // Check UN Sanctions
    for (const entry of MOCK_WATCHLISTS.UN_SANCTIONS.entries) {
      const matchScore = this.calculateMatchScore(fullName, entry.name);
      if (matchScore >= 70) {
        matches.push({
          source: 'UN Security Council Sanctions',
          name: entry.name,
          matchScore,
          matchType: matchScore >= 90 ? 'exact' : matchScore >= 80 ? 'partial' : 'phonetic',
          details: {
            listType: 'sanctions',
            country: entry.country,
            program: entry.program,
          },
        });
      }
    }

    // Sanctions match is critical
    if (matches.length > 0) {
      riskScore = 100;
      recommendations.push('CRITICAL: Sanctions match detected');
      recommendations.push('DO NOT proceed with onboarding');
      recommendations.push('File SAR (Suspicious Activity Report) if applicable');
      recommendations.push('Escalate to compliance officer immediately');
    } else {
      riskScore = 5;
      recommendations.push('No sanctions matches found');
    }

    return {
      status: 'COMPLETED',
      riskScore,
      riskLevel: this.determineRiskLevel(riskScore),
      matches,
      recommendations,
      provider: 'DOW-JONES',
      externalRef: `SAN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  /**
   * Perform Adverse Media check
   */
  async performAdverseMediaCheck(params: { userId: string; firstName: string; lastName: string }): Promise<ComplianceCheckResult> {
    const matches: WatchlistMatch[] = [];
    let riskScore = 0;
    const recommendations: string[] = [];

    const fullName = `${params.firstName} ${params.lastName}`.toUpperCase();
    
    for (const entry of MOCK_WATCHLISTS.ADVERSE_MEDIA.entries) {
      const matchScore = this.calculateMatchScore(fullName, entry.name);
      if (matchScore >= 70) {
        matches.push({
          source: 'Adverse Media Database',
          name: entry.name,
          matchScore,
          matchType: matchScore >= 90 ? 'exact' : matchScore >= 80 ? 'partial' : 'phonetic',
          details: {
            listType: 'adverse_media',
            country: entry.country,
            program: entry.program,
          },
        });
      }
    }

    if (matches.length > 0) {
      riskScore = 50 + matches.length * 15;
      recommendations.push('Adverse media found - review articles and assess relevance');
      recommendations.push('Consider enhanced due diligence');
    } else {
      riskScore = 5;
      recommendations.push('No adverse media found');
    }

    return {
      status: 'COMPLETED',
      riskScore: Math.min(100, riskScore),
      riskLevel: this.determineRiskLevel(Math.min(100, riskScore)),
      matches,
      recommendations,
      provider: 'LEXISNEXIS',
      externalRef: `AM-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  }

  /**
   * Perform KYC check (overall status check)
   */
  async performKYCCheck(userId: string): Promise<ComplianceCheckResult> {
    const clientProfile = await db.clientProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            documents: true,
          },
        },
      },
    });

    if (!clientProfile) {
      return {
        status: 'FAILED',
        riskScore: 100,
        riskLevel: 'VERY_HIGH',
        matches: [],
        recommendations: ['Client profile not found'],
        provider: 'INTERNAL',
        externalRef: `KYC-${Date.now()}`,
      };
    }

    let riskScore = 0;
    const recommendations: string[] = [];
    const matches: WatchlistMatch[] = [];

    // Check KYC status
    if (clientProfile.kycStatus === 'APPROVED') {
      riskScore = 10;
      recommendations.push('KYC verification completed and approved');
    } else if (clientProfile.kycStatus === 'REJECTED') {
      riskScore = 80;
      recommendations.push('KYC verification was rejected - review rejection reason');
      recommendations.push('Re-verification may be required');
    } else if (clientProfile.kycStatus === 'IN_REVIEW') {
      riskScore = 30;
      recommendations.push('KYC verification in progress');
    } else {
      riskScore = 50;
      recommendations.push('KYC verification pending - initiate verification process');
    }

    // Check document status
    const pendingDocs = clientProfile.user.documents.filter(d => d.status === 'PENDING');
    const rejectedDocs = clientProfile.user.documents.filter(d => d.status === 'REJECTED');

    if (pendingDocs.length > 0) {
      riskScore += 10;
      recommendations.push(`${pendingDocs.length} documents pending verification`);
    }

    if (rejectedDocs.length > 0) {
      riskScore += 20;
      recommendations.push(`${rejectedDocs.length} documents rejected - request new documents`);
    }

    return {
      status: 'COMPLETED',
      riskScore: Math.min(100, riskScore),
      riskLevel: this.determineRiskLevel(Math.min(100, riskScore)),
      matches,
      recommendations,
      provider: 'INTERNAL',
      externalRef: `KYC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
  }

  /**
   * Perform Document Verification check
   */
  async performDocumentVerification(userId: string): Promise<ComplianceCheckResult> {
    const documents = await db.kYCDocument.findMany({
      where: { userId },
    });

    if (documents.length === 0) {
      return {
        status: 'FAILED',
        riskScore: 60,
        riskLevel: 'HIGH',
        matches: [],
        recommendations: ['No documents submitted for verification'],
        provider: 'JUMIO',
        externalRef: `DOC-${Date.now()}`,
      };
    }

    let riskScore = 0;
    const recommendations: string[] = [];
    const matches: WatchlistMatch[] = [];

    // Check each document
    for (const doc of documents) {
      if (doc.status === 'APPROVED') {
        riskScore += 5;
      } else if (doc.status === 'PENDING') {
        riskScore += 20;
        recommendations.push(`Document ${doc.documentType} pending verification`);
      } else if (doc.status === 'REJECTED') {
        riskScore += 30;
        recommendations.push(`Document ${doc.documentType} rejected: ${doc.rejectionReason}`);
      }

      // Check expiry
      if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) {
        riskScore += 25;
        recommendations.push(`Document ${doc.documentType} has expired`);
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('All documents verified successfully');
    }

    return {
      status: 'COMPLETED',
      riskScore: Math.min(100, riskScore),
      riskLevel: this.determineRiskLevel(Math.min(100, riskScore)),
      matches,
      recommendations,
      provider: 'JUMIO',
      externalRef: `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
    };
  }

  /**
   * Screen a user against all watchlists
   */
  async screenUser(params: ScreeningRequest): Promise<{
    checkId: string;
    result: ComplianceCheckResult;
  }> {
    // Create a comprehensive AML check
    const { checkId } = await this.createCheck({
      userId: params.userId,
      type: 'AML',
    });

    const result = await this.executeCheck(checkId);

    // Update client profile with results
    const hasSanctionsMatch = result.matches.some(m => m.details.listType === 'sanctions');
    const hasPEPMatch = result.matches.some(m => m.details.listType === 'pep');

    await db.clientProfile.update({
      where: { userId: params.userId },
      data: {
        pepStatus: hasPEPMatch,
        sanctionCheck: !hasSanctionsMatch,
        lastComplianceCheck: new Date(),
        riskScore: result.riskScore,
        riskLevel: result.riskLevel === 'VERY_HIGH' ? 'VERY_HIGH' : result.riskLevel,
      },
    });

    return { checkId, result };
  }

  /**
   * Generate alerts from compliance check matches
   */
  async generateAlerts(
    checkId: string,
    matches: WatchlistMatch[],
    userId: string
  ): Promise<void> {
    for (const match of matches) {
      const severity = this.determineAlertSeverity(match);
      
      await db.complianceAlert.create({
        data: {
          checkId,
          type: match.details.listType,
          severity,
          title: `${match.details.listType.toUpperCase()} Match Detected`,
          description: `Potential match found: ${match.name} from ${match.source} (${match.matchScore}% confidence)`,
          entityType: 'user',
          entityId: userId,
          status: 'open',
        },
      });
    }
  }

  /**
   * Calculate match score between names
   */
  private calculateMatchScore(name1: string, name2: string): number {
    const n1 = name1.toUpperCase().replace(/[^A-Z\s]/g, '').trim();
    const n2 = name2.toUpperCase().replace(/[^A-Z\s]/g, '').trim();

    // Exact match
    if (n1 === n2) return 100;

    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) return 90;

    // Split into parts and compare
    const parts1 = n1.split(/\s+/);
    const parts2 = n2.split(/\s+/);

    let matchCount = 0;
    for (const p1 of parts1) {
      for (const p2 of parts2) {
        if (p1 === p2) matchCount++;
        else if (p1.includes(p2) || p2.includes(p1)) matchCount += 0.7;
        else if (this.levenshteinDistance(p1, p2) <= 2) matchCount += 0.5;
      }
    }

    const maxParts = Math.max(parts1.length, parts2.length);
    return Math.round((matchCount / maxParts) * 100);
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate risk score from matches
   */
  private calculateRiskScore(matches: WatchlistMatch[]): number {
    let score = 0;

    for (const match of matches) {
      // Base score from match confidence
      score += match.matchScore * 0.3;

      // Type-specific adjustments
      if (match.details.listType === 'sanctions') {
        score += 50; // Sanctions are critical
      } else if (match.details.listType === 'pep') {
        score += 30;
      } else if (match.details.listType === 'adverse_media') {
        score += 20;
      }

      // Match type adjustments
      if (match.matchType === 'exact') {
        score += 20;
      } else if (match.matchType === 'partial') {
        score += 10;
      }
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'VERY_HIGH';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Determine alert severity from match
   */
  private determineAlertSeverity(match: WatchlistMatch): AlertSeverity {
    if (match.details.listType === 'sanctions') return 'critical';
    if (match.details.listType === 'pep' && match.matchScore >= 90) return 'high';
    if (match.details.listType === 'pep') return 'medium';
    if (match.matchScore >= 90) return 'high';
    if (match.matchScore >= 80) return 'medium';
    return 'low';
  }

  /**
   * Get compliance dashboard statistics
   */
  async getDashboardStats(): Promise<ComplianceDashboardStats> {
    // Get check counts
    const totalChecks = await db.complianceCheck.count();
    const pendingChecks = await db.complianceCheck.count({ where: { status: 'PENDING' } });
    const completedChecks = await db.complianceCheck.count({ where: { status: 'COMPLETED' } });
    const failedChecks = await db.complianceCheck.count({ where: { status: 'FAILED' } });

    // Get high risk clients
    const highRiskClients = await db.clientProfile.count({
      where: {
        OR: [
          { riskLevel: 'HIGH' },
          { riskLevel: 'VERY_HIGH' },
        ],
      },
    });

    // Get alert counts
    const activeAlerts = await db.complianceAlert.count({ where: { status: 'open' } });
    const criticalAlerts = await db.complianceAlert.count({
      where: { status: 'open', severity: 'critical' },
    });

    // Get checks by type
    const checksByType: Record<ComplianceCheckType, number> = {
      KYC: await db.complianceCheck.count({ where: { type: 'KYC' } }),
      AML: await db.complianceCheck.count({ where: { type: 'AML' } }),
      PEP: await db.complianceCheck.count({ where: { type: 'PEP' } }),
      SANCTIONS: await db.complianceCheck.count({ where: { type: 'SANCTIONS' } }),
      ADVERSE_MEDIA: await db.complianceCheck.count({ where: { type: 'ADVERSE_MEDIA' } }),
      DOCUMENT_VERIFICATION: await db.complianceCheck.count({ where: { type: 'DOCUMENT_VERIFICATION' } }),
    };

    // Get checks by status
    const checksByStatus: Record<ComplianceCheckStatus, number> = {
      PENDING: pendingChecks,
      IN_PROGRESS: await db.complianceCheck.count({ where: { status: 'IN_PROGRESS' } }),
      COMPLETED: completedChecks,
      FAILED: failedChecks,
      EXPIRED: await db.complianceCheck.count({ where: { status: 'EXPIRED' } }),
    };

    // Get AML statistics
    const amlStats = {
      pepCount: await db.clientProfile.count({ where: { pepStatus: true } }),
      sanctionsCount: await db.clientProfile.count({ where: { sanctionCheck: false } }),
      adverseMediaCount: await db.complianceAlert.count({
        where: { type: 'adverse_media', status: 'open' },
      }),
    };

    // Get KYC statistics
    const kycStats = {
      pending: await db.clientProfile.count({ where: { kycStatus: 'PENDING' } }),
      approved: await db.clientProfile.count({ where: { kycStatus: 'APPROVED' } }),
      rejected: await db.clientProfile.count({ where: { kycStatus: 'REJECTED' } }),
      inReview: await db.clientProfile.count({ where: { kycStatus: 'IN_REVIEW' } }),
    };

    return {
      totalChecks,
      pendingChecks,
      completedChecks,
      failedChecks,
      highRiskClients,
      activeAlerts,
      criticalAlerts,
      checksByType,
      checksByStatus,
      amlStats,
      kycStats,
    };
  }

  /**
   * Get recent compliance checks
   */
  async getRecentChecks(limit: number = 20): Promise<any[]> {
    const checks = await db.complianceCheck.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        userId: true,
      },
    });

    // Fetch user details separately
    const checksWithUsers = await Promise.all(
      checks.map(async (check) => {
        const user = await db.user.findUnique({
          where: { id: check.userId },
          include: { clientProfile: true },
        });
        return {
          ...check,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            firstName: user.clientProfile?.firstName,
            lastName: user.clientProfile?.lastName,
          } : null,
        };
      })
    );

    return checksWithUsers;
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(limit: number = 50): Promise<any[]> {
    return db.complianceAlert.findMany({
      where: { status: 'open' },
      take: limit,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    await db.complianceAlert.update({
      where: { id: alertId },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
      },
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolution: string,
    isFalsePositive: boolean = false
  ): Promise<void> {
    await db.complianceAlert.update({
      where: { id: alertId },
      data: {
        status: isFalsePositive ? 'false_positive' : 'resolved',
        resolvedBy,
        resolvedAt: new Date(),
        resolution,
      },
    });
  }

  /**
   * Run scheduled compliance re-checks for expired checks
   */
  async runScheduledRechecks(): Promise<{ rechecked: number; errors: string[] }> {
    const errors: string[] = [];
    let rechecked = 0;

    // Find expired checks that need re-checking
    const expiredChecks = await db.complianceCheck.findMany({
      where: {
        validUntil: { lt: new Date() },
        status: 'COMPLETED',
      },
    });

    for (const check of expiredChecks) {
      try {
        // Create new check
        const { checkId } = await this.createCheck({
          userId: check.userId,
          type: check.type as ComplianceCheckType,
        });

        // Execute it
        await this.executeCheck(checkId);
        rechecked++;
      } catch (error) {
        errors.push(`Failed to recheck ${check.id}: ${error}`);
      }
    }

    return { rechecked, errors };
  }
}

// Export singleton instance
export const complianceManager = new ComplianceManager();
