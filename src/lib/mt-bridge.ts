/**
 * OMNI-CRM MT4/MT5 Bridge Service
 * Real-time trading platform integration
 */

import { db } from '@/lib/db';
import { BookingType, AccountStatus } from '@prisma/client';
import { ibCommissionEngine } from '@/lib/ib-commission-engine';
import { hashPassword } from '@/lib/security';

// ============================================
// TYPES
// ============================================

interface MTAccount {
  login: number;
  name: string;
  email: string;
  group: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  credit: number;
  enable: boolean;
  enableChangePassword: boolean;
  enableReadOnly: boolean;
  enableOtce: boolean;
  agent: number;
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  zipCode: string;
  passwordPhone: string;
  passwordInvestor: string;
  comment: string;
  color: number;
  leadCampaign: string;
  leadSource: string;
}

interface MTTrade {
  order: number;
  login: number;
  symbol: string;
  digits: number;
  cmd: number; // 0=BUY, 1=SELL
  volume: number;
  openTime: Date;
  openPrice: number;
  sl: number;
  tp: number;
  closeTime: Date | null;
  closePrice: number;
  commission: number;
  swap: number;
  profit: number;
  comment: string;
  timestamp: Date;
}

interface MTBalanceOperation {
  login: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'CREDIT' | 'BALANCE';
  amount: number;
  comment: string;
  ticket?: number;
}

interface MTGroupConfig {
  name: string;
  enable: boolean;
  currency: string;
  leverageDefault: number;
  leverageMax: number;
  tradeConfirm: boolean;
  hedgeProhibited: boolean;
  hedgeMargin: number;
  marginCall: number;
  marginStopOut: number;
  marginType: 'FOREX' | 'CFD' | 'FUTURES' | 'CFD_FUTURES';
}

// ============================================
// MT BRIDGE SERVICE CLASS
// ============================================

class MTBridgeService {
  private mtServer: string;
  private mtPort: number;
  private mtTimeout: number;

  constructor() {
    this.mtServer = process.env.MT_SERVER || 'localhost';
    this.mtPort = parseInt(process.env.MT_PORT || '443');
    this.mtTimeout = 30000;
  }

  // ============================================
  // ACCOUNT MANAGEMENT
  // ============================================

  /**
   * Create new MT account
   */
  async createAccount(params: {
    userId: string;
    group: string;
    leverage: number;
    name: string;
    email: string;
    password: string;
    investorPassword: string;
    bookingType: BookingType;
  }): Promise<{ mtAccountId: string; success: boolean }> {
    try {
      // In production, this would call MT Manager API
      // For now, we simulate the account creation
      const mtAccountId = `${100000 + Math.floor(Math.random() * 900000)}`;

      // Create account in our database
      const tradingAccount = await db.tradingAccount.create({
        data: {
          userId: params.userId,
          mtAccountId,
          mtPassword: this.encryptPassword(params.password),
          mtServer: this.mtServer,
          mtGroup: params.group,
          accountType: 'STANDARD',
          currency: 'USD',
          leverage: params.leverage,
          balance: 0,
          equity: 0,
          margin: 0,
          freeMargin: 0,
          marginLevel: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          totalVolume: 0,
          totalProfit: 0,
          totalTrades: 0,
          bookingType: params.bookingType,
          status: 'ACTIVE',
        },
      });

      return {
        mtAccountId,
        success: true,
      };
    } catch (error) {
      console.error('MT account creation error:', error);
      throw new Error('Failed to create MT account');
    }
  }

  /**
   * Get account info from MT
   */
  async getAccountInfo(mtAccountId: string): Promise<MTAccount | null> {
    try {
      // In production, this would query MT Manager API
      const account = await db.tradingAccount.findUnique({
        where: { mtAccountId },
      });

      if (!account) return null;

      return {
        login: parseInt(mtAccountId),
        name: '',
        email: '',
        group: account.mtGroup,
        leverage: account.leverage,
        balance: account.balance,
        equity: account.equity,
        margin: account.margin,
        freeMargin: account.freeMargin,
        marginLevel: account.marginLevel,
        credit: 0,
        enable: account.status === 'ACTIVE',
        enableChangePassword: true,
        enableReadOnly: false,
        enableOtce: true,
        agent: 0,
        id: parseInt(mtAccountId),
        address: '',
        city: '',
        state: '',
        country: '',
        phone: '',
        zipCode: '',
        passwordPhone: '',
        passwordInvestor: '',
        comment: '',
        color: 0,
        leadCampaign: '',
        leadSource: '',
      };
    } catch (error) {
      console.error('Get account info error:', error);
      return null;
    }
  }

  /**
   * Update account leverage
   */
  async updateLeverage(mtAccountId: string, leverage: number): Promise<boolean> {
    try {
      await db.tradingAccount.update({
        where: { mtAccountId },
        data: { leverage },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Change account password
   */
  async changePassword(
    mtAccountId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify old password and update
      const account = await db.tradingAccount.findUnique({
        where: { mtAccountId },
      });

      if (!account) {
        return { success: false, error: 'Account not found' };
      }

      // In production, would verify against MT server
      await db.tradingAccount.update({
        where: { mtAccountId },
        data: { mtPassword: this.encryptPassword(newPassword) },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to change password' };
    }
  }

  /**
   * Block/Unblock account
   */
  async setAccountStatus(mtAccountId: string, active: boolean): Promise<boolean> {
    try {
      await db.tradingAccount.update({
        where: { mtAccountId },
        data: { 
          status: active ? 'ACTIVE' : 'FROZEN',
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // BALANCE OPERATIONS
  // ============================================

  /**
   * Deposit to MT account
   */
  async deposit(params: {
    mtAccountId: string;
    amount: number;
    comment: string;
    transactionId: string;
  }): Promise<{ success: boolean; ticket?: number }> {
    try {
      const account = await db.tradingAccount.findUnique({
        where: { mtAccountId: params.mtAccountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Update balance in our database
      const newBalance = account.balance + params.amount;
      await db.tradingAccount.update({
        where: { mtAccountId: params.mtAccountId },
        data: {
          balance: newBalance,
          equity: newBalance,
          freeMargin: newBalance,
          totalDeposits: { increment: params.amount },
          lastSyncAt: new Date(),
        },
      });

      // In production, would call MT Manager API
      const ticket = Date.now();

      return { success: true, ticket };
    } catch (error) {
      console.error('Deposit error:', error);
      throw error;
    }
  }

  /**
   * Withdraw from MT account
   */
  async withdraw(params: {
    mtAccountId: string;
    amount: number;
    comment: string;
    transactionId: string;
  }): Promise<{ success: boolean; ticket?: number }> {
    try {
      const account = await db.tradingAccount.findUnique({
        where: { mtAccountId: params.mtAccountId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      const availableBalance = account.balance - account.margin;
      if (availableBalance < params.amount) {
        throw new Error('Insufficient balance');
      }

      // Update balance
      const newBalance = account.balance - params.amount;
      await db.tradingAccount.update({
        where: { mtAccountId: params.mtAccountId },
        data: {
          balance: newBalance,
          equity: newBalance,
          freeMargin: newBalance - account.margin,
          totalWithdrawals: { increment: params.amount },
          lastSyncAt: new Date(),
        },
      });

      const ticket = Date.now();

      return { success: true, ticket };
    } catch (error) {
      console.error('Withdrawal error:', error);
      throw error;
    }
  }

  /**
   * Transfer between accounts
   */
  async internalTransfer(params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    comment: string;
  }): Promise<{ success: boolean }> {
    try {
      // Withdraw from source
      await this.withdraw({
        mtAccountId: params.fromAccountId,
        amount: params.amount,
        comment: `Transfer to ${params.toAccountId}: ${params.comment}`,
        transactionId: `TRF-${Date.now()}`,
      });

      // Deposit to destination
      await this.deposit({
        mtAccountId: params.toAccountId,
        amount: params.amount,
        comment: `Transfer from ${params.fromAccountId}: ${params.comment}`,
        transactionId: `TRF-${Date.now()}`,
      });

      return { success: true };
    } catch (error) {
      console.error('Transfer error:', error);
      throw error;
    }
  }

  // ============================================
  // TRADE OPERATIONS
  // ============================================

  /**
   * Get open trades
   */
  async getOpenTrades(mtAccountId: string): Promise<MTTrade[]> {
    try {
      // In production, would query MT server
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(params: {
    mtAccountId: string;
    from: Date;
    to: Date;
  }): Promise<MTTrade[]> {
    try {
      // In production, would query MT server
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Process closed trade (for commission calculation)
   */
  async processClosedTrade(trade: MTTrade): Promise<void> {
    try {
      // Update account stats
      await db.tradingAccount.update({
        where: { mtAccountId: trade.login.toString() },
        data: {
          totalVolume: { increment: trade.volume },
          totalProfit: { increment: trade.profit },
          totalTrades: { increment: 1 },
          lastSyncAt: new Date(),
        },
      });

      // Trigger commission calculation + distribution (5 levels) عند كل صفقة مغلقة
      // ملاحظة: نحسب العمولات بغض النظر عن الربح لأن MT يرسل commission/spread
      const account = await db.tradingAccount.findUnique({
        where: { mtAccountId: trade.login.toString() },
        select: { id: true, userId: true },
      });

      if (account) {
        const calculations = await ibCommissionEngine.calculateTradeCommission({
          tradeId: trade.order.toString(),
          clientId: account.userId,
          accountId: account.id,
          symbol: trade.symbol,
          volume: trade.volume,
          profit: trade.profit,
          closePrice: trade.closePrice,
          openPrice: trade.openPrice,
          commission: trade.commission,
          swap: trade.swap,
        });

        if (calculations.length > 0) {
          const systemEmail = process.env.SYSTEM_ACTOR_EMAIL || 'system@omnicrm.local';
          const systemUser = await db.user.upsert({
            where: { email: systemEmail },
            update: {},
            create: {
              email: systemEmail,
              name: 'System (MT Bridge)',
              password: hashPassword(process.env.SYSTEM_ACTOR_PASSWORD || 'ChangeMe!123'),
              userType: 'ADMIN',
              status: 'ACTIVE',
            },
          });

          await ibCommissionEngine.processCommissions(calculations, {
            ipAddress: 'mt-bridge',
            actorId: systemUser.id,
          });
        }
      }
    } catch (error) {
      console.error('Process trade error:', error);
    }
  }

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  /**
   * Sync account data from MT server
   */
  async syncAccount(mtAccountId: string): Promise<{
    success: boolean;
    balance?: number;
    equity?: number;
  }> {
    try {
      // In production, would fetch live data from MT
      const account = await db.tradingAccount.findUnique({
        where: { mtAccountId },
      });

      if (!account) {
        return { success: false };
      }

      await db.tradingAccount.update({
        where: { mtAccountId },
        data: { lastSyncAt: new Date() },
      });

      return {
        success: true,
        balance: account.balance,
        equity: account.equity,
      };
    } catch {
      return { success: false };
    }
  }

  /**
   * Batch sync all accounts
   */
  async syncAllAccounts(): Promise<{ synced: number; failed: number }> {
    try {
      const accounts = await db.tradingAccount.findMany({
        where: { status: 'ACTIVE' },
        select: { mtAccountId: true },
      });

      let synced = 0;
      let failed = 0;

      for (const account of accounts) {
        const result = await this.syncAccount(account.mtAccountId);
        if (result.success) {
          synced++;
        } else {
          failed++;
        }
      }

      return { synced, failed };
    } catch {
      return { synced: 0, failed: 0 };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private encryptPassword(password: string): string {
    // In production, use proper encryption
    return Buffer.from(password).toString('base64');
  }
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

/**
 * Handle MT webhook events
 */
async function handleMTWebhook(event: string, data: unknown): Promise<void> {
  switch (event) {
    case 'trade_closed':
      const trade = data as MTTrade;
      await mtBridgeService.processClosedTrade(trade);
      break;
    case 'balance_changed':
      // Handle balance change
      break;
    case 'account_created':
      // Handle new account
      break;
    default:
      console.log(`Unknown MT webhook event: ${event}`);
  }
}

// Export singleton instance
export const mtBridgeService = new MTBridgeService();
export { handleMTWebhook };
