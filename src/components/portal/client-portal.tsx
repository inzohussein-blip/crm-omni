'use client';

/**
 * OMNI-CRM Client Portal Dashboard
 * Comprehensive client dashboard with wallet balances, trading accounts, KYC status, and transactions
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Send,
  Download,
  Upload,
  Building2,
  Coins,
  BarChart3,
  Activity,
  Shield,
  Loader2,
  ChevronRight,
  Plus,
  Minus,
  DollarSign,
} from 'lucide-react';
import { DepositForm } from './deposit-form';
import { WithdrawalForm } from './withdrawal-form';
import { KYCUpload } from './kyc-upload';
import { TradingHistory } from './trading-history';

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

interface TradingAccountData {
  id: string;
  mtAccountId: string;
  accountType: string;
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalVolume: number;
  totalProfit: number;
  totalTrades: number;
  bookingType: string;
  status: string;
}

interface TransactionData {
  id: string;
  type: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  status: string;
  paymentMethod?: string;
  description?: string;
  createdAt: string;
  processedAt?: string;
}

interface ClientProfileData {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  country?: string;
  kycStatus: string;
  kycLevel: number;
  kycRejectionReason?: string;
  accountType: string;
  riskLevel: string;
}

interface ClientDashboard {
  profile: ClientProfileData;
  wallets: WalletData[];
  tradingAccounts: TradingAccountData[];
  recentTransactions: TransactionData[];
  stats: {
    totalBalance: number;
    totalEquity: number;
    totalProfit: number;
    totalVolume: number;
    totalTrades: number;
    activeAccounts: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getWalletTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    INTERNAL: 'Main Wallet',
    TRADING: 'Trading Account',
    IB: 'IB Commission',
    BONUS: 'Bonus Wallet',
    MARGIN: 'Margin Account',
  };
  return labels[type] || type;
};

const getAccountTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    STANDARD: 'Standard',
    ECN: 'ECN',
    ISLAMIC: 'Islamic',
    VIP: 'VIP',
    DEMO: 'Demo',
  };
  return labels[type] || type;
};

const getKYCStatusConfig = (status: string) => {
  const configs: Record<string, { icon: typeof Clock; color: string; bgColor: string; label: string }> = {
    PENDING: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', label: 'Pending' },
    IN_REVIEW: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', label: 'In Review' },
    APPROVED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Approved' },
    REJECTED: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Rejected' },
    EXPIRED: { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30', label: 'Expired' },
  };
  return configs[status] || configs.PENDING;
};

// ============================================
// WALLET CARD COMPONENT
// ============================================

interface WalletCardProps {
  wallet: WalletData;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onTransfer?: () => void;
}

function WalletCard({ wallet, onDeposit, onWithdraw, onTransfer }: WalletCardProps) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    FROZEN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    CLOSED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium">{getWalletTypeLabel(wallet.walletType)}</p>
              <p className="text-sm text-muted-foreground">{wallet.currency}</p>
            </div>
          </div>
          <Badge className={cn('text-xs', statusColors[wallet.status] || statusColors.ACTIVE)}>
            {wallet.status}
          </Badge>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-2xl font-bold">
            {formatCurrency(wallet.balance, wallet.currency)}
          </p>
          {wallet.frozenBalance > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {formatCurrency(wallet.frozenBalance, wallet.currency)} frozen
            </p>
          )}
        </div>

        {wallet.status === 'ACTIVE' && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={onDeposit}>
              <ArrowDownRight className="h-3 w-3 mr-1" />
              Deposit
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onWithdraw}>
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Withdraw
            </Button>
            <Button size="sm" variant="outline" onClick={onTransfer}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// TRADING ACCOUNT CARD COMPONENT
// ============================================

interface TradingAccountCardProps {
  account: TradingAccountData;
  onViewHistory?: () => void;
}

function TradingAccountCard({ account, onViewHistory }: TradingAccountCardProps) {
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    INACTIVE: 'bg-gray-100 text-gray-700',
    FROZEN: 'bg-amber-100 text-amber-700',
    CLOSED: 'bg-red-100 text-red-700',
  };

  const isProfitable = account.totalProfit >= 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <BarChart3 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="font-medium">#{account.mtAccountId}</p>
              <p className="text-sm text-muted-foreground">
                {getAccountTypeLabel(account.accountType)} • {account.leverage}:1
              </p>
            </div>
          </div>
          <Badge className={cn('text-xs', statusColors[account.status] || statusColors.ACTIVE)}>
            {account.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-lg font-bold">{formatCurrency(account.balance, account.currency)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Equity</p>
            <p className="text-lg font-bold">{formatCurrency(account.equity, account.currency)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Free Margin</p>
            <p className="text-sm font-medium">{formatCurrency(account.freeMargin, account.currency)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">P/L</p>
            <p className={cn(
              'text-sm font-bold flex items-center gap-1',
              isProfitable ? 'text-green-600' : 'text-red-600'
            )}>
              {isProfitable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatCurrency(account.totalProfit, account.currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span>Volume: {account.totalVolume.toFixed(2)} lots</span>
          <span>Trades: {account.totalTrades}</span>
        </div>

        <Button size="sm" variant="outline" className="w-full" onClick={onViewHistory}>
          <Activity className="h-3 w-3 mr-1" />
          View Trading History
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// KYC STATUS CARD COMPONENT
// ============================================

interface KYCStatusCardProps {
  profile: ClientProfileData;
  onStartKYC?: () => void;
  onUploadDocument?: () => void;
}

function KYCStatusCard({ profile, onStartKYC, onUploadDocument }: KYCStatusCardProps) {
  const config = getKYCStatusConfig(profile.kycStatus);
  const StatusIcon = config.icon;

  const levelSteps = [
    { level: 1, label: 'Basic Info', description: 'Personal details' },
    { level: 2, label: 'Identity', description: 'ID document' },
    { level: 3, label: 'Address', description: 'Proof of address' },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-violet-500" />
          KYC Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className={cn('flex items-center gap-2 p-3 rounded-lg', config.bgColor)}>
          <StatusIcon className={cn('h-5 w-5', config.color)} />
          <span className={cn('font-medium', config.color)}>{config.label}</span>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          {levelSteps.map((step) => (
            <div key={step.level} className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium shrink-0',
                  profile.kycLevel >= step.level
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {profile.kycLevel >= step.level ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step.level
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rejection Reason */}
        {profile.kycStatus === 'REJECTED' && profile.kycRejectionReason && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            <strong>Reason:</strong> {profile.kycRejectionReason}
          </div>
        )}

        {/* Action Buttons */}
        {profile.kycStatus === 'PENDING' && profile.kycLevel === 0 && (
          <Button className="w-full" onClick={onStartKYC}>
            Start Verification
          </Button>
        )}

        {(profile.kycStatus === 'PENDING' || profile.kycStatus === 'IN_REVIEW') && profile.kycLevel > 0 && profile.kycLevel < 3 && (
          <Button className="w-full" variant="outline" onClick={onUploadDocument}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documents
          </Button>
        )}

        {profile.kycStatus === 'REJECTED' && (
          <Button className="w-full" variant="outline" onClick={onUploadDocument}>
            <Upload className="h-4 w-4 mr-2" />
            Re-submit Documents
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// TRANSACTION ITEM COMPONENT
// ============================================

interface TransactionItemProps {
  transaction: TransactionData;
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const typeIcons: Record<string, typeof ArrowDownRight> = {
    DEPOSIT: ArrowDownRight,
    WITHDRAWAL: ArrowUpRight,
    INTERNAL_TRANSFER: RefreshCw,
    TRADE: Activity,
    COMMISSION: Coins,
    BONUS: GiftIcon,
    ADJUSTMENT: DollarSign,
    FEE: Minus,
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
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
    PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30',
  };

  const Icon = typeIcons[transaction.type] || DollarSign;
  const isCredit = ['DEPOSIT', 'COMMISSION', 'BONUS'].includes(transaction.type);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
      <div className={cn('p-2 rounded-lg', typeColors[transaction.type] || typeColors.ADJUSTMENT)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{transaction.type.replace('_', ' ')}</span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full', statusColors[transaction.status] || statusColors.PENDING)}>
            {transaction.status}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {transaction.description || transaction.paymentMethod || 'N/A'}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(transaction.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn(
          'font-semibold',
          isCredit ? 'text-green-600' : 'text-red-600'
        )}>
          {isCredit ? '+' : '-'}
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        {transaction.fee > 0 && (
          <p className="text-xs text-muted-foreground">Fee: {formatCurrency(transaction.fee, transaction.currency)}</p>
        )}
      </div>
    </div>
  );
}

// Gift icon fallback
function GiftIcon(props: React.ComponentProps<typeof Wallet>) {
  return <Coins {...props} />;
}

// ============================================
// MAIN CLIENT PORTAL COMPONENT
// ============================================

interface ClientPortalProps {
  userId?: string;
  className?: string;
}

export function ClientPortal({ userId = 'demo_user', className }: ClientPortalProps) {
  const [dashboard, setDashboard] = useState<ClientDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [tradingHistoryOpen, setTradingHistoryOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/portal?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDashboard(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDeposit = () => setDepositOpen(true);
  const handleWithdraw = () => setWithdrawOpen(true);
  const handleKYC = () => setKycOpen(true);
  const handleTradingHistory = (accountId: string) => {
    setSelectedAccountId(accountId);
    setTradingHistoryOpen(true);
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <p className="text-muted-foreground">Unable to load dashboard. Please try again.</p>
      </div>
    );
  }

  const { profile, wallets, tradingAccounts, recentTransactions, stats } = dashboard;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.firstName}+${profile.lastName}`} />
            <AvatarFallback>{profile.firstName[0]}{profile.lastName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {profile.firstName}!</h1>
            <p className="text-muted-foreground">
              {profile.country || 'Location not set'} • {getAccountTypeLabel(profile.accountType)} Account
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDeposit}>
            <ArrowDownRight className="h-4 w-4 mr-2" />
            Deposit
          </Button>
          <Button variant="outline" onClick={handleWithdraw}>
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Withdraw
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Total Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</p>
              </div>
              <Wallet className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500 to-violet-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-violet-100 text-sm">Total Equity</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalEquity)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-violet-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Trading Volume</p>
                <p className="text-2xl font-bold">{stats.totalVolume.toFixed(2)} lots</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          'text-white',
          stats.totalProfit >= 0
            ? 'bg-gradient-to-br from-green-500 to-green-700'
            : 'bg-gradient-to-br from-red-500 to-red-700'
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total P/L</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalProfit)}</p>
              </div>
              {stats.totalProfit >= 0 ? (
                <TrendingUp className="h-8 w-8 text-white/50" />
              ) : (
                <TrendingDown className="h-8 w-8 text-white/50" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="accounts">Trading Accounts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Wallets & KYC */}
            <div className="lg:col-span-2 space-y-4">
              {/* Quick Wallet Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Wallet Summary</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('wallets')}>
                      View All <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {wallets.slice(0, 3).map((wallet) => (
                      <div key={wallet.id} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">{getWalletTypeLabel(wallet.walletType)}</p>
                        <p className="text-lg font-bold">{formatCurrency(wallet.balance, wallet.currency)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Recent Transactions</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                      View All <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {recentTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No transactions yet
                        </div>
                      ) : (
                        recentTransactions.slice(0, 5).map((tx) => (
                          <TransactionItem key={tx.id} transaction={tx} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - KYC Status */}
            <div>
              <KYCStatusCard
                profile={profile}
                onStartKYC={handleKYC}
                onUploadDocument={handleKYC}
              />
            </div>
          </div>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Your Wallets</h3>
              <p className="text-sm text-muted-foreground">Manage your multi-currency wallets</p>
            </div>
            <Button onClick={handleDeposit}>
              <Plus className="h-4 w-4 mr-2" />
              Add Funds
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
              />
            ))}
          </div>

          {wallets.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No wallets found</p>
                <Button className="mt-4" onClick={handleDeposit}>Create Your First Wallet</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trading Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Trading Accounts</h3>
              <p className="text-sm text-muted-foreground">{stats.activeAccounts} active accounts</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Open New Account
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tradingAccounts.map((account) => (
              <TradingAccountCard
                key={account.id}
                account={account}
                onViewHistory={() => handleTradingHistory(account.id)}
              />
            ))}
          </div>

          {tradingAccounts.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No trading accounts found</p>
                <Button className="mt-4">Open Your First Account</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Transaction History</h3>
              <p className="text-sm text-muted-foreground">
                {stats.pendingDeposits + stats.pendingWithdrawals} pending transactions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDeposit}>
                <ArrowDownRight className="h-4 w-4 mr-2" />
                Deposit
              </Button>
              <Button variant="outline" onClick={handleWithdraw}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-4">
                  {recentTransactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transactions yet</p>
                      <p className="text-sm mt-1">Your transaction history will appear here</p>
                    </div>
                  ) : (
                    recentTransactions.map((tx) => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Make a Deposit</DialogTitle>
          </DialogHeader>
          <DepositForm
            userId={userId}
            wallets={wallets}
            onSuccess={() => {
              setDepositOpen(false);
              fetchDashboard();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
          </DialogHeader>
          <WithdrawalForm
            userId={userId}
            wallets={wallets}
            onSuccess={() => {
              setWithdrawOpen(false);
              fetchDashboard();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={kycOpen} onOpenChange={setKycOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC Document Upload</DialogTitle>
          </DialogHeader>
          <KYCUpload
            userId={userId}
            kycLevel={profile.kycLevel}
            onSuccess={() => {
              setKycOpen(false);
              fetchDashboard();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={tradingHistoryOpen} onOpenChange={setTradingHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Trading History</DialogTitle>
          </DialogHeader>
          <TradingHistory
            accountId={selectedAccountId}
            userId={userId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClientPortal;
