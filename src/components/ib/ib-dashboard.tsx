'use client';

/**
 * OMNI-CRM IB Dashboard
 * Multi-level Commission Tracking and Marketing Tools
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Network,
  DollarSign,
  Users,
  TrendingUp,
  Link2,
  Copy,
  Share2,
  BarChart3,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// IB STATS CARD
// ============================================

interface IBStatsProps {
  totalClients: number;
  activeClients: number;
  totalVolume: number;
  totalCommission: number;
  pendingCommission: number;
}

export function IBStatsCard({
  totalClients,
  activeClients,
  totalVolume,
  totalCommission,
  pendingCommission,
}: IBStatsProps) {
  const stats = [
    {
      title: 'Total Clients',
      value: totalClients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Active Clients',
      value: activeClients,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Trading Volume',
      value: `$${(totalVolume / 1000000).toFixed(2)}M`,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Total Commission',
      value: `$${totalCommission.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn('rounded-lg p-2', stat.bgColor)}>
                <Icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.title === 'Total Commission' && pendingCommission > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ${pendingCommission.toLocaleString()} pending
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// COMMISSION TIERS
// ============================================

interface CommissionTierProps {
  levels: {
    level: number;
    rate: number;
    clients: number;
    volume: number;
    commission: number;
  }[];
}

export function CommissionTiersCard({ levels }: CommissionTierProps) {
  const maxCommission = Math.max(...levels.map(l => l.commission));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Network className="h-5 w-5" />
          Commission Tiers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {levels.map((tier) => (
            <div key={tier.level} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Level {tier.level}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {tier.rate}% commission
                  </span>
                </div>
                <span className="font-semibold text-green-600">
                  ${tier.commission.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Clients:</span>{' '}
                  <span className="font-medium">{tier.clients}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Volume:</span>{' '}
                  <span className="font-medium">${(tier.volume / 1000).toFixed(0)}K</span>
                </div>
              </div>
              <Progress 
                value={(tier.commission / maxCommission) * 100} 
                className="h-2"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// REFERRAL LINK CARD
// ============================================

interface ReferralLinkCardProps {
  ibCode: string;
  referralLink: string;
  totalClicks: number;
  totalSignups: number;
  conversionRate: number;
}

export function ReferralLinkCard({
  ibCode,
  referralLink,
  totalClicks,
  totalSignups,
  conversionRate,
}: ReferralLinkCardProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Your Referral Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Link */}
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-lg bg-muted font-mono text-sm truncate">
            {referralLink}
          </div>
          <Button variant="outline" size="icon" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {/* IB Code */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">IB Code:</span>
          <Badge variant="secondary" className="font-mono">{ibCode}</Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalClicks}</p>
            <p className="text-xs text-muted-foreground">Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalSignups}</p>
            <p className="text-xs text-muted-foreground">Signups</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="flex-1">
            Generate Banner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// IB NETWORK TREE
// ============================================

interface IBNetworkNode {
  id: string;
  name: string;
  email: string;
  level: number;
  clients: number;
  commission: number;
  children?: IBNetworkNode[];
}

interface IBNetworkTreeProps {
  tree: IBNetworkNode;
  maxDepth?: number;
}

export function IBNetworkTree({ tree, maxDepth = 3 }: IBNetworkTreeProps) {
  const renderNode = (node: IBNetworkNode, depth: number = 0) => {
    if (depth > maxDepth) return null;

    return (
      <div key={node.id} className="ml-4">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
            depth === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}>
            {node.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{node.name}</p>
            <p className="text-xs text-muted-foreground">
              {node.clients} clients • ${node.commission.toLocaleString()} commission
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            L{node.level}
          </Badge>
        </div>
        
        {node.children && node.children.length > 0 && (
          <div className="border-l border-border ml-4 pl-2">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Network className="h-5 w-5" />
          Your Network
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderNode(tree)}
      </CardContent>
    </Card>
  );
}

// ============================================
// MARKETING BANNERS
// ============================================

interface BannerData {
  id: string;
  name: string;
  imageUrl: string;
  targetUrl: string;
  impressions: number;
  clicks: number;
}

interface MarketingBannersProps {
  banners: BannerData[];
  onCreateBanner?: () => void;
}

export function MarketingBanners({ banners, onCreateBanner }: MarketingBannersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Marketing Banners
        </CardTitle>
      </CardHeader>
      <CardContent>
        {banners.length === 0 ? (
          <div className="text-center py-8">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No banners created yet</p>
            <Button onClick={onCreateBanner}>Create Banner</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              <div key={banner.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="w-20 h-12 bg-muted rounded flex items-center justify-center">
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.name}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{banner.name}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{banner.impressions.toLocaleString()} views</span>
                    <span>{banner.clicks.toLocaleString()} clicks</span>
                    <span>
                      {banner.impressions > 0 
                        ? ((banner.clicks / banner.impressions) * 100).toFixed(1) 
                        : 0}% CTR
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm">Get Code</Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={onCreateBanner}>
              Create New Banner
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
