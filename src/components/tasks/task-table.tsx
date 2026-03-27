'use client';

/**
 * OMNI-CRM Smart Task Table
 * Action-Oriented Task Manager with Real-time Updates and Visual Alerts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  UserPlus,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Filter,
  Bell,
  BellRing,
  Zap,
  Activity,
} from 'lucide-react';
import type { Task, TaskStatus, Priority, TaskCategory, PlatformSource } from '@/types';

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  NEW: { label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  OPEN: { label: 'Open', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  PENDING_INFO: { label: 'Pending Info', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  ESCALATED: { label: 'Escalated', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  RESOLVED: { label: 'Resolved', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  CLOSED: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800/30' },
};

const priorityConfig: Record<Priority, { label: string; color: string; icon: typeof ArrowUp }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-600', icon: ArrowUp },
  HIGH: { label: 'High', color: 'text-orange-600', icon: ArrowUp },
  MEDIUM: { label: 'Medium', color: 'text-yellow-600', icon: ArrowUp },
  LOW: { label: 'Low', color: 'text-gray-600', icon: ArrowDown },
};

const categoryConfig: Record<TaskCategory, { label: string }> = {
  KYC_VERIFICATION: { label: 'KYC' },
  DEPOSIT: { label: 'Deposit' },
  WITHDRAWAL: { label: 'Withdrawal' },
  ACCOUNT_OPENING: { label: 'Account' },
  SUPPORT: { label: 'Support' },
  COMPLAINT: { label: 'Complaint' },
  COMPLIANCE: { label: 'Compliance' },
  OTHER: { label: 'Other' },
};

const sourceConfig: Record<PlatformSource, { label: string }> = {
  WEB: { label: 'Web' },
  MOBILE_APP: { label: 'Mobile' },
  MT4: { label: 'MT4' },
  MT5: { label: 'MT5' },
  API: { label: 'API' },
  EMAIL: { label: 'Email' },
  CHAT: { label: 'Chat' },
  PHONE: { label: 'Phone' },
};

// ============================================
// SLA VISUAL ALERT COMPONENT
// ============================================

interface SLAAlertProps {
  slaRemaining: number;
  slaMinutes: number;
  slaDeadline?: string;
  isOverdue: boolean;
}

function SLAAlert({ slaRemaining, slaMinutes, slaDeadline, isOverdue }: SLAAlertProps) {
  const [isPulsing, setIsPulsing] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  
  // Calculate urgency level
  const urgencyLevel = (() => {
    if (isOverdue || slaRemaining <= 0) return 'critical';
    if (slaRemaining <= 10) return 'urgent';
    if (slaRemaining <= 30) return 'warning';
    return 'normal';
  })();

  // Pulsing effect for urgent tasks
  useEffect(() => {
    if (urgencyLevel === 'critical' || urgencyLevel === 'urgent') {
      const interval = setInterval(() => {
        setIsPulsing(prev => !prev);
      }, urgencyLevel === 'critical' ? 500 : 1000);
      return () => {
        clearInterval(interval);
        setIsPulsing(false);
      };
    }
    return () => {
      setIsPulsing(false);
    };
  }, [urgencyLevel]);

  // Show warning notification
  useEffect(() => {
    if (urgencyLevel === 'urgent' && slaRemaining <= 10) {
      const timeout = setTimeout(() => setShowWarning(true), 1000);
      return () => clearTimeout(timeout);
    }
  }, [urgencyLevel, slaRemaining]);

  const formatSLA = (minutes: number) => {
    if (minutes <= 0) return { text: 'OVERDUE!', color: 'text-red-600' };
    if (minutes < 60) return { text: `${minutes}m`, color: minutes <= 10 ? 'text-red-600' : 'text-orange-600' };
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return { 
      text: `${hours}h ${mins}m`, 
      color: hours < 1 ? 'text-orange-600' : hours < 2 ? 'text-yellow-600' : 'text-green-600' 
    };
  };

  const slaDisplay = formatSLA(slaRemaining);
  const slaProgress = slaMinutes > 0 
    ? Math.max(0, Math.min(100, (slaRemaining / slaMinutes) * 100))
    : 0;

  // Progress bar color based on urgency
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
          <div className={cn(
            'space-y-1 p-1 rounded',
            isPulsing && urgencyLevel === 'critical' && 'bg-red-100 dark:bg-red-900/50 animate-pulse',
            isPulsing && urgencyLevel === 'urgent' && 'bg-orange-100 dark:bg-orange-900/50'
          )}>
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
              {urgencyLevel === 'critical' && (
                <Zap className="h-3 w-3 text-red-600 animate-pulse" />
              )}
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={cn('h-full transition-all duration-1000', progressColor)}
                style={{ width: `${slaProgress}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">
              {urgencyLevel === 'critical' ? '🚨 CRITICAL - SLA Breached!' :
               urgencyLevel === 'urgent' ? '⚠️ URGENT - Action Required!' :
               urgencyLevel === 'warning' ? '⏰ Warning - Time Limited' :
               '✅ On Track'}
            </p>
            <p>SLA: {slaMinutes} minutes</p>
            <p>Deadline: {slaDeadline ? new Date(slaDeadline).toLocaleString() : 'N/A'}</p>
            {urgencyLevel === 'critical' && (
              <p className="text-red-400 font-medium">Immediate action required!</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// TASK TABLE COMPONENT
// ============================================

interface TaskTableProps {
  tasks: Task[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onView?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onAssign?: (task: Task) => void;
  enableRealTime?: boolean;
  pollInterval?: number; // in milliseconds
}

export function TaskTable({
  tasks: initialTasks,
  isLoading,
  onRefresh,
  onView,
  onEdit,
  onStatusChange,
  onAssign,
  enableRealTime = true,
  pollInterval = 5000,
}: TaskTableProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [sortField, setSortField] = useState<'priorityScore' | 'slaRemaining' | 'createdAt'>('priorityScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [liveIndicator, setLiveIndicator] = useState(false);
  const pollCountRef = useRef(0);

  // Update tasks when props change
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Real-time polling
  useEffect(() => {
    if (!enableRealTime) return;

    const pollTasks = async () => {
      try {
        const response = await fetch('/api/tasks?limit=20');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.tasks) {
            setTasks(prevTasks => {
              // Check if there are new/changed tasks
              const hasChanges = JSON.stringify(prevTasks) !== JSON.stringify(data.data.tasks);
              if (hasChanges) {
                // Flash the live indicator
                setLiveIndicator(true);
                setTimeout(() => setLiveIndicator(false), 500);
              }
              return data.data.tasks;
            });
          }
        }
        pollCountRef.current++;
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    const interval = setInterval(pollTasks, pollInterval);
    return () => clearInterval(interval);
  }, [enableRealTime, pollInterval]);

  // Update SLA remaining every minute
  useEffect(() => {
    const updateSLA = () => {
      setTasks(prevTasks => 
        prevTasks.map(task => {
          if (!task.slaDeadline) return task;
          const remaining = Math.max(0, Math.floor((new Date(task.slaDeadline).getTime() - Date.now()) / 1000 / 60));
          return {
            ...task,
            slaRemaining: remaining,
            isOverdue: remaining === 0 && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(task.status),
          };
        })
      );
    };

    const interval = setInterval(updateSLA, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const sortedTasks = [...tasks].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    return sortDirection === 'desc' ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal);
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Count overdue tasks
  const overdueCount = tasks.filter(t => t.isOverdue).length;
  const criticalCount = tasks.filter(t => t.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(t.status)).length;

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Tasks</h3>
          <Badge variant="secondary">{tasks.length}</Badge>
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
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          {enableRealTime && (
            <div className={cn(
              'flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all',
              liveIndicator 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            )}>
              <Activity className={cn('h-3 w-3', liveIndicator && 'animate-pulse')} />
              Live
            </div>
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Task ID</TableHead>
              <TableHead className="w-[60px]">
                <button
                  onClick={() => handleSort('priorityScore')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Priority
                  {sortField === 'priorityScore' && (
                    sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </TableHead>
              <TableHead>Title / Category</TableHead>
              <TableHead className="w-[100px]">Source</TableHead>
              <TableHead className="w-[140px]">Assigned Agent</TableHead>
              <TableHead className="w-[140px]">
                <button
                  onClick={() => handleSort('slaRemaining')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  SLA Countdown
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
            {sortedTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              sortedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onView={onView}
                  onEdit={onEdit}
                  onStatusChange={onStatusChange}
                  onAssign={onAssign}
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
// TASK ROW COMPONENT
// ============================================

interface TaskRowProps {
  task: Task;
  onView?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onAssign?: (task: Task) => void;
}

function TaskRow({ task, onView, onEdit, onStatusChange, onAssign }: TaskRowProps) {
  const status = statusConfig[task.status];
  const priority = priorityConfig[task.priority];
  const category = categoryConfig[task.category];
  const source = sourceConfig[task.platformSource];
  const PriorityIcon = priority.icon;

  // Determine row highlight based on urgency
  const rowHighlight = (() => {
    if (task.isOverdue) return 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500';
    if (task.priority === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(task.status)) {
      return 'bg-orange-50 dark:bg-orange-900/10 border-l-4 border-l-orange-500';
    }
    return '';
  })();

  return (
    <TableRow className={cn(
      'hover:bg-muted/30 transition-colors',
      rowHighlight
    )}>
      {/* Task ID */}
      <TableCell className="font-mono text-xs">
        #{task.id.slice(0, 6).toUpperCase()}
      </TableCell>

      {/* Priority */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className={cn(
                'flex items-center justify-center rounded-lg p-1.5',
                task.priority === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/30' :
                task.priority === 'HIGH' ? 'bg-orange-100 dark:bg-orange-900/30' :
                task.priority === 'MEDIUM' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                'bg-gray-100 dark:bg-gray-800/30'
              )}>
                <PriorityIcon className={cn('h-4 w-4', priority.color)} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{priority.label} Priority (Score: {task.priorityScore})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Title / Category */}
      <TableCell>
        <div className="space-y-1">
          <p className="font-medium text-sm truncate max-w-[200px]">{task.title}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {category.label}
            </Badge>
            {task.sourceReference && (
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                Ref: {task.sourceReference}
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* Source */}
      <TableCell>
        <Badge variant="secondary" className="text-xs">
          {source.label}
        </Badge>
      </TableCell>

      {/* Assigned Agent */}
      <TableCell>
        {task.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assignee.avatar} />
              <AvatarFallback className="text-xs">
                {task.assignee.name?.slice(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate max-w-[80px]">{task.assignee.name}</span>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => onAssign?.(task)}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Assign
          </Button>
        )}
      </TableCell>

      {/* SLA Countdown with Visual Alerts */}
      <TableCell>
        <SLAAlert
          slaRemaining={task.slaRemaining || 0}
          slaMinutes={task.slaMinutes}
          slaDeadline={task.slaDeadline}
          isOverdue={task.isOverdue || false}
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
            <DropdownMenuItem onClick={() => onView?.(task)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(task)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssign?.(task)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {task.assignee ? 'Reassign' : 'Assign'}
            </DropdownMenuItem>
            {task.status !== 'RESOLVED' && task.status !== 'CLOSED' && (
              <DropdownMenuItem onClick={() => onStatusChange?.(task.id, 'RESOLVED')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Resolved
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
