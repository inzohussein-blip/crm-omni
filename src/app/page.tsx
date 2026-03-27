'use client';

/**
 * OMNI-CRM Main Dashboard
 * Integration Setup and Client Portal
 */

import { useEffect, useState } from 'react';
import { IntegrationSetup } from '@/components/setup/integration-setup';
import { ClientPortal } from '@/components/portal/client-portal';
import { Sidebar } from '@/components/layout/sidebar';
import { DashboardHeader } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Server,
  CreditCard,
  Shield,
  CheckCircle2,
  ArrowRight,
  Wallet,
  BarChart3,
  Bell,
  Calendar
} from 'lucide-react';

// ============================================
// MAIN DASHBOARD PAGE
// ============================================

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<any>(null);
  const [tradingStatus, setTradingStatus] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [dashboardRes, tradingRes] = await Promise.all([
          fetch('/api/dashboard?period=today').then(r => r.json()),
          fetch('/api/trading/status').then(r => r.json()),
        ]);

        if (!mounted) return;
        if (dashboardRes?.success) setMetrics(dashboardRes.data);
        if (tradingRes?.success) setTradingStatus(tradingRes.data);
      } catch {
        // ignore - keep last good values
      }
    };

    load();
    const t = setInterval(load, 10000);

    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const formatUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  const pendingTasks =
    (metrics?.tasks?.byStatus?.new || 0) +
    (metrics?.tasks?.byStatus?.inProgress || 0);

  const mt4Connected = tradingStatus?.mt4?.connected;
  const mt5Connected = tradingStatus?.mt5?.connected;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DashboardHeader
          title="OMNI-CRM Dashboard"
          subtitle="Tier-1 Forex Brokerage Management System"
        />

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="setup" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Setup
              </TabsTrigger>
              <TabsTrigger value="portal" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Client Portal
              </TabsTrigger>
              <TabsTrigger value="connections" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Connections
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards (Live) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">إجمالي الإيداعات (اليوم)</p>
                        <p className="text-2xl font-bold">{formatUSD(metrics?.transactions?.deposits || 0)}</p>
                        <p className="text-xs text-muted-foreground mt-1">آخر تحديث: {metrics?.meta?.lastUpdated ? new Date(metrics.meta.lastUpdated).toLocaleTimeString() : '--'}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-emerald-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">حجم التداول (Lots)</p>
                        <p className="text-2xl font-bold">{Number(metrics?.bookAnalytics?.totalVolume || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground mt-1">A-Book + B-Book</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">المهام المعلقة</p>
                        <p className="text-2xl font-bold">{pendingTasks}</p>
                        <p className="text-xs text-muted-foreground mt-1">New + In Progress</p>
                      </div>
                      <Bell className="h-8 w-8 text-primary opacity-80" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">اتصال MT4 / MT5</p>
                        <p className="text-2xl font-bold">
                          <span className={mt4Connected ? 'text-green-600' : 'text-red-600'}>MT4</span>
                          <span className="text-muted-foreground"> / </span>
                          <span className={mt5Connected ? 'text-green-600' : 'text-red-600'}>MT5</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Accounts: {tradingStatus?.meta?.activeAccounts ?? '--'}</p>
                      </div>
                      <Server className="h-8 w-8 text-blue-500 opacity-80" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Integration Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Integration Status
                  </CardTitle>
                  <CardDescription>
                    Current connection status for all integrated systems
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: 'MT4 Server', status: 'connected', icon: Server },
                      { name: 'MT5 Server', status: 'connected', icon: Server },
                      { name: 'Crypto Gateway', status: 'connected', icon: Wallet },
                      { name: 'Bank Transfer', status: 'pending', icon: CreditCard },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.name} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <Badge 
                              className={
                                item.status === 'connected' 
                                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                  : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                              }
                            >
                              {item.status}
                            </Badge>
                          </div>
                          {item.status === 'connected' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setActiveTab('setup')}>
                              Setup
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('setup')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Configure System</h3>
                        <p className="text-sm text-muted-foreground">Set up integrations</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('portal')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <Users className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Client Portal</h3>
                        <p className="text-sm text-muted-foreground">View client dashboard</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <Shield className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Security Center</h3>
                        <p className="text-sm text-muted-foreground">Manage security settings</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { action: 'New client registration', user: 'john.doe@email.com', time: '2 minutes ago', type: 'client' },
                      { action: 'Deposit completed', user: 'Account #123456', time: '15 minutes ago', type: 'deposit' },
                      { action: 'KYC approved', user: 'jane.smith@email.com', time: '1 hour ago', type: 'kyc' },
                      { action: 'Withdrawal request', user: 'Account #789012', time: '2 hours ago', type: 'withdrawal' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg">
                        <div className={`p-2 rounded-lg ${
                          activity.type === 'deposit' ? 'bg-green-500/10' :
                          activity.type === 'withdrawal' ? 'bg-red-500/10' :
                          activity.type === 'kyc' ? 'bg-blue-500/10' :
                          'bg-muted'
                        }`}>
                          {activity.type === 'deposit' ? <DollarSign className="h-4 w-4 text-green-500" /> :
                           activity.type === 'withdrawal' ? <DollarSign className="h-4 w-4 text-red-500" /> :
                           activity.type === 'kyc' ? <Shield className="h-4 w-4 text-blue-500" /> :
                           <Users className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.user}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Setup Tab */}
            <TabsContent value="setup">
              <IntegrationSetup />
            </TabsContent>

            {/* Client Portal Tab */}
            <TabsContent value="portal">
              <ClientPortal userId="demo_user" />
            </TabsContent>

            {/* Connections Tab */}
            <TabsContent value="connections" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Trading Platform Connections
                  </CardTitle>
                  <CardDescription>
                    MetaTrader server connections and sync status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">MT4 Server</h4>
                        <Badge className="bg-green-500/10 text-green-500">Connected</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Server: demo.mt4server.com:443</p>
                        <p>Accounts: 1,234</p>
                        <p>Last Sync: 2 minutes ago</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Test Connection
                      </Button>
                    </div>

                    <div className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">MT5 Server</h4>
                        <Badge className="bg-green-500/10 text-green-500">Connected</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Server: demo.mt5server.com:443</p>
                        <p>Accounts: 856</p>
                        <p>Last Sync: 5 minutes ago</p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        Test Connection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Gateways
                  </CardTitle>
                  <CardDescription>
                    Payment processing status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Cryptocurrency (TRC20)', status: 'active', transactions: 45 },
                      { name: 'Bank Transfer', status: 'active', transactions: 12 },
                      { name: 'Skrill', status: 'inactive', transactions: 0 },
                      { name: 'Neteller', status: 'inactive', transactions: 0 },
                      { name: 'Stripe', status: 'inactive', transactions: 0 },
                    ].map((gateway) => (
                      <div key={gateway.name} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{gateway.name}</h4>
                          <Badge className={
                            gateway.status === 'active' 
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-muted text-muted-foreground'
                          }>
                            {gateway.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {gateway.transactions} pending transactions
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer */}
        <footer className="border-t border-border p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>© 2024 OMNI-CRM</span>
              <span>•</span>
              <span>Tier-1 Forex Brokerage System</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                System Operational
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
