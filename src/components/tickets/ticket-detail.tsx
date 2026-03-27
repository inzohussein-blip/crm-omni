'use client';

/**
 * OMNI-CRM Support Ticket Detail View
 * Comprehensive ticket detail with message thread, reply, status changes, and internal notes
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Ticket,
  Clock,
  AlertTriangle,
  User,
  Building,
  Send,
  Paperclip,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  MessageSquare,
  Calendar,
  Star,
  X,
  ChevronDown,
  UserPlus,
} from 'lucide-react';
import type { SupportTicket, TicketMessage, TicketStatus, Priority, User as UserType } from '@/types';

// ============================================
// STATUS CONFIG
// ============================================

const statusConfig: Record<TicketStatus, { label: string; color: string; bgColor: string }> = {
  OPEN: { label: 'Open', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  WAITING_CUSTOMER: { label: 'Waiting Customer', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  WAITING_THIRD_PARTY: { label: 'Waiting Third Party', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  ESCALATED: { label: 'Escalated', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  RESOLVED: { label: 'Resolved', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  CLOSED: { label: 'Closed', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
};

const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string; icon: typeof ArrowUp }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: ArrowUp },
  HIGH: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: ArrowUp },
  MEDIUM: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: ArrowUp },
  LOW: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800/30', icon: ArrowDown },
};

// Valid status transitions
const statusTransitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'WAITING_THIRD_PARTY', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  WAITING_CUSTOMER: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  WAITING_THIRD_PARTY: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

// ============================================
// TICKET DETAIL COMPONENT
// ============================================

interface TicketDetailProps {
  ticket: SupportTicket | null;
  isLoading?: boolean;
  onClose?: () => void;
  onStatusChange?: (ticketId: string, status: TicketStatus) => Promise<void>;
  onPriorityChange?: (ticketId: string, priority: Priority) => Promise<void>;
  onAssign?: (ticketId: string, agentId: string) => Promise<void>;
  onSendMessage?: (ticketId: string, content: string, attachments?: File[], isInternal?: boolean) => Promise<void>;
  users?: Partial<UserType>[];
}

export function TicketDetail({
  ticket,
  isLoading,
  onClose,
  onStatusChange,
  onPriorityChange,
  onAssign,
  onSendMessage,
  users = [],
}: TicketDetailProps) {
  const [messageContent, setMessageContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'details'>('messages');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  if (!ticket) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Select a ticket to view details</p>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];
  const PriorityIcon = priority.icon;

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageContent.trim() || !onSendMessage) return;

    setIsSending(true);
    try {
      await onSendMessage(ticket.id, messageContent, attachments, isInternal);
      setMessageContent('');
      setAttachments([]);
      setIsInternal(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle file attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  // Calculate SLA status
  const slaRemaining = ticket.slaRemaining ?? 0;
  const slaStatus = ticket.isOverdue ? 'overdue' : slaRemaining <= 30 ? 'critical' : slaRemaining <= 60 ? 'warning' : 'normal';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-muted-foreground" />
              <span className="font-mono text-sm">{ticket.ticketNumber}</span>
              <Badge className={cn(status.bgColor, status.color)}>
                {status.label}
              </Badge>
              <Badge className={cn(priority.bgColor, priority.color, 'gap-1')}>
                <PriorityIcon className="h-3 w-3" />
                {priority.label}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold">{ticket.subject}</h2>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Client Info */}
        <div className="flex items-center gap-4 text-sm">
          {ticket.user && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={ticket.user.avatar} />
                <AvatarFallback className="text-xs">
                  {ticket.user.name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{ticket.user.name}</span>
              <span className="text-muted-foreground">{ticket.user.email}</span>
            </div>
          )}
        </div>

        {/* SLA Alert */}
        {slaStatus !== 'normal' && (
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            slaStatus === 'overdue' ? 'bg-red-100 dark:bg-red-900/20' :
            'bg-orange-100 dark:bg-orange-900/20'
          )}>
            <AlertTriangle className={cn(
              'h-4 w-4',
              slaStatus === 'overdue' ? 'text-red-600' : 'text-orange-600'
            )} />
            <span className={cn(
              'text-sm font-medium',
              slaStatus === 'overdue' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
            )}>
              {slaStatus === 'overdue' ? 'SLA Breached!' : `SLA deadline in ${slaRemaining} minutes`}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <Select
            value={ticket.status}
            onValueChange={(value) => onStatusChange?.(ticket.id, value as TicketStatus)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {statusTransitions[ticket.status].map((s) => (
                <SelectItem key={s} value={s}>
                  {statusConfig[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Dropdown */}
          <Select
            value={ticket.priority}
            onValueChange={(value) => onPriorityChange?.(ticket.id, value as Priority)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assign Dropdown */}
          <Select
            value={ticket.assignedToId || ''}
            onValueChange={(value) => onAssign?.(ticket.id, value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id || ''}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Created {formatDate(ticket.createdAt)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p>Updated: {formatDate(ticket.updatedAt)}</p>
                    {ticket.firstResponseAt && (
                      <p>First Response: {formatDate(ticket.firstResponseAt)}</p>
                    )}
                    {ticket.resolvedAt && (
                      <p>Resolved: {formatDate(ticket.resolvedAt)}</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {ticket.messages && ticket.messages.length > 0 ? (
            ticket.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={ticket.assignedToId}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Box */}
      <div className="border-t border-border p-4 space-y-3">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm"
              >
                <FileText className="h-4 w-4" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={() => removeAttachment(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder={isInternal ? "Add internal note..." : "Type your reply..."}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4 mr-1" />
                  Attach
                </Button>
                <Button
                  variant={isInternal ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setIsInternal(!isInternal)}
                  className={cn(isInternal && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400')}
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Internal Note
                </Button>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || isSending}
              >
                <Send className="h-4 w-4 mr-1" />
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================

interface MessageBubbleProps {
  message: TicketMessage;
  currentUserId?: string;
}

function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isClient = message.senderType === 'client';
  const isStaff = message.senderType === 'staff';
  const isSystem = message.senderType === 'system';
  const isInternal = message.isInternal;

  // Parse attachments
  const attachments = message.attachments || [];

  return (
    <div className={cn(
      'flex gap-3',
      isClient && 'flex-row',
      !isClient && 'flex-row-reverse'
    )}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.sender?.avatar} />
        <AvatarFallback className={cn(
          'text-xs',
          isClient && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          isStaff && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          isSystem && 'bg-gray-100 text-gray-700 dark:bg-gray-800/30 dark:text-gray-400'
        )}>
          {message.sender?.name?.slice(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        'flex-1 max-w-[80%] space-y-1',
        isClient && 'items-start',
        !isClient && 'items-end'
      )}>
        <div className={cn(
          'flex items-center gap-2 text-xs',
          !isClient && 'flex-row-reverse'
        )}>
          <span className="font-medium">{message.sender?.name || 'Unknown'}</span>
          {isInternal && (
            <Badge variant="outline" className="text-amber-600 text-[10px]">
              <Lock className="h-3 w-3 mr-1" />
              Internal
            </Badge>
          )}
          <span className="text-muted-foreground">
            {new Date(message.createdAt).toLocaleString()}
          </span>
        </div>

        <div className={cn(
          'rounded-lg p-3',
          isInternal && 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
          !isInternal && isClient && 'bg-blue-50 dark:bg-blue-900/20',
          !isInternal && !isClient && 'bg-muted'
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {attachments.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-sm hover:bg-muted/80"
              >
                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <ImageIcon className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="truncate max-w-[100px]">{url.split('/').pop()}</span>
                <Download className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketDetail;
