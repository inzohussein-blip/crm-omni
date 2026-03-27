'use client';

/**
 * OMNI-CRM Support Ticket List
 * Displays a list of support tickets with filtering and sorting
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Ticket,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  UserPlus,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Filter,
  Search,
  MessageSquare,
  Zap,
  Bell,
  BellRing,
} from 'lucide-react';
import type { SupportTicket, TicketStatus, Priority, TicketCategory } from '@/types';

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig: Record<TicketStatus, { label: string; color: string; bgColor: string }> = {
  OPEN: { label: 'Open', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  WAITING_CUSTOMER: { label: 'Waiting', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  WAITING_THIRD_PARTY: { label: 'Third Party', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  ESCALATED: { label: 'Escalated', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  RESOLVED: { label: 'Resolved', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  CLOSED: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
};

const priorityConfig: Record<Priority, { label: string; color: string; icon: typeof ArrowUp }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-600', icon: ArrowUp },
  HIGH: { label: 'High', color: 'text-orange-600', icon: ArrowUp },
  MEDIUM: { label: 'Medium', color: 'text-yellow-600', icon: ArrowUp },
  LOW: { label: 'Low', color: 'text-gray-600', icon: ArrowDown },
};

const categoryConfig: Record<TicketCategory, { label: string }> = {
  GENERAL: { label: 'General' },
  TECHNICAL: { label: 'Technical' },
  ACCOUNT: { label: 'Account' },
  DEPOSIT: { label: 'Deposit' },
  WITHDRAWAL: { label: 'Withdrawal' },
  TRADING: { label: 'Trading' },
  COMPLIANCE: { label: 'Compliance' },
  COMPLAINT: { label: 'Complaint' },
  IB_RELATED: { label: 'IB' },
};

// ============================================
// SLA INDICATOR COMPONENT
// ============================================

interface SLAIndicatorProps {
  slaRemaining?: number;
  slaMinutes: number;
  slaDeadline?: string;
  isOverdue?: boolean;
}

function SLAIndicator({ slaRemaining = 0, slaMinutes, slaDeadline, isOverdue }: SLAIndicatorProps) {
  const urgencyLevel = (() => {
    if (isOverdue || slaRemaining <= 0) return 'critical';
    if (slaRemaining <= 30) return 'urgent';
    if (slaRemaining <= 60) return 'warning';
    return 'normal';
  })();

  const formatSLA = (minutes: number) => {
    if (minutes <= 0) return { text: 'OVERDUE', color: 'text-red-600' };
    if (minutes < 60) return { text: `${minutes}m`, color: minutes <= 30 ? 'text-red-600' : 'text-orange-600' };
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { 
      text: `${hours}h ${mins}m`, 
      color: hours < 1 ? 'text-orange-600' : 'text-green-600' 
    };
  };

  const slaDisplay = formatSLA(slaRemaining);
  const slaProgress = slaMinutes > 0 
    ? Math.max(0, Math.min(100, (slaRemaining / slaMinutes) * 100))
    : 0;

  const progressColor = (() => {
    if (urgencyLevel === 'critical') return 'bg-red-500';
    if (urgencyLevel === 'urgent') return 'bg-orange-500';
    if (urgencyLevel === 'warning') return 'bg-yellow-500';
    return 'bg-green-500';
  })();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1 min-w-[100px]">
            <div className="flex items-center gap-1">
              {urgencyLevel === 'critical' ? (
                <BellRing className="h-3 w-3 text-red-600 animate-bounce" />
              ) : urgencyLevel === 'urgent' ? (
                <Bell className="h-3 w-3 text-orange-600" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span className={cn('text-sm font-bold', slaDisplay.color)}>
                {slaDisplay.text}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={cn('h-full transition-all', progressColor)}
                style={{ width: `${slaProgress}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>SLA: {slaMinutes} minutes</p>
            {slaDeadline && <p>Deadline: {new Date(slaDeadline).toLocaleString()}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// TICKET LIST COMPONENT
// ============================================

interface TicketListProps {
  tickets: SupportTicket[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onViewTicket?: (ticket: SupportTicket) => void;
  onAssignTicket?: (ticket: SupportTicket) => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
  enableRealTime?: boolean;
}

export function TicketList({
  tickets: initialTickets,
  isLoading,
  onRefresh,
  onViewTicket,
  onAssignTicket,
  onStatusChange,
  enableRealTime = true,
}: TicketListProps) {
  const [tickets, setTickets] = useState(initialTickets);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'createdAt' | 'priority' | 'slaRemaining'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Update tickets when props change
  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.user?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort tickets
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'priority') {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      aVal = priorityOrder[a.priority];
      bVal = priorityOrder[b.priority];
    }

    if (sortField === 'slaRemaining') {
      aVal = a.slaRemaining ?? 9999;
      bVal = b.slaRemaining ?? 9999;
    }

    if (sortField === 'createdAt') {
      aVal = new Date(a.createdAt).getTime();
      bVal = new Date(b.createdAt).getTime();
    }

    return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Count statistics
  const overdueCount = tickets.filter(t => t.isOverdue).length;
  const criticalCount = tickets.filter(t => t.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(t.status)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Support Tickets</h3>
            <Badge variant="secondary">{tickets.length}</Badge>
            {overdueCount > 0 && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} Overdue
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 gap-1">
                <Zap className="h-3 w-3" />
                {criticalCount} Critical
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(statusConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[120px]">Ticket #</TableHead>
              <TableHead className="w-[80px]">
                <button
                  onClick={() => handleSort('priority')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Priority
                  {sortField === 'priority' && (
                    sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
              <TableHead>Subject / Client</TableHead>
              <TableHead className="w-[120px]">Category</TableHead>
              <TableHead className="w-[140px]">Assignee</TableHead>
              <TableHead className="w-[130px]">
                <button
                  onClick={() => handleSort('slaRemaining')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  SLA
                  {sortField === 'slaRemaining' && (
                    sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No tickets found</p>
                </TableCell>
              </TableRow>
            ) : (
              sortedTickets.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  onView={onViewTicket}
                  onAssign={onAssignTicket}
                  onStatusChange={onStatusChange}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ============================================
// TICKET ROW COMPONENT
// ============================================

interface TicketRowProps {
  ticket: SupportTicket;
  onView?: (ticket: SupportTicket) => void;
  onAssign?: (ticket: SupportTicket) => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => void;
}

function TicketRow({ ticket, onView, onAssign, onStatusChange }: TicketRowProps) {
  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];
  const category = categoryConfig[ticket.category];
  const PriorityIcon = priority.icon;

  const rowHighlight = (() => {
    if (ticket.isOverdue) return 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500';
    if (ticket.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-l-orange-500';
    }
    return '';
  })();

  return (
    <TableRow className={cn('hover:bg-muted/30 transition-colors', rowHighlight)}>
      {/* Ticket Number */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm font-medium">{ticket.ticketNumber}</span>
        </div>
      </TableCell>

      {/* Priority */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className={cn(
                'flex items-center justify-center rounded-lg p-1.5',
                ticket.priority === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30' :
                ticket.priority === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30' :
                ticket.priority === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                'bg-gray-100 dark:bg-gray-800/30'
              )}>
                <PriorityIcon className={cn('h-4 w-4', priority.color)} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{priority.label} Priority</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Subject / Client */}
      <TableCell>
        <div className="space-y-1">
          <p className="font-medium text-sm truncate max-w-[200px]">{ticket.subject}</p>
          <div className="flex items-center gap-2">
            {ticket.user && (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={ticket.user.avatar} />
                  <AvatarFallback className="text-[8px]">
                    {ticket.user.name?.slice(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {ticket.user.name}
                </span>
              </div>
            )}
            {ticket._count && ticket._count.messages > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                {ticket._count.messages}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Category */}
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {category.label}
        </Badge>
      </TableCell>

      {/* Assignee */}
      <TableCell>
        {ticket.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={ticket.assignee.avatar} />
              <AvatarFallback className="text-xs">
                {ticket.assignee.name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-[80px]">{ticket.assignee.name}</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => onAssign?.(ticket)}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Assign
          </Button>
        )}
      </TableCell>

      {/* SLA */}
      <TableCell>
        <SLAIndicator
          slaRemaining={ticket.slaRemaining}
          slaMinutes={ticket.slaMinutes}
          slaDeadline={ticket.slaDeadline}
          isOverdue={ticket.isOverdue}
        />
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge className={cn(status.bgColor, status.color, 'font-medium')}>
          {status.label}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView?.(ticket)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssign?.(ticket)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {ticket.assignee ? 'Reassign' : 'Assign'}
            </DropdownMenuItem>
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <DropdownMenuItem onClick={() => onStatusChange?.(ticket.id, 'RESOLVED')}>
                <Ticket className="h-4 w-4 mr-2" />
                Mark Resolved
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default TicketList;
