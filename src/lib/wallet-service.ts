/**
 * OMNI-CRM Wallet Service
 * Multi-currency wallet management with Database Locking
 * Prevents race conditions and ensures financial integrity
 */

import { db } from '@/lib/db';
import { TransactionStatus, TransactionType, WalletStatus } from '@prisma/client';
import { auditService } from './audit';

// ============================================
// TYPES & INTERFACES
// ============================================

interface TransferParams {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description?: string;
  referenceId?: string;
  actorId: string;
  ipAddress: string;
}

interface DepositParams {
  walletId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference?: string;
  actorId: string;
  ipAddress: string;
}

interface WithdrawalParams {
  walletId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDetails?: Record<string, unknown>;
  actorId: string;
  ipAddress: string;
}

interface BalanceCheck {
  walletId: string;
  availableBalance: number;
  frozenBalance: number;
  totalBalance: number;
}

// ============================================
// WALLET SERVICE CLASS
// ============================================

class WalletService {
  // Minimum time between balance checks (ms)
  private readonly LOCK_TIMEOUT = 30000; // 30 seconds

  /**
   * Get wallet balance with lock
   * Uses pessimistic locking to prevent concurrent modifications
   */
  async getWalletWithLock(walletId: string): Promise<BalanceCheck> {
    // PostgreSQL pessimistic lock (FOR UPDATE) داخل transaction
    return db.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        balance: number;
        frozenBalance: number;
        status: string;
      }>>`
        SELECT id, balance, "frozenBalance" as "frozenBalance", status
        FROM "Wallet"
        WHERE id = ${walletId}
        FOR UPDATE
      `;

      if (!rows || rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const w = rows[0];

      if (w.status !== 'ACTIVE') {
        throw new Error('Wallet is not active');
      }

      return {
        walletId: w.id,
        availableBalance: w.balance - w.frozenBalance,
        frozenBalance: w.frozenBalance,
        totalBalance: w.balance,
      };
    });
  }

  /**
   * Process internal transfer between wallets
   * Atomic transaction with balance validation
   */
  async processInternalTransfer(params: TransferParams): Promise<string> {
    const { fromWalletId, toWalletId, amount, currency, type, description, referenceId, actorId, ipAddress } = params;

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (fromWalletId === toWalletId) {
      throw new Error('Cannot transfer to the same wallet');
    }

    // Use transaction for atomicity
    const result = await db.$transaction(async (tx) => {
      // Pessimistic lock: lock both wallets بنفس الترتيب لتجنب deadlocks
      const ids = [fromWalletId, toWalletId].sort();
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id IN (${ids[0]}, ${ids[1]}) FOR UPDATE`;

      // Lock and get source wallet
      const fromWallet = await tx.wallet.findUnique({
        where: { id: fromWalletId },
      });

      if (!fromWallet) {
        throw new Error('Source wallet not found');
      }

      if (fromWallet.status !== 'ACTIVE') {
        throw new Error('Source wallet is not active');
      }

      const availableBalance = fromWallet.balance - fromWallet.frozenBalance;
      if (availableBalance < amount) {
        throw new Error(`Insufficient balance. Available: ${availableBalance}`);
      }

      // Lock and get destination wallet
      const toWallet = await tx.wallet.findUnique({
        where: { id: toWalletId },
      });

      if (!toWallet) {
        throw new Error('Destination wallet not found');
      }

      if (toWallet.status !== 'ACTIVE') {
        throw new Error('Destination wallet is not active');
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: fromWallet.userId,
          fromWalletId,
          toWalletId,
          type,
          amount,
          currency,
          fee: 0,
          netAmount: amount,
          status: 'COMPLETED',
          description,
          metadata: referenceId ? JSON.stringify({ referenceId }) : null,
          processedAt: new Date(),
        },
      });

      // Debit source wallet
      await tx.wallet.update({
        where: { id: fromWalletId },
        data: {
          balance: { decrement: amount },
          lastBalanceUpdate: new Date(),
        },
      });

      // Credit destination wallet
      await tx.wallet.update({
        where: { id: toWalletId },
        data: {
          balance: { increment: amount },
          lastBalanceUpdate: new Date(),
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'TRANSFER',
          entityType: 'Transaction',
          entityId: transaction.id,
          newValue: JSON.stringify({
            fromWallet: fromWalletId,
            toWallet: toWalletId,
            amount,
            currency,
          }),
          ipAddress,
          transactionId: transaction.id,
        },
      });

      return transaction.id;
    });

    return result;
  }

  /**
   * Process deposit
   */
  async processDeposit(params: DepositParams): Promise<string> {
    const { walletId, amount, currency, paymentMethod, paymentReference, actorId, ipAddress } = params;

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const result = await db.$transaction(async (tx) => {
      // Lock wallet row to avoid concurrent deposit/withdraw/transfer
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${walletId} FOR UPDATE`;

      // Get and validate wallet
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.status !== 'ACTIVE') {
        throw new Error('Wallet is not active');
      }

      // Create pending transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: wallet.userId,
          toWalletId: walletId,
          type: 'DEPOSIT',
          amount,
          currency,
          fee: 0,
          netAmount: amount,
          status: 'PENDING',
          paymentMethod,
          paymentReference,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DEPOSIT',
          entityType: 'Transaction',
          entityId: transaction.id,
          newValue: JSON.stringify({
            walletId,
            amount,
            currency,
            paymentMethod,
          }),
          ipAddress,
          transactionId: transaction.id,
        },
      });

      return transaction.id;
    });

    return result;
  }

  /**
   * Approve deposit and credit wallet
   */
  async approveDeposit(transactionId: string, approvedBy: string, ipAddress: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction || transaction.type !== 'DEPOSIT' || transaction.status !== 'PENDING') {
        throw new Error('Invalid transaction for approval');
      }

      // Update transaction status
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          approvedAt: new Date(),
          approvedBy,
          processedAt: new Date(),
        },
      });

      // Credit wallet
      if (transaction.toWalletId) {
        // Lock wallet row قبل التحديث
        await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${transaction.toWalletId} FOR UPDATE`;
        await tx.wallet.update({
          where: { id: transaction.toWalletId },
          data: {
            balance: { increment: transaction.amount },
            lastBalanceUpdate: new Date(),
          },
        });

        // Update trading account stats if applicable
        const wallet = await tx.wallet.findUnique({
          where: { id: transaction.toWalletId },
        });

        if (wallet && wallet.walletType === 'TRADING') {
          const tradingAccount = await tx.tradingAccount.findFirst({
            where: { userId: wallet.userId },
          });

          if (tradingAccount) {
            await tx.tradingAccount.update({
              where: { id: tradingAccount.id },
              data: {
                totalDeposits: { increment: transaction.amount },
              },
            });
          }
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: approvedBy,
          action: 'APPROVE',
          entityType: 'Transaction',
          entityId: transactionId,
          oldValue: JSON.stringify({ status: 'PENDING' }),
          newValue: JSON.stringify({ status: 'COMPLETED' }),
          ipAddress,
          transactionId,
        },
      });
    });
  }

  /**
   * Process withdrawal request
   */
  async processWithdrawal(params: WithdrawalParams): Promise<string> {
    const { walletId, amount, currency, paymentMethod, paymentDetails, actorId, ipAddress } = params;

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    const result = await db.$transaction(async (tx) => {
      // Get and validate wallet
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.status !== 'ACTIVE') {
        throw new Error('Wallet is not active');
      }

      const availableBalance = wallet.balance - wallet.frozenBalance;
      if (availableBalance < amount) {
        throw new Error(`Insufficient balance. Available: ${availableBalance}`);
      }

      // Freeze the amount
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          frozenBalance: { increment: amount },
        },
      });

      // Calculate fees (example: 0% for internal, could be configurable)
      const fee = 0;
      const netAmount = amount - fee;

      // Create pending transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: wallet.userId,
          fromWalletId: walletId,
          type: 'WITHDRAWAL',
          amount,
          currency,
          fee,
          netAmount,
          status: 'PENDING',
          paymentMethod,
          metadata: paymentDetails ? JSON.stringify(paymentDetails) : null,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'WITHDRAWAL',
          entityType: 'Transaction',
          entityId: transaction.id,
          newValue: JSON.stringify({
            walletId,
            amount,
            currency,
            paymentMethod,
          }),
          ipAddress,
          transactionId: transaction.id,
        },
      });

      return transaction.id;
    });

    return result;
  }

  /**
   * Approve withdrawal and debit wallet
   */
  async approveWithdrawal(transactionId: string, approvedBy: string, ipAddress: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction || transaction.type !== 'WITHDRAWAL' || transaction.status !== 'PENDING') {
        throw new Error('Invalid transaction for approval');
      }

      // Update transaction status
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          approvedAt: new Date(),
          approvedBy,
          processedAt: new Date(),
        },
      });

      // Debit wallet and unfreeze
      if (transaction.fromWalletId) {
        await tx.wallet.update({
          where: { id: transaction.fromWalletId },
          data: {
            balance: { decrement: transaction.amount },
            frozenBalance: { decrement: transaction.amount },
            lastBalanceUpdate: new Date(),
          },
        });

        // Update trading account stats
        const wallet = await tx.wallet.findUnique({
          where: { id: transaction.fromWalletId },
        });

        if (wallet && wallet.walletType === 'TRADING') {
          const tradingAccount = await tx.tradingAccount.findFirst({
            where: { userId: wallet.userId },
          });

          if (tradingAccount) {
            await tx.tradingAccount.update({
              where: { id: tradingAccount.id },
              data: {
                totalWithdrawals: { increment: transaction.amount },
              },
            });
          }
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: approvedBy,
          action: 'APPROVE',
          entityType: 'Transaction',
          entityId: transactionId,
          oldValue: JSON.stringify({ status: 'PENDING' }),
          newValue: JSON.stringify({ status: 'COMPLETED' }),
          ipAddress,
          transactionId,
        },
      });
    });
  }

  /**
   * Reject withdrawal and unfreeze funds
   */
  async rejectWithdrawal(
    transactionId: string,
    rejectedBy: string,
    reason: string,
    ipAddress: string
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction || transaction.type !== 'WITHDRAWAL' || transaction.status !== 'PENDING') {
        throw new Error('Invalid transaction for rejection');
      }

      // Update transaction status
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      // Unfreeze the amount
      if (transaction.fromWalletId) {
        await tx.wallet.update({
          where: { id: transaction.fromWalletId },
          data: {
            frozenBalance: { decrement: transaction.amount },
          },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: rejectedBy,
          action: 'REJECT',
          entityType: 'Transaction',
          entityId: transactionId,
          oldValue: JSON.stringify({ status: 'PENDING' }),
          newValue: JSON.stringify({ status: 'REJECTED', reason }),
          ipAddress,
          transactionId,
        },
      });
    });
  }

  /**
   * Get wallet balance summary for a user
   */
  async getUserWalletSummary(userId: string) {
    const wallets = await db.wallet.findMany({
      where: { userId },
      include: {
        outgoingTransactions: {
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        incomingTransactions: {
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            type: true,
            amount: true,
            currency: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return wallets.map(wallet => ({
      ...wallet,
      availableBalance: wallet.balance - wallet.frozenBalance,
      recentTransactions: [...wallet.outgoingTransactions, ...wallet.incomingTransactions]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
    }));
  }

  /**
   * Freeze wallet (admin action)
   */
  async freezeWallet(walletId: string, reason: string, actorId: string, ipAddress: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      await tx.wallet.update({
        where: { id: walletId },
        data: { status: 'FROZEN' },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          entityType: 'Wallet',
          entityId: walletId,
          oldValue: JSON.stringify({ status: wallet.status }),
          newValue: JSON.stringify({ status: 'FROZEN', reason }),
          ipAddress,
        },
      });
    });
  }
}

// Export singleton instance
export const walletService = new WalletService();
