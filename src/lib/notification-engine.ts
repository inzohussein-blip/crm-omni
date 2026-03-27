'use client';

/**
 * OMNI-CRM Notification Engine
 * Real-time notifications via WebSocket + In-app + Email
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';
import type { Notification, NotificationType } from '@/types';

// ============================================
// TYPES
// ============================================

interface NotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
  channels?: ('in_app' | 'push' | 'email')[];
}

// ============================================
// HELPER FUNCTIONS (defined outside component)
// ============================================

function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Ignore errors
  }
}

function playUrgentSound() {
  try {
    const audio = new Audio('/sounds/urgent.mp3');
    audio.volume = 0.8;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Ignore errors
  }
}

function requestBrowserNotification(
  title: string,
  body: string,
  urgent: boolean = false
) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      requireInteraction: urgent,
      tag: urgent ? 'urgent' : 'normal',
    });
  }
}

// ============================================
// NOTIFICATION ENGINE HOOK
// ============================================

export function useNotificationEngine(userId?: string, userType?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  // Event handlers - defined with useCallback
  const handleNewTask = useCallback((task: unknown) => {
    const typedTask = task as { id: string; title: string; priority: string };
    
    playNotificationSound();

    toast({
      title: '📋 New Task',
      description: typedTask.title,
      variant: typedTask.priority === 'CRITICAL' ? 'destructive' : 'default',
    });

    requestBrowserNotification('New Task', typedTask.title);
  }, [toast]);

  const handleTaskUpdate = useCallback((data: unknown) => {
    const typedData = data as { taskId: string; status?: string };
    
    toast({
      title: '✅ Task Updated',
      description: `Task #${typedData.taskId.slice(0, 6)} status changed`,
    });
  }, [toast]);

  const handleSLABreach = useCallback((task: unknown) => {
    const typedTask = task as { id: string; title: string };
    
    playUrgentSound();

    toast({
      title: '⚠️ SLA Breach Alert!',
      description: typedTask.title,
      variant: 'destructive',
    });

    requestBrowserNotification('SLA Breach!', typedTask.title, true);
  }, [toast]);

  const handleTransactionUpdate = useCallback((transaction: unknown) => {
    const typedTransaction = transaction as { type: string; amount: number; currency: string };
    
    toast({
      title: '💰 Transaction Update',
      description: `${typedTransaction.type}: ${typedTransaction.amount} ${typedTransaction.currency}`,
    });
  }, [toast]);

  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    toast({
      title: notification.title,
      description: notification.message,
    });
  }, [toast]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId) return;

    const newSocket = io('/?XTransformPort=3003', {
      path: '/',
      transports: ['websocket'],
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('🔌 Connected to real-time service');
      setIsConnected(true);
      
      newSocket.emit('authenticate', { userId, userType });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from real-time service');
      setIsConnected(false);
    });

    newSocket.on('authenticated', () => {
      console.log('✅ WebSocket authenticated');
    });

    // Handle incoming events
    newSocket.on('new_task', handleNewTask);
    newSocket.on('task_update', handleTaskUpdate);
    newSocket.on('sla_breach', handleSLABreach);
    newSocket.on('transaction_update', handleTransactionUpdate);
    newSocket.on('notification', handleNewNotification);

    // Use queueMicrotask to defer state update
    queueMicrotask(() => {
      setSocket(newSocket);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [userId, userType, handleNewTask, handleTaskUpdate, handleSLABreach, handleTransactionUpdate, handleNewNotification]);

  // Actions
  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    await fetch('/api/notifications/read-all', {
      method: 'POST',
    });
  }, []);

  const joinRoom = useCallback((room: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join_room', room);
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_room', room);
    }
  }, []);

  return {
    socket,
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    joinRoom,
    leaveRoom,
  };
}

// ============================================
// PUSH NOTIFICATION SETUP
// ============================================

export async function setupPushNotifications(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('✅ Push notifications enabled');
    }
  }
}
