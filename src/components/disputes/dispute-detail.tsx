'use client';

/**
 * OMNI-CRM Dispute Detail Component
 * Full dispute view with messages, evidence, and resolution handling
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertTriangle,
  Scale,
  Clock,
  DollarSign,
  FileText,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
  ArrowUpRight,
  Send,
  Paperclip,
  Eye,
  Download,
  Trash2,
  Plus,
  MessageSquare,
  Shield,
  Building2,
  Calendar,
  FileImage,
  Video,
  Mail,
  MessageCircle,
  Receipt,
  File,
  ChevronLeft,
} from 'lucide-react';
import type { Dispute, DisputeMessage, EvidenceItem, DisputeStatus } from './dispute-list';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getStatusColor = (status: DisputeStatus) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'IN_REVIEW':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'ESCALATED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'RESOLVED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCategoryLabel = (category: string) => {
  return category.replace(/_/g, ' ');
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

const getEvidenceIcon = (type: EvidenceItem['type']) => {
  switch (type) {
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'image':
    case 'screenshot':
      return <FileImage className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'chat_log':
      return <MessageCircle className="h-4 w-4" />;
    case 'transaction_record':
      return <Receipt className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

// ============================================
// RESOLUTION DIALOG
// ============================================

interface ResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (data: { resolution: string; resolutionType: string; refundAmount?: number }) => void;
  isLoading: boolean;
}

function ResolutionDialog({ open, onOpenChange, onResolve, isLoading }: ResolutionDialogProps) {
  const [resolution, setResolution] = useState('');
  const [resolutionType, setResolutionType] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');

  const handleResolve = () => {
    onResolve({
      resolution,
      resolutionType,
      refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
    });
    setResolution('');
    setResolutionType('');
    setRefundAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Dispute</DialogTitle>
          <DialogDescription>
            Provide resolution details for this dispute case.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resolution Type</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select resolution type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="refund">Full Refund</SelectItem>
                <SelectItem value="partial_refund">Partial Refund</SelectItem>
                <SelectItem value="compensation">Compensation</SelectItem>
                <SelectItem value="resolved">Resolved (No Financial Action)</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(resolutionType === 'refund' || resolutionType === 'partial_refund' || resolutionType === 'compensation') && (
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Resolution Notes</Label>
            <Textarea
              placeholder="Describe the resolution..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={!resolution || !resolutionType || isLoading}>
            {isLoading ? 'Resolving...' : 'Resolve Dispute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// ESCALATE DIALOG
// ============================================

interface EscalateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEscalate: (reason: string) => void;
  isLoading: boolean;
}

function EscalateDialog({ open, onOpenChange, onEscalate, isLoading }: EscalateDialogProps) {
  const [reason, setReason] = useState('');

  const handleEscalate = () => {
    onEscalate(reason);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate Dispute</DialogTitle>
          <DialogDescription>
            Escalate this dispute to senior management for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason for Escalation</Label>
            <Textarea
              placeholder="Explain why this dispute needs escalation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleEscalate} 
            disabled={!reason || isLoading}
          >
            {isLoading ? 'Escalating...' : 'Escalate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface DisputeDetailProps {
  dispute: Dispute | null;
  onClose?: () => void;
  onUpdated?: () => void;
}

export function DisputeDetail({ dispute, onClose, onUpdated }: DisputeDetailProps) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showResolutionDialog, setShowResolutionDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DisputeStatus | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!dispute) return;
    
    try {
      const response = await fetch(`/api/disputes?action=messages&disputeId=${dispute.id}&includeInternal=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMessages(data.data.messages || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [dispute]);

  useEffect(() => {
    if (dispute) {
      setMessages(dispute.messages || []);
      setSelectedStatus(dispute.status as DisputeStatus);
    }
  }, [dispute]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send reply
  const handleSendReply = async () => {
    if (!dispute || !replyText.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_message',
          disputeId: dispute.id,
          senderId: 'staff_user', // In real app, get from auth
          senderType: 'staff',
          content: replyText,
          isInternal,
        }),
      });
      
      if (response.ok) {
        setReplyText('');
        fetchMessages();
        onUpdated?.();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update status
  const handleStatusChange = async (newStatus: DisputeStatus) => {
    if (!dispute || newStatus === dispute.status) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: dispute.id,
          status: newStatus,
          actorId: 'staff_user', // In real app, get from auth
        }),
      });
      
      if (response.ok) {
        setSelectedStatus(newStatus);
        fetchMessages();
        onUpdated?.();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Resolve dispute
  const handleResolve = async (data: { resolution: string; resolutionType: string; refundAmount?: number }) => {
    if (!dispute) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve',
          id: dispute.id,
          ...data,
          resolvedBy: 'staff_user', // In real app, get from auth
        }),
      });
      
      if (response.ok) {
        setShowResolutionDialog(false);
        fetchMessages();
        onUpdated?.();
      }
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Escalate dispute
  const handleEscalate = async (reason: string) => {
    if (!dispute) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'escalate',
          id: dispute.id,
          reason,
          escalatedBy: 'staff_user', // In real app, get from auth
        }),
      });
      
      if (response.ok) {
        setShowEscalateDialog(false);
        fetchMessages();
        onUpdated?.();
      }
    } catch (error) {
      console.error('Failed to escalate dispute:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!dispute) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-[600px] text-center">
          <Scale className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Dispute Selected</h3>
          <p className="text-muted-foreground">
            Select a dispute from the list to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold">{dispute.caseNumber}</span>
              <Badge className={getStatusColor(dispute.status as DisputeStatus)}>
                {dispute.status.replace('_', ' ')}
              </Badge>
            </div>
            <h2 className="text-xl font-semibold mt-1">{dispute.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMessages()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Client Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={dispute.client?.avatar} />
                <AvatarFallback>
                  {dispute.client?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{dispute.client?.name || 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">{dispute.client?.email}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Against Entity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Against
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                {dispute.againstType === 'broker' ? (
                  <Building2 className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="font-medium capitalize">{dispute.againstType}</div>
                {dispute.againstEntity && (
                  <div className="text-sm text-muted-foreground">{dispute.againstEntity.name}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dispute Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{getCategoryLabel(dispute.category)}</span>
            </div>
            {dispute.amount && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-red-500">
                  {formatCurrency(dispute.amount, dispute.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{formatDate(dispute.createdAt)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Status:</Label>
              <Select
                value={selectedStatus || undefined}
                onValueChange={(value) => handleStatusChange(value as DisputeStatus)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {dispute.status !== 'ESCALATED' && dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEscalateDialog(true)}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Escalate
                </Button>
              )}
              {dispute.status !== 'RESOLVED' && dispute.status !== 'CLOSED' && (
                <Button
                  size="sm"
                  onClick={() => setShowResolutionDialog(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{dispute.description}</p>
        </CardContent>
      </Card>

      {/* Evidence */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Evidence ({dispute.evidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {dispute.evidence.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                    {getEvidenceIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {item.type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolution */}
      {dispute.resolution && (
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Resolution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {dispute.resolutionType?.replace('_', ' ')}
              </Badge>
              {dispute.resolver && (
                <span className="text-sm text-muted-foreground">
                  by {dispute.resolver.name}
                </span>
              )}
            </div>
            <p className="text-sm">{dispute.resolution}</p>
            {dispute.resolvedAt && (
              <p className="text-xs text-muted-foreground">
                Resolved on {formatDate(dispute.resolvedAt)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communication Thread ({messages.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] mb-4 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isInternal ? 'bg-amber-50 dark:bg-amber-900/20 -mx-4 px-4 py-2' : ''}`}
                >
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={message.sender?.avatar} />
                    <AvatarFallback>
                      {message.sender?.name?.charAt(0) || message.senderType.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {message.sender?.name || 'Unknown'}
                      </span>
                      {message.senderType === 'system' && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                      {message.isInternal && (
                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800">
                          Internal Note
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{message.content}</p>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {message.attachments.map((att, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {att}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Separator className="my-4" />

          {/* Reply Box */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant={isInternal ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsInternal(!isInternal)}
              >
                {isInternal ? 'Internal Note' : 'Public Reply'}
              </Button>
              <span className="text-xs text-muted-foreground">
                {isInternal 
                  ? 'Only visible to staff' 
                  : 'Visible to client'}
              </span>
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder={isInternal ? 'Add internal note...' : 'Type your reply...'}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || isLoading}
              >
                <Send className="h-4 w-4 mr-2" />
                Send {isInternal ? 'Note' : 'Reply'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ResolutionDialog
        open={showResolutionDialog}
        onOpenChange={setShowResolutionDialog}
        onResolve={handleResolve}
        isLoading={isLoading}
      />
      <EscalateDialog
        open={showEscalateDialog}
        onOpenChange={setShowEscalateDialog}
        onEscalate={handleEscalate}
        isLoading={isLoading}
      />
    </div>
  );
}
