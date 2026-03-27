/**
 * OMNI-CRM Client Cabinet API
 * Wallet, KYC, and Transfer management
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { walletService } from '@/lib/wallet-service';
import { auditService } from '@/lib/audit';
import { TransactionType, KYCStatus, DocumentType } from '@prisma/client';

// ============================================
// GET CLIENT DATA
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get client profile with related data
    const client = await db.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
        wallets: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' },
        },
        accounts: {
          where: { status: 'ACTIVE' },
          take: 5,
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            notifications: { where: { isRead: false } },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Get wallet summary
    const walletSummary = await walletService.getUserWalletSummary(userId);

    // Get recent transactions
    const recentTransactions = await db.transaction.findMany({
      where: {
        OR: [
          { fromWallet: { userId } },
          { toWallet: { userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        fromWallet: { select: { currency: true, walletType: true } },
        toWallet: { select: { currency: true, walletType: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          ...client,
          password: undefined, // Don't expose password
        },
        walletSummary,
        recentTransactions,
        unreadNotifications: client._count.notifications,
      },
    });
  } catch (error) {
    console.error('Error fetching client data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client data' },
      { status: 500 }
    );
  }
}

// ============================================
// WALLET TRANSFER
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'internal_transfer':
        return await handleInternalTransfer(params, request);

      case 'deposit_request':
        return await handleDepositRequest(params, request);

      case 'withdrawal_request':
        return await handleWithdrawalRequest(params, request);

      case 'kyc_upload':
        return await handleKYCUpload(params, request);

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

// ============================================
// INTERNAL TRANSFER HANDLER
// ============================================

async function handleInternalTransfer(params: Record<string, unknown>, request: NextRequest) {
  const { fromWalletId, toWalletId, amount, currency, userId } = params;

  if (!fromWalletId || !toWalletId || !amount || !userId) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  const transactionId = await walletService.processInternalTransfer({
    fromWalletId: fromWalletId as string,
    toWalletId: toWalletId as string,
    amount: Number(amount),
    currency: currency as string,
    type: 'INTERNAL_TRANSFER',
    actorId: userId as string,
    ipAddress,
  });

  // Notify via WebSocket
  try {
    await fetch('http://localhost:3003/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'notification',
        payload: {
          userId,
          type: 'TRADE',
          title: 'Transfer Complete',
          message: `Successfully transferred ${amount} ${currency}`,
          entityType: 'transaction',
          entityId: transactionId,
        },
      }),
    });
  } catch (e) {
    console.error('WebSocket notification failed:', e);
  }

  return NextResponse.json({
    success: true,
    data: { transactionId },
  });
}

// ============================================
// DEPOSIT REQUEST HANDLER
// ============================================

async function handleDepositRequest(params: Record<string, unknown>, request: NextRequest) {
  const { walletId, amount, currency, paymentMethod, paymentReference, userId } = params;

  if (!walletId || !amount || !userId) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  const transactionId = await walletService.processDeposit({
    walletId: walletId as string,
    amount: Number(amount),
    currency: currency as string,
    paymentMethod: paymentMethod as string,
    paymentReference: paymentReference as string | undefined,
    actorId: userId as string,
    ipAddress,
  });

  // Create task for approval
  await db.task.create({
    data: {
      title: `Deposit Request - $${amount} ${currency}`,
      description: `Payment Method: ${paymentMethod}${paymentReference ? `, Ref: ${paymentReference}` : ''}`,
      category: 'DEPOSIT',
      priority: Number(amount) > 10000 ? 'HIGH' : 'MEDIUM',
      priorityScore: Number(amount) > 10000 ? 85 : 55,
      creatorId: userId as string,
      entityType: 'transaction',
      entityId: transactionId,
      slaMinutes: 60,
      slaDeadline: new Date(Date.now() + 60 * 60 * 1000),
      status: 'NEW',
    },
  });

  return NextResponse.json({
    success: true,
    data: { transactionId, status: 'pending' },
  });
}

// ============================================
// WITHDRAWAL REQUEST HANDLER
// ============================================

async function handleWithdrawalRequest(params: Record<string, unknown>, request: NextRequest) {
  const { walletId, amount, currency, paymentMethod, paymentDetails, userId } = params;

  if (!walletId || !amount || !userId) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

  try {
    const transactionId = await walletService.processWithdrawal({
      walletId: walletId as string,
      amount: Number(amount),
      currency: currency as string,
      paymentMethod: paymentMethod as string,
      paymentDetails: paymentDetails as Record<string, unknown>,
      actorId: userId as string,
      ipAddress,
    });

    // Create task for approval
    await db.task.create({
      data: {
        title: `Withdrawal Request - $${amount} ${currency}`,
        description: `Payment Method: ${paymentMethod}`,
        category: 'WITHDRAWAL',
        priority: Number(amount) > 5000 ? 'HIGH' : 'MEDIUM',
        priorityScore: Number(amount) > 5000 ? 88 : 60,
        creatorId: userId as string,
        entityType: 'transaction',
        entityId: transactionId,
        slaMinutes: 45,
        slaDeadline: new Date(Date.now() + 45 * 60 * 1000),
        status: 'NEW',
      },
    });

    return NextResponse.json({
      success: true,
      data: { transactionId, status: 'pending' },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Withdrawal failed' },
      { status: 400 }
    );
  }
}

// ============================================
// KYC DOCUMENT UPLOAD HANDLER
// ============================================

async function handleKYCUpload(params: Record<string, unknown>, request: NextRequest) {
  const { userId, documentType, frontImage, backImage, selfieImage, documentNumber, issueDate, expiryDate } = params;

  if (!userId || !documentType || !frontImage) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Create KYC document record
  const document = await db.kYCDocument.create({
    data: {
      userId: userId as string,
      documentType: documentType as DocumentType,
      documentNumber: documentNumber as string | undefined,
      frontImage: frontImage as string,
      backImage: backImage as string | undefined,
      selfieImage: selfieImage as string | undefined,
      issueDate: issueDate ? new Date(issueDate as string) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate as string) : undefined,
      status: 'PENDING',
    },
  });

  // Update client profile KYC status
  await db.clientProfile.update({
    where: { userId: userId as string },
    data: {
      kycStatus: 'IN_REVIEW',
      kycSubmittedAt: new Date(),
    },
  });

  // Create verification task
  await db.task.create({
    data: {
      title: `KYC Verification - ${documentType}`,
      description: 'Client submitted document for verification',
      category: 'KYC_VERIFICATION',
      priority: 'HIGH',
      priorityScore: 80,
      creatorId: userId as string,
      entityType: 'kyc_document',
      entityId: document.id,
      slaMinutes: 120,
      slaDeadline: new Date(Date.now() + 120 * 60 * 1000),
      status: 'NEW',
    },
  });

  // Audit log
  await auditService.log({
    action: 'KYC_SUBMIT',
    entityType: 'KYCDocument',
    entityId: document.id,
    newValue: { documentType },
    context: {
      userId: userId as string,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    },
  });

  return NextResponse.json({
    success: true,
    data: { documentId: document.id, status: 'pending' },
  });
}
