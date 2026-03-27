'use client';

/**
 * OMNI-CRM Client Cabinet
 * Multi-Currency Wallets, KYC, Internal Transfers
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface WalletData {
  id: string;
  walletType: string;
  currency: string;
  balance: number;
  frozenBalance: number;
  status: string;
}

interface TransactionData {
  id: string;
  type: string;
  amount: number;
  currency: string;
  fee: number;
  status: string;
  createdAt: string;
}

// ============================================
// WALLET CARD COMPONENT
// ============================================

interface WalletCardProps {
  wallet: WalletData;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onTransfer?: () => void;
}

export function WalletCard({ wallet, onDeposit, onWithdraw, onTransfer }: WalletCardProps) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    FROZEN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const typeLabels: Record<string, string> = {
    INTERNAL: 'Main Wallet',
    TRADING: 'Trading Account',
    IB: 'IB Commission',
    BONUS: 'Bonus Wallet',
    MARGIN: 'Margin Account',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {typeLabels[wallet.walletType] || wallet.walletType}
          </CardTitle>
          <Badge className={cn('text-xs', statusColors[wallet.status] || statusColors.ACTIVE)}>
            {wallet.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-2xl font-bold">
            {wallet.currency} {wallet.balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          {wallet.frozenBalance > 0 && (
            <p className="text-xs text-amber-600">
              {wallet.frozenBalance.toLocaleString()} frozen
            </p>
          )}
        </div>

        {wallet.status === 'ACTIVE' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onDeposit}>
              <ArrowDownRight className="h-3 w-3 mr-1" />
              Deposit
            </Button>
            <Button size="sm" variant="outline" onClick={onWithdraw}>
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Withdraw
            </Button>
            <Button size="sm" variant="outline" onClick={onTransfer}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Transfer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// KYC STATUS COMPONENT
// ============================================

interface KYCStatusCardProps {
  status: string;
  level: number;
  rejectionReason?: string;
  onStartKYC?: () => void;
  onUploadDocument?: (type: string) => void;
}

export function KYCStatusCard({
  status,
  level,
  rejectionReason,
  onStartKYC,
  onUploadDocument,
}: KYCStatusCardProps) {
  const statusConfig: Record<string, { icon: typeof Clock; color: string; bgColor: string; label: string }> = {
    PENDING: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', label: 'Pending' },
    IN_REVIEW: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'In Review' },
    APPROVED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Approved' },
    REJECTED: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Rejected' },
    EXPIRED: { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30', label: 'Expired' },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  const levelSteps = [
    { level: 1, label: 'Basic Info', description: 'Personal details verification' },
    { level: 2, label: 'Identity', description: 'ID document verification' },
    { level: 3, label: 'Address', description: 'Proof of address' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          KYC Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className={cn('flex items-center gap-2 p-3 rounded-lg', config.bgColor)}>
          <StatusIcon className={cn('h-5 w-5', config.color)} />
          <span className={cn('font-medium', config.color)}>{config.label}</span>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {levelSteps.map((step) => (
            <div key={step.level} className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                  level >= step.level
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {level >= step.level ? <CheckCircle className="h-4 w-4" /> : step.level}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rejection Reason */}
        {status === 'REJECTED' && rejectionReason && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            <strong>Reason:</strong> {rejectionReason}
          </div>
        )}

        {/* Action Buttons */}
        {status === 'PENDING' && level === 0 && (
          <Button className="w-full" onClick={onStartKYC}>
            Start Verification
          </Button>
        )}

        {status === 'PENDING' && level < 3 && level > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Upload documents:</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onUploadDocument?.('passport')}>
                <Upload className="h-3 w-3 mr-1" />
                Passport
              </Button>
              <Button variant="outline" size="sm" onClick={() => onUploadDocument?.('utility')}>
                <Upload className="h-3 w-3 mr-1" />
                Utility Bill
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// TRANSACTION HISTORY COMPONENT
// ============================================

interface TransactionHistoryProps {
  transactions: TransactionData[];
  onLoadMore?: () => void;
}

export function TransactionHistory({ transactions, onLoadMore }: TransactionHistoryProps) {
  const typeIcons: Record<string, typeof ArrowDownRight> = {
    DEPOSIT: ArrowDownRight,
    WITHDRAWAL: ArrowUpRight,
    INTERNAL_TRANSFER: RefreshCw,
    TRADE: Wallet,
    COMMISSION: Wallet,
    BONUS: Wallet,
    ADJUSTMENT: Wallet,
    FEE: Wallet,
    SWAP: RefreshCw,
  };

  const typeColors: Record<string, string> = {
    DEPOSIT: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    WITHDRAWAL: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    INTERNAL_TRANSFER: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    TRADE: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    COMMISSION: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    BONUS: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
    ADJUSTMENT: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
    FEE: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    SWAP: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
    REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            transactions.map((tx) => {
              const Icon = typeIcons[tx.type] || Wallet;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className={cn('p-2 rounded-lg', typeColors[tx.type] || typeColors.ADJUSTMENT)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tx.type.replace('_', ' ')}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColors[tx.status] || statusColors.PENDING)}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-semibold',
                      tx.type === 'DEPOSIT' || tx.type === 'COMMISSION' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {tx.type === 'DEPOSIT' || tx.type === 'COMMISSION' ? '+' : '-'}
                      {tx.currency} {tx.amount.toLocaleString()}
                    </p>
                    {tx.fee > 0 && (
                      <p className="text-xs text-muted-foreground">Fee: {tx.fee}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {onLoadMore && transactions.length >= 10 && (
          <Button variant="outline" className="w-full mt-4" onClick={onLoadMore}>
            Load More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
