'use client';

/**
 * OMNI-CRM Dispute List Component
 * Displays a filterable list of disputes with status indicators
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  Scale,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  ArrowUpRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================
// TYPES
// ============================================

export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';
export type DisputeCategory = 'DEPOSIT' | 'WITHDRAWAL' | 'TRADING' | 'ACCOUNT' | 'COMPLIANCE' | 'IB_COMMISSION' | 'OTHER';

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderType: 'client' | 'staff' | 'system';
  sender?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  content: string;
  attachments?: string[];
  isInternal: boolean;
  createdAt: string;
}

export interface Dispute {
  id: string;
  caseNumber: string;
  clientId: string;
  againstType: string;
  againstId?: string;
  title: string;
  description: string;
  category: DisputeCategory;
  amount?: number;
  currency?: string;
  evidence?: EvidenceItem[];
  status: DisputeStatus;
  resolution?: string;
  resolutionType?: string;
  resolvedAt?: string;
  resolvedById?: string;
  client?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  resolver?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  againstEntity?: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    userType?: string;
  };
  messages?: DisputeMessage[];
  resolutionTime?: number;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface EvidenceItem {
  id: string;
  type: 'document' | 'image' | 'video' | 'screenshot' | 'email' | 'chat_log' | 'transaction_record' | 'other';
  name: string;
  url: string;
  description?: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface DisputeStats {
  total: number;
  open: number;
  inReview: number;
  escalated: number;
  resolved: number;
  closed: number;
  totalAmount: number;
  avgResolutionTime: number;
  byCategory: Record<string, number>;
  byAgainstType: Record<string, number>;
}

interface DisputeListProps {
  onSelectDispute?: (dispute: Dispute) => void;
  onCreateDispute?: () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getStatusColor = (status: DisputeStatus) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'IN_REVIEW':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'ESCALATED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: DisputeStatus) => {
  switch (status) {
    case 'OPEN':
      return <AlertCircle className="h-3 w-3" />;
    case 'IN_REVIEW':
      return <Clock className="h-3 w-3" />;
    case 'ESCALATED':
      return <ArrowUpRight className="h-3 w-3" />;
    case 'RESOLVED':
      return <CheckCircle className="h-3 w-3" />;
    case 'CLOSED':
      return <Ban className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

const getCategoryLabel = (category: DisputeCategory) => {
  return category.replace(/_/g, ' ');
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// ============================================
// STATS CARDS
// ============================================

function DisputeStatsCards({ stats }: { stats: DisputeStats | null }) {
  if (!stats) return null;

  const cards = [
    {
      title: 'Open Cases',
      value: stats.open,
      icon: AlertCircle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'In Review',
      value: stats.inReview,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      title: 'Escalated',
      value: stats.escalated,
      icon: ArrowUpRight,
      color: 'text-red-500',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-full ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DisputeList({ onSelectDispute, onCreateDispute }: DisputeListProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const response = await fetch(`/api/disputes?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDisputes(data.data.disputes || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, search]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/disputes?action=stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data.stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
    fetchStats();
  }, [fetchDisputes, fetchStats]);

  const handleViewDispute = (dispute: Dispute) => {
    if (onSelectDispute) {
      onSelectDispute(dispute);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispute Management</h2>
          <p className="text-muted-foreground">Track and resolve client disputes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchDisputes(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {onCreateDispute && (
            <Button size="sm" onClick={onCreateDispute}>
              <Scale className="h-4 w-4 mr-2" />
              New Dispute
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <DisputeStatsCards stats={stats} />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case number, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                <SelectItem value="ESCALATED">Escalated</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                <SelectItem value="TRADING">Trading</SelectItem>
                <SelectItem value="ACCOUNT">Account</SelectItem>
                <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                <SelectItem value="IB_COMMISSION">IB Commission</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dispute Cases</CardTitle>
          <CardDescription>
            {disputes.length} dispute{disputes.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading disputes...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : disputes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No disputes found
                    </TableCell>
                  </TableRow>
                ) : (
                  disputes.map((dispute) => (
                    <TableRow key={dispute.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono font-medium">
                        {dispute.caseNumber}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium truncate">{dispute.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            vs {dispute.againstType}
                            {dispute.againstEntity && ` - ${dispute.againstEntity.name}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={dispute.client?.avatar} />
                            <AvatarFallback>
                              {dispute.client?.name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm">
                            <div className="font-medium">{dispute.client?.name || 'Unknown'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(dispute.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dispute.amount ? (
                          <span className="font-medium">
                            {formatCurrency(dispute.amount, dispute.currency)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${getStatusColor(dispute.status)}`}>
                          {getStatusIcon(dispute.status)}
                          {dispute.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(dispute.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDispute(dispute)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {dispute.status === 'OPEN' && (
                              <DropdownMenuItem>
                                <Clock className="h-4 w-4 mr-2" />
                                Start Review
                              </DropdownMenuItem>
                            )}
                            {dispute.status !== 'ESCALATED' && dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                              <DropdownMenuItem>
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Escalate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
