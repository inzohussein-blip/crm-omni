/**
 * OMNI-CRM Payment Gateway Service
 * Multi-provider payment processing
 */

import { db } from '@/lib/db';
import { TransactionStatus, TransactionType } from '@prisma/client';
import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

type PaymentProvider = 'CRYPTO' | 'BANK_TRANSFER' | 'SKRILL' | 'NETELLER' | 'PAYPAL' | 'STRIPE';
type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

interface PaymentRequest {
  userId: string;
  walletId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

interface CryptoPaymentRequest extends PaymentRequest {
  provider: 'CRYPTO';
  network: 'BTC' | 'ETH' | 'TRC20' | 'ERC20' | 'BEP20';
  cryptoCurrency: 'USDT' | 'BTC' | 'ETH' | 'BNB';
}

interface BankPaymentRequest extends PaymentRequest {
  provider: 'BANK_TRANSFER';
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  swiftCode?: string;
  iban?: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  cryptoAddress?: string;
  qrCode?: string;
  expiresAt?: Date;
  error?: string;
}

interface PaymentCallback {
  transactionId: string;
  externalId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  fee?: number;
  cryptoTxHash?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// EXCHANGE RATES
// ============================================

const EXCHANGE_RATES: Record<string, number> = {
  'USD_USDT': 1,
  'EUR_USDT': 1.08,
  'GBP_USDT': 1.26,
  'USDT_USD': 1,
  'BTC_USD': 45000, // Dynamic in production
  'ETH_USD': 2500,  // Dynamic in production
};

// ============================================
// PAYMENT GATEWAY SERVICE
// ============================================

class PaymentGatewayService {
  // ============================================
  // DEPOSIT METHODS
  // ============================================

  /**
   * Create crypto deposit
   */
  async createCryptoDeposit(params: CryptoPaymentRequest): Promise<PaymentResponse> {
    try {
      // Generate deposit address
      const cryptoAddress = this.generateCryptoAddress(params.network, params.cryptoCurrency);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create pending transaction
      const transaction = await db.transaction.create({
        data: {
          userId: params.userId,
          toWalletId: params.walletId,
          type: 'DEPOSIT',
          amount: params.amount,
          currency: params.currency,
          fee: 0,
          netAmount: params.amount,
          status: 'PENDING',
          paymentMethod: `CRYPTO_${params.network}_${params.cryptoCurrency}`,
          cryptoAddress,
          cryptoNetwork: params.network,
          metadata: JSON.stringify({
            provider: 'CRYPTO',
            network: params.network,
            cryptoCurrency: params.cryptoCurrency,
            expectedAmount: params.amount,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      });

      // Generate QR code URL
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${cryptoAddress}`;

      return {
        success: true,
        transactionId: transaction.id,
        cryptoAddress,
        qrCode,
        expiresAt,
      };
    } catch (error) {
      console.error('Crypto deposit error:', error);
      return { success: false, error: 'Failed to create crypto deposit' };
    }
  }

  /**
   * Create bank transfer deposit
   */
  async createBankDeposit(params: BankPaymentRequest): Promise<PaymentResponse> {
    try {
      // Generate reference number
      const referenceNumber = `BNK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create pending transaction
      const transaction = await db.transaction.create({
        data: {
          userId: params.userId,
          toWalletId: params.walletId,
          type: 'DEPOSIT',
          amount: params.amount,
          currency: params.currency,
          fee: 0,
          netAmount: params.amount,
          status: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          paymentReference: referenceNumber,
          metadata: JSON.stringify({
            provider: 'BANK_TRANSFER',
            bankName: params.bankName,
            referenceNumber,
            expectedAmount: params.amount,
          }),
        },
      });

      return {
        success: true,
        transactionId: transaction.id,
      };
    } catch (error) {
      console.error('Bank deposit error:', error);
      return { success: false, error: 'Failed to create bank deposit' };
    }
  }

  /**
   * Create e-wallet deposit (Skrill, Neteller, PayPal)
   */
  async createEwalletDeposit(params: PaymentRequest & { email: string }): Promise<PaymentResponse> {
    try {
      const transaction = await db.transaction.create({
        data: {
          userId: params.userId,
          toWalletId: params.walletId,
          type: 'DEPOSIT',
          amount: params.amount,
          currency: params.currency,
          fee: this.calculateFee(params.provider, params.amount),
          netAmount: params.amount - this.calculateFee(params.provider, params.amount),
          status: 'PENDING',
          paymentMethod: params.provider,
          metadata: JSON.stringify({
            provider: params.provider,
            email: params.email,
            expectedAmount: params.amount,
          }),
        },
      });

      // Generate payment URL (would redirect to provider)
      const paymentUrl = `${process.env.BASE_URL}/payment/redirect/${transaction.id}`;

      return {
        success: true,
        transactionId: transaction.id,
        paymentUrl,
      };
    } catch (error) {
      console.error('E-wallet deposit error:', error);
      return { success: false, error: 'Failed to create deposit' };
    }
  }

  // ============================================
  // WITHDRAWAL METHODS
  // ============================================

  /**
   * Create crypto withdrawal
   */
  async createCryptoWithdrawal(
    params: CryptoPaymentRequest & { destinationAddress: string }
  ): Promise<PaymentResponse> {
    try {
      // Validate wallet balance
      const wallet = await db.wallet.findUnique({
        where: { id: params.walletId },
      });

      if (!wallet || wallet.balance < params.amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Create pending withdrawal
      const transaction = await db.transaction.create({
        data: {
          userId: params.userId,
          fromWalletId: params.walletId,
          type: 'WITHDRAWAL',
          amount: params.amount,
          currency: params.currency,
          fee: this.calculateFee('CRYPTO', params.amount),
          netAmount: params.amount - this.calculateFee('CRYPTO', params.amount),
          status: 'PENDING',
          paymentMethod: `CRYPTO_${params.network}_${params.cryptoCurrency}`,
          cryptoAddress: params.destinationAddress,
          cryptoNetwork: params.network,
          metadata: JSON.stringify({
            provider: 'CRYPTO',
            network: params.network,
            cryptoCurrency: params.cryptoCurrency,
            destinationAddress: params.destinationAddress,
          }),
        },
      });

      // Freeze funds
      await db.wallet.update({
        where: { id: params.walletId },
        data: { frozenBalance: { increment: params.amount } },
      });

      return {
        success: true,
        transactionId: transaction.id,
      };
    } catch (error) {
      console.error('Crypto withdrawal error:', error);
      return { success: false, error: 'Failed to create withdrawal' };
    }
  }

  /**
   * Create bank withdrawal
   */
  async createBankWithdrawal(params: BankPaymentRequest): Promise<PaymentResponse> {
    try {
      const wallet = await db.wallet.findUnique({
        where: { id: params.walletId },
      });

      if (!wallet || wallet.balance < params.amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      const transaction = await db.transaction.create({
        data: {
          userId: params.userId,
          fromWalletId: params.walletId,
          type: 'WITHDRAWAL',
          amount: params.amount,
          currency: params.currency,
          fee: this.calculateFee('BANK_TRANSFER', params.amount),
          netAmount: params.amount - this.calculateFee('BANK_TRANSFER', params.amount),
          status: 'PENDING',
          paymentMethod: 'BANK_TRANSFER',
          metadata: JSON.stringify({
            provider: 'BANK_TRANSFER',
            bankName: params.bankName,
            accountNumber: params.accountNumber,
            accountHolder: params.accountHolder,
            swiftCode: params.swiftCode,
            iban: params.iban,
          }),
        },
      });

      await db.wallet.update({
        where: { id: params.walletId },
        data: { frozenBalance: { increment: params.amount } },
      });

      return {
        success: true,
        transactionId: transaction.id,
      };
    } catch (error) {
      console.error('Bank withdrawal error:', error);
      return { success: false, error: 'Failed to create withdrawal' };
    }
  }

  // ============================================
  // CALLBACK HANDLERS
  // ============================================

  /**
   * Handle crypto payment callback
   */
  async handleCryptoCallback(callback: PaymentCallback): Promise<{ success: boolean }> {
    try {
      const transaction = await db.transaction.findUnique({
        where: { id: callback.transactionId },
      });

      if (!transaction) {
        return { success: false };
      }

      if (callback.status === 'COMPLETED') {
        // Update transaction
        await db.transaction.update({
          where: { id: callback.transactionId },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            cryptoTxHash: callback.cryptoTxHash,
            fee: callback.fee || 0,
            netAmount: transaction.amount - (callback.fee || 0),
          },
        });

        // Credit wallet
        if (transaction.toWalletId) {
          await db.wallet.update({
            where: { id: transaction.toWalletId },
            data: {
              balance: { increment: transaction.amount },
              lastBalanceUpdate: new Date(),
            },
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Crypto callback error:', error);
      return { success: false };
    }
  }

  /**
   * Verify callback signature
   */
  verifyCallbackSignature(
    payload: string,
    signature: string,
    provider: PaymentProvider
  ): boolean {
    const secrets: Record<PaymentProvider, string> = {
      CRYPTO: process.env.CRYPTO_SECRET || '',
      BANK_TRANSFER: '',
      SKRILL: process.env.SKRILL_SECRET || '',
      NETELLER: process.env.NETELLER_SECRET || '',
      PAYPAL: process.env.PAYPAL_SECRET || '',
      STRIPE: process.env.STRIPE_WEBHOOK_SECRET || '',
    };

    const secret = secrets[provider];
    if (!secret) return true; // Skip if no secret configured

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateCryptoAddress(network: string, currency: string): string {
    // In production, would integrate with actual crypto wallet service
    const prefix: Record<string, string> = {
      BTC: '1',
      ETH: '0x',
      TRC20: 'T',
      ERC20: '0x',
      BEP20: '0x',
    };

    const randomPart = crypto.randomBytes(20).toString('hex');
    return `${prefix[network] || ''}${randomPart}`;
  }

  private calculateFee(provider: PaymentProvider, amount: number): number {
    const feeConfig: Record<PaymentProvider, { fixed: number; percent: number }> = {
      CRYPTO: { fixed: 0, percent: 0 },
      BANK_TRANSFER: { fixed: 25, percent: 0.5 },
      SKRILL: { fixed: 0, percent: 1.5 },
      NETELLER: { fixed: 0, percent: 1.5 },
      PAYPAL: { fixed: 0, percent: 2.9 },
      STRIPE: { fixed: 0.30, percent: 2.9 },
    };

    const config = feeConfig[provider];
    return config.fixed + (amount * config.percent / 100);
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const key = `${from}_${to}`;
    return EXCHANGE_RATES[key] || 1;
  }

  /**
   * Get supported payment methods
   */
  getSupportedMethods(): Array<{
    provider: PaymentProvider;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'BOTH';
    currencies: string[];
    minAmount: number;
    maxAmount: number;
    fee: string;
  }> {
    return [
      {
        provider: 'CRYPTO',
        type: 'BOTH',
        currencies: ['USDT', 'BTC', 'ETH'],
        minAmount: 10,
        maxAmount: 1000000,
        fee: '0%',
      },
      {
        provider: 'BANK_TRANSFER',
        type: 'BOTH',
        currencies: ['USD', 'EUR', 'GBP'],
        minAmount: 100,
        maxAmount: 50000,
        fee: '$25 + 0.5%',
      },
      {
        provider: 'SKRILL',
        type: 'BOTH',
        currencies: ['USD', 'EUR', 'GBP'],
        minAmount: 10,
        maxAmount: 10000,
        fee: '1.5%',
      },
      {
        provider: 'NETELLER',
        type: 'BOTH',
        currencies: ['USD', 'EUR', 'GBP'],
        minAmount: 10,
        maxAmount: 10000,
        fee: '1.5%',
      },
    ];
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService();
