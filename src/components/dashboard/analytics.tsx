'use client';

/**
 * OMNI-CRM A-Book/B-Book Analytics Component
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// CHART CONFIG
// ============================================

const chartConfig = {
  aBook: {
    label: 'A-Book',
    color: 'hsl(var(--chart-1))',
  },
  bBook: {
    label: 'B-Book',
    color: 'hsl(var(--chart-2))',
  },
  volume: {
    label: 'Volume',
    color: 'hsl(var(--chart-3))',
  },
  profit: {
    label: 'Profit',
    color: 'hsl(var(--chart-4))',
  },
} satisfies ChartConfig;

const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'];

// ============================================
// ANALYTICS CARDS
// ============================================

interface BookAnalyticsProps {
  aBook: {
    accounts: number;
    volume: number;
    profit: number;
  };
  bBook: {
    accounts: number;
    volume: number;
    profit: number;
  };
  totalVolume: number;
}

export function BookAnalyticsCard({ aBook, bBook, totalVolume }: BookAnalyticsProps) {
  const aBookPercentage = totalVolume > 0 ? (aBook.volume / totalVolume) * 100 : 0;
  const bBookPercentage = totalVolume > 0 ? (bBook.volume / totalVolume) * 100 : 0;

  const pieData = [
    { name: 'A-Book', value: aBook.volume, percentage: aBookPercentage },
    { name: 'B-Book', value: bBook.volume, percentage: bBookPercentage },
  ];

  const barData = [
    { name: 'Accounts', aBook: aBook.accounts, bBook: bBook.accounts },
    { name: 'Volume (K)', aBook: Math.round(aBook.volume / 1000), bBook: Math.round(bBook.volume / 1000) },
    { name: 'Profit ($)', aBook: Math.round(aBook.profit), bBook: Math.round(bBook.profit) },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">A-Book / B-Book Analytics</CardTitle>
        <Badge variant="outline">Real-time</Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* A-Book */}
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">A-Book</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accounts</span>
                <span className="font-semibold">{aBook.accounts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-semibold">${(aBook.volume / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit</span>
                <span className="font-semibold text-emerald-600">${aBook.profit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* B-Book */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">B-Book</span>
              <Activity className="h-4 w-4 text-amber-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accounts</span>
                <span className="font-semibold">{bBook.accounts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-semibold">${(bBook.volume / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Profit</span>
                <span className={cn(
                  'font-semibold',
                  bBook.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  ${bBook.profit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Distribution */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Volume Distribution</span>
            <span className="text-muted-foreground">
              A-Book: {aBookPercentage.toFixed(1)}% | B-Book: {bBookPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${aBookPercentage}%` }}
            />
            <div
              className="bg-amber-500 transition-all"
              style={{ width: `${bBookPercentage}%` }}
            />
          </div>
        </div>

        {/* Bar Chart */}
        <ChartContainer config={chartConfig} className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" className="text-xs" width={70} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="aBook" fill="var(--color-aBook)" radius={[0, 4, 4, 0]} name="A-Book" />
              <Bar dataKey="bBook" fill="var(--color-bBook)" radius={[0, 4, 4, 0]} name="B-Book" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// VOLUME CHART
// ============================================

interface VolumeChartProps {
  data: { date: string; aBook: number; bBook: number }[];
}

export function VolumeChart({ data }: VolumeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trading Volume Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="aBook"
                stroke="var(--color-aBook)"
                strokeWidth={2}
                dot={false}
                name="A-Book"
              />
              <Line
                type="monotone"
                dataKey="bBook"
                stroke="var(--color-bBook)"
                strokeWidth={2}
                dot={false}
                name="B-Book"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ============================================
// RISK INDICATOR
// ============================================

interface RiskIndicatorProps {
  score: number; // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

export function RiskIndicator({ score, level }: RiskIndicatorProps) {
  const config = {
    LOW: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', label: 'Low Risk' },
    MEDIUM: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', label: 'Medium Risk' },
    HIGH: { color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', label: 'High Risk' },
    VERY_HIGH: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', label: 'Very High Risk' },
  };

  const { color, bgColor, label } = config[level];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className={cn('h-5 w-5', color)} />
          Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Risk Level</span>
          <Badge className={cn(bgColor, color)}>{label}</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Risk Score</span>
            <span className={cn('font-semibold', color)}>{score}/100</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
