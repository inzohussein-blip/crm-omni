'use client';

/**
 * OMNI-CRM Export Dialog
 * UI component for exporting reports in PDF, Excel, and CSV formats
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileSpreadsheet,
  FileText,
  File,
  Download,
  Loader2,
  Calendar,
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  Eye,
  AlertCircle,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type ReportType = 'transactions' | 'clients' | 'ib_commissions' | 'trading_volume' | 'book_analytics';
type ExportFormat = 'pdf' | 'xlsx' | 'csv';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultReportType?: ReportType;
  defaultDateRange?: { from: Date; to: Date };
  ibId?: string;
}

interface ReportTypeInfo {
  type: ReportType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface FormatInfo {
  format: ExportFormat;
  name: string;
  icon: React.ReactNode;
  description: string;
}

interface PreviewData {
  metadata: {
    title: string;
    generatedAt: string;
    period: { from: string; to: string };
  };
  summary: Record<string, unknown>;
  rowCount: number;
  preview: Array<Record<string, unknown>>;
}

// ============================================
// CONSTANTS
// ============================================

const REPORT_TYPES: ReportTypeInfo[] = [
  {
    type: 'transactions',
    name: 'Transactions Report',
    description: 'Complete transaction history with deposits, withdrawals, and transfers',
    icon: <DollarSign className="h-5 w-5" />,
    color: 'bg-green-500',
  },
  {
    type: 'clients',
    name: 'Client Report',
    description: 'Client activity report with KYC status and account information',
    icon: <Users className="h-5 w-5" />,
    color: 'bg-blue-500',
  },
  {
    type: 'ib_commissions',
    name: 'IB Commission Report',
    description: 'Introducing Broker commission earnings and breakdown',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'bg-purple-500',
  },
  {
    type: 'trading_volume',
    name: 'Trading Volume Report',
    description: 'Trading volume analysis with A-Book/B-Book breakdown',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'bg-amber-500',
  },
  {
    type: 'book_analytics',
    name: 'Book Analytics Report',
    description: 'A-Book vs B-Book performance analysis',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'bg-rose-500',
  },
];

const EXPORT_FORMATS: FormatInfo[] = [
  {
    format: 'pdf',
    name: 'PDF Document',
    icon: <FileText className="h-5 w-5 text-red-500" />,
    description: 'Portable document format with charts and formatting',
  },
  {
    format: 'xlsx',
    name: 'Excel Spreadsheet',
    icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
    description: 'Microsoft Excel format with multiple sheets',
  },
  {
    format: 'csv',
    name: 'CSV File',
    icon: <File className="h-5 w-5 text-blue-500" />,
    description: 'Comma-separated values for data processing',
  },
];

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'Custom Range', value: 'custom' },
];

// ============================================
// COMPONENT
// ============================================

export function ExportDialog({
  open,
  onOpenChange,
  defaultReportType,
  defaultDateRange,
  ibId,
}: ExportDialogProps) {
  // State
  const [selectedReport, setSelectedReport] = useState<ReportType>(defaultReportType || 'transactions');
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');
  const [datePreset, setDatePreset] = useState('last_30_days');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize dates
  useEffect(() => {
    if (defaultDateRange) {
      setDateFrom(defaultDateRange.from.toISOString().split('T')[0]);
      setDateTo(defaultDateRange.to.toISOString().split('T')[0]);
      setDatePreset('custom');
    } else {
      applyDatePreset('last_30_days');
    }
  }, [defaultDateRange]);

  // Apply date preset
  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let from: Date;
    let to = new Date(today);

    switch (preset) {
      case 'today':
        from = new Date(today);
        break;
      case 'last_7_days':
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        break;
      case 'last_30_days':
        from = new Date(today);
        from.setDate(from.getDate() - 30);
        break;
      case 'this_month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this_quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        from = new Date(today.getFullYear(), quarter * 3, 1);
        break;
      case 'custom':
        return; // Don't change dates
      default:
        from = new Date(today);
        from.setDate(from.getDate() - 30);
    }

    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
  };

  // Handle preset change
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    applyDatePreset(preset);
  };

  // Handle export
  const handleExport = async () => {
    setError(null);
    setIsExporting(true);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          reportType: selectedReport,
          format: selectedFormat,
          dateFrom,
          dateTo,
          includeSummary,
          includeCharts: selectedFormat === 'pdf' ? includeCharts : false,
          includeDetails,
          ibId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'report';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle preview
  const handlePreview = async () => {
    setError(null);
    setIsPreviewing(true);
    setPreviewData(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          reportType: selectedReport,
          format: selectedFormat,
          dateFrom,
          dateTo,
          ibId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Preview failed');
      }

      const data = await response.json();
      setPreviewData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Get selected report info
  const selectedReportInfo = REPORT_TYPES.find(r => r.type === selectedReport);
  const selectedFormatInfo = EXPORT_FORMATS.find(f => f.format === selectedFormat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Generate and download reports in PDF, Excel, or CSV format
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="configure" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="configure">Configure</TabsTrigger>
              <TabsTrigger value="preview" disabled={!previewData}>
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Configuration Tab */}
            <TabsContent value="configure" className="space-y-4 mt-4">
              {/* Report Type Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Report Type</Label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {REPORT_TYPES.map(report => (
                    <Card
                      key={report.type}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedReport === report.type
                          ? 'ring-2 ring-primary border-primary'
                          : ''
                      }`}
                      onClick={() => setSelectedReport(report.type)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${report.color} text-white`}>
                            {report.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{report.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {report.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="flex flex-wrap gap-3">
                  <Select value={datePreset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-[180px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map(preset => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={e => {
                        setDateFrom(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="w-[150px]"
                      disabled={datePreset !== 'custom'}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={e => {
                        setDateTo(e.target.value);
                        setDatePreset('custom');
                      }}
                      className="w-[150px]"
                      disabled={datePreset !== 'custom'}
                    />
                  </div>
                </div>
              </div>

              {/* Export Format */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Export Format</Label>
                <div className="flex gap-3">
                  {EXPORT_FORMATS.map(format => (
                    <Card
                      key={format.format}
                      className={`flex-1 cursor-pointer transition-all hover:shadow-md ${
                        selectedFormat === format.format
                          ? 'ring-2 ring-primary border-primary'
                          : ''
                      }`}
                      onClick={() => setSelectedFormat(format.format)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        {format.icon}
                        <div>
                          <p className="text-sm font-medium">{format.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Include</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="summary"
                      checked={includeSummary}
                      onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                    />
                    <Label htmlFor="summary" className="text-sm">
                      Summary Section
                    </Label>
                  </div>
                  {selectedFormat === 'pdf' && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="charts"
                        checked={includeCharts}
                        onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                      />
                      <Label htmlFor="charts" className="text-sm">
                        Charts & Visualizations
                      </Label>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="details"
                      checked={includeDetails}
                      onCheckedChange={(checked) => setIncludeDetails(checked as boolean)}
                    />
                    <Label htmlFor="details" className="text-sm">
                      Detailed Data
                    </Label>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="p-3 flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              {previewData ? (
                <>
                  {/* Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Summary</CardTitle>
                      <CardDescription>
                        {previewData.metadata.title} • {previewData.rowCount} records
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(previewData.summary).slice(0, 8).map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-xs text-muted-foreground capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-sm font-medium">
                              {typeof value === 'number'
                                ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview Table */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Data Preview (First 10 rows)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {previewData.preview.length > 0 &&
                                Object.keys(previewData.preview[0]).map(key => (
                                  <th
                                    key={key}
                                    className="text-left p-2 font-medium capitalize"
                                  >
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                  </th>
                                ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.preview.map((row, i) => (
                              <tr key={i} className="border-b">
                                {Object.values(row).map((value, j) => (
                                  <td key={j} className="p-2 text-muted-foreground">
                                    {typeof value === 'object'
                                      ? JSON.stringify(value)
                                      : String(value ?? '')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Click "Preview" to see a sample of the data</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Separator />

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {selectedReportInfo && (
              <Badge variant="outline" className="gap-1">
                {selectedReportInfo.icon}
                {selectedReportInfo.name}
              </Badge>
            )}
            {selectedFormatInfo && (
              <Badge variant="secondary" className="gap-1">
                {selectedFormatInfo.icon}
                {selectedFormatInfo.name}
              </Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={isPreviewing || isExporting}
            >
              {isPreviewing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// QUICK EXPORT BUTTON
// ============================================

interface QuickExportButtonProps {
  reportType: ReportType;
  format?: ExportFormat;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  ibId?: string;
  onExportComplete?: () => void;
}

export function QuickExportButton({
  reportType,
  format = 'xlsx',
  label = 'Export',
  variant = 'outline',
  size = 'default',
  ibId,
  onExportComplete,
}: QuickExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_export',
          reportType,
          format,
          ibId,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'report';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.();
    } catch (error) {
      console.error('Quick export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleQuickExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}

// ============================================
// EXPORT DROPDOWN
// ============================================

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportDropdownProps {
  reportType: ReportType;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  ibId?: string;
  onExportComplete?: () => void;
}

export function ExportDropdown({
  reportType,
  label = 'Export',
  variant = 'outline',
  size = 'default',
  ibId,
  onExportComplete,
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_export',
          reportType,
          format,
          ibId,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'report';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {EXPORT_FORMATS.map(format => (
          <DropdownMenuItem
            key={format.format}
            onClick={() => handleExport(format.format)}
            disabled={isExporting !== null}
          >
            <div className="flex items-center gap-2">
              {isExporting === format.format ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                format.icon
              )}
              <div>
                <p className="font-medium">{format.name}</p>
                <p className="text-xs text-muted-foreground">{format.description}</p>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
