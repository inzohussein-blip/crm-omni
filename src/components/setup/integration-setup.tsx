'use client';

/**
 * OMNI-CRM Integration Setup Component
 * Initial connection configuration wizard
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  CreditCard, 
  Shield, 
  Database, 
  CheckCircle2, 
  Loader2,
  Settings,
  Globe,
  Wallet,
  ArrowRight,
  Zap
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface MTConfig {
  server: string;
  port: number;
  managerLogin: string;
  managerPassword: string;
  enableMT4: boolean;
  enableMT5: boolean;
}

interface PaymentConfig {
  cryptoEnabled: boolean;
  cryptoNetwork: string;
  bankEnabled: boolean;
  skrillEnabled: boolean;
  netellerEnabled: boolean;
  stripeEnabled: boolean;
  stripeKey: string;
}

interface SystemConfig {
  companyName: string;
  companyEmail: string;
  timezone: string;
  defaultCurrency: string;
  defaultLeverage: number;
  kycRequired: boolean;
  twoFactorRequired: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function IntegrationSetup() {
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [testing, setTesting] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'connected' | 'failed' | 'pending'>>({});

  // Config states
  const [mtConfig, setMTConfig] = useState<MTConfig>({
    server: 'demo.mt4server.com',
    port: 443,
    managerLogin: '',
    managerPassword: '',
    enableMT4: true,
    enableMT5: true,
  });

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    cryptoEnabled: true,
    cryptoNetwork: 'TRC20',
    bankEnabled: true,
    skrillEnabled: false,
    netellerEnabled: false,
    stripeEnabled: false,
    stripeKey: '',
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    companyName: 'OMNI Broker',
    companyEmail: 'info@omnibroker.com',
    timezone: 'UTC',
    defaultCurrency: 'USD',
    defaultLeverage: 100,
    kycRequired: true,
    twoFactorRequired: true,
  });

  // Test connection
  const testConnection = async (type: string, config: Record<string, unknown>) => {
    setTesting(type);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, config }),
      });

      const data = await response.json();
      
      setConnectionStatus(prev => ({
        ...prev,
        [type]: data.success ? 'connected' : 'failed',
      }));
    } catch {
      setConnectionStatus(prev => ({
        ...prev,
        [type]: 'failed',
      }));
    } finally {
      setTesting(null);
    }
  };

  // Save settings
  const saveSettings = async (category: string, settings: Record<string, unknown>[]) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Save settings error:', error);
      return false;
    }
  };

  // Get status badge
  const getStatusBadge = (type: string) => {
    const status = connectionStatus[type];
    if (!status) return null;
    
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Connected</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
    }
  };

  const steps = [
    { title: 'System', icon: Settings },
    { title: 'MetaTrader', icon: Server },
    { title: 'Payments', icon: CreditCard },
    { title: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">CRM Integration Setup</h1>
        <p className="text-muted-foreground">
          Configure your OMNI-CRM connections and settings
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep === index;
          const isCompleted = index < activeStep;
          
          return (
            <div key={step.title} className="flex items-center">
              <button
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : isCompleted
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card>
        {/* Step 1: System Configuration */}
        {activeStep === 0 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Basic system settings for your CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={systemConfig.companyName}
                    onChange={(e) => setSystemConfig({ ...systemConfig, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={systemConfig.companyEmail}
                    onChange={(e) => setSystemConfig({ ...systemConfig, companyEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={systemConfig.timezone}
                    onChange={(e) => setSystemConfig({ ...systemConfig, timezone: e.target.value })}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Shanghai">Shanghai (CST)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <select
                    id="currency"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={systemConfig.defaultCurrency}
                    onChange={(e) => setSystemConfig({ ...systemConfig, defaultCurrency: e.target.value })}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leverage">Default Leverage</Label>
                  <select
                    id="leverage"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={systemConfig.defaultLeverage}
                    onChange={(e) => setSystemConfig({ ...systemConfig, defaultLeverage: parseInt(e.target.value) })}
                  >
                    <option value="50">1:50</option>
                    <option value="100">1:100</option>
                    <option value="200">1:200</option>
                    <option value="500">1:500</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={() => setActiveStep(1)}>
                  Continue to MetaTrader
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: MetaTrader Configuration */}
        {activeStep === 1 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                MetaTrader Connection
              </CardTitle>
              <CardDescription>
                Connect to MT4/MT5 trading servers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="mt5" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mt4" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    MT4 Server
                  </TabsTrigger>
                  <TabsTrigger value="mt5" className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    MT5 Server
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mt4" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Server Address</Label>
                      <Input
                        placeholder="mt4.yourbroker.com"
                        value={mtConfig.server}
                        onChange={(e) => setMTConfig({ ...mtConfig, server: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        type="number"
                        value={mtConfig.port}
                        onChange={(e) => setMTConfig({ ...mtConfig, port: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Manager Login</Label>
                      <Input
                        placeholder="Manager account login"
                        value={mtConfig.managerLogin}
                        onChange={(e) => setMTConfig({ ...mtConfig, managerLogin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Manager Password</Label>
                      <Input
                        type="password"
                        placeholder="Manager password"
                        value={mtConfig.managerPassword}
                        onChange={(e) => setMTConfig({ ...mtConfig, managerPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge('mt4')}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => testConnection('mt4', mtConfig)}
                      disabled={testing === 'mt4'}
                    >
                      {testing === 'mt4' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="mt5" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Server Address</Label>
                      <Input
                        placeholder="mt5.yourbroker.com"
                        value={mtConfig.server}
                        onChange={(e) => setMTConfig({ ...mtConfig, server: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Port</Label>
                      <Input
                        type="number"
                        value={mtConfig.port}
                        onChange={(e) => setMTConfig({ ...mtConfig, port: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Manager Login</Label>
                      <Input
                        placeholder="Manager account login"
                        value={mtConfig.managerLogin}
                        onChange={(e) => setMTConfig({ ...mtConfig, managerLogin: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Manager Password</Label>
                      <Input
                        type="password"
                        placeholder="Manager password"
                        value={mtConfig.managerPassword}
                        onChange={(e) => setMTConfig({ ...mtConfig, managerPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusBadge('mt5')}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => testConnection('mt5', mtConfig)}
                      disabled={testing === 'mt5'}
                    >
                      {testing === 'mt5' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep(0)}>
                  Back
                </Button>
                <Button onClick={() => setActiveStep(2)}>
                  Continue to Payments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: Payment Gateways */}
        {activeStep === 2 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Gateways
              </CardTitle>
              <CardDescription>
                Configure payment methods for deposits and withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Crypto */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-orange-500" />
                    <div>
                      <h4 className="font-medium">Cryptocurrency</h4>
                      <p className="text-sm text-muted-foreground">
                        USDT, BTC, ETH payments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge('crypto')}
                    <Switch
                      checked={paymentConfig.cryptoEnabled}
                      onCheckedChange={(checked) => 
                        setPaymentConfig({ ...paymentConfig, cryptoEnabled: checked })
                      }
                    />
                  </div>
                </div>
                {paymentConfig.cryptoEnabled && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['TRC20', 'ERC20', 'BEP20', 'BTC'].map((network) => (
                      <Button
                        key={network}
                        variant={paymentConfig.cryptoNetwork === network ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentConfig({ ...paymentConfig, cryptoNetwork: network })}
                      >
                        {network}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bank Transfer */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Bank Transfer</h4>
                      <p className="text-sm text-muted-foreground">
                        Wire transfers and SEPA
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge('bank')}
                    <Switch
                      checked={paymentConfig.bankEnabled}
                      onCheckedChange={(checked) => 
                        setPaymentConfig({ ...paymentConfig, bankEnabled: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* E-Wallets */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-purple-500" />
                  <div>
                    <h4 className="font-medium">E-Wallets</h4>
                    <p className="text-sm text-muted-foreground">
                      Skrill, Neteller, PayPal
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Skrill</span>
                    <Switch
                      checked={paymentConfig.skrillEnabled}
                      onCheckedChange={(checked) => 
                        setPaymentConfig({ ...paymentConfig, skrillEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Neteller</span>
                    <Switch
                      checked={paymentConfig.netellerEnabled}
                      onCheckedChange={(checked) => 
                        setPaymentConfig({ ...paymentConfig, netellerEnabled: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Stripe</span>
                    <Switch
                      checked={paymentConfig.stripeEnabled}
                      onCheckedChange={(checked) => 
                        setPaymentConfig({ ...paymentConfig, stripeEnabled: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setActiveStep(3)}>
                  Continue to Security
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 4: Security */}
        {activeStep === 3 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security and compliance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">KYC Verification Required</h4>
                    <p className="text-sm text-muted-foreground">
                      Require identity verification before trading
                    </p>
                  </div>
                  <Switch
                    checked={systemConfig.kycRequired}
                    onCheckedChange={(checked) => 
                      setSystemConfig({ ...systemConfig, kycRequired: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all user accounts
                    </p>
                  </div>
                  <Switch
                    checked={systemConfig.twoFactorRequired}
                    onCheckedChange={(checked) => 
                      setSystemConfig({ ...systemConfig, twoFactorRequired: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Device Fingerprinting</h4>
                    <p className="text-sm text-muted-foreground">
                      Track and verify user devices
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Audit Trail Logging</h4>
                    <p className="text-sm text-muted-foreground">
                      Log all system activities
                    </p>
                  </div>
                  <Switch checked disabled />
                </div>
              </div>

              <Separator />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep(2)}>
                  Back
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    // Save all settings
                    await saveSettings('system', [
                      { key: 'companyName', value: systemConfig.companyName, category: 'system' },
                      { key: 'companyEmail', value: systemConfig.companyEmail, category: 'system' },
                      { key: 'timezone', value: systemConfig.timezone, category: 'system' },
                      { key: 'defaultCurrency', value: systemConfig.defaultCurrency, category: 'trading' },
                      { key: 'defaultLeverage', value: systemConfig.defaultLeverage, category: 'trading' },
                    ]);
                    alert('Settings saved successfully!');
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Setup
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
