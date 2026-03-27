'use client';

/**
 * Report Builder Component
 * UI for generating and exporting PDF/Excel reports
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReportConfig {
  type: 'dashboard' | 'transaction' | 'client' | 'ib' | 'abbook';
  format: 'pdf' | 'excel';
  period: {
    from: string;
    to: string;
  };
  options?: Record<string, boolean>;
}

const reportTypes = [
  {
    id: 'dashboard',
    name: 'Dashboard Report',
    description: 'Overview of all KPIs and metrics',
    icon: PieChart,
  },
  {
    id: 'transaction',
    name: 'Transaction Report',
    description: 'Deposits, withdrawals, and transfers',
    icon: DollarSign,
  },
  {
    id: 'client',
    name: 'Client Report',
    description: 'Client profiles and KYC status',
    icon: Users,
  },
  {
    id: 'ib',
    name: 'IB Performance',
    description: 'IB commissions and referrals',
    icon: TrendingUp,
  },
  {
    id: 'abbook',
    name: 'A/B Book Analytics',
    description: 'Trading volume and profit analysis',
    icon: BarChart3,
  },
];

export function ReportBuilder() {
  const [config, setConfig] = useState<ReportConfig>({
    type: 'dashboard',
    format: 'pdf',
    period: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<unknown>(null);
  const { toast } = useToast();

  const generateReport = async (format: 'pdf' | 'excel') => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          format,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Trigger download
          const link = document.createElement('a');
          link.href = data.data.content;
          link.download = `${data.data.filename}.${format === 'pdf' ? 'pdf' : 'csv'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast({
            title: 'Report Generated',
            description: `Your ${format.toUpperCase()} report has been downloaded.`,
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const previewReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/reports?type=${config.type}&from=${config.period.from}&to=${config.period.to}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPreviewData(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to preview report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Builder</h2>
          <p className="text-muted-foreground">
            Generate and export reports in PDF or Excel format
          </p>
        </div>
        <Button variant="outline" onClick={previewReport} disabled={isGenerating}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Configure your report parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type */}
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select
                value={config.type}
                onValueChange={(value) => setConfig({ ...config, type: value as ReportConfig['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-4">
              <Label>Period</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from" className="text-xs">From</Label>
                  <Input
                    id="from"
                    type="date"
                    value={config.period.from}
                    onChange={(e) => setConfig({
                      ...config,
                      period: { ...config.period, from: e.target.value },
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to" className="text-xs">To</Label>
                  <Input
                    id="to"
                    type="date"
                    value={config.period.to}
                    onChange={(e) => setConfig({
                      ...config,
                      period: { ...config.period, to: e.target.value },
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="space-y-2">
              <Label>Quick Period</Label>
              <div className="flex flex-wrap gap-2">
                {['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'].map((period) => (
                  <Button
                    key={period}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const to = new Date();
                      const from = new Date();
                      switch (period) {
                        case 'Today':
                          break;
                        case 'This Week':
                          from.setDate(from.getDate() - 7);
                          break;
                        case 'This Month':
                          from.setMonth(from.getMonth() - 1);
                          break;
                        case 'This Quarter':
                          from.setMonth(from.getMonth() - 3);
                          break;
                        case 'This Year':
                          from.setFullYear(from.getFullYear() - 1);
                          break;
                      }
                      setConfig({
                        ...config,
                        period: {
                          from: from.toISOString().split('T')[0],
                          to: to.toISOString().split('T')[0],
                        },
                      });
                    }}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>

            {/* Type-specific Options */}
            {config.type === 'transaction' && (
              <div className="space-y-4">
                <Label>Include</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="deposits" defaultChecked />
                    <Label htmlFor="deposits" className="font-normal">Deposits</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="withdrawals" defaultChecked />
                    <Label htmlFor="withdrawals" className="font-normal">Withdrawals</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="transfers" defaultChecked />
                    <Label htmlFor="transfers" className="font-normal">Internal Transfers</Label>
                  </div>
                </div>
              </div>
            )}

            {config.type === 'client' && (
              <div className="space-y-4">
                <Label>Include</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="kyc" defaultChecked />
                    <Label htmlFor="kyc" className="font-normal">KYC Information</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="trading" defaultChecked />
                    <Label htmlFor="trading" className="font-normal">Trading Accounts</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="wallets" defaultChecked />
                    <Label htmlFor="wallets" className="font-normal">Wallet Balances</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                className="flex-1 gap-2"
                onClick={() => generateReport('pdf')}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => generateReport('excel')}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Report preview for {reportTypes.find(t => t.id === config.type)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewData ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <SummaryCard
                    title="Period"
                    value={`${config.period.from} to ${config.period.to}`}
                    icon={Calendar}
                  />
                  <SummaryCard
                    title="Type"
                    value={config.type.toUpperCase()}
                    icon={FileText}
                  />
                  <SummaryCard
                    title="Format"
                    value={config.format.toUpperCase()}
                    icon={FileSpreadsheet}
                  />
                  <SummaryCard
                    title="Status"
                    value="Ready"
                    icon={Download}
                    valueColor="text-green-500"
                  />
                </div>

                {/* Data Preview */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <pre className="text-xs overflow-auto max-h-[400px]">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">No Preview Available</p>
                <p className="text-sm">Click "Preview" to see report data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>
            Set up automatic report generation and delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Daily Dashboard</span>
                <Badge>Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Sent every day at 8:00 AM
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Weekly Transaction</span>
                <Badge>Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Sent every Monday at 9:00 AM
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Monthly Summary</span>
                <Badge variant="outline">Inactive</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Sent on 1st of every month
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  valueColor,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  valueColor?: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{title}</span>
      </div>
      <p className={`font-medium ${valueColor}`}>{value}</p>
    </div>
  );
}
