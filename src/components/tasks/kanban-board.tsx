'use client';

/**
 * OMNI-CRM Kanban Task Board
 * Drag & Drop Task Management
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Clock,
  AlertTriangle,
  UserPlus,
  GripVertical,
  Plus,
  MoreHorizontal,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import type { Task, TaskStatus, Priority } from '@/types';

// ============================================
// KANBAN CONFIGURATION
// ============================================

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  color: string;
  bgColor: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'NEW', title: 'New', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  { id: 'OPEN', title: 'Open', color: 'text-cyan-600', bgColor: 'bg-cyan-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-500' },
  { id: 'PENDING_INFO', title: 'Pending', color: 'text-orange-600', bgColor: 'bg-orange-500' },
  { id: 'ESCALATED', title: 'Escalated', color: 'text-red-600', bgColor: 'bg-red-500' },
  { id: 'RESOLVED', title: 'Resolved', color: 'text-green-600', bgColor: 'bg-green-500' },
];

const priorityColors: Record<Priority, string> = {
  CRITICAL: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MEDIUM: 'border-l-yellow-500',
  LOW: 'border-l-gray-400',
};

// ============================================
// KANBAN BOARD COMPONENT
// ============================================

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onAssign?: (task: Task) => void;
}

export function KanbanBoard({ tasks, onTaskMove, onTaskClick, onAssign }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((task: Task) => {
    setDraggedTask(task);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== columnId) {
      onTaskMove?.(draggedTask.id, columnId);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  }, [draggedTask, onTaskMove]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
    setDragOverColumn(null);
  }, []);

  // Get tasks for column
  const getTasksForColumn = (status: TaskStatus): Task[] => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-4 h-full min-w-max p-4">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = getTasksForColumn(column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={cn(
                'flex flex-col w-72 shrink-0 rounded-lg bg-muted/30',
                isOver && 'ring-2 ring-primary ring-offset-2'
              )}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={cn(
                'flex items-center justify-between p-3 border-b',
                column.bgColor,
                'text-white rounded-t-lg'
              )}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{column.title}</span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {columnTasks.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
                {columnTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    Drop tasks here
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      isDragging={draggedTask?.id === task.id}
                      onDragStart={() => handleDragStart(task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedTask(task)}
                      onAssign={() => onAssign?.(task)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedTask && <TaskDetail task={selectedTask} onAssign={onAssign} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================
// KANBAN CARD COMPONENT
// ============================================

interface KanbanCardProps {
  task: Task;
  isDragging?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick?: () => void;
  onAssign?: () => void;
}

function KanbanCard({ task, isDragging, onDragStart, onDragEnd, onClick, onAssign }: KanbanCardProps) {
  const slaProgress = task.slaMinutes > 0 
    ? Math.max(0, Math.min(100, ((task.slaRemaining || 0) / task.slaMinutes) * 100))
    : 100;

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all hover:shadow-md',
        isDragging && 'opacity-50 rotate-2',
        'border-l-4',
        priorityColors[task.priority],
        task.isOverdue && 'bg-red-50 dark:bg-red-900/10'
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <span className="font-mono text-xs text-muted-foreground">
              #{task.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {task.priority}
          </Badge>
        </div>

        {/* Title */}
        <p className="font-medium text-sm line-clamp-2">{task.title}</p>

        {/* Category & Source */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {task.category.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {task.platformSource}
          </Badge>
        </div>

        {/* SLA Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">SLA</span>
            <span className={cn(
              'font-medium',
              task.isOverdue ? 'text-red-600' : slaProgress < 30 ? 'text-orange-600' : 'text-green-600'
            )}>
              {task.isOverdue ? 'OVERDUE' : `${task.slaRemaining}m`}
            </span>
          </div>
          <Progress value={slaProgress} className="h-1" />
        </div>

        {/* Assignee */}
        <div className="flex items-center justify-between pt-1">
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {task.assignee.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs truncate max-w-[100px]">{task.assignee.name}</span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onAssign?.();
              }}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Assign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// TASK DETAIL COMPONENT
// ============================================

interface TaskDetailProps {
  task: Task;
  onAssign?: (task: Task) => void;
}

function TaskDetail({ task, onAssign }: TaskDetailProps) {
  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Task ID</p>
          <p className="font-mono">#{task.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge>{task.status}</Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Priority</p>
          <Badge variant={task.priority === 'CRITICAL' ? 'destructive' : 'secondary'}>
            {task.priority}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Category</p>
          <Badge variant="outline">{task.category.replace('_', ' ')}</Badge>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Description</p>
          <p className="text-sm">{task.description}</p>
        </div>
      )}

      {/* SLA Info */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">SLA Status</p>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className={cn(
            'font-medium',
            task.isOverdue ? 'text-red-600' : 'text-green-600'
          )}>
            {task.isOverdue ? 'OVERDUE' : `${task.slaRemaining} minutes remaining`}
          </span>
        </div>
        <Progress 
          value={task.slaMinutes > 0 ? ((task.slaRemaining || 0) / task.slaMinutes) * 100 : 0} 
          className="h-2 mt-2" 
        />
      </div>

      {/* Assignee */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Assigned To</p>
          {task.assignee ? (
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarFallback>{task.assignee.name?.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span>{task.assignee.name}</span>
            </div>
          ) : (
            <p className="text-muted-foreground">Unassigned</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => onAssign?.(task)}>
          {task.assignee ? 'Reassign' : 'Assign'}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button className="flex-1">
          <CheckCircle className="h-4 w-4 mr-2" />
          Mark Resolved
        </Button>
        <Button variant="outline" className="flex-1">
          <ArrowRight className="h-4 w-4 mr-2" />
          Escalate
        </Button>
      </div>
    </div>
  );
}
