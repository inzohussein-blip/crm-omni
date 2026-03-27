'use client';

/**
 * OMNI-CRM Campaign Builder Component
 * Create and edit marketing campaigns with full UI
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  Calendar as CalendarIcon,
  Users,
  Eye,
  Send,
  Save,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Globe,
  DollarSign,
  Activity,
  TrendingUp,
  Filter,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { 
  MarketingCampaign, 
  CampaignType, 
  TargetAudience,
  MarketingSegment,
  SegmentMember,
} from '@/types';
import type { ApiResponse } from '@/types';

// ============================================
// TYPES
// ============================================

interface CampaignFormData {
  name: string;
  type: CampaignType;
  subject: string;
  content: string;
  htmlContent: string;
  targetAudience: TargetAudience;
  segmentId?: string;
  scheduledAt?: Date;
}

interface PreviewData {
  recipients: number;
  previewMembers: SegmentMember[];
}

// ============================================
// DUMMY DATA FOR DEMO
// ============================================

const dummySegments: MarketingSegment[] = [
  {
    id: 'seg_001',
    name: 'VIP Clients',
    description: 'All VIP account holders',
    criteria: { accountTypes: ['VIP'] },
    memberCount: 85,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seg_002',
    name: 'Active Traders',
    description: 'Clients who traded in last 30 days',
    criteria: { lastLoginDays: 30, hasTraded: true },
    memberCount: 450,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seg_003',
    name: 'High Depositors',
    description: 'Clients with deposits over $10,000',
    criteria: { depositMin: 10000 },
    memberCount: 125,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const countries = [
  'US', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH',
  'AE', 'SA', 'KW', 'QA', 'BH', 'OM',
  'SG', 'MY', 'ID', 'TH', 'VN', 'PH',
  'AU', 'NZ', 'JP', 'KR', 'HK', 'TW',
  'BR', 'MX', 'AR', 'CL', 'CO',
  'ZA', 'NG', 'EG', 'MA',
];

const accountTypes = ['STANDARD', 'ECN', 'ISLAMIC', 'VIP', 'DEMO'];
const kycStatuses = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'];

// ============================================
// CAMPAIGN BUILDER COMPONENT
// ============================================

interface CampaignBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: MarketingCampaign | null;
  onSave?: (campaign: Partial<MarketingCampaign>) => void;
  onSend?: (campaign: Partial<MarketingCampaign>) => void;
}

export function CampaignBuilder({
  open,
  onOpenChange,
  editCampaign,
  onSave,
  onSend,
}: CampaignBuilderProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [segments, setSegments] = useState<MarketingSegment[]>(dummySegments);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    type: 'EMAIL',
    subject: '',
    content: '',
    htmlContent: '',
    targetAudience: {},
    scheduledAt: undefined,
  });

  // Initialize form with edit data
  useEffect(() => {
    if (editCampaign) {
      setFormData({
        name: editCampaign.name,
        type: editCampaign.type,
        subject: editCampaign.subject || '',
        content: editCampaign.content,
        htmlContent: editCampaign.htmlContent || '',
        targetAudience: editCampaign.targetAudience,
        segmentId: editCampaign.segmentId,
        scheduledAt: editCampaign.scheduledAt ? new Date(editCampaign.scheduledAt) : undefined,
      });
    } else {
      setFormData({
        name: '',
        type: 'EMAIL',
        subject: '',
        content: '',
        htmlContent: '',
        targetAudience: {},
        scheduledAt: undefined,
      });
    }
    setStep(1);
  }, [editCampaign, open]);

  // Fetch segments
  const fetchSegments = useCallback(async () => {
    try {
      const response = await fetch('/api/marketing/segments');
      if (response.ok) {
        const data: ApiResponse<{ segments: MarketingSegment[] }> = await response.json();
        if (data.success && data.data?.segments && data.data.segments.length > 0) {
          setSegments(data.data.segments);
        }
      }
    } catch (error) {
      console.error('Failed to fetch segments:', error);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // Preview audience
  const previewAudience = useCallback(async () => {
    setIsPreviewLoading(true);
    try {
      const response = await fetch('/api/marketing/segments?action=preview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: formData.targetAudience }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPreviewData({
            recipients: data.data.total,
            previewMembers: data.data.members,
          });
        }
      }
    } catch (error) {
      console.error('Failed to preview audience:', error);
      // Use dummy data for demo
      setPreviewData({
        recipients: Math.floor(Math.random() * 500) + 100,
        previewMembers: [],
      });
    } finally {
      setIsPreviewLoading(false);
    }
  }, [formData.targetAudience]);

  useEffect(() => {
    if (step === 3 && Object.keys(formData.targetAudience).length > 0) {
      previewAudience();
    }
  }, [step, formData.targetAudience, previewAudience]);

  // Handle form field changes
  const updateField = <K extends keyof CampaignFormData>(
    field: K,
    value: CampaignFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle target audience changes
  const updateTargetAudience = <K extends keyof TargetAudience>(
    field: K,
    value: TargetAudience[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: { ...prev.targetAudience, [field]: value },
    }));
  };

  // Save campaign
  const handleSave = async (asDraft = true) => {
    setIsLoading(true);
    try {
      const campaignData = {
        ...formData,
        scheduledAt: formData.scheduledAt?.toISOString(),
      };

      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onSave?.(data.data);
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Failed to save campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Welcome Email Campaign"
              />
            </div>

            {/* Campaign Type */}
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {([
                  { type: 'EMAIL', icon: Mail, label: 'Email' },
                  { type: 'SMS', icon: MessageSquare, label: 'SMS' },
                  { type: 'PUSH', icon: Bell, label: 'Push' },
                  { type: 'IN_APP', icon: Smartphone, label: 'In-App' },
                ] as const).map(({ type, icon: Icon, label }) => (
                  <Card
                    key={type}
                    className={cn(
                      'cursor-pointer transition-colors hover:border-primary',
                      formData.type === type && 'border-primary bg-primary/5'
                    )}
                    onClick={() => updateField('type', type)}
                  >
                    <CardContent className="flex flex-col items-center py-4">
                      <Icon className="h-6 w-6 mb-2" />
                      <span className="text-sm font-medium">{label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Subject (for email) */}
            {formData.type === 'EMAIL' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="e.g., Welcome to OMNI Trading!"
                />
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Content Editor */}
            <div className="space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="Write your message here..."
                rows={6}
              />
              <p className="text-sm text-muted-foreground">
                Use {'{{recipientName}}'} for personalization
              </p>
            </div>

            {/* HTML Content (for email) */}
            {formData.type === 'EMAIL' && (
              <div className="space-y-2">
                <Label htmlFor="htmlContent">HTML Content (Optional)</Label>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent}
                  onChange={(e) => updateField('htmlContent', e.target.value)}
                  placeholder="<html>...</html>"
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {/* Preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formData.type === 'EMAIL' ? (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <strong>Subject:</strong> {formData.subject || 'No subject'}
                    </div>
                    <Separator />
                    <div className="text-sm whitespace-pre-wrap">
                      {formData.content || 'No content'}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">
                      {formData.content || 'No content'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Segment Selection */}
            <div className="space-y-2">
              <Label>Use Saved Segment</Label>
              <Select
                value={formData.segmentId || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    updateField('segmentId', undefined);
                  } else {
                    const segment = segments.find(s => s.id === value);
                    if (segment) {
                      updateField('segmentId', value);
                      setFormData(prev => ({
                        ...prev,
                        targetAudience: segment.criteria,
                      }));
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Custom Audience</SelectItem>
                  {segments.map(segment => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name} ({segment.memberCount} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Custom Audience Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Custom Filters</Label>
                {Object.keys(formData.targetAudience).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateField('targetAudience', {})}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {/* Countries */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Countries
                </Label>
                <div className="flex flex-wrap gap-2">
                  {countries.slice(0, 10).map(country => (
                    <Badge
                      key={country}
                      variant={formData.targetAudience.countries?.includes(country) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = formData.targetAudience.countries || [];
                        const updated = current.includes(country)
                          ? current.filter(c => c !== country)
                          : [...current, country];
                        updateTargetAudience('countries', updated.length > 0 ? updated : undefined);
                      }}
                    >
                      {country}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Account Types */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Account Types
                </Label>
                <div className="flex flex-wrap gap-2">
                  {accountTypes.map(type => (
                    <Badge
                      key={type}
                      variant={formData.targetAudience.accountTypes?.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = formData.targetAudience.accountTypes || [];
                        const updated = current.includes(type)
                          ? current.filter(t => t !== type)
                          : [...current, type];
                        updateTargetAudience('accountTypes', updated.length > 0 ? updated : undefined);
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Deposit Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Deposit Range
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={formData.targetAudience.depositMin || ''}
                    onChange={(e) => updateTargetAudience('depositMin', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-32"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={formData.targetAudience.depositMax || ''}
                    onChange={(e) => updateTargetAudience('depositMax', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-32"
                  />
                </div>
              </div>

              {/* VIP Only */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vipOnly"
                  checked={formData.targetAudience.vipOnly}
                  onCheckedChange={(checked) => updateTargetAudience('vipOnly', checked ? true : undefined)}
                />
                <Label htmlFor="vipOnly">VIP Clients Only</Label>
              </div>

              {/* Has Traded */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasTraded"
                  checked={formData.targetAudience.hasTraded}
                  onCheckedChange={(checked) => updateTargetAudience('hasTraded', checked ? true : undefined)}
                />
                <Label htmlFor="hasTraded">Has Traded</Label>
              </div>
            </div>

            {/* Preview Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Audience Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isPreviewLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : previewData ? (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">{previewData.recipients.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Matching recipients</div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Add filters to see audience size
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            {/* Schedule Options */}
            <div className="space-y-4">
              <Label>When to Send</Label>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={cn(
                    'cursor-pointer transition-colors',
                    !formData.scheduledAt && 'border-primary bg-primary/5'
                  )}
                  onClick={() => updateField('scheduledAt', undefined)}
                >
                  <CardContent className="flex flex-col items-center py-6">
                    <Send className="h-8 w-8 mb-2" />
                    <span className="font-medium">Send Now</span>
                    <span className="text-sm text-muted-foreground">Immediately after saving</span>
                  </CardContent>
                </Card>
                <Popover>
                  <PopoverTrigger asChild>
                    <Card
                      className={cn(
                        'cursor-pointer transition-colors',
                        formData.scheduledAt && 'border-primary bg-primary/5'
                      )}
                    >
                      <CardContent className="flex flex-col items-center py-6">
                        <CalendarIcon className="h-8 w-8 mb-2" />
                        <span className="font-medium">Schedule</span>
                        <span className="text-sm text-muted-foreground">
                          {formData.scheduledAt
                            ? format(formData.scheduledAt, 'PPP')
                            : 'Pick a date'}
                        </span>
                      </CardContent>
                    </Card>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.scheduledAt}
                      onSelect={(date) => updateField('scheduledAt', date)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                    {formData.scheduledAt && (
                      <div className="p-3 border-t">
                        <Label className="text-sm">Time</Label>
                        <Input
                          type="time"
                          className="mt-1"
                          value={formData.scheduledAt ? format(formData.scheduledAt, 'HH:mm') : '09:00'}
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':');
                            const newDate = new Date(formData.scheduledAt || new Date());
                            newDate.setHours(parseInt(hours), parseInt(minutes));
                            updateField('scheduledAt', newDate);
                          }}
                        />
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Campaign Name</div>
                    <div className="font-medium">{formData.name || 'Untitled'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Type</div>
                    <div className="font-medium capitalize">{formData.type.toLowerCase()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Recipients</div>
                    <div className="font-medium">
                      {previewData?.recipients.toLocaleString() || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge>
                      {formData.scheduledAt ? 'Scheduled' : 'Draft'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  // Render statistics dashboard (for step indicator)
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[
        { num: 1, label: 'Basic Info' },
        { num: 2, label: 'Content' },
        { num: 3, label: 'Audience' },
        { num: 4, label: 'Schedule' },
      ].map(({ num, label }, idx) => (
        <div key={num} className="flex items-center">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
              step >= num
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {step > num ? <Check className="h-4 w-4" /> : num}
          </div>
          <span className={cn(
            'hidden sm:inline ml-2 text-sm',
            step >= num ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {label}
          </span>
          {idx < 3 && (
            <div className={cn(
              'w-8 sm:w-16 h-0.5 mx-2',
              step > num ? 'bg-primary' : 'bg-muted'
            )} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editCampaign ? 'Edit Campaign' : 'Create Campaign'}
          </DialogTitle>
          <DialogDescription>
            Set up your marketing campaign in a few simple steps
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Step Content */}
        <div className="py-4">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
                <Button
                  onClick={() => handleSave(false)}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Send className="h-4 w-4 mr-2" />
                  {formData.scheduledAt ? 'Schedule' : 'Send Now'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// STATISTICS DASHBOARD COMPONENT
// ============================================

interface CampaignStatsDashboardProps {
  campaignId?: string;
}

export function CampaignStatsDashboard({ campaignId }: CampaignStatsDashboardProps) {
  const [stats, setStats] = useState({
    totalSent: 2450,
    avgOpenRate: 42.5,
    avgClickRate: 18.3,
    avgBounceRate: 3.2,
    recentCampaigns: 12,
    activeCampaigns: 3,
    scheduledCampaigns: 2,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Campaign Performance</h3>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Sent</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.totalSent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Avg Open Rate</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-green-600">{stats.avgOpenRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Avg Click Rate</span>
            </div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{stats.avgClickRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-muted-foreground">Active Campaigns</span>
            </div>
            <div className="text-2xl font-bold mt-1">{stats.activeCampaigns}</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Performance Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { day: 'Mon', opens: 45, clicks: 22 },
              { day: 'Tue', opens: 52, clicks: 28 },
              { day: 'Wed', opens: 38, clicks: 18 },
              { day: 'Thu', opens: 61, clicks: 35 },
              { day: 'Fri', opens: 48, clicks: 25 },
              { day: 'Sat', opens: 32, clicks: 15 },
              { day: 'Sun', opens: 28, clicks: 12 },
            ].map(({ day, opens, clicks }) => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-8 text-sm text-muted-foreground">{day}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 w-12">Opens</span>
                    <Progress value={opens} className="h-2 flex-1" />
                    <span className="text-xs w-8">{opens}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-600 w-12">Clicks</span>
                    <Progress value={clicks} className="h-2 flex-1" />
                    <span className="text-xs w-8">{clicks}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
