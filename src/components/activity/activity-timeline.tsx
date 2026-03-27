'use client';

/**
 * OMNI-CRM Activity Timeline Component
 * Timeline view with filtering and expandable details
 */

import { useState, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import {
  Activity,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  LogIn,
  LogOut,
  Eye,
  Download,
  Upload,
  UserPlus,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  FileText,
  Check,
  X,
  Clipboard,
  UserCheck,
  CheckSquare,
  MessageSquare,
  MessageCircle,
  Archive,
  DollarSign,
  Gift,
  Settings,
  Key,
  Smartphone,
  AlertTriangle,
  Send,
  FileUp,
  FilePlus,
  RefreshCw,
  Flag,
  ArrowUpCircle,
  Server,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Calendar,
  User,
  Clock,
  Loader2,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface ActivityLogEntry {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  description?: string | null;
  metadata?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  isPublic: boolean;
  createdAt: string;
}

interface ActivityStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  recentActivities: ActivityLogEntry[];
}

// ============================================
// CONSTANTS
// ============================================

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  APPROVE: CheckCircle,
  REJECT: XCircle,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  VIEW: Eye,
  EXPORT: Download,
  IMPORT: Upload,
  ASSIGN: UserPlus,
  TRANSFER: ArrowRight,
  DEPOSIT: ArrowDown,
  WITHDRAWAL: ArrowUp,
  TRADE: TrendingUp,
  KYC_SUBMIT: FileText,
  KYC_APPROVE: Check,
  KYC_REJECT: X,
  TASK_CREATE: Clipboard,
  TASK_ASSIGN: UserCheck,
  TASK_COMPLETE: CheckSquare,
  TICKET_CREATE: MessageSquare,
  TICKET_REPLY: MessageCircle,
  TICKET_CLOSE: Archive,
  COMMISSION_EARN: DollarSign,
  BONUS_AWARD: Gift,
  SETTING_CHANGE: Settings,
  PASSWORD_CHANGE: Key,
  DEVICE_APPROVE: Smartphone,
  ALERT_TRIGGER: AlertTriangle,
  CAMPAIGN_SEND: Send,
  DOCUMENT_UPLOAD: FileUp,
  NOTE_ADD: FilePlus,
  STATUS_CHANGE: RefreshCw,
  PRIORITY_CHANGE: Flag,
  ESCALATE: ArrowUpCircle,
  SYSTEM: Server,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500',
  UPDATE: 'bg-blue-500',
  DELETE: 'bg-red-500',
  APPROVE: 'bg-green-500',
  REJECT: 'bg-red-500',
  LOGIN: 'bg-blue-500',
  LOGOUT: 'bg-gray-500',
  VIEW: 'bg-gray-500',
  EXPORT: 'bg-purple-500',
  IMPORT: 'bg-purple-500',
  ASSIGN: 'bg-amber-500',
  TRANSFER: 'bg-cyan-500',
  DEPOSIT: 'bg-green-500',
  WITHDRAWAL: 'bg-amber-500',
  TRADE: 'bg-blue-500',
  KYC_SUBMIT: 'bg-amber-500',
  KYC_APPROVE: 'bg-green-500',
  KYC_REJECT: 'bg-red-500',
  TASK_CREATE: 'bg-blue-500',
  TASK_ASSIGN: 'bg-amber-500',
  TASK_COMPLETE: 'bg-green-500',
  TICKET_CREATE: 'bg-blue-500',
  TICKET_REPLY: 'bg-cyan-500',
  TICKET_CLOSE: 'bg-gray-500',
  COMMISSION_EARN: 'bg-green-500',
  BONUS_AWARD: 'bg-pink-500',
  SETTING_CHANGE: 'bg-purple-500',
  PASSWORD_CHANGE: 'bg-red-500',
  DEVICE_APPROVE: 'bg-green-500',
  ALERT_TRIGGER: 'bg-amber-500',
  CAMPAIGN_SEND: 'bg-cyan-500',
  DOCUMENT_UPLOAD: 'bg-blue-500',
  NOTE_ADD: 'bg-purple-500',
  STATUS_CHANGE: 'bg-amber-500',
  PRIORITY_CHANGE: 'bg-red-500',
  ESCALATE: 'bg-red-500',
  SYSTEM: 'bg-gray-500',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  user: 'User',
  client: 'Client',
  transaction: 'Transaction',
  task: 'Task',
  ticket: 'Ticket',
  dispute: 'Dispute',
  kyc_document: 'KYC Document',
  trading_account: 'Trading Account',
  wallet: 'Wallet',
  commission: 'Commission',
  bonus: 'Bonus',
  campaign: 'Campaign',
  ib_profile: 'IB Profile',
  referral: 'Referral',
  calendar_event: 'Calendar Event',
  notification: 'Notification',
  device: 'Device',
  compliance_check: 'Compliance Check',
  audit_log: 'Audit Log',
  system: 'System',
};

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Created' },
  { value: 'UPDATE', label: 'Updated' },
  { value: 'DELETE', label: 'Deleted' },
  { value: 'APPROVE', label: 'Approved' },
  { value: 'REJECT', label: 'Rejected' },
  { value: 'LOGIN', label: 'Logged In' },
  { value: 'LOGOUT', label: 'Logged Out' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'TRADE', label: 'Trade' },
  { value: 'TASK_CREATE', label: 'Task Created' },
  { value: 'TASK_COMPLETE', label: 'Task Completed' },
  { value: 'TICKET_CREATE', label: 'Ticket Created' },
  { value: 'TICKET_REPLY', label: 'Ticket Reply' },
  { value: 'KYC_SUBMIT', label: 'KYC Submitted' },
  { value: 'KYC_APPROVE', label: 'KYC Approved' },
  { value: 'COMMISSION_EARN', label: 'Commission Earned' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'user', label: 'User' },
  { value: 'client', label: 'Client' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'task', label: 'Task' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'dispute', label: 'Dispute' },
  { value: 'kyc_document', label: 'KYC Document' },
  { value: 'trading_account', label: 'Trading Account' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'commission', label: 'Commission' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'system', label: 'System' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getActionIcon(action: string): React.ElementType {
  return ACTION_ICONS[action] || Activity;
}

function getActionColor(action: string): string {
  return ACTION_COLORS[action] || 'bg-gray-500';
}

function formatTimestamp(dateString: string): string {
  const date = parseISO(dateString);
  if (isToday(date)) {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, yyyy h:mm a');
}

function groupActivitiesByDate(activities: ActivityLogEntry[]): Record<string, ActivityLogEntry[]> {
  const grouped: Record<string, ActivityLogEntry[]> = {};
  
  for (const activity of activities) {
    const date = parseISO(activity.createdAt);
    let key: string;
    
    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else {
      key = format(date, 'MMMM d, yyyy');
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(activity);
  }
  
  return grouped;
}

// ============================================
// COMPONENTS
// ============================================

interface ActivityItemProps {
  activity: ActivityLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function ActivityIcon({ action }: { action: string }) {
  const iconProps = { className: 'h-3 w-3' };
  
  switch (action) {
    case 'CREATE': return <Plus {...iconProps} />;
    case 'UPDATE': return <Edit {...iconProps} />;
    case 'DELETE': return <Trash2 {...iconProps} />;
    case 'APPROVE': return <CheckCircle {...iconProps} />;
    case 'REJECT': return <XCircle {...iconProps} />;
    case 'LOGIN': return <LogIn {...iconProps} />;
    case 'LOGOUT': return <LogOut {...iconProps} />;
    case 'VIEW': return <Eye {...iconProps} />;
    case 'EXPORT': return <Download {...iconProps} />;
    case 'IMPORT': return <Upload {...iconProps} />;
    case 'ASSIGN': return <UserPlus {...iconProps} />;
    case 'TRANSFER': return <ArrowRight {...iconProps} />;
    case 'DEPOSIT': return <ArrowDown {...iconProps} />;
    case 'WITHDRAWAL': return <ArrowUp {...iconProps} />;
    case 'TRADE': return <TrendingUp {...iconProps} />;
    case 'KYC_SUBMIT': return <FileText {...iconProps} />;
    case 'KYC_APPROVE': return <Check {...iconProps} />;
    case 'KYC_REJECT': return <X {...iconProps} />;
    case 'TASK_CREATE': return <Clipboard {...iconProps} />;
    case 'TASK_ASSIGN': return <UserCheck {...iconProps} />;
    case 'TASK_COMPLETE': return <CheckSquare {...iconProps} />;
    case 'TICKET_CREATE': return <MessageSquare {...iconProps} />;
    case 'TICKET_REPLY': return <MessageCircle {...iconProps} />;
    case 'TICKET_CLOSE': return <Archive {...iconProps} />;
    case 'COMMISSION_EARN': return <DollarSign {...iconProps} />;
    case 'BONUS_AWARD': return <Gift {...iconProps} />;
    case 'SETTING_CHANGE': return <Settings {...iconProps} />;
    case 'PASSWORD_CHANGE': return <Key {...iconProps} />;
    case 'DEVICE_APPROVE': return <Smartphone {...iconProps} />;
    case 'ALERT_TRIGGER': return <AlertTriangle {...iconProps} />;
    case 'CAMPAIGN_SEND': return <Send {...iconProps} />;
    case 'DOCUMENT_UPLOAD': return <FileUp {...iconProps} />;
    case 'NOTE_ADD': return <FilePlus {...iconProps} />;
    case 'STATUS_CHANGE': return <RefreshCw {...iconProps} />;
    case 'PRIORITY_CHANGE': return <Flag {...iconProps} />;
    case 'ESCALATE': return <ArrowUpCircle {...iconProps} />;
    case 'SYSTEM': return <Server {...iconProps} />;
    default: return <Activity {...iconProps} />;
  }
}

function ActivityItem({ activity, isExpanded, onToggle }: ActivityItemProps) {
  const colorClass = getActionColor(activity.action);
  const entityLabel = ENTITY_TYPE_LABELS[activity.entityType] || activity.entityType;

  const metadata = activity.metadata ? JSON.parse(activity.metadata) : null;

  return (
    <div className="relative pl-8 pb-4">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />

      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center text-white',
          colorClass
        )}
      >
        <ActivityIcon action={activity.action} />
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{activity.title}</h4>
              <Badge variant="outline" className="text-xs">
                {entityLabel}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {activity.action.replace(/_/g, ' ')}
              </Badge>
            </div>

            {activity.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {activity.description}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {activity.userName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {activity.userName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimestamp(activity.createdAt)}
              </span>
            </div>
          </div>

          {(activity.description || metadata) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (activity.description || metadata) && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            {activity.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1">{activity.description}</p>
              </div>
            )}

            {metadata && Object.keys(metadata).length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Metadata</Label>
                <div className="mt-1 bg-muted/50 rounded p-2">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {activity.ipAddress && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>IP: {activity.ipAddress}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
}

function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ActivityTimeline() {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/activity?action=stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch activity stats:', error);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (actionFilter !== 'all') params.append('filterAction', actionFilter);
      if (entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
      if (dateTo) params.append('dateTo', dateTo.toISOString());

      const response = await fetch(`/api/activity?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setActivities(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, entityTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, [fetchStats, fetchActivities]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setActionFilter('all');
    setEntityTypeFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setPage(1);
  };

  const hasActiveFilters = search || actionFilter !== 'all' || entityTypeFilter !== 'all' || dateFrom || dateTo;

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Today"
            value={stats.today}
            icon={Clock}
          />
          <StatsCard
            title="This Week"
            value={stats.thisWeek}
            icon={Calendar}
          />
          <StatsCard
            title="This Month"
            value={stats.thisMonth}
            icon={Activity}
          />
          <StatsCard
            title="Total"
            value={stats.total}
            icon={Server}
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>

              {/* Action Filter */}
              <Select
                value={actionFilter}
                onValueChange={(value) => {
                  setActionFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Entity Type Filter */}
              <Select
                value={entityTypeFilter}
                onValueChange={(value) => {
                  setEntityTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      setPage(1);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      setPage(1);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activities found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date} className="mb-6">
                  <div className="sticky top-0 bg-background z-10 pb-2">
                    <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {date}
                    </h3>
                    <Separator className="mt-2" />
                  </div>
                  <div className="mt-4">
                    {dateActivities.map((activity) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                        isExpanded={expandedIds.has(activity.id)}
                        onToggle={() => toggleExpanded(activity.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Users Card */}
      {stats && stats.topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Top Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topUsers.map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm">{user.userName}</span>
                  </div>
                  <Badge variant="secondary">
                    {user.count} activities
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity by Type Breakdown */}
      {stats && Object.keys(stats.byEntityType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.byEntityType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm truncate">
                      {ENTITY_TYPE_LABELS[type] || type}
                    </span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
