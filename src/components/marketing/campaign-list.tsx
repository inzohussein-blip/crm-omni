'use client';

/**
 * OMNI-CRM Campaign List Component
 * Display and manage marketing campaigns
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Eye,
  Calendar,
  Users,
  TrendingUp,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { 
  MarketingCampaign, 
  CampaignType, 
  CampaignStatus,
  CampaignStatistics 
} from '@/types';
import type { ApiResponse } from '@/types';

// ============================================
// ICON MAPPING
// ============================================

const campaignTypeIcons: Record<CampaignType, React.ElementType> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  PUSH: Bell,
  IN_APP: Smartphone,
};

const statusColors: Record<CampaignStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  SENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  SENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const statusIcons: Record<CampaignStatus, React.ElementType> = {
  DRAFT: Clock,
  SCHEDULED: Calendar,
  SENDING: Loader2,
  SENT: CheckCircle,
  CANCELLED: XCircle,
  FAILED: AlertCircle,
};

// ============================================
// DUMMY DATA FOR DEMO
// ============================================

const dummyCampaigns: MarketingCampaign[] = [
  {
    id: 'camp_001',
    name: 'Welcome Email Campaign',
    type: 'EMAIL',
    subject: 'Welcome to OMNI Trading!',
    content: 'Welcome to our platform...',
    targetAudience: { countries: ['US', 'UK'] },
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    totalRecipients: 1250,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    unsubscribeCount: 0,
    status: 'SCHEDULED',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalRecipients: 1250,
      sentCount: 0,
      openCount: 0,
      clickCount: 0,
      bounceCount: 0,
      unsubscribeCount: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      unsubscribeRate: 0,
    },
  },
  {
    id: 'camp_002',
    name: 'VIP Deposit Bonus',
    type: 'EMAIL',
    subject: 'Exclusive VIP Bonus - 50% Deposit Match!',
    content: 'Dear VIP client...',
    targetAudience: { vipOnly: true },
    segmentId: 'seg_vip',
    sentAt: new Date(Date.now() - 172800000).toISOString(),
    totalRecipients: 85,
    sentCount: 85,
    openCount: 52,
    clickCount: 23,
    bounceCount: 2,
    unsubscribeCount: 1,
    status: 'SENT',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalRecipients: 85,
      sentCount: 85,
      openCount: 52,
      clickCount: 23,
      bounceCount: 2,
      unsubscribeCount: 1,
      openRate: 61.2,
      clickRate: 27.1,
      bounceRate: 2.4,
      unsubscribeRate: 1.2,
    },
  },
  {
    id: 'camp_003',
    name: 'Inactive Users Re-engagement',
    type: 'EMAIL',
    subject: 'We miss you! Come back for a special bonus',
    content: 'It has been a while...',
    targetAudience: { lastActivityDays: 60 },
    totalRecipients: 450,
    sentCount: 450,
    openCount: 89,
    clickCount: 34,
    bounceCount: 45,
    unsubscribeCount: 12,
    status: 'SENT',
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalRecipients: 450,
      sentCount: 450,
      openCount: 89,
      clickCount: 34,
      bounceCount: 45,
      unsubscribeCount: 12,
      openRate: 19.8,
      clickRate: 7.6,
      bounceRate: 10,
      unsubscribeRate: 2.7,
    },
  },
  {
    id: 'camp_004',
    name: 'KYC Reminder',
    type: 'SMS',
    content: 'Complete your KYC to unlock all features',
    targetAudience: { kycStatus: ['PENDING'] },
    totalRecipients: 125,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    unsubscribeCount: 0,
    status: 'DRAFT',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'camp_005',
    name: 'Trading Competition Announcement',
    type: 'PUSH',
    content: 'Join our monthly trading competition!',
    targetAudience: { hasTraded: true },
    totalRecipients: 890,
    sentCount: 890,
    openCount: 456,
    clickCount: 234,
    bounceCount: 12,
    unsubscribeCount: 5,
    status: 'SENT',
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date().toISOString(),
    stats: {
      totalRecipients: 890,
      sentCount: 890,
      openCount: 456,
      clickCount: 234,
      bounceCount: 12,
      unsubscribeCount: 5,
      openRate: 51.2,
      clickRate: 26.3,
      bounceRate: 1.3,
      unsubscribeRate: 0.6,
    },
  },
];

// ============================================
// CAMPAIGN LIST COMPONENT
// ============================================

interface CampaignListProps {
  onCreateCampaign?: () => void;
  onSelectCampaign?: (campaign: MarketingCampaign) => void;
}

export function CampaignList({ onCreateCampaign, onSelectCampaign }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(dummyCampaigns);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch campaigns from API
  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('includeStats', 'true');

      const response = await fetch(`/api/marketing/campaigns?${params}`);
      if (response.ok) {
        const data: ApiResponse<{ campaigns: MarketingCampaign[] }> = await response.json();
        if (data.success && data.data?.campaigns && data.data.campaigns.length > 0) {
          setCampaigns(data.data.campaigns);
        }
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filter campaigns by search query
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle campaign actions
  const handleSendCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns?id=${campaignId}&action=send`, {
        method: 'PATCH',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Failed to send campaign:', error);
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns?id=${campaignId}&action=cancel`, {
        method: 'PATCH',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Failed to cancel campaign:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns?id=${campaignId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  // View campaign details
  const handleViewDetails = (campaign: MarketingCampaign) => {
    setSelectedCampaign(campaign);
    setShowDetails(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Campaigns</h2>
          <p className="text-muted-foreground">Manage your marketing campaigns</p>
        </div>
        <Button onClick={onCreateCampaign} className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="SENDING">Sending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="PUSH">Push</SelectItem>
                <SelectItem value="IN_APP">In-App</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchCampaigns} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const TypeIcon = campaignTypeIcons[campaign.type];
                  const StatusIcon = statusIcons[campaign.status];
                  const stats = campaign.stats;

                  return (
                    <TableRow 
                      key={campaign.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(campaign)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{campaign.name}</span>
                          {campaign.subject && (
                            <span className="text-sm text-muted-foreground truncate max-w-xs">
                              {campaign.subject}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[campaign.status]}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${campaign.status === 'SENDING' ? 'animate-spin' : ''}`} />
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{campaign.type.toLowerCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{campaign.totalRecipients.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats && campaign.status === 'SENT' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-green-500" />
                              <span>{stats.openRate.toFixed(1)}% open</span>
                            </div>
                            <Progress value={stats.openRate} className="h-1" />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {campaign.scheduledAt ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(campaign.scheduledAt).toLocaleDateString()}</span>
                          </div>
                        ) : campaign.sentAt ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4" />
                            <span>Sent {new Date(campaign.sentAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(campaign)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {campaign.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Send Now
                              </DropdownMenuItem>
                            )}
                            {campaign.status === 'SCHEDULED' && (
                              <DropdownMenuItem onClick={() => handleCancelCampaign(campaign.id)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Cancel Schedule
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {campaign.status === 'DRAFT' && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Campaign Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCampaign && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCampaign.name}</DialogTitle>
                <DialogDescription>
                  Campaign details and performance metrics
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Status and Type */}
                <div className="flex items-center gap-4">
                  <Badge className={statusColors[selectedCampaign.status]}>
                    {selectedCampaign.status}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const TypeIcon = campaignTypeIcons[selectedCampaign.type];
                      return <TypeIcon className="h-4 w-4" />;
                    })()}
                    <span className="capitalize">{selectedCampaign.type.toLowerCase()}</span>
                  </div>
                </div>

                {/* Stats Grid */}
                {selectedCampaign.stats && selectedCampaign.status === 'SENT' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{selectedCampaign.sentCount}</div>
                        <div className="text-sm text-muted-foreground">Sent</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">{selectedCampaign.stats.openRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Open Rate</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-blue-600">{selectedCampaign.stats.clickRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Click Rate</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">{selectedCampaign.stats.bounceRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">Bounce Rate</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Content Preview */}
                <div>
                  <h4 className="font-medium mb-2">Subject</h4>
                  <p className="text-muted-foreground">{selectedCampaign.subject || 'No subject'}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Content Preview</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm whitespace-pre-wrap">{selectedCampaign.content}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Target Audience */}
                <div>
                  <h4 className="font-medium mb-2">Target Audience</h4>
                  <Card>
                    <CardContent className="pt-4">
                      <pre className="text-sm text-muted-foreground">
                        {JSON.stringify(selectedCampaign.targetAudience, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedCampaign.status === 'DRAFT' && (
                    <Button onClick={() => handleSendCampaign(selectedCampaign.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Send Now
                    </Button>
                  )}
                  {selectedCampaign.status === 'SCHEDULED' && (
                    <Button variant="destructive" onClick={() => handleCancelCampaign(selectedCampaign.id)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Cancel Schedule
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
