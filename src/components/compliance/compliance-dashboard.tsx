'use client';

/**
 * Compliance Dashboard Component
 * AML/KYC monitoring, risk alerts, and compliance tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserCheck,
  FileSearch,
  Flag,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  RefreshCw,
  Users,
  FileText,
  Ban,
  Activity,
  Search,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================

interface ComplianceStats {
  totalClients: number;
  kycPending: number;
  kycApproved: number;
  kycRejected: number;
  amlChecks: number;
  highRiskClients: number;
  activeAlerts: number;
  criticalAlerts: number;
  pepMatches: number;
  sanctionsHits: number;
  adverseMedia: number;
}

interface KYCRecord {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  level: number;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewer?: string;
  documents: number;
  riskScore: number;
}

interface AMLAlert {
  id: string;
  clientId: string;
  clientName: string;
  type: 'PEP' | 'SANCTIONS' | 'ADVERSE_MEDIA' | 'HIGH_RISK_COUNTRY' | 'UNUSUAL_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
  matchedName?: string;
  matchedList?: string;
  matchScore: number;
  createdAt: Date;
  resolvedAt?: Date;
  notes?: string;
}

interface ComplianceCheck {
  id: string;
  clientId: string;
  clientName: string;
  type: 'KYC' | 'AML' | 'PEP' | 'SANCTIONS' | 'ADVERSE_MEDIA';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  createdAt: Date;
  completedAt?: Date;
}

// ============================================
// Dummy Data
// ============================================

const dummyStats: ComplianceStats = {
  totalClients: 1250,
  kycPending: 45,
  kycApproved: 1100,
  kycRejected: 25,
  amlChecks: 890,
  highRiskClients: 28,
  activeAlerts: 12,
  criticalAlerts: 3,
  pepMatches: 8,
  sanctionsHits: 2,
  adverseMedia: 5,
};

const dummyKYCRecords: KYCRecord[] = [
  {
    id: 'kyc1',
    clientId: 'c1',
    clientName: 'Ahmed Al-Hassan',
    clientEmail: 'ahmed@example.com',
    status: 'PENDING',
    level: 2,
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    documents: 3,
    riskScore: 35,
  },
  {
    id: 'kyc2',
    clientId: 'c2',
    clientName: 'John Smith',
    clientEmail: 'john@example.com',
    status: 'IN_REVIEW',
    level: 2,
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    documents: 4,
    riskScore: 25,
    reviewer: 'Compliance Team',
  },
  {
    id: 'kyc3',
    clientId: 'c3',
    clientName: 'Maria Garcia',
    clientEmail: 'maria@example.com',
    status: 'APPROVED',
    level: 2,
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    reviewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    documents: 3,
    riskScore: 15,
    reviewer: 'Sarah Connor',
  },
  {
    id: 'kyc4',
    clientId: 'c4',
    clientName: 'Vladimir Petrov',
    clientEmail: 'vladimir@example.com',
    status: 'REJECTED',
    level: 1,
    submittedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    reviewedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
    documents: 2,
    riskScore: 85,
    reviewer: 'Compliance Team',
  },
];

const dummyAMLAlerts: AMLAlert[] = [
  {
    id: 'aml1',
    clientId: 'c10',
    clientName: 'Sergey Ivanov',
    type: 'SANCTIONS',
    severity: 'CRITICAL',
    status: 'OPEN',
    matchedName: 'Sergey Ivanov',
    matchedList: 'OFAC SDN List',
    matchScore: 95,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'aml2',
    clientId: 'c11',
    clientName: 'Mohammed Al-Rashid',
    type: 'PEP',
    severity: 'HIGH',
    status: 'ACKNOWLEDGED',
    matchedName: 'Mohammed Al-Rashid',
    matchedList: 'PEP Database',
    matchScore: 88,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 'aml3',
    clientId: 'c12',
    clientName: 'Alex Wong',
    type: 'ADVERSE_MEDIA',
    severity: 'MEDIUM',
    status: 'OPEN',
    matchScore: 72,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: 'aml4',
    clientId: 'c13',
    clientName: 'James Brown',
    type: 'HIGH_RISK_COUNTRY',
    severity: 'LOW',
    status: 'RESOLVED',
    matchScore: 45,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    notes: 'Client provides valid business explanation',
  },
];

const dummyChecks: ComplianceCheck[] = [
  { id: 'chk1', clientId: 'c20', clientName: 'Client A', type: 'AML', status: 'COMPLETED', riskScore: 25, riskLevel: 'LOW', createdAt: new Date(), completedAt: new Date() },
  { id: 'chk2', clientId: 'c21', clientName: 'Client B', type: 'PEP', status: 'IN_PROGRESS', riskScore: 55, riskLevel: 'MEDIUM', createdAt: new Date() },
  { id: 'chk3', clientId: 'c22', clientName: 'Client C', type: 'SANCTIONS', status: 'PENDING', riskScore: 0, riskLevel: 'LOW', createdAt: new Date() },
];

// ============================================
// Compliance Dashboard Component
// ============================================

export function ComplianceDashboard() {
  const [stats, setStats] = useState<ComplianceStats>(dummyStats);
  const [kycRecords, setKYCRecords] = useState<KYCRecord[]>(dummyKYCRecords);
  const [amlAlerts, setAMLAlerts] = useState<AMLAlert[]>(dummyAMLAlerts);
  const [checks, setChecks] = useState<ComplianceCheck[]>(dummyChecks);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAlert, setSelectedAlert] = useState<AMLAlert | null>(null);
  const { toast } = useToast();

  // Status colors
  const statusColors = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    IN_REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    OPEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    ACKNOWLEDGED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    FALSE_POSITIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  // Severity colors
  const severityColors = {
    LOW: 'text-green-600',
    MEDIUM: 'text-amber-600',
    HIGH: 'text-orange-600',
    CRITICAL: 'text-red-600',
  };

  // Risk level colors
  const riskLevelColors = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-amber-500',
    HIGH: 'bg-orange-500',
    VERY_HIGH: 'bg-red-500',
  };

  // Alert type icons
  const alertTypeIcons = {
    PEP: UserCheck,
    SANCTIONS: Ban,
    ADVERSE_MEDIA: FileSearch,
    HIGH_RISK_COUNTRY: Flag,
    UNUSUAL_ACTIVITY: Activity,
  };

  // Acknowledge alert
  const handleAcknowledge = (alertId: string) => {
    setAMLAlerts(prev =>
      prev.map(a =>
        a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' as const } : a
      )
    );
    toast({
      title: 'Alert Acknowledged',
      description: 'The alert has been acknowledged for review.',
    });
  };

  // Resolve alert
  const handleResolve = (alertId: string, isFalsePositive = false) => {
    setAMLAlerts(prev =>
      prev.map(a =>
        a.id === alertId
          ? {
              ...a,
              status: isFalsePositive ? ('FALSE_POSITIVE' as const) : ('RESOLVED' as const),
              resolvedAt: new Date(),
            }
          : a
      )
    );
    toast({
      title: 'Alert Resolved',
      description: isFalsePositive
        ? 'Alert marked as false positive.'
        : 'Alert has been resolved.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compliance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor AML/KYC compliance and manage risk alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Search className="h-4 w-4 mr-2" />
            Screen Client
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KYC Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="h-5 w-5 text-blue-500" />
              <Badge variant="outline">{stats.kycPending} pending</Badge>
            </div>
            <p className="text-2xl font-bold">
              {((stats.kycApproved / stats.totalClients) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">KYC Compliance Rate</p>
            <Progress
              value={(stats.kycApproved / stats.totalClients) * 100}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <Badge variant="destructive">{stats.criticalAlerts} critical</Badge>
            </div>
            <p className="text-2xl font-bold">{stats.activeAlerts}</p>
            <p className="text-sm text-muted-foreground">Active AML Alerts</p>
          </CardContent>
        </Card>

        {/* High Risk Clients */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Flag className="h-5 w-5 text-amber-500" />
              <Badge variant="outline">{((stats.highRiskClients / stats.totalClients) * 100).toFixed(1)}%</Badge>
            </div>
            <p className="text-2xl font-bold">{stats.highRiskClients}</p>
            <p className="text-sm text-muted-foreground">High Risk Clients</p>
          </CardContent>
        </Card>

        {/* AML Checks */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-5 w-5 text-green-500" />
              <Badge variant="outline">This month</Badge>
            </div>
            <p className="text-2xl font-bold">{stats.amlChecks}</p>
            <p className="text-sm text-muted-foreground">AML Checks Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Ban className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium">Sanctions Hits</p>
                <p className="text-sm text-muted-foreground">OFAC, UN, EU lists</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.sanctionsHits}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">PEP Matches</p>
                <p className="text-sm text-muted-foreground">Politically Exposed</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pepMatches}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSearch className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Adverse Media</p>
                <p className="text-sm text-muted-foreground">Negative news</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.adverseMedia}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="kyc" className="gap-2">
            <UserCheck className="h-4 w-4" />
            KYC Queue
            {stats.kycPending > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.kycPending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            AML Alerts
            {stats.activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-1">{stats.activeAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="checks" className="gap-2">
            <Shield className="h-4 w-4" />
            Checks
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest compliance alerts requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {amlAlerts.slice(0, 5).map((alert) => {
                    const Icon = alertTypeIcons[alert.type];
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-full', severityColors[alert.severity])}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{alert.clientName}</p>
                            <p className="text-xs text-muted-foreground">{alert.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={statusColors[alert.status]}>{alert.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(alert.createdAt))} ago
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* KYC Status */}
            <Card>
              <CardHeader>
                <CardTitle>KYC Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Approved</span>
                      <span className="text-sm font-medium">{stats.kycApproved}</span>
                    </div>
                    <Progress value={(stats.kycApproved / stats.totalClients) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Pending</span>
                      <span className="text-sm font-medium">{stats.kycPending}</span>
                    </div>
                    <Progress value={(stats.kycPending / stats.totalClients) * 100} className="h-2 bg-muted [&>div]:bg-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Rejected</span>
                      <span className="text-sm font-medium">{stats.kycRejected}</span>
                    </div>
                    <Progress value={(stats.kycRejected / stats.totalClients) * 100} className="h-2 bg-muted [&>div]:bg-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KYC Queue Tab */}
        <TabsContent value="kyc">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>KYC Verification Queue</CardTitle>
                  <CardDescription>Client documents awaiting verification</CardDescription>
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {kycRecords.map((record) => (
                    <div key={record.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {record.clientName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium">{record.clientName}</p>
                            <p className="text-sm text-muted-foreground">{record.clientEmail}</p>
                          </div>
                        </div>
                        <Badge className={statusColors[record.status]}>{record.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {record.documents} docs
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(record.submittedAt))} ago
                        </span>
                        <span className={cn('flex items-center gap-1', severityColors[
                          record.riskScore > 70 ? 'CRITICAL' :
                          record.riskScore > 50 ? 'HIGH' :
                          record.riskScore > 30 ? 'MEDIUM' : 'LOW'
                        ])}>
                          <Flag className="h-4 w-4" />
                          Risk: {record.riskScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AML Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AML Alerts</CardTitle>
                  <CardDescription>Anti-Money Laundering alerts and watchlist matches</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {amlAlerts.map((alert) => {
                  const Icon = alertTypeIcons[alert.type];
                  return (
                    <div key={alert.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-full',
                            alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                            alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                            alert.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                            'bg-green-100 text-green-600'
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{alert.clientName}</p>
                            <p className="text-sm text-muted-foreground">
                              {alert.type.replace('_', ' ')}
                              {alert.matchedList && ` • Match: ${alert.matchedList}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[alert.status]}>{alert.status}</Badge>
                          <Badge variant="outline" className={cn('capitalize', severityColors[alert.severity])}>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>

                      {alert.matchScore > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Match Score</span>
                            <span className="font-medium">{alert.matchScore}%</span>
                          </div>
                          <Progress value={alert.matchScore} className="h-1" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          Created {format(new Date(alert.createdAt), 'PPp')}
                        </span>
                        {alert.status === 'OPEN' && (
                          <Button size="sm" onClick={() => handleAcknowledge(alert.id)}>
                            Acknowledge
                          </Button>
                        )}
                        {alert.status === 'ACKNOWLEDGED' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleResolve(alert.id, true)}>
                              False Positive
                            </Button>
                            <Button size="sm" onClick={() => handleResolve(alert.id)}>
                              Resolve
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Checks Tab */}
        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Checks</CardTitle>
              <CardDescription>Ongoing and completed compliance screenings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checks.map((check) => (
                  <div key={check.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className={cn('w-3 h-3 rounded-full', riskLevelColors[check.riskLevel])} />
                      <div>
                        <p className="font-medium">{check.clientName}</p>
                        <p className="text-sm text-muted-foreground">{check.type} Check</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">Risk: {check.riskScore}</p>
                        <p className="text-sm text-muted-foreground">{check.riskLevel}</p>
                      </div>
                      <Badge className={statusColors[check.status]}>{check.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
