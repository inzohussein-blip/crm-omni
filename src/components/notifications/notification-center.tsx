'use client';

/**
 * Notification Center Component
 * Displays all notifications with filtering and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  RefreshCw,
  Filter,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Shield,
  FileCheck,
  Briefcase,
  Gift,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  channels: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  DEPOSIT: <DollarSign className="h-4 w-4 text-green-500" />,
  WITHDRAWAL: <TrendingUp className="h-4 w-4 text-red-500" />,
  TRADE: <TrendingUp className="h-4 w-4 text-blue-500" />,
  KYC: <FileCheck className="h-4 w-4 text-amber-500" />,
  TASK: <Briefcase className="h-4 w-4 text-purple-500" />,
  COMMISSION: <Gift className="h-4 w-4 text-pink-500" />,
  SECURITY: <Shield className="h-4 w-4 text-red-500" />,
  SYSTEM: <Info className="h-4 w-4 text-gray-500" />,
  MARKETING: <Mail className="h-4 w-4 text-orange-500" />,
};

const typeColors: Record<string, string> = {
  DEPOSIT: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  WITHDRAWAL: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  TRADE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  KYC: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  TASK: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  COMMISSION: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400',
  SECURITY: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  SYSTEM: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
  MARKETING: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3" />,
  sms: <MessageSquare className="h-3 w-3" />,
  push: <Smartphone className="h-3 w-3" />,
  in_app: <Globe className="h-3 w-3" />,
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications-advanced?limit=50');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data.notifications as Notification[]);
        }
      }

      // Fetch unread count
      const countResponse = await fetch('/api/notifications-advanced?action=unread_count');
      if (countResponse.ok) {
        const countData = await countResponse.json();
        if (countData.success) {
          setUnreadCount(countData.data.count);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          notificationId,
        }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications-advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_all_read',
          userId: 'demo_user',
        }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
        toast({
          title: 'All notifications marked as read',
        });
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.isRead;
    return n.type === activeTab.toUpperCase();
  });

  const getChannels = (channelsStr: string): string[] => {
    try {
      return JSON.parse(channelsStr);
    } catch {
      return ['in_app'];
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">Notifications</h2>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Filter className="h-4 w-4" />
            All
            <Badge variant="secondary" className="ml-1">{notifications.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            <BellOff className="h-4 w-4" />
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="deposit" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Deposits
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BellOff className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No notifications</p>
                    <p className="text-sm">
                      {activeTab === 'unread'
                        ? "You've read all your notifications"
                        : 'No notifications to display'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-4 hover:bg-muted/50 transition-colors cursor-pointer',
                          !notification.isRead && 'bg-blue-50/50 dark:bg-blue-900/10'
                        )}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div
                            className={cn(
                              'p-2 rounded-full',
                              typeColors[notification.type] || 'bg-gray-100 dark:bg-gray-900/30'
                            )}
                          >
                            {typeIcons[notification.type] || <Info className="h-4 w-4" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{notification.title}</span>
                              {!notification.isRead && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              <div className="flex items-center gap-1">
                                {getChannels(notification.channels).map((channel) => (
                                  <span key={channel} className="text-muted-foreground">
                                    {channelIcons[channel]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
