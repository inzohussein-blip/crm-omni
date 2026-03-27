'use client';

/**
 * OMNI-CRM SLA Alert System
 * Visual and Audio alerts for SLA breaches
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============================================
// TYPES
// ============================================

interface SLATask {
  id: string;
  title: string;
  priority: string;
  slaRemaining: number;
  slaDeadline?: string;
  isOverdue: boolean;
}

interface SLAAlertProps {
  tasks: SLATask[];
  onDismiss?: (taskId: string) => void;
  onTakeAction?: (taskId: string) => void;
}

// ============================================
// SLA ALERT COMPONENT
// ============================================

export function SLAAlertSystem({ tasks, onDismiss, onTakeAction }: SLAAlertProps) {
  const [alertedTasks, setAlertedTasks] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SLATask | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play alert sound - defined with useCallback to avoid hoisting issues
  const playAlertSound = useCallback((urgent: boolean) => {
    try {
      const soundPath = urgent ? '/sounds/urgent.mp3' : '/sounds/warning.mp3';
      const audio = new Audio(soundPath);
      audio.volume = urgent ? 0.9 : 0.5;
      audio.play().catch(() => {
        // Ignore autoplay restrictions
      });
    } catch {
      // Ignore errors
    }
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((task: SLATask) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const title = task.isOverdue ? 'SLA BREACH!' : 'SLA Warning';
      const body = `${task.title}\n${task.isOverdue ? 'Overdue' : `${task.slaRemaining} minutes remaining`}`;
      
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: task.id,
        requireInteraction: true,
      });
    }
  }, []);

  // Check for SLA breaches - using a ref to track if we've already processed
  const processingRef = useRef(false);
  
  useEffect(() => {
    const criticalTasks = tasks.filter(
      task => (task.slaRemaining <= 10 || task.isOverdue) && !alertedTasks.has(task.id)
    );

    if (criticalTasks.length > 0 && !processingRef.current) {
      processingRef.current = true;
      // Show alert for the first critical task
      const task = criticalTasks[0];
      
      // Use queueMicrotask to defer state updates
      queueMicrotask(() => {
        setCurrentAlert(task);
        setShowDialog(true);
        setAlertedTasks(prev => new Set([...prev, task.id]));

        // Play sound
        if (soundEnabled) {
          playAlertSound(task.isOverdue);
        }

        // Browser notification
        sendBrowserNotification(task);
        processingRef.current = false;
      });
    }
  }, [tasks, alertedTasks, soundEnabled, playAlertSound, sendBrowserNotification]);

  // Handle dismiss
  const handleDismiss = () => {
    if (currentAlert) {
      onDismiss?.(currentAlert.id);
    }
    setShowDialog(false);
    setCurrentAlert(null);
  };

  // Handle take action
  const handleTakeAction = () => {
    if (currentAlert) {
      onTakeAction?.(currentAlert.id);
    }
    setShowDialog(false);
    setCurrentAlert(null);
  };

  return (
    <>
      {/* Audio element for alerts */}
      <audio ref={audioRef} preload="auto" />

      {/* Alert Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className={cn(
          currentAlert?.isOverdue && 'border-red-500 bg-red-50 dark:bg-red-950'
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn(
                'h-5 w-5',
                currentAlert?.isOverdue ? 'text-red-600' : 'text-amber-600'
              )} />
              {currentAlert?.isOverdue ? 'SLA BREACH!' : 'SLA Warning'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentAlert?.isOverdue ? (
                <span className="text-red-600 font-medium">
                  This task has exceeded its SLA deadline and requires immediate attention.
                </span>
              ) : (
                <span>
                  This task has only {currentAlert?.slaRemaining} minutes remaining before SLA breach.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {currentAlert && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="font-medium">{currentAlert.title}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant={
                  currentAlert.priority === 'CRITICAL' ? 'destructive' :
                  currentAlert.priority === 'HIGH' ? 'default' : 'secondary'
                }>
                  {currentAlert.priority}
                </Badge>
                <Badge variant="outline">
                  #{currentAlert.id.slice(0, 6)}
                </Badge>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleDismiss} className="bg-muted text-foreground">
              Dismiss
            </AlertDialogAction>
            <AlertDialogAction onClick={handleTakeAction}>
              Take Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sound Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setSoundEnabled(!soundEnabled)}
      >
        {soundEnabled ? (
          <BellRing className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </>
  );
}

// ============================================
// SLA INDICATOR COMPONENT
// ============================================

interface SLAIndicatorProps {
  remaining: number;
  total: number;
  isOverdue: boolean;
  showLabel?: boolean;
}

export function SLAIndicator({ remaining, total, isOverdue, showLabel = true }: SLAIndicatorProps) {
  const percentage = isOverdue ? 0 : Math.max(0, Math.min(100, (remaining / total) * 100));
  
  const getStatusColor = () => {
    if (isOverdue) return 'bg-red-500';
    if (percentage < 20) return 'bg-red-500';
    if (percentage < 50) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const formatTime = (minutes: number) => {
    if (minutes <= 0) return 'Overdue';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        {showLabel && (
          <span className={cn(
            'text-xs font-medium',
            isOverdue ? 'text-red-600' : percentage < 50 ? 'text-amber-600' : 'text-green-600'
          )}>
            {isOverdue ? 'OVERDUE' : formatTime(remaining)}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', getStatusColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// SLA BADGE COMPONENT
// ============================================

interface SLABadgeProps {
  remaining: number;
  isOverdue: boolean;
}

export function SLABadge({ remaining, isOverdue }: SLABadgeProps) {
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="animate-pulse">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Overdue
      </Badge>
    );
  }

  if (remaining <= 10) {
    return (
      <Badge variant="destructive">
        {remaining}m left
      </Badge>
    );
  }

  if (remaining <= 30) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {remaining}m left
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-green-600 border-green-600">
      {remaining >= 60 ? `${Math.floor(remaining / 60)}h ${remaining % 60}m` : `${remaining}m`} left
    </Badge>
  );
}
