'use client';

/**
 * Marketing Dashboard Component
 * Campaign management, analytics, and email templates
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Plus,
  Send,
  Calendar,
  BarChart3,
  Users,
  Eye,
  MousePointer,
  AlertCircle,
  CheckCircle,
  Clock,
  Pause,
  Play,
  Copy,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// ============================================
// Types
// ============================================

interface Campaign {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
  subject?: string;
  content: string;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  variables: string[];
  isActive: boolean;
}

// ============================================
// Dummy Data
// ============================================

const dummyCampaigns: Campaign[] = [
  {
    id: 'c1',
    name: 'Q4 Promotion',
    type: 'EMAIL',
    status: 'SENT',
    subject: 'Exclusive Q4 Trading Bonus!',
    content: 'Get 50% bonus on your next deposit...',
    totalRecipients: 5000,
    sentCount: 4850,
    openCount: 1250,
    clickCount: 320,
    bounceCount: 150,
    sentAt: '2024-12-01T10:00:00Z',
    createdAt: '2024-11-28T15:00:00Z',
  },
  {
    id: 'c2',
    name: 'New Year Special',
    type: 'EMAIL',
    status: 'SCHEDULED',
    subject: 'Start 2025 with a Trading Boost!',
    content: 'New year, new opportunities...',
    totalRecipients: 8000,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    scheduledAt: '2025-01-01T00:00:00Z',
    createdAt: '2024-12-10T09:00:00Z',
  },
  {
    id: 'c3',
    name: 'KYC Reminder',
    type: 'SMS',
    status: 'SENT',
    content: 'Complete your KYC to unlock all features',
    totalRecipients: 120,
    sentCount: 118,
    openCount: 95,
    clickCount: 45,
    bounceCount: 2,
    sentAt: '2024-12-05T14:30:00Z',
    createdAt: '2024-12-05T14:00:00Z',
  },
  {
    id: 'c4',
    name: 'Weekly Market Update',
    type: 'EMAIL',
    status: 'DRAFT',
    subject: 'This Week in Forex Markets',
    content: 'Market analysis and trading opportunities...',
    totalRecipients: 0,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    createdAt: '2024-12-12T11:00:00Z',
  },
];

const dummyStats: CampaignStats = {
  totalCampaigns: 24,
  activeCampaigns: 3,
  totalSent: 45250,
  avgOpenRate: 25.8,
  avgClickRate: 6.5,
  avgBounceRate: 3.2,
  byType: { EMAIL: 18, SMS: 4, PUSH: 2 },
  byStatus: { SENT: 15, SCHEDULED: 3, DRAFT: 6 },
};

const dummyTemplates: EmailTemplate[] = [
  { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to OMNI-CRM!', category: 'onboarding', variables: ['name'], isActive: true },
  { id: 'deposit', name: 'Deposit Confirmation', subject: 'Your deposit has been credited', category: 'transactions', variables: ['name', 'amount'], isActive: true },
  { id: 'kyc_approved', name: 'KYC Approved', subject: 'Your account has been verified', category: 'compliance', variables: ['name'], isActive: true },
  { id: 'monthly_report', name: 'Monthly Report', subject: 'Your Monthly Trading Report', category: 'reports', variables: ['name', 'volume'], isActive: true },
];

// ============================================
// Marketing Dashboard Component
// ============================================

export function MarketingDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(dummyCampaigns);
  const [stats, setStats] = useState<CampaignStats>(dummyStats);
  const [templates, setTemplates] = useState<EmailTemplate[]>(dummyTemplates);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const { toast } = useToast();

  // Type icons
  const typeIcons = {
    EMAIL: Mail,
    SMS: MessageSquare,
    PUSH: Smartphone,
    IN_APP: Globe,
  };

  // Status colors
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    SENT: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  // Calculate rates
  const getOpenRate = (campaign: Campaign) =>
    campaign.sentCount > 0 ? ((campaign.openCount / campaign.sentCount) * 100).toFixed(1) : '0';
  const getClickRate = (campaign: Campaign) =>
    campaign.sentCount > 0 ? ((campaign.clickCount / campaign.sentCount) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Marketing</h2>
          <p className="text-muted-foreground">
            Campaign management and analytics
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Campaign</DialogTitle>
              <DialogDescription>
                Create a new marketing campaign
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input placeholder="e.g., Q1 2025 Promotion" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue="EMAIL">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="PUSH">Push Notification</SelectItem>
                    <SelectItem value="IN_APP">In-App Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Subject</Label>
                <Input placeholder="Email subject line" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Content</Label>
                <Textarea placeholder="Campaign content..." rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Target Segment</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="vip">VIP Clients</SelectItem>
                    <SelectItem value="active">Active Traders</SelectItem>
                    <SelectItem value="inactive">Inactive (30+ days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Input type="datetime-local" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline">Save as Draft</Button>
              <Button>Schedule Campaign</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
              </div>
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <Send className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                <p className="text-2xl font-bold">{stats.avgOpenRate.toFixed(1)}%</p>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +2.3%
                </p>
              </div>
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Click Rate</p>
                <p className="text-2xl font-bold">{stats.avgClickRate.toFixed(1)}%</p>
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  -0.5%
                </p>
              </div>
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <MousePointer className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns" className="gap-2">
            <Mail className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Copy className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {campaigns.map((campaign) => {
                  const TypeIcon = typeIcons[campaign.type];
                  return (
                    <div
                      key={campaign.id}
                      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedCampaign(campaign)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-muted">
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {campaign.subject || 'No subject'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right mr-4">
                            <p className="text-sm font-medium">
                              {campaign.sentCount.toLocaleString()} / {campaign.totalRecipients.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Sent</p>
                          </div>
                          <div className="text-right mr-4">
                            <p className="text-sm font-medium">{getOpenRate(campaign)}%</p>
                            <p className="text-xs text-muted-foreground">Open Rate</p>
                          </div>
                          <Badge className={statusColors[campaign.status]}>
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress Bar for Sent Campaigns */}
                      {campaign.status === 'SENT' && (
                        <div className="mt-3 space-y-1">
                          <Progress
                            value={(campaign.sentCount / campaign.totalRecipients) * 100}
                            className="h-1"
                          />
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {campaign.openCount} opens
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointer className="h-3 w-3" />
                              {campaign.clickCount} clicks
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {campaign.bounceCount} bounces
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Schedule info */}
                      {campaign.status === 'SCHEDULED' && campaign.scheduledAt && (
                        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Scheduled for {format(new Date(campaign.scheduledAt), 'PPP p')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                  <CardDescription>{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Variables:</span>
                      {template.variables.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaigns by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Campaigns by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {type === 'EMAIL' && <Mail className="h-4 w-4 text-blue-500" />}
                        {type === 'SMS' && <MessageSquare className="h-4 w-4 text-green-500" />}
                        {type === 'PUSH' && <Smartphone className="h-4 w-4 text-purple-500" />}
                        <span>{type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(count / stats.totalCampaigns) * 100}
                          className="w-24 h-2"
                        />
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Campaigns by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Campaigns by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === 'SENT' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {status === 'SCHEDULED' && <Clock className="h-4 w-4 text-blue-500" />}
                        {status === 'DRAFT' && <Pause className="h-4 w-4 text-gray-500" />}
                        <span>{status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(count / stats.totalCampaigns) * 100}
                          className="w-24 h-2"
                        />
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{stats.avgOpenRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Avg Open Rate</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{stats.avgClickRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Avg Click Rate</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{stats.avgBounceRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Avg Bounce Rate</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-3xl font-bold">{stats.activeCampaigns}</p>
                    <p className="text-sm text-muted-foreground">Active Campaigns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
