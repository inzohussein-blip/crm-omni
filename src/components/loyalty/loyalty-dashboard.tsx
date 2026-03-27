'use client';

/**
 * Loyalty Dashboard Component
 * Points, levels, rewards, and bonus management
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  Star,
  Gift,
  TrendingUp,
  Coins,
  Award,
  Trophy,
  Sparkles,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  Zap,
  Crown,
  Diamond,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// ============================================
// Types
// ============================================

interface LoyaltyAccount {
  id: string;
  userId: string;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  level: number;
  levelName: string;
  nextLevelPoints: number;
}

interface LoyaltyLevel {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  benefits: string[];
  color: string;
}

interface LoyaltyTransaction {
  id: string;
  type: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';
  points: number;
  reason: string;
  source: string;
  createdAt: Date;
}

interface Bonus {
  id: string;
  type: 'WELCOME' | 'DEPOSIT' | 'RELOAD' | 'LOYALTY' | 'REFERRAL' | 'PROMOTIONAL';
  amount: number;
  currency: string;
  status: 'PENDING' | 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'CANCELLED';
  volumeRequirement: number;
  volumeProgress: number;
  expiresAt?: Date;
  createdAt: Date;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string;
  available: boolean;
}

// ============================================
// Dummy Data
// ============================================

const dummyAccount: LoyaltyAccount = {
  id: 'la_1',
  userId: 'user_1',
  points: 5250,
  totalEarned: 8500,
  totalRedeemed: 3250,
  level: 3,
  levelName: 'Gold',
  nextLevelPoints: 20000,
};

const dummyLevels: LoyaltyLevel[] = [
  { level: 1, name: 'Bronze', minPoints: 0, maxPoints: 999, benefits: ['5% discount', 'Priority support'], color: '#CD7F32' },
  { level: 2, name: 'Silver', minPoints: 1000, maxPoints: 4999, benefits: ['10% discount', 'Weekly analysis'], color: '#C0C0C0' },
  { level: 3, name: 'Gold', minPoints: 5000, maxPoints: 19999, benefits: ['15% discount', 'VIP support', 'Personal manager'], color: '#FFD700' },
  { level: 4, name: 'Platinum', minPoints: 20000, maxPoints: 99999, benefits: ['20% discount', '24/7 support', 'Dedicated manager'], color: '#E5E4E2' },
  { level: 5, name: 'Diamond', minPoints: 100000, maxPoints: Infinity, benefits: ['25% discount', 'VIP trips', 'Personal broker'], color: '#B9F2FF' },
];

const dummyTransactions: LoyaltyTransaction[] = [
  { id: 'lt1', type: 'EARN', points: 500, reason: 'Deposit Bonus', source: 'deposit', createdAt: new Date() },
  { id: 'lt2', type: 'EARN', points: 250, reason: 'Trading Volume', source: 'trade', createdAt: new Date(Date.now() - 86400000) },
  { id: 'lt3', type: 'REDEEM', points: -1000, reason: '$25 Trading Credit', source: 'redemption', createdAt: new Date(Date.now() - 172800000) },
  { id: 'lt4', type: 'EARN', points: 100, reason: 'Referral Bonus', source: 'referral', createdAt: new Date(Date.now() - 259200000) },
];

const dummyBonuses: Bonus[] = [
  { id: 'b1', type: 'WELCOME', amount: 100, currency: 'USD', status: 'ACTIVE', volumeRequirement: 10, volumeProgress: 3.5, expiresAt: new Date(Date.now() + 30 * 86400000), createdAt: new Date() },
  { id: 'b2', type: 'DEPOSIT', amount: 250, currency: 'USD', status: 'PENDING', volumeRequirement: 25, volumeProgress: 0, createdAt: new Date() },
  { id: 'b3', type: 'RELOAD', amount: 50, currency: 'USD', status: 'RELEASED', volumeRequirement: 5, volumeProgress: 5, createdAt: new Date(Date.now() - 7 * 86400000) },
];

const dummyRewards: Reward[] = [
  { id: 'r1', name: '$10 Trading Credit', description: 'Get $10 credit for trading', pointsCost: 500, category: 'credit', available: true },
  { id: 'r2', name: '$25 Trading Credit', description: 'Get $25 credit for trading', pointsCost: 1000, category: 'credit', available: true },
  { id: 'r3', name: 'Free VPS (1 Month)', description: 'Free VPS hosting', pointsCost: 1500, category: 'service', available: true },
  { id: 'r4', name: 'Premium Signals', description: '30 days of trading signals', pointsCost: 2000, category: 'service', available: true },
  { id: 'r5', name: '10% Spread Discount', description: 'Reduced spreads for 30 days', pointsCost: 5000, category: 'discount', available: true },
];

// ============================================
// Loyalty Dashboard Component
// ============================================

export function LoyaltyDashboard() {
  const [account, setAccount] = useState<LoyaltyAccount>(dummyAccount);
  const [levels] = useState<LoyaltyLevel[]>(dummyLevels);
  const [transactions] = useState<LoyaltyTransaction[]>(dummyTransactions);
  const [bonuses, setBonuses] = useState<Bonus[]>(dummyBonuses);
  const [rewards] = useState<Reward[]>(dummyRewards);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Calculate progress to next level
  const currentLevel = levels.find(l => l.level === account.level);
  const nextLevel = levels.find(l => l.level === account.level + 1);
  const progressPercent = nextLevel
    ? ((account.points - (currentLevel?.minPoints || 0)) / ((nextLevel?.minPoints || 0) - (currentLevel?.minPoints || 0))) * 100
    : 100;

  // Get level icon
  const getLevelIcon = (levelName: string) => {
    switch (levelName.toLowerCase()) {
      case 'bronze': return <Award className="h-5 w-5" style={{ color: '#CD7F32' }} />;
      case 'silver': return <Star className="h-5 w-5" style={{ color: '#C0C0C0' }} />;
      case 'gold': return <Trophy className="h-5 w-5" style={{ color: '#FFD700' }} />;
      case 'platinum': return <Crown className="h-5 w-5" style={{ color: '#E5E4E2' }} />;
      case 'diamond': return <Diamond className="h-5 w-5" style={{ color: '#B9F2FF' }} />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  // Redeem reward
  const handleRedeem = (reward: Reward) => {
    if (account.points < reward.pointsCost) {
      toast({
        title: 'Insufficient Points',
        description: `You need ${reward.pointsCost - account.points} more points to redeem this reward.`,
        variant: 'destructive',
      });
      return;
    }

    setAccount(prev => ({
      ...prev,
      points: prev.points - reward.pointsCost,
      totalRedeemed: prev.totalRedeemed + reward.pointsCost,
    }));

    toast({
      title: 'Reward Redeemed!',
      description: `You have successfully redeemed ${reward.name}.`,
    });
  };

  // Bonus status colors
  const bonusStatusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    RELEASED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    EXPIRED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Loyalty Program</h2>
          <p className="text-muted-foreground">
            Earn points, unlock rewards, and enjoy exclusive benefits
          </p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Points Card */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-amber-100">Available Points</p>
                <p className="text-4xl font-bold">{account.points.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-full bg-white/20">
                <Coins className="h-8 w-8" />
              </div>
            </div>

            {/* Level Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {getLevelIcon(account.levelName)}
                  {account.levelName}
                </span>
                <span>
                  {nextLevel ? `${account.points} / ${nextLevel.minPoints} to ${nextLevel.name}` : 'Max Level!'}
                </span>
              </div>
              <Progress value={progressPercent} className="h-3 bg-white/20" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-amber-100 text-sm">Total Earned</p>
                <p className="text-xl font-semibold">{account.totalEarned.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-amber-100 text-sm">Total Redeemed</p>
                <p className="text-xl font-semibold">{account.totalRedeemed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Level Benefits */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {getLevelIcon(account.levelName)}
              <CardTitle>{account.levelName} Benefits</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentLevel?.benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="rewards" className="gap-2">
            <Gift className="h-4 w-4" />
            Rewards
          </TabsTrigger>
          <TabsTrigger value="bonuses" className="gap-2">
            <Zap className="h-4 w-4" />
            Bonuses
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Levels Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Level Progress</CardTitle>
                <CardDescription>Your journey through the loyalty tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {levels.map((level) => (
                    <div
                      key={level.level}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-lg border',
                        level.level === account.level && 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      )}
                    >
                      <div
                        className="p-2 rounded-full"
                        style={{ backgroundColor: `${level.color}20` }}
                      >
                        {getLevelIcon(level.name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{level.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {level.minPoints.toLocaleString()}+ pts
                          </p>
                        </div>
                        {level.level === account.level && (
                          <Badge variant="outline" className="mt-1">Current Level</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Points Earned</p>
                  <p className="text-2xl font-bold">{account.totalEarned.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Active Bonuses</p>
                  <p className="text-2xl font-bold">{bonuses.filter(b => b.status === 'ACTIVE').length}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Rewards Redeemed</p>
                  <p className="text-2xl font-bold">{Math.floor(account.totalRedeemed / 500)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{reward.name}</CardTitle>
                    <Badge variant="secondary">{reward.category}</Badge>
                  </div>
                  <CardDescription>{reward.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4 text-amber-500" />
                      <span className="font-bold">{reward.pointsCost}</span>
                      <span className="text-sm text-muted-foreground">pts</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRedeem(reward)}
                      disabled={account.points < reward.pointsCost}
                    >
                      {account.points >= reward.pointsCost ? (
                        <>
                          <Unlock className="h-4 w-4 mr-1" />
                          Redeem
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-1" />
                          Locked
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Bonuses Tab */}
        <TabsContent value="bonuses">
          <Card>
            <CardHeader>
              <CardTitle>Active Bonuses</CardTitle>
              <CardDescription>Track your bonus progress and unlock trading credits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bonuses.map((bonus) => (
                  <div key={bonus.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                          <Gift className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium">{bonus.type} Bonus</p>
                          <p className="text-sm text-muted-foreground">
                            ${bonus.amount} {bonus.currency}
                          </p>
                        </div>
                      </div>
                      <Badge className={bonusStatusColors[bonus.status]}>
                        {bonus.status}
                      </Badge>
                    </div>

                    {/* Volume Progress */}
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Volume Progress</span>
                        <span>
                          {bonus.volumeProgress.toFixed(1)} / {bonus.volumeRequirement} lots
                        </span>
                      </div>
                      <Progress
                        value={(bonus.volumeProgress / bonus.volumeRequirement) * 100}
                        className="h-2"
                      />
                    </div>

                    {bonus.expiresAt && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires {format(new Date(bonus.expiresAt), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-full',
                            tx.type === 'EARN'
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                              : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                          )}
                        >
                          {tx.type === 'EARN' ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingUp className="h-4 w-4 rotate-180" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{tx.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <p
                        className={cn(
                          'font-bold',
                          tx.type === 'EARN' ? 'text-green-500' : 'text-red-500'
                        )}
                      >
                        {tx.type === 'EARN' ? '+' : ''}{tx.points}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
