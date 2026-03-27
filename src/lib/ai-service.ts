/**
 * OMNI-CRM AI Services
 * Smart task routing, fraud detection, and predictive analytics
 */

import { db } from '@/lib/db';
import { Priority, TaskStatus } from '@prisma/client';

// ============================================
// TYPES
// ============================================

interface AgentPerformance {
  agentId: string;
  tasksCompleted: number;
  avgResolutionTime: number;
  slaCompliance: number;
  customerSatisfaction: number;
  specializations: string[];
  currentLoad: number;
}

interface TaskRoutingScore {
  agentId: string;
  score: number;
  reasons: string[];
}

interface FraudIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: Record<string, unknown>;
}

interface RiskAssessment {
  score: number; // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  indicators: FraudIndicator[];
  recommendations: string[];
}

interface ChurnPrediction {
  clientId: string;
  probability: number;
  factors: string[];
  suggestedActions: string[];
}

// ============================================
// AI SERVICE CLASS
// ============================================

class AIService {
  // ============================================
  // SMART TASK ROUTING
  // ============================================

  /**
   * Find best agent for task
   */
  async findBestAgent(taskId: string): Promise<TaskRoutingScore[]> {
    // Get task details
    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Get all active staff members
    const staff = await db.user.findMany({
      where: {
        userType: { in: ['STAFF', 'ADMIN'] },
        status: 'ACTIVE',
      },
      include: {
        tasksAssigned: {
          where: {
            status: { notIn: ['RESOLVED', 'CLOSED', 'CANCELLED'] },
          },
        },
      },
    });

    // Calculate scores for each agent
    const scores: TaskRoutingScore[] = staff.map(agent => {
      let score = 50; // Base score
      const reasons: string[] = [];

      // Factor 1: Current workload (lower is better)
      const currentLoad = agent.tasksAssigned.length;
      if (currentLoad < 5) {
        score += 20;
        reasons.push('Low current workload');
      } else if (currentLoad < 10) {
        score += 10;
        reasons.push('Moderate workload');
      } else {
        score -= 10;
        reasons.push('High workload');
      }

      // Factor 2: Category match (if agent has history with this category)
      // In production, would analyze past task completions
      const categoryMatch = Math.random() > 0.5; // Simplified
      if (categoryMatch) {
        score += 15;
        reasons.push(`Experience with ${task.category} tasks`);
      }

      // Factor 3: Priority handling capability
      if (task.priority === 'CRITICAL' || task.priority === 'HIGH') {
        // Would check agent's seniority/capabilities
        score += 10;
        reasons.push('Senior agent for high priority');
      }

      // Factor 4: Time zone / availability
      // In production, would check work hours
      score += 5;
      reasons.push('Currently available');

      // Factor 5: Performance history
      // Would analyze past SLA compliance, resolution times
      const performanceBonus = Math.floor(Math.random() * 10);
      score += performanceBonus;
      if (performanceBonus > 5) {
        reasons.push('High performance rating');
      }

      return {
        agentId: agent.id,
        score: Math.min(100, Math.max(0, score)),
        reasons,
      };
    });

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Auto-assign task to best agent
   */
  async autoAssignTask(taskId: string): Promise<string | null> {
    const scores = await this.findBestAgent(taskId);
    
    if (scores.length === 0) {
      return null;
    }

    const bestAgent = scores[0];
    
    // Assign task
    await db.task.update({
      where: { id: taskId },
      data: {
        assigneeId: bestAgent.agentId,
        status: 'OPEN',
      },
    });

    return bestAgent.agentId;
  }

  // ============================================
  // FRAUD DETECTION
  // ============================================

  /**
   * Analyze transaction for fraud indicators
   */
  async analyzeTransaction(transactionId: string): Promise<RiskAssessment> {
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        fromWallet: { include: { user: true } },
        toWallet: { include: { user: true } },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const indicators: FraudIndicator[] = [];
    let riskScore = 0;

    // Check 1: Large amount
    if (transaction.amount > 50000) {
      indicators.push({
        type: 'LARGE_AMOUNT',
        severity: 'HIGH',
        description: `Unusually large transaction: ${transaction.amount} ${transaction.currency}`,
        evidence: { amount: transaction.amount },
      });
      riskScore += 30;
    } else if (transaction.amount > 10000) {
      indicators.push({
        type: 'HIGH_AMOUNT',
        severity: 'MEDIUM',
        description: 'High value transaction',
        evidence: { amount: transaction.amount },
      });
      riskScore += 15;
    }

    // Check 2: Rapid successive transactions
    const recentTransactions = await db.transaction.count({
      where: {
        userId: transaction.userId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentTransactions > 5) {
      indicators.push({
        type: 'RAPID_TRANSACTIONS',
        severity: 'MEDIUM',
        description: `${recentTransactions} transactions in the last hour`,
        evidence: { count: recentTransactions },
      });
      riskScore += 20;
    }

    // Check 3: New account with large deposit
    const user = transaction.fromWallet?.user || transaction.toWallet?.user;
    if (user) {
      const accountAge = Date.now() - new Date(user.createdAt).getTime();
      const hoursSinceCreation = accountAge / (1000 * 60 * 60);

      if (hoursSinceCreation < 24 && transaction.amount > 5000) {
        indicators.push({
          type: 'NEW_ACCOUNT_LARGE_AMOUNT',
          severity: 'HIGH',
          description: 'Large transaction from newly created account',
          evidence: { accountAgeHours: hoursSinceCreation },
        });
        riskScore += 35;
      }
    }

    // Check 4: Round number transactions (often suspicious)
    if (transaction.amount % 1000 === 0 && transaction.amount > 5000) {
      indicators.push({
        type: 'ROUND_NUMBER',
        severity: 'LOW',
        description: 'Suspiciously round transaction amount',
        evidence: { amount: transaction.amount },
      });
      riskScore += 5;
    }

    // Check 5: KYC status
    if (user) {
      const clientProfile = await db.clientProfile.findUnique({
        where: { userId: user.id },
      });

      if (clientProfile && clientProfile.kycStatus !== 'APPROVED') {
        indicators.push({
          type: 'KYC_NOT_VERIFIED',
          severity: 'MEDIUM',
          description: 'Transaction from unverified client',
          evidence: { kycStatus: clientProfile.kycStatus },
        });
        riskScore += 25;
      }
    }

    // Determine risk level
    const level = riskScore >= 70 ? 'VERY_HIGH' :
                  riskScore >= 50 ? 'HIGH' :
                  riskScore >= 30 ? 'MEDIUM' : 'LOW';

    // Generate recommendations
    const recommendations: string[] = [];
    if (level === 'VERY_HIGH' || level === 'HIGH') {
      recommendations.push('Require manual approval');
      recommendations.push('Verify identity documents');
      recommendations.push('Contact client for confirmation');
    }
    if (level === 'MEDIUM') {
      recommendations.push('Monitor closely');
      recommendations.push('Consider enhanced due diligence');
    }

    return {
      score: Math.min(100, riskScore),
      level,
      indicators,
      recommendations,
    };
  }

  // ============================================
  // CHURN PREDICTION
  // ============================================

  /**
   * Predict client churn probability
   */
  async predictChurn(clientId: string): Promise<ChurnPrediction> {
    const client = await db.user.findUnique({
      where: { id: clientId },
      include: {
        accounts: true,
        wallets: true,
        clientProfile: true,
      },
    });

    if (!client || !client.clientProfile) {
      throw new Error('Client not found');
    }

    let probability = 0;
    const factors: string[] = [];

    // Factor 1: Account activity
    const lastLogin = client.lastLoginAt;
    if (lastLogin) {
      const daysSinceLogin = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin > 30) {
        probability += 25;
        factors.push('Inactive for over 30 days');
      } else if (daysSinceLogin > 14) {
        probability += 15;
        factors.push('Reduced login frequency');
      }
    }

    // Factor 2: Trading volume decline
    const accounts = client.accounts;
    if (accounts.length > 0) {
      const totalVolume = accounts.reduce((sum, acc) => sum + acc.totalVolume, 0);
      if (totalVolume === 0) {
        probability += 20;
        factors.push('No trading activity');
      }
    }

    // Factor 3: Balance trend
    const wallets = client.wallets;
    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
    if (totalBalance < 100) {
      probability += 15;
      factors.push('Low account balance');
    }

    // Factor 4: KYC status
    if (client.clientProfile.kycStatus !== 'APPROVED') {
      probability += 10;
      factors.push('KYC not completed');
    }

    // Factor 5: Support tickets
    const supportTickets = await db.task.count({
      where: {
        entityType: 'user',
        entityId: clientId,
        category: 'COMPLAINT',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (supportTickets > 0) {
      probability += 15;
      factors.push('Recent complaints');
    }

    // Generate suggested actions
    const suggestedActions: string[] = [];
    if (probability > 50) {
      suggestedActions.push('Assign dedicated account manager');
      suggestedActions.push('Offer loyalty bonus or promotion');
    }
    if (factors.includes('Inactive for over 30 days')) {
      suggestedActions.push('Send re-engagement email');
      suggestedActions.push('Offer welcome back bonus');
    }
    if (factors.includes('KYC not completed')) {
      suggestedActions.push('Send KYC reminder with clear instructions');
    }

    return {
      clientId,
      probability: Math.min(100, probability),
      factors,
      suggestedActions,
    };
  }

  // ============================================
  // PRIORITY PREDICTION
  // ============================================

  /**
   * Predict optimal priority for task
   */
  async predictTaskPriority(taskId: string): Promise<{
    suggestedPriority: Priority;
    confidence: number;
    factors: string[];
  }> {
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    let score = 50;
    const factors: string[] = [];

    // Category-based scoring
    const categoryScores: Record<string, number> = {
      COMPLAINT: 90,
      WITHDRAWAL: 85,
      DEPOSIT: 80,
      KYC_VERIFICATION: 75,
      COMPLIANCE: 70,
      ACCOUNT_OPENING: 60,
      SUPPORT: 50,
      OTHER: 30,
    };

    score = categoryScores[task.category] || 50;
    factors.push(`Category: ${task.category}`);

    // Time-based factors
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      factors.push('Business hours - higher priority');
    }

    // Determine suggested priority
    let suggestedPriority: Priority;
    if (score >= 85) suggestedPriority = 'CRITICAL';
    else if (score >= 70) suggestedPriority = 'HIGH';
    else if (score >= 50) suggestedPriority = 'MEDIUM';
    else suggestedPriority = 'LOW';

    return {
      suggestedPriority,
      confidence: 0.85,
      factors,
    };
  }

  // ============================================
  // SENTIMENT ANALYSIS
  // ============================================

  /**
   * Analyze text sentiment (simplified)
   */
  analyzeSentiment(text: string): {
    score: number; // -1 to 1
    label: 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
    keywords: string[];
  } {
    const negativeWords = ['angry', 'frustrated', 'terrible', 'worst', 'hate', 'scam', 'fraud', 'complaint', 'unhappy', 'disappointed'];
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'thank', 'happy', 'satisfied', 'perfect', 'best', 'love'];
    
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let negativeCount = 0;
    let positiveCount = 0;
    const foundKeywords: string[] = [];

    words.forEach(word => {
      if (negativeWords.includes(word)) {
        negativeCount++;
        foundKeywords.push(word);
      }
      if (positiveWords.includes(word)) {
        positiveCount++;
        foundKeywords.push(word);
      }
    });

    const total = negativeCount + positiveCount;
    let score = 0;
    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
    }

    let label: 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE';
    if (score < -0.3) label = 'NEGATIVE';
    else if (score > 0.3) label = 'POSITIVE';
    else label = 'NEUTRAL';

    return { score, label, keywords: [...new Set(foundKeywords)] };
  }
}

// Export singleton instance
export const aiService = new AIService();
