/**
 * Client Portal API Routes
 * Handles client-specific data and operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Fetch client portal data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId') || 'demo_user';

    switch (action) {
      case 'profile':
        return await getProfile(userId);

      case 'wallets':
        return await getWallets(userId);

      case 'trading_accounts':
        return await getTradingAccounts(userId);

      case 'transactions':
        return await getTransactions(userId, searchParams);

      case 'documents':
        return await getDocuments(userId);

      case 'summary':
        return await getSummary(userId);

      default:
        return await getPortalData(userId);
    }
  } catch (error) {
    console.error('Client portal API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client data' },
      { status: 500 }
    );
  }
}

// POST - Client actions (deposit, withdraw, transfer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, ...data } = body;

    switch (action) {
      case 'deposit':
        return await createDeposit(userId, data);

      case 'withdraw':
        return await createWithdrawal(userId, data);

      case 'transfer':
        return await createInternalTransfer(userId, data);

      case 'upload_document':
        return await uploadDocument(userId, data);

      case 'update_profile':
        return await updateProfile(userId, data);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Client action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

async function getProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      clientProfile: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      createdAt: user.createdAt,
      clientProfile: user.clientProfile,
    },
  });
}

async function getWallets(userId: string) {
  const wallets = await db.wallet.findMany({
    where: { userId },
    orderBy: { walletType: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: wallets,
  });
}

async function getTradingAccounts(userId: string) {
  const accounts = await db.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: accounts,
  });
}

async function getTransactions(userId: string, searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const type = searchParams.get('type');
  const status = searchParams.get('status');

  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;
  if (status) where.status = status;

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      transactions,
      total,
      limit,
      offset,
    },
  });
}

async function getDocuments(userId: string) {
  const documents = await db.kycDocument.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: documents,
  });
}

async function getSummary(userId: string) {
  const [wallets, accounts, recentTransactions] = await Promise.all([
    db.wallet.findMany({ where: { userId } }),
    db.tradingAccount.findMany({ where: { userId } }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalEquity = accounts.reduce((sum, a) => sum + a.equity, 0);
  const totalVolume = accounts.reduce((sum, a) => sum + a.totalVolume, 0);
  const totalProfit = accounts.reduce((sum, a) => sum + a.totalProfit, 0);

  return NextResponse.json({
    success: true,
    data: {
      totalBalance,
      totalEquity,
      totalVolume,
      totalProfit,
      wallets,
      accounts,
      recentTransactions,
    },
  });
}

async function getPortalData(userId: string) {
  const [profile, wallets, accounts, transactions, documents] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { clientProfile: true },
    }),
    db.wallet.findMany({ where: { userId } }),
    db.tradingAccount.findMany({ where: { userId } }),
    db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.kycDocument.findMany({ where: { userId } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      profile,
      wallets,
      tradingAccounts: accounts,
      transactions,
      documents,
    },
  });
}

async function createDeposit(userId: string, data: Record<string, unknown>) {
  const { amount, currency, paymentMethod, walletId } = data;

  // Create pending transaction
  const transaction = await db.transaction.create({
    data: {
      userId,
      type: 'DEPOSIT',
      amount: amount as number,
      currency: currency as string,
      fee: 0,
      netAmount: amount as number,
      status: 'PENDING',
      paymentMethod: paymentMethod as string,
      toWalletId: walletId as string,
    },
  });

  // Create task for approval
  await db.task.create({
    data: {
      title: `Deposit Approval - $${amount} ${currency}`,
      description: `Deposit request via ${paymentMethod} requires approval`,
      category: 'DEPOSIT',
      priority: 'HIGH',
      creatorId: userId,
      entityType: 'transaction',
      entityId: transaction.id,
      slaMinutes: 30,
      status: 'NEW',
    },
  });

  return NextResponse.json({
    success: true,
    data: transaction,
    message: 'Deposit request created successfully',
  });
}

async function createWithdrawal(userId: string, data: Record<string, unknown>) {
  const { amount, currency, paymentMethod, walletId, cryptoAddress } = data;

  // Check wallet balance
  const wallet = await db.wallet.findUnique({
    where: { id: walletId as string },
  });

  if (!wallet || wallet.balance < (amount as number)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient balance' },
      { status: 400 }
    );
  }

  // Freeze the amount
  await db.wallet.update({
    where: { id: walletId as string },
    data: {
      frozenBalance: { increment: amount as number },
    },
  });

  // Create pending transaction
  const transaction = await db.transaction.create({
    data: {
      userId,
      type: 'WITHDRAWAL',
      amount: amount as number,
      currency: currency as string,
      fee: calculateWithdrawalFee(paymentMethod as string, amount as number),
      netAmount: (amount as number) - calculateWithdrawalFee(paymentMethod as string, amount as number),
      status: 'PENDING',
      paymentMethod: paymentMethod as string,
      fromWalletId: walletId as string,
      cryptoAddress: cryptoAddress as string,
    },
  });

  // Create task for approval
  await db.task.create({
    data: {
      title: `Withdrawal Approval - $${amount} ${currency}`,
      description: `Withdrawal request via ${paymentMethod} requires approval`,
      category: 'WITHDRAWAL',
      priority: 'HIGH',
      creatorId: userId,
      entityType: 'transaction',
      entityId: transaction.id,
      slaMinutes: 45,
      status: 'NEW',
    },
  });

  return NextResponse.json({
    success: true,
    data: transaction,
    message: 'Withdrawal request created successfully',
  });
}

async function createInternalTransfer(userId: string, data: Record<string, unknown>) {
  const { amount, fromWalletId, toWalletId } = data;

  // Validate wallets belong to user
  const [fromWallet, toWallet] = await Promise.all([
    db.wallet.findUnique({ where: { id: fromWalletId as string } }),
    db.wallet.findUnique({ where: { id: toWalletId as string } }),
  ]);

  if (!fromWallet || !toWallet || fromWallet.userId !== userId || toWallet.userId !== userId) {
    return NextResponse.json(
      { success: false, error: 'Invalid wallets' },
      { status: 400 }
    );
  }

  if (fromWallet.balance < (amount as number)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient balance' },
      { status: 400 }
    );
  }

  // Perform transfer
  await db.$transaction([
    db.wallet.update({
      where: { id: fromWalletId as string },
      data: { balance: { decrement: amount as number } },
    }),
    db.wallet.update({
      where: { id: toWalletId as string },
      data: { balance: { increment: amount as number } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: 'INTERNAL_TRANSFER',
        amount: amount as number,
        currency: fromWallet.currency,
        fee: 0,
        netAmount: amount as number,
        status: 'COMPLETED',
        fromWalletId: fromWalletId as string,
        toWalletId: toWalletId as string,
        processedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: 'Transfer completed successfully',
  });
}

async function uploadDocument(userId: string, data: Record<string, unknown>) {
  const { documentType, frontImage, backImage, selfieImage } = data;

  const document = await db.kycDocument.create({
    data: {
      userId,
      documentType: documentType as 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'UTILITY_BILL' | 'BANK_STATEMENT' | 'SELFIE',
      frontImage: frontImage as string,
      backImage: backImage as string,
      selfieImage: selfieImage as string,
      status: 'PENDING',
    },
  });

  // Create KYC verification task
  await db.task.create({
    data: {
      title: 'KYC Document Verification',
      description: `${documentType} requires verification`,
      category: 'KYC_VERIFICATION',
      priority: 'MEDIUM',
      creatorId: userId,
      entityType: 'kyc_document',
      entityId: document.id,
      slaMinutes: 60,
      status: 'NEW',
    },
  });

  return NextResponse.json({
    success: true,
    data: document,
    message: 'Document uploaded successfully',
  });
}

async function updateProfile(userId: string, data: Record<string, unknown>) {
  const { firstName, lastName, phone, country, city, address } = data;

  const user = await db.user.update({
    where: { id: userId },
    data: {
      name: `${firstName} ${lastName}`,
      phone: phone as string,
    },
  });

  if (user.clientProfile) {
    await db.clientProfile.update({
      where: { userId },
      data: {
        firstName: firstName as string,
        lastName: lastName as string,
        country: country as string,
        city: city as string,
        address: address as string,
      },
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Profile updated successfully',
  });
}

function calculateWithdrawalFee(method: string, amount: number): number {
  const fees: Record<string, (a: number) => number> = {
    'crypto': (a) => Math.max(5, a * 0.01),
    'bank_wire': (a) => Math.max(25, a * 0.005),
    'skrill': (a) => Math.max(1, a * 0.02),
    'neteller': (a) => Math.max(1, a * 0.02),
    'default': () => 0,
  };

  return (fees[method] || fees.default)(amount);
}
