/**
 * OMNI-CRM Client Portal API
 * API endpoints for client dashboard, deposits, withdrawals, KYC, and trading history
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================
// GET ENDPOINTS
// ============================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'dashboard':
        return await getDashboard(userId);
      case 'trades':
        return await getTradingHistory(
          userId,
          searchParams.get('accountId'),
          searchParams.get('period'),
          searchParams.get('symbol')
        );
      default:
        return await getDashboard(userId);
    }
  } catch (error) {
    console.error('Portal API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST ENDPOINTS
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'deposit':
        return await createDeposit(body);
      case 'withdraw':
        return await createWithdrawal(body);
      case 'kyc_upload':
        return await uploadKYCDocuments(body);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Portal API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DASHBOARD DATA
// ============================================

async function getDashboard(userId: string) {
  // Get user with client profile
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      clientProfile: true,
    },
  });

  if (!user) {
    // Return mock data for demo
    return NextResponse.json({
      success: true,
      data: getMockDashboard(userId),
    });
  }

  // Get wallets
  const wallets = await db.wallet.findMany({
    where: { userId },
    orderBy: { walletType: 'asc' },
  });

  // Get trading accounts
  const tradingAccounts = await db.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // Get recent transactions
  const recentTransactions = await db.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Calculate stats
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalEquity = tradingAccounts.reduce((sum, a) => sum + a.equity, 0);
  const totalProfit = tradingAccounts.reduce((sum, a) => sum + a.totalProfit, 0);
  const totalVolume = tradingAccounts.reduce((sum, a) => sum + a.totalVolume, 0);
  const totalTrades = tradingAccounts.reduce((sum, a) => sum + a.totalTrades, 0);
  const activeAccounts = tradingAccounts.filter((a) => a.status === 'ACTIVE').length;

  const pendingDeposits = recentTransactions.filter(
    (t) => t.type === 'DEPOSIT' && t.status === 'PENDING'
  ).length;
  const pendingWithdrawals = recentTransactions.filter(
    (t) => t.type === 'WITHDRAWAL' && t.status === 'PENDING'
  ).length;

  const dashboard = {
    profile: user.clientProfile || {
      id: 'demo',
      userId: user.id,
      firstName: user.name?.split(' ')[0] || 'Demo',
      lastName: user.name?.split(' ')[1] || 'User',
      country: 'United States',
      kycStatus: 'PENDING',
      kycLevel: 0,
      accountType: 'STANDARD',
      riskLevel: 'MEDIUM',
    },
    wallets: wallets.map((w) => ({
      id: w.id,
      walletType: w.walletType,
      currency: w.currency,
      balance: w.balance,
      frozenBalance: w.frozenBalance,
      status: w.status,
    })),
    tradingAccounts: tradingAccounts.map((a) => ({
      id: a.id,
      mtAccountId: a.mtAccountId,
      accountType: a.accountType,
      currency: a.currency,
      leverage: a.leverage,
      balance: a.balance,
      equity: a.equity,
      margin: a.margin,
      freeMargin: a.freeMargin,
      marginLevel: a.marginLevel,
      totalDeposits: a.totalDeposits,
      totalWithdrawals: a.totalWithdrawals,
      totalVolume: a.totalVolume,
      totalProfit: a.totalProfit,
      totalTrades: a.totalTrades,
      bookingType: a.bookingType,
      status: a.status,
    })),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      fee: t.fee,
      netAmount: t.netAmount,
      status: t.status,
      paymentMethod: t.paymentMethod,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
      processedAt: t.processedAt?.toISOString(),
    })),
    stats: {
      totalBalance,
      totalEquity,
      totalProfit,
      totalVolume,
      totalTrades,
      activeAccounts,
      pendingDeposits,
      pendingWithdrawals,
    },
  };

  return NextResponse.json({ success: true, data: dashboard });
}

// ============================================
// TRADING HISTORY
// ============================================

async function getTradingHistory(
  userId: string,
  accountId: string | null,
  period: string | null,
  symbol: string | null
) {
  // For demo, return mock trading data
  const days = parseInt(period || '30');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'XAUUSD', 'BTCUSD'];
  const mockTrades = [];

  for (let i = 0; i < 25; i++) {
    const openTime = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
    const closeTime = new Date(openTime.getTime() + Math.random() * 86400000 * 2);
    const tradeSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const volume = Math.round((Math.random() * 2 + 0.1) * 100) / 100;
    const openPrice = 1 + Math.random();
    const priceChange = (Math.random() - 0.48) * 0.02;
    const closePrice = type === 'BUY' ? openPrice + priceChange : openPrice - priceChange;
    const profit = volume * (type === 'BUY' ? closePrice - openPrice : openPrice - closePrice) * 100000;

    mockTrades.push({
      id: `trade-${i}`,
      ticket: `${100000 + i}`,
      symbol: tradeSymbol,
      type,
      volume,
      openPrice,
      closePrice,
      profit: Math.round(profit * 100) / 100,
      swap: Math.round((Math.random() - 0.5) * 10 * 100) / 100,
      commission: Math.round(-volume * 7 * 100) / 100,
      openTime: openTime.toISOString(),
      closeTime: closeTime.toISOString(),
      sl: type === 'BUY' ? openPrice - 0.005 : openPrice + 0.005,
      tp: type === 'BUY' ? openPrice + 0.01 : openPrice - 0.01,
    });
  }

  const stats = {
    totalTrades: mockTrades.length,
    winningTrades: mockTrades.filter((t) => t.profit > 0).length,
    losingTrades: mockTrades.filter((t) => t.profit < 0).length,
    totalProfit: mockTrades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0),
    totalLoss: Math.abs(mockTrades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)),
    netPnL: mockTrades.reduce((sum, t) => sum + t.profit, 0),
    winRate: (mockTrades.filter((t) => t.profit > 0).length / mockTrades.length) * 100,
    totalVolume: mockTrades.reduce((sum, t) => sum + t.volume, 0),
    averageProfit: 0,
    averageLoss: 0,
    bestTrade: Math.max(...mockTrades.map((t) => t.profit)),
    worstTrade: Math.min(...mockTrades.map((t) => t.profit)),
  };

  return NextResponse.json({
    success: true,
    data: {
      trades: mockTrades,
      stats,
    },
  });
}

// ============================================
// DEPOSIT
// ============================================

async function createDeposit(body: {
  userId: string;
  walletId: string;
  paymentMethod: string;
  currency: string;
  amount: number;
}) {
  const { userId, walletId, paymentMethod, currency, amount } = body;

  if (!walletId || !paymentMethod || !currency || !amount) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Create pending transaction
  const transaction = await db.transaction.create({
    data: {
      userId,
      toWalletId: walletId,
      type: 'DEPOSIT',
      amount,
      currency,
      fee: paymentMethod === 'card' ? amount * 0.025 : 0,
      netAmount: paymentMethod === 'card' ? amount * 0.975 : amount,
      status: 'PENDING',
      paymentMethod,
      paymentProvider: paymentMethod.toUpperCase(),
      description: `Deposit via ${paymentMethod}`,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      transactionId: transaction.id,
      status: 'PENDING',
      message: 'Deposit request submitted successfully',
    },
  });
}

// ============================================
// WITHDRAWAL
// ============================================

async function createWithdrawal(body: {
  userId: string;
  walletId: string;
  paymentMethod: string;
  currency: string;
  amount: number;
  cryptoAddress?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
    iban?: string;
  };
  accountEmail?: string;
}) {
  const { userId, walletId, paymentMethod, currency, amount, cryptoAddress, bankDetails, accountEmail } = body;

  if (!walletId || !paymentMethod || !currency || !amount) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Check wallet balance
  const wallet = await db.wallet.findUnique({
    where: { id: walletId },
  });

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: 'Wallet not found' },
      { status: 404 }
    );
  }

  if (wallet.balance < amount) {
    return NextResponse.json(
      { success: false, error: 'Insufficient balance' },
      { status: 400 }
    );
  }

  // Calculate fee
  let fee = 0;
  if (paymentMethod === 'bank_transfer') fee = 25;
  else if (paymentMethod === 'card') fee = amount * 0.015;
  else if (paymentMethod === 'skrill' || paymentMethod === 'neteller') fee = amount * 0.01;

  // Create pending transaction
  const transaction = await db.transaction.create({
    data: {
      userId,
      fromWalletId: walletId,
      type: 'WITHDRAWAL',
      amount,
      currency,
      fee,
      netAmount: amount - fee,
      status: 'PENDING',
      paymentMethod,
      paymentProvider: paymentMethod.toUpperCase(),
      cryptoAddress,
      metadata: bankDetails ? JSON.stringify(bankDetails) : accountEmail ? JSON.stringify({ email: accountEmail }) : null,
      description: `Withdrawal via ${paymentMethod}`,
    },
  });

  // Freeze the amount
  await db.wallet.update({
    where: { id: walletId },
    data: {
      frozenBalance: { increment: amount },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      transactionId: transaction.id,
      status: 'PENDING',
      message: 'Withdrawal request submitted successfully',
    },
  });
}

// ============================================
// KYC UPLOAD
// ============================================

async function uploadKYCDocuments(body: {
  userId: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  files: Array<{ name: string; type: string; size: number }>;
}) {
  const { userId, documentType, documentNumber, issueDate, expiryDate, files } = body;

  if (!documentType || !files || files.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Create KYC document record
  const kycDocument = await db.kYCDocument.create({
    data: {
      userId,
      documentType: documentType as any,
      documentNumber,
      frontImage: files[0]?.name || 'uploaded',
      backImage: files[1]?.name,
      selfieImage: documentType === 'SELFIE' ? files[0]?.name : undefined,
      status: 'PENDING',
      issueDate: issueDate ? new Date(issueDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    },
  });

  // Update client profile KYC status if needed
  const clientProfile = await db.clientProfile.findUnique({
    where: { userId },
  });

  if (clientProfile && clientProfile.kycLevel === 0) {
    await db.clientProfile.update({
      where: { userId },
      data: {
        kycStatus: 'IN_REVIEW',
        kycLevel: 1,
        kycSubmittedAt: new Date(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      documentId: kycDocument.id,
      status: 'PENDING',
      message: 'Documents uploaded successfully. Verification typically takes 1-2 business days.',
    },
  });
}

// ============================================
// MOCK DATA FOR DEMO
// ============================================

function getMockDashboard(userId: string) {
  return {
    profile: {
      id: 'demo-profile',
      userId,
      firstName: 'John',
      lastName: 'Trader',
      country: 'United States',
      kycStatus: 'IN_REVIEW',
      kycLevel: 1,
      kycRejectionReason: null,
      accountType: 'STANDARD',
      riskLevel: 'MEDIUM',
    },
    wallets: [
      {
        id: 'wallet-1',
        walletType: 'INTERNAL',
        currency: 'USD',
        balance: 15750.25,
        frozenBalance: 500,
        status: 'ACTIVE',
      },
      {
        id: 'wallet-2',
        walletType: 'TRADING',
        currency: 'USD',
        balance: 8500.00,
        frozenBalance: 0,
        status: 'ACTIVE',
      },
      {
        id: 'wallet-3',
        walletType: 'BONUS',
        currency: 'USD',
        balance: 250.00,
        frozenBalance: 0,
        status: 'ACTIVE',
      },
    ],
    tradingAccounts: [
      {
        id: 'account-1',
        mtAccountId: '12345678',
        accountType: 'STANDARD',
        currency: 'USD',
        leverage: 100,
        balance: 8500.00,
        equity: 8750.50,
        margin: 1200.00,
        freeMargin: 7550.50,
        marginLevel: 729.21,
        totalDeposits: 15000.00,
        totalWithdrawals: 5000.00,
        totalVolume: 125.75,
        totalProfit: 1250.50,
        totalTrades: 156,
        bookingType: 'B_BOOK',
        status: 'ACTIVE',
      },
      {
        id: 'account-2',
        mtAccountId: '87654321',
        accountType: 'ECN',
        currency: 'EUR',
        balance: 5000.00,
        equity: 4850.25,
        margin: 800.00,
        freeMargin: 4050.25,
        marginLevel: 606.28,
        totalDeposits: 7500.00,
        totalWithdrawals: 2000.00,
        totalVolume: 45.50,
        totalProfit: -150.75,
        totalTrades: 42,
        bookingType: 'A_BOOK',
        status: 'ACTIVE',
      },
    ],
    recentTransactions: [
      {
        id: 'tx-1',
        type: 'DEPOSIT',
        amount: 5000.00,
        currency: 'USD',
        fee: 0,
        netAmount: 5000.00,
        status: 'COMPLETED',
        paymentMethod: 'bank_transfer',
        description: 'Deposit via Bank Transfer',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        processedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'tx-2',
        type: 'WITHDRAWAL',
        amount: 1000.00,
        currency: 'USD',
        fee: 25.00,
        netAmount: 975.00,
        status: 'PENDING',
        paymentMethod: 'bank_transfer',
        description: 'Withdrawal to Bank Account',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        processedAt: null,
      },
      {
        id: 'tx-3',
        type: 'INTERNAL_TRANSFER',
        amount: 2000.00,
        currency: 'USD',
        fee: 0,
        netAmount: 2000.00,
        status: 'COMPLETED',
        paymentMethod: null,
        description: 'Transfer to Trading Account',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        processedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'tx-4',
        type: 'BONUS',
        amount: 250.00,
        currency: 'USD',
        fee: 0,
        netAmount: 250.00,
        status: 'COMPLETED',
        paymentMethod: null,
        description: 'Welcome Bonus',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        processedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'tx-5',
        type: 'DEPOSIT',
        amount: 500.00,
        currency: 'USD',
        fee: 12.50,
        netAmount: 487.50,
        status: 'COMPLETED',
        paymentMethod: 'card',
        description: 'Deposit via Credit Card',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        processedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ],
    stats: {
      totalBalance: 24500.25,
      totalEquity: 13600.75,
      totalProfit: 1099.75,
      totalVolume: 171.25,
      totalTrades: 198,
      activeAccounts: 2,
      pendingDeposits: 0,
      pendingWithdrawals: 1,
    },
  };
}
