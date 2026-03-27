'use client';

/**
 * OMNI-CRM Trading History
 * Component to display trade history for client accounts
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  BarChart3,
  Clock,
  DollarSign,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Trade {
  id: string;
  ticket: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  closePrice: number;
  profit: number;
  swap: number;
  commission: number;
  openTime: string;
  closeTime: string;
  sl: number;
  tp: number;
}

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
  winRate: number;
  totalVolume: number;
  averageProfit: number;
  averageLoss: number;
  bestTrade: number;
  worstTrade: number;
}

interface TradingHistoryProps {
  accountId: string | null;
  userId: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

const formatPrice = (price: number) => {
  return price.toFixed(price < 10 ? 5 : 2);
};

// ============================================
// MAIN COMPONENT
// ============================================

export function TradingHistory({ accountId, userId }: TradingHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [symbolFilter, setSymbolFilter] = useState('all');

  const fetchTrades = useCallback(async () => {
    if (!accountId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/portal?userId=${userId}&accountId=${accountId}&action=trades&period=${period}${symbolFilter !== 'all' ? `&symbol=${symbolFilter}` : ''}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTrades(data.data.trades || []);
          setStats(data.data.stats || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, userId, period, symbolFilter]);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Get unique symbols for filter
  const symbols = [...new Set(trades.map((t) => t.symbol))];

  // Calculate stats from trades if not provided
  const calculatedStats: TradeStats = stats || {
    totalTrades: trades.length,
    winningTrades: trades.filter((t) => t.profit > 0).length,
    losingTrades: trades.filter((t) => t.profit < 0).length,
    totalProfit: trades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0),
    totalLoss: Math.abs(trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)),
    netPnL: trades.reduce((sum, t) => sum + t.profit, 0),
    winRate: trades.length > 0 ? (trades.filter((t) => t.profit > 0).length / trades.length) * 100 : 0,
    totalVolume: trades.reduce((sum, t) => sum + t.volume, 0),
    averageProfit: 0,
    averageLoss: 0,
    bestTrade: Math.max(...trades.map((t) => t.profit), 0),
    worstTrade: Math.min(...trades.map((t) => t.profit), 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <BarChart3 className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Trades</p>
                <p className="text-lg font-bold">{calculatedStats.totalTrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-lg font-bold">{calculatedStats.winRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Activity className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Volume</p>
                <p className="text-lg font-bold">{calculatedStats.totalVolume.toFixed(2)} lots</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          calculatedStats.netPnL >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-lg',
                calculatedStats.netPnL >= 0 ? 'bg-green-200 dark:bg-green-800/30' : 'bg-red-200 dark:bg-red-800/30'
              )}>
                <DollarSign className={cn(
                  'h-4 w-4',
                  calculatedStats.netPnL >= 0 ? 'text-green-600' : 'text-red-600'
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net P/L</p>
                <p className={cn(
                  'text-lg font-bold',
                  calculatedStats.netPnL >= 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {formatCurrency(calculatedStats.netPnL)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={symbolFilter} onValueChange={setSymbolFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Symbols</SelectItem>
              {symbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={fetchTrades}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Trades Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Open Price</TableHead>
                  <TableHead className="text-right">Close Price</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Open Time</TableHead>
                  <TableHead>Close Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Activity className="h-8 w-8" />
                        <p>No trades found for this period</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-mono text-sm">
                        #{trade.ticket}
                      </TableCell>
                      <TableCell className="font-medium">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            trade.type === 'BUY'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.volume.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(trade.openPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatPrice(trade.closePrice)}
                      </TableCell>
                      <TableCell className={cn(
                        'text-right font-semibold',
                        trade.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {formatCurrency(trade.profit)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(trade.openTime)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(trade.closeTime)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      {trades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Best Trade</p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(calculatedStats.bestTrade)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Worst Trade</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(calculatedStats.worstTrade)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Winning Trades</p>
            <p className="text-lg font-bold text-green-600">
              {calculatedStats.winningTrades}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Losing Trades</p>
            <p className="text-lg font-bold text-red-600">
              {calculatedStats.losingTrades}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingHistory;
