'use client';

/**
 * Client Portal - Complete UI Component
 * Full-featured client cabinet with wallet, trading, KYC, and settings
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  FileText,
  Shield,
  Settings,
  User,
  Bell,
  Download,
  Upload,
  Plus,
  Minus,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  Users,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// ============================================
// Types
// ============================================

interface ClientWallet {
  id: string;
  type: 'INTERNAL' | 'TRADING' | 'IB' | 'BONUS';
  currency: string;
  balance: number;
  frozenBalance: number;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
}

interface TradingAccount {
  id: string;
  mtAccountId: string;
  accountType: 'STANDARD' | 'ECN' | 'ISLAMIC' | 'VIP' | 'DEMO';
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
  bookingType: 'A_BOOK' | 'B_BOOK';
  status: 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'CLOSED';
}

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'INTERNAL_TRANSFER' | 'TRADE' | 'COMMISSION' | 'BONUS';
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paymentMethod?: string;
  createdAt: string;
  processedAt?: string;
}

interface KYCDocument {
  id: string;
  documentType: 'PASSPORT' | 'NATIONAL_ID' | 'DRIVERS_LICENSE' | 'UTILITY_BILL' | 'BANK_STATEMENT' | 'SELFIE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  frontImage: string;
  backImage?: string;
  rejectionReason?: string;
  createdAt: string;
  verifiedAt?: string;
}

interface ClientProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  kycStatus: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  kycLevel: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  accountType: 'STANDARD' | 'ECN' | 'ISLAMIC' | 'VIP';
  bookingType: 'A_BOOK' | 'B_BOOK';
  createdAt: string;
}

// ============================================
// Dummy Data
// ============================================

const dummyProfile: ClientProfile = {
  firstName: 'Ahmed',
  lastName: 'Al-Hassan',
  email: 'ahmed@example.com',
  phone: '+971501234567',
  country: 'United Arab Emirates',
  kycStatus: 'APPROVED',
  kycLevel: 2,
  riskLevel: 'MEDIUM',
  accountType: 'ECN',
  bookingType: 'B_BOOK',
  createdAt: '2024-01-15T10:00:00Z',
};

const dummyWallets: ClientWallet[] = [
  { id: 'w1', type: 'INTERNAL', currency: 'USD', balance: 15420.50, frozenBalance: 500, status: 'ACTIVE' },
  { id: 'w2', type: 'TRADING', currency: 'USD', balance: 8500.00, frozenBalance: 0, status: 'ACTIVE' },
  { id: 'w3', type: 'IB', currency: 'USD', balance: 1250.00, frozenBalance: 0, status: 'ACTIVE' },
  { id: 'w4', type: 'BONUS', currency: 'USD', balance: 500.00, frozenBalance: 0, status: 'ACTIVE' },
];

const dummyTradingAccounts: TradingAccount[] = [
  {
    id: 'ta1',
    mtAccountId: '12345678',
    accountType: 'ECN',
    currency: 'USD',
    leverage: 100,
    balance: 8500.00,
    equity: 8750.25,
    margin: 1200.00,
    freeMargin: 7550.25,
    marginLevel: 729.19,
    totalDeposits: 25000.00,
    totalWithdrawals: 16500.00,
    totalVolume: 125.5,
    totalProfit: 1250.50,
    totalTrades: 342,
    bookingType: 'B_BOOK',
    status: 'ACTIVE',
  },
  {
    id: 'ta2',
    mtAccountId: '12345679',
    accountType: 'STANDARD',
    currency: 'EUR',
    leverage: 200,
    balance: 5200.00,
    equity: 5050.00,
    margin: 800.00,
    freeMargin: 4250.00,
    marginLevel: 631.25,
    totalDeposits: 10000.00,
    totalWithdrawals: 4800.00,
    totalVolume: 45.2,
    totalProfit: -150.00,
    totalTrades: 89,
    bookingType: 'A_BOOK',
    status: 'ACTIVE',
  },
];

const dummyTransactions: Transaction[] = [
  {
    id: 'txn1',
    type: 'DEPOSIT',
    amount: 5000.00,
    currency: 'USD',
    fee: 0,
    netAmount: 5000.00,
    status: 'COMPLETED',
    paymentMethod: 'Wire Transfer',
    createdAt: '2024-12-10T14:30:00Z',
    processedAt: '2024-12-10T15:00:00Z',
  },
  {
    id: 'txn2',
    type: 'WITHDRAWAL',
    amount: 2000.00,
    currency: 'USD',
    fee: 25.00,
    netAmount: 1975.00,
    status: 'PENDING',
    paymentMethod: 'Crypto (USDT)',
    createdAt: '2024-12-12T09:15:00Z',
  },
  {
    id: 'txn3',
    type: 'INTERNAL_TRANSFER',
    amount: 1500.00,
    currency: 'USD',
    fee: 0,
    netAmount: 1500.00,
    status: 'COMPLETED',
    createdAt: '2024-12-08T11:00:00Z',
    processedAt: '2024-12-08T11:00:00Z',
  },
  {
    id: 'txn4',
    type: 'BONUS',
    amount: 250.00,
    currency: 'USD',
    fee: 0,
    netAmount: 250.00,
    status: 'COMPLETED',
    createdAt: '2024-12-01T00:00:00Z',
    processedAt: '2024-12-01T00:00:00Z',
  },
];

const dummyDocuments: KYCDocument[] = [
  {
    id: 'doc1',
    documentType: 'PASSPORT',
    status: 'APPROVED',
    frontImage: '/documents/passport_front.jpg',
    createdAt: '2024-01-15T10:00:00Z',
    verifiedAt: '2024-01-15T14:00:00Z',
  },
  {
    id: 'doc2',
    documentType: 'UTILITY_BILL',
    status: 'APPROVED',
    frontImage: '/documents/utility_bill.jpg',
    createdAt: '2024-01-15T10:05:00Z',
    verifiedAt: '2024-01-15T14:00:00Z',
  },
];

// ============================================
// Client Portal Component
// ============================================

export function ClientPortal() {
  const [profile, setProfile] = useState<ClientProfile>(dummyProfile);
  const [wallets, setWallets] = useState<ClientWallet[]>(dummyWallets);
  const [tradingAccounts, setTradingAccounts] = useState<TradingAccount[]>(dummyTradingAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(dummyTransactions);
  const [documents, setDocuments] = useState<KYCDocument[]>(dummyDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch('/api/client/portal');
      // const data = await response.json();
      // setProfile(data.profile);
      // setWallets(data.wallets);
      // etc.
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate totals
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalEquity = tradingAccounts.reduce((sum, a) => sum + a.equity, 0);
  const totalVolume = tradingAccounts.reduce((sum, a) => sum + a.totalVolume, 0);
  const totalProfit = tradingAccounts.reduce((sum, a) => sum + a.totalProfit, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>{profile.country}</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    {profile.accountType}
                  </Badge>
                  <Badge className={cn(
                    'text-xs',
                    profile.kycStatus === 'APPROVED' ? 'bg-green-500' : 'bg-amber-500'
                  )}>
                    KYC Level {profile.kycLevel}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="wallets" className="gap-2">
              <Wallet className="h-4 w-4" />
              Wallets
            </TabsTrigger>
            <TabsTrigger value="trading" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Trading
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="kyc" className="gap-2">
              <Shield className="h-4 w-4" />
              KYC
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Balance"
                value={`$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                subtitle="All wallets"
                icon={Wallet}
                iconColor="text-green-500"
              />
              <StatsCard
                title="Trading Equity"
                value={`$${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                subtitle="MT4/MT5 accounts"
                icon={TrendingUp}
                iconColor="text-blue-500"
              />
              <StatsCard
                title="Total Volume"
                value={`${totalVolume.toFixed(1)} lots`}
                subtitle="Trading volume"
                icon={BarChart3}
                iconColor="text-purple-500"
              />
              <StatsCard
                title="Total P/L"
                value={`$${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                subtitle="Realized profit"
                icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
                iconColor={totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}
                trend={totalProfit >= 0 ? { value: 12.5, isPositive: true } : { value: 5.2, isPositive: false }}
              />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickActionButton
                    icon={ArrowDownRight}
                    label="Deposit"
                    color="bg-green-500 hover:bg-green-600"
                  />
                  <QuickActionButton
                    icon={ArrowUpRight}
                    label="Withdraw"
                    color="bg-red-500 hover:bg-red-600"
                  />
                  <QuickActionButton
                    icon={RefreshCw}
                    label="Transfer"
                    color="bg-blue-500 hover:bg-blue-600"
                  />
                  <QuickActionButton
                    icon={FileText}
                    label="Documents"
                    color="bg-purple-500 hover:bg-purple-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity & Accounts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trading Accounts Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Trading Accounts</span>
                    <Badge variant="secondary">{tradingAccounts.length} Active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tradingAccounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-full',
                            account.accountType === 'ECN' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                          )}>
                            <BarChart3 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">#{account.mtAccountId}</p>
                            <p className="text-sm text-muted-foreground">
                              {account.accountType} • {account.leverage}:1
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${account.equity.toFixed(2)}</p>
                          <p className={cn(
                            'text-sm',
                            account.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
                          )}>
                            {account.totalProfit >= 0 ? '+' : ''}{account.totalProfit.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recent Transactions</span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('transactions')}>
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-full',
                            tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-600' :
                            tx.type === 'WITHDRAWAL' ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          )}>
                            {tx.type === 'DEPOSIT' ? <ArrowDownRight className="h-4 w-4" /> :
                             tx.type === 'WITHDRAWAL' ? <ArrowUpRight className="h-4 w-4" /> :
                             <RefreshCw className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tx.type.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.createdAt), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            'font-medium',
                            tx.type === 'DEPOSIT' || tx.type === 'BONUS' ? 'text-green-500' :
                            tx.type === 'WITHDRAWAL' ? 'text-red-500' : 'text-foreground'
                          )}>
                            {tx.type === 'WITHDRAWAL' ? '-' : '+'}${tx.amount.toFixed(2)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallets.map((wallet) => (
                <Card key={wallet.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{wallet.type}</CardTitle>
                      <Badge variant={wallet.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {wallet.status}
                      </Badge>
                    </div>
                    <CardDescription>{wallet.currency} Wallet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-3xl font-bold">
                          ${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        {wallet.frozenBalance > 0 && (
                          <p className="text-sm text-amber-500">
                            ${wallet.frozenBalance.toFixed(2)} frozen
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 gap-1">
                          <Plus className="h-3 w-3" />
                          Deposit
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1">
                          <Minus className="h-3 w-3" />
                          Withdraw
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-6">
            <div className="grid gap-4">
              {tradingAccounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle>#{account.mtAccountId}</CardTitle>
                          <CardDescription>
                            {account.accountType} Account • {account.currency}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{account.bookingType.replace('_', '-')}</Badge>
                        <Badge variant="outline">{account.leverage}:1</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Balance</p>
                        <p className="text-xl font-bold">${account.balance.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Equity</p>
                        <p className="text-xl font-bold">${account.equity.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Free Margin</p>
                        <p className="text-xl font-bold">${account.freeMargin.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margin Level</p>
                        <p className="text-xl font-bold">{account.marginLevel.toFixed(2)}%</p>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Deposits</p>
                        <p className="font-medium text-green-500">${account.totalDeposits.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                        <p className="font-medium text-red-500">${account.totalWithdrawals.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Volume</p>
                        <p className="font-medium">{account.totalVolume.toFixed(1)} lots</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total P/L</p>
                        <p className={cn(
                          'font-medium',
                          account.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {account.totalProfit >= 0 ? '+' : ''}${account.totalProfit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Transaction History</CardTitle>
                  <div className="flex gap-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="deposit">Deposits</SelectItem>
                        <SelectItem value="withdrawal">Withdrawals</SelectItem>
                        <SelectItem value="transfer">Transfers</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'p-2 rounded-full',
                            tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' :
                            tx.type === 'WITHDRAWAL' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                            tx.type === 'BONUS' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' :
                            'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                          )}>
                            {tx.type === 'DEPOSIT' ? <ArrowDownRight className="h-5 w-5" /> :
                             tx.type === 'WITHDRAWAL' ? <ArrowUpRight className="h-5 w-5" /> :
                             tx.type === 'BONUS' ? <Gift className="h-5 w-5" /> :
                             <RefreshCw className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{tx.type.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">
                              {tx.paymentMethod || 'Internal'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            'text-lg font-bold',
                            tx.type === 'DEPOSIT' || tx.type === 'BONUS' ? 'text-green-500' :
                            tx.type === 'WITHDRAWAL' ? 'text-red-500' : ''
                          )}>
                            {tx.type === 'WITHDRAWAL' ? '-' : '+'}${tx.amount.toFixed(2)} {tx.currency}
                          </p>
                          {tx.fee > 0 && (
                            <p className="text-sm text-muted-foreground">Fee: ${tx.fee.toFixed(2)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <Badge variant={tx.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {tx.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-6">
            {/* KYC Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Verification Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 mb-6">
                  <div className={cn(
                    'h-16 w-16 rounded-full flex items-center justify-center',
                    profile.kycStatus === 'APPROVED' ? 'bg-green-100 text-green-600' :
                    profile.kycStatus === 'REJECTED' ? 'bg-red-100 text-red-600' :
                    'bg-amber-100 text-amber-600'
                  )}>
                    {profile.kycStatus === 'APPROVED' ? <CheckCircle className="h-8 w-8" /> :
                     profile.kycStatus === 'REJECTED' ? <AlertCircle className="h-8 w-8" /> :
                     <Clock className="h-8 w-8" />}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {profile.kycStatus === 'APPROVED' ? 'Verified' :
                       profile.kycStatus === 'REJECTED' ? 'Rejected' :
                       profile.kycStatus === 'IN_REVIEW' ? 'In Review' : 'Pending'}
                    </p>
                    <p className="text-muted-foreground">
                      KYC Level {profile.kycLevel} of 2
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Verification Progress</span>
                    <span>{profile.kycLevel * 50}%</span>
                  </div>
                  <Progress value={profile.kycLevel * 50} />
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1">
                        <Upload className="h-4 w-4" />
                        Upload Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                          Upload your identification documents for verification
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Document Type</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="passport">Passport</SelectItem>
                              <SelectItem value="national_id">National ID</SelectItem>
                              <SelectItem value="drivers_license">Driver's License</SelectItem>
                              <SelectItem value="utility_bill">Utility Bill</SelectItem>
                              <SelectItem value="bank_statement">Bank Statement</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Front Image</Label>
                          <Input type="file" accept="image/*" />
                        </div>
                        <div className="space-y-2">
                          <Label>Back Image (Optional)</Label>
                          <Input type="file" accept="image/*" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button>Upload</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.documentType.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            Uploaded {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          doc.status === 'APPROVED' ? 'bg-green-500' :
                          doc.status === 'REJECTED' ? 'bg-red-500' : 'bg-amber-500'
                        )}>
                          {doc.status}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================
// Helper Components
// ============================================

function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconColor,
  trend 
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            {trend && (
              <p className={cn(
                'text-sm mt-1 flex items-center gap-1',
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              )}>
                {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend.value}%
              </p>
            )}
          </div>
          <div className={cn('p-2 rounded-full bg-muted', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({ 
  icon: Icon, 
  label, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  color: string;
}) {
  return (
    <button className={cn(
      'flex flex-col items-center gap-2 p-4 rounded-lg text-white transition-colors',
      color
    )}>
      <Icon className="h-6 w-6" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Gift icon component
function Gift({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}
