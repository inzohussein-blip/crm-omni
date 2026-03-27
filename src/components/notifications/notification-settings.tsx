'use client';

/**
 * Notification Settings Component
 * User preferences for notification channels and types
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  depositAlerts: boolean;
  withdrawalAlerts: boolean;
  tradeAlerts: boolean;
  kycAlerts: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

const defaultPreferences: NotificationPreferences = {
  userId: '',
  email: true,
  sms: true,
  push: true,
  inApp: true,
  depositAlerts: true,
  withdrawalAlerts: true,
  tradeAlerts: true,
  kycAlerts: true,
  marketingEmails: false,
  securityAlerts: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: 'UTC',
};

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications-advanced?action=preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPreferences({ ...defaultPreferences, ...data.data });
        }
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTimeChange = (key: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/notifications-advanced', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo_user',
          preferences,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Settings Saved',
          description: 'Your notification preferences have been updated.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save preferences.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Settings</h2>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>
        <Button onClick={savePreferences} disabled={isSaving}>
          {isSaving ? (
            <span className="animate-spin mr-2">⏳</span>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels" className="gap-2">
            <Bell className="h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Alert Types
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Clock className="h-4 w-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Receive notifications via email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="email-toggle">Enable Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Get important updates delivered to your inbox
                    </p>
                  </div>
                  <Switch
                    id="email-toggle"
                    checked={preferences.email}
                    onCheckedChange={() => handleToggle('email')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-500" />
                  SMS Notifications
                </CardTitle>
                <CardDescription>
                  Receive notifications via SMS text message
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sms-toggle">Enable SMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Get urgent alerts on your phone
                    </p>
                  </div>
                  <Switch
                    id="sms-toggle"
                    checked={preferences.sms}
                    onCheckedChange={() => handleToggle('sms')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-purple-500" />
                  Push Notifications
                </CardTitle>
                <CardDescription>
                  Receive push notifications on your devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="push-toggle">Enable Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Instant alerts on desktop and mobile
                    </p>
                  </div>
                  <Switch
                    id="push-toggle"
                    checked={preferences.push}
                    onCheckedChange={() => handleToggle('push')}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-orange-500" />
                  In-App Notifications
                </CardTitle>
                <CardDescription>
                  Notifications within the OMNI-CRM platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="inapp-toggle">Enable In-App</Label>
                    <p className="text-sm text-muted-foreground">
                      See notifications when logged in
                    </p>
                  </div>
                  <Switch
                    id="inapp-toggle"
                    checked={preferences.inApp}
                    onCheckedChange={() => handleToggle('inApp')}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alert Types Tab */}
        <TabsContent value="types">
          <Card>
            <CardHeader>
              <CardTitle>Alert Categories</CardTitle>
              <CardDescription>
                Choose which types of alerts you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <Label className="font-medium">Deposit Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications when deposits are credited
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.depositAlerts}
                  onCheckedChange={() => handleToggle('depositAlerts')}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <Label className="font-medium">Withdrawal Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications when withdrawals are processed
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.withdrawalAlerts}
                  onCheckedChange={() => handleToggle('withdrawalAlerts')}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <Label className="font-medium">Trade Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Trading activity and position alerts
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.tradeAlerts}
                  onCheckedChange={() => handleToggle('tradeAlerts')}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <CheckCircle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <Label className="font-medium">KYC Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Document verification updates
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.kycAlerts}
                  onCheckedChange={() => handleToggle('kycAlerts')}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <Label className="font-medium">Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Login attempts and security events
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.securityAlerts}
                  onCheckedChange={() => handleToggle('securityAlerts')}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30">
                    <Mail className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <Label className="font-medium">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Promotions, offers, and newsletters
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.marketingEmails}
                  onCheckedChange={() => handleToggle('marketingEmails')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Quiet Hours
              </CardTitle>
              <CardDescription>
                Set times when you don&apos;t want to be disturbed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={preferences.quietHoursStart || '22:00'}
                    onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Notifications will be held after this time
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={preferences.quietHoursEnd || '07:00'}
                    onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Notifications will resume at this time
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      Important Note
                    </p>
                    <p className="text-sm text-amber-600/80 dark:text-amber-400/80">
                      Security alerts will always be delivered immediately, even during quiet hours.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Badge variant="outline">Current Timezone: {preferences.timezone || 'UTC'}</Badge>
                <p className="text-sm text-muted-foreground">
                  Times are in your local timezone
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
