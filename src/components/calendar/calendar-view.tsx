'use client';

/**
 * OMNI-CRM Calendar View Component
 * Full-featured calendar with Month/Week/Day views, drag & drop, and event management
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  Repeat,
  Bell,
  Trash2,
  Edit,
  MoreHorizontal,
  GripVertical,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  differenceInMinutes,
  addMinutes,
  isSameWeek,
} from 'date-fns';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type ViewType = 'month' | 'week' | 'day';
type EventType = 'MEETING' | 'CALL' | 'REMINDER' | 'DEADLINE' | 'TRAINING' | 'MARKETING' | 'COMPLIANCE' | 'OTHER';
type ResponseStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type: EventType;
  color: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  isAllDay: boolean;
  timezone: string;
  isRecurring: boolean;
  recurrenceRule?: string | null;
  organizerId: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
  attendees?: Array<{
    eventId: string;
    userId: string;
    responseStatus: ResponseStatus;
  }>;
  reminders?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  googleEventId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface EventFormData {
  title: string;
  description: string;
  type: EventType;
  color: string;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  isRecurring: boolean;
  recurrenceFreq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurrenceInterval: number;
}

// ============================================
// CONSTANTS
// ============================================

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  MEETING: '#3b82f6',
  CALL: '#10b981',
  REMINDER: '#f59e0b',
  DEADLINE: '#ef4444',
  TRAINING: '#8b5cf6',
  MARKETING: '#ec4899',
  COMPLIANCE: '#06b6d4',
  OTHER: '#6b7280',
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  MEETING: 'Meeting',
  CALL: 'Call',
  REMINDER: 'Reminder',
  DEADLINE: 'Deadline',
  TRAINING: 'Training',
  MARKETING: 'Marketing',
  COMPLIANCE: 'Compliance',
  OTHER: 'Other',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ============================================
// DUMMY DATA
// ============================================

const generateDummyEvents = (): CalendarEvent[] => {
  const today = new Date();
  const events: CalendarEvent[] = [];

  // Today's events
  events.push({
    id: '1',
    title: 'Team Standup',
    description: 'Daily team sync meeting',
    type: 'MEETING',
    color: EVENT_TYPE_COLORS.MEETING,
    startAt: setHours(setMinutes(today, 0), 9),
    endAt: setHours(setMinutes(today, 30), 9),
    isAllDay: false,
    timezone: 'UTC',
    isRecurring: true,
    recurrenceRule: 'FREQ=DAILY;INTERVAL=1',
    organizerId: 'user-1',
    createdAt: today,
    updatedAt: today,
  });

  events.push({
    id: '2',
    title: 'Client Call - KYC Review',
    description: 'Review KYC documents with client',
    type: 'CALL',
    color: EVENT_TYPE_COLORS.CALL,
    startAt: setHours(setMinutes(today, 0), 11),
    endAt: setHours(setMinutes(today, 0), 12),
    isAllDay: false,
    timezone: 'UTC',
    isRecurring: false,
    organizerId: 'user-1',
    createdAt: today,
    updatedAt: today,
  });

  events.push({
    id: '3',
    title: 'Deposit Approval Deadline',
    description: 'Process pending deposits before EOD',
    type: 'DEADLINE',
    color: EVENT_TYPE_COLORS.DEADLINE,
    startAt: setHours(setMinutes(today, 0), 17),
    endAt: setHours(setMinutes(today, 0), 18),
    isAllDay: false,
    timezone: 'UTC',
    isRecurring: false,
    organizerId: 'user-1',
    createdAt: today,
    updatedAt: today,
  });

  // Tomorrow's events
  const tomorrow = addDays(today, 1);
  events.push({
    id: '4',
    title: 'Training: AML Compliance',
    description: 'Mandatory AML training session',
    type: 'TRAINING',
    color: EVENT_TYPE_COLORS.TRAINING,
    startAt: setHours(setMinutes(tomorrow, 0), 10),
    endAt: setHours(setMinutes(tomorrow, 0), 12),
    isAllDay: false,
    timezone: 'UTC',
    isRecurring: false,
    organizerId: 'user-1',
    createdAt: today,
    updatedAt: today,
  });

  // This week events
  const in2Days = addDays(today, 2);
  events.push({
    id: '5',
    title: 'Marketing Campaign Review',
    description: 'Review Q4 marketing campaigns',
    type: 'MARKETING',
    color: EVENT_TYPE_COLORS.MARKETING,
    startAt: setHours(setMinutes(in2Days, 0), 14),
    endAt: setHours(setMinutes(in2Days, 0), 15),
    isAllDay: false,
    timezone: 'UTC',
    isRecurring: false,
    organizerId: 'user-1',
    createdAt: today,
    updatedAt: today,
  });

  const in3Days = addDays(today, 3);
  events.push({
    id: '6',
    title: 'Compliance Audit Prep',
    description: 'Prepare for upcoming compliance audit',
    type: 'COMPLIANCE',
    color: EVENT_TYPE_COLORS.COMPLIANCE,
    startAt: setHours(setMinutes(in3Days, 0), 9),
    endAt: setHours(setMinutes(in3Days, 0), 17),
    isAllDay: true,
    timezone: 'UTC',
    isRecurring: false,
    organizerId: 'user-1',
    createdAt: today,
    updatedAt: today,
  });

  return events;
};

// ============================================
// SUB-COMPONENTS
// ============================================

interface EventChipProps {
  event: CalendarEvent;
  onClick?: () => void;
  compact?: boolean;
}

function EventChip({ event, onClick, compact = false }: EventChipProps) {
  const startDate = event.startAt instanceof Date ? event.startAt : parseISO(event.startAt);
  
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'rounded px-2 py-1 cursor-pointer transition-all hover:shadow-md',
        compact ? 'text-xs truncate' : 'text-sm'
      )}
      style={{ 
        backgroundColor: event.color + '20',
        borderLeft: `3px solid ${event.color}`,
      }}
    >
      <div className="font-medium truncate" style={{ color: event.color }}>
        {event.title}
      </div>
      {!compact && !event.isAllDay && (
        <div className="text-xs text-muted-foreground">
          {format(startDate, 'HH:mm')}
        </div>
      )}
    </div>
  );
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}

function MonthView({ currentDate, events, onEventClick, onDateClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = event.startAt instanceof Date ? event.startAt : parseISO(event.startAt);
      return isSameDay(eventStart, date);
    });
  };

  return (
    <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
      {/* Weekday Headers */}
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
        <div key={day} className="bg-muted p-2 text-center text-sm font-medium">
          {day}
        </div>
      ))}
      
      {/* Calendar Days */}
      {days.map((day, idx) => {
        const dayEvents = getEventsForDay(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        
        return (
          <div
            key={idx}
            onClick={() => onDateClick(day)}
            className={cn(
              'min-h-24 p-1 bg-background cursor-pointer hover:bg-muted/50 transition-colors',
              !isCurrentMonth && 'bg-muted/30 text-muted-foreground'
            )}
          >
            <div className={cn(
              'text-sm p-1 rounded-full w-7 h-7 flex items-center justify-center',
              isToday(day) && 'bg-primary text-primary-foreground font-bold'
            )}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1 mt-1">
              {dayEvents.slice(0, 3).map(event => (
                <EventChip
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  compact
                />
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground px-2">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
}

function WeekView({ currentDate, events, onEventClick, onTimeSlotClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getEventsForDayAndHour = (date: Date, hour: number) => {
    return events.filter(event => {
      if (event.isAllDay) return false;
      const eventStart = event.startAt instanceof Date ? event.startAt : parseISO(event.startAt);
      return isSameDay(eventStart, date) && getHours(eventStart) === hour;
    });
  };

  const getAllDayEvents = (date: Date) => {
    return events.filter(event => {
      const eventStart = event.startAt instanceof Date ? event.startAt : parseISO(event.startAt);
      return isSameDay(eventStart, date) && event.isAllDay;
    });
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 bg-muted">
        <div className="p-2 text-center text-sm font-medium border-r">Time</div>
        {days.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              'p-2 text-center border-r last:border-r-0',
              isToday(day) && 'bg-primary/10'
            )}
          >
            <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
            <div className={cn(
              'text-lg font-semibold',
              isToday(day) && 'text-primary'
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events */}
      <div className="grid grid-cols-8 bg-muted/50 border-t">
        <div className="p-2 text-xs text-muted-foreground border-r">All-day</div>
        {days.map((day, idx) => {
          const allDayEvents = getAllDayEvents(day);
          return (
            <div key={idx} className="p-1 border-r last:border-r-0 min-h-8">
              {allDayEvents.map(event => (
                <EventChip
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  compact
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <ScrollArea className="h-96">
        <div className="relative">
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-t">
              {/* Time label */}
              <div className="p-2 text-xs text-muted-foreground border-r text-right">
                {format(setHours(new Date(), hour), 'HH:00')}
              </div>
              
              {/* Day columns */}
              {days.map((day, idx) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                
                return (
                  <div
                    key={idx}
                    onClick={() => onTimeSlotClick(day, hour)}
                    className="min-h-12 border-r last:border-r-0 p-0.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {hourEvents.map(event => (
                      <EventChip
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
}

function DayView({ currentDate, events, onEventClick, onTimeSlotClick }: DayViewProps) {
  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      if (event.isAllDay) return false;
      const eventStart = event.startAt instanceof Date ? event.startAt : parseISO(event.startAt);
      return isSameDay(eventStart, currentDate) && getHours(eventStart) === hour;
    });
  };

  const allDayEvents = events.filter(event => {
    const eventStart = event.startAt instanceof Date ? event.startAt : parseISO(event.startAt);
    return isSameDay(eventStart, currentDate) && event.isAllDay;
  });

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Header */}
      <div className={cn(
        'p-4 bg-muted text-center',
        isToday(currentDate) && 'bg-primary/10'
      )}>
        <div className="text-sm text-muted-foreground">{format(currentDate, 'EEEE')}</div>
        <div className={cn(
          'text-2xl font-bold',
          isToday(currentDate) && 'text-primary'
        )}>
          {format(currentDate, 'MMMM d, yyyy')}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="p-2 bg-muted/50 border-t">
          <div className="text-xs text-muted-foreground mb-1">All-day</div>
          <div className="space-y-1">
            {allDayEvents.map(event => (
              <EventChip
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <ScrollArea className="h-96">
        <div className="relative">
          {HOURS.map(hour => {
            const hourEvents = getEventsForHour(hour);
            
            return (
              <div key={hour} className="grid grid-cols-1 border-t">
                <div
                  onClick={() => onTimeSlotClick(currentDate, hour)}
                  className="min-h-14 p-2 cursor-pointer hover:bg-muted/50 transition-colors flex gap-2"
                >
                  <div className="w-12 text-xs text-muted-foreground text-right shrink-0">
                    {format(setHours(new Date(), hour), 'HH:00')}
                  </div>
                  <div className="flex-1 space-y-1">
                    {hourEvents.map(event => (
                      <EventChip
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  mode: 'create' | 'edit' | 'view';
  defaultDate?: Date;
  defaultHour?: number;
  onSave: (data: EventFormData) => void;
  onDelete?: () => void;
}

function EventDialog({ open, onOpenChange, event, mode, defaultDate, defaultHour, onSave, onDelete }: EventDialogProps) {
  // Memoize initial form data - this is computed once on mount and when key changes
  const initialFormData = useMemo((): EventFormData => {
    if (event && (mode === 'edit' || mode === 'view')) {
      return {
        title: event.title,
        description: event.description || '',
        type: event.type,
        color: event.color,
        startAt: event.startAt instanceof Date ? event.startAt : parseISO(event.startAt),
        endAt: event.endAt 
          ? (event.endAt instanceof Date ? event.endAt : parseISO(event.endAt))
          : addHours(event.startAt instanceof Date ? event.startAt : parseISO(event.startAt), 1),
        isAllDay: event.isAllDay,
        isRecurring: event.isRecurring,
        recurrenceFreq: 'DAILY',
        recurrenceInterval: 1,
      };
    }
    
    if (mode === 'create' && defaultDate) {
      return {
        title: '',
        description: '',
        type: 'MEETING',
        color: EVENT_TYPE_COLORS.MEETING,
        startAt: setHours(setMinutes(defaultDate, 0), defaultHour || 9),
        endAt: setHours(setMinutes(defaultDate, 0), (defaultHour || 9) + 1),
        isAllDay: false,
        isRecurring: false,
        recurrenceFreq: 'DAILY',
        recurrenceInterval: 1,
      };
    }
    
    return {
      title: '',
      description: '',
      type: 'MEETING',
      color: EVENT_TYPE_COLORS.MEETING,
      startAt: new Date(),
      endAt: addHours(new Date(), 1),
      isAllDay: false,
      isRecurring: false,
      recurrenceFreq: 'DAILY',
      recurrenceInterval: 1,
    };
  }, [event, mode, defaultDate, defaultHour]);

  const [formData, setFormData] = useState<EventFormData>(initialFormData);

  const handleTypeChange = (type: EventType) => {
    setFormData(prev => ({
      ...prev,
      type,
      color: EVENT_TYPE_COLORS[type],
    }));
  };

  const handleSubmit = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const isViewMode = mode === 'view';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New Event' : mode === 'edit' ? 'Edit Event' : 'Event Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new calendar event' : mode === 'edit' ? 'Modify event details' : 'View event information'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Event title"
              disabled={isViewMode}
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={formData.type} onValueChange={handleTypeChange} disabled={isViewMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(type => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
                      />
                      {EVENT_TYPE_LABELS[type]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="allDay">All Day</Label>
            <Switch
              id="allDay"
              checked={formData.isAllDay}
              onCheckedChange={checked => setFormData(prev => ({ ...prev, isAllDay: checked }))}
              disabled={isViewMode}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" disabled={isViewMode}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.startAt, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startAt}
                    onSelect={date => date && setFormData(prev => ({ ...prev, startAt: date }))}
                  />
                </PopoverContent>
              </Popover>
              {!formData.isAllDay && (
                <Input
                  type="time"
                  value={format(formData.startAt, 'HH:mm')}
                  onChange={e => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    setFormData(prev => ({
                      ...prev,
                      startAt: setHours(setMinutes(prev.startAt, minutes), hours),
                    }));
                  }}
                  disabled={isViewMode}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" disabled={isViewMode}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.endAt, 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endAt}
                    onSelect={date => date && setFormData(prev => ({ ...prev, endAt: date }))}
                  />
                </PopoverContent>
              </Popover>
              {!formData.isAllDay && (
                <Input
                  type="time"
                  value={format(formData.endAt, 'HH:mm')}
                  onChange={e => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    setFormData(prev => ({
                      ...prev,
                      endAt: setHours(setMinutes(prev.endAt, minutes), hours),
                    }));
                  }}
                  disabled={isViewMode}
                />
              )}
            </div>
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Recurring</Label>
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, isRecurring: checked }))}
                disabled={isViewMode}
              />
            </div>
            {formData.isRecurring && (
              <div className="flex gap-2">
                <Select 
                  value={formData.recurrenceFreq} 
                  onValueChange={(value: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY') => 
                    setFormData(prev => ({ ...prev, recurrenceFreq: value }))
                  }
                  disabled={isViewMode}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={formData.recurrenceInterval}
                  onChange={e => setFormData(prev => ({ ...prev, recurrenceInterval: parseInt(e.target.value) || 1 }))}
                  placeholder="Interval"
                  className="w-24"
                  disabled={isViewMode}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Event description..."
              rows={3}
              disabled={isViewMode}
            />
          </div>

          {/* Event info for view mode */}
          {isViewMode && event && (
            <div className="space-y-2 text-sm text-muted-foreground">
              {event.isRecurring && (
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  <span>Recurring event</span>
                </div>
              )}
              {event.googleEventId && (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Synced with Google Calendar</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {mode === 'view' && event && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          {mode === 'create' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.title}>
                Create Event
              </Button>
            </>
          )}
          {mode === 'edit' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.title}>
                Save Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper function
function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}

// ============================================
// MAIN COMPONENT
// ============================================

interface CalendarViewProps {
  userId?: string;
}

export function CalendarView({ userId = 'demo-user' }: CalendarViewProps) {
  const [view, setView] = useState<ViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultHour, setDefaultHour] = useState<number | undefined>();

  // Load events
  useEffect(() => {
    loadEvents();
  }, [currentDate, view, userId]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to fetch from API
      const response = await fetch(
        `/api/calendar?action=view&view=${view}&date=${currentDate.toISOString()}&userId=${userId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.events?.length > 0) {
          setEvents(data.data.events);
        } else {
          // Use dummy data if no events from API
          setEvents(generateDummyEvents());
        }
      } else {
        // Use dummy data on error
        setEvents(generateDummyEvents());
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      // Use dummy data on error
      setEvents(generateDummyEvents());
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, view, userId]);

  // Navigation handlers
  const navigatePrev = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate(prev => subMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => subWeeks(prev, 1));
        break;
      case 'day':
        setCurrentDate(prev => subDays(prev, 1));
        break;
    }
  }, [view]);

  const navigateNext = useCallback(() => {
    switch (view) {
      case 'month':
        setCurrentDate(prev => addMonths(prev, 1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, 1));
        break;
      case 'day':
        setCurrentDate(prev => addDays(prev, 1));
        break;
    }
  }, [view]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Event handlers
  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogMode('view');
    setDialogOpen(true);
  }, []);

  const handleDateClick = useCallback((date: Date) => {
    setDefaultDate(date);
    setDefaultHour(9);
    setSelectedEvent(null);
    setDialogMode('create');
    setDialogOpen(true);
  }, []);

  const handleTimeSlotClick = useCallback((date: Date, hour: number) => {
    setDefaultDate(date);
    setDefaultHour(hour);
    setSelectedEvent(null);
    setDialogMode('create');
    setDialogOpen(true);
  }, []);

  const handleSaveEvent = useCallback(async (data: EventFormData) => {
    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: dialogMode === 'create' ? 'create' : 'update',
          ...(dialogMode === 'edit' && { eventId: selectedEvent?.id }),
          title: data.title,
          type: data.type,
          color: data.color,
          startAt: data.startAt.toISOString(),
          endAt: data.endAt.toISOString(),
          isAllDay: data.isAllDay,
          isRecurring: data.isRecurring,
          recurrenceRule: data.isRecurring ? {
            freq: data.recurrenceFreq,
            interval: data.recurrenceInterval,
          } : undefined,
          description: data.description,
          organizerId: userId,
        }),
      });

      if (response.ok) {
        loadEvents();
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  }, [dialogMode, selectedEvent, userId, loadEvents]);

  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return;

    try {
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          eventId: selectedEvent.id,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        loadEvents();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }, [selectedEvent, loadEvents]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayEvents = events.filter(e => {
      const start = e.startAt instanceof Date ? e.startAt : parseISO(e.startAt);
      return isSameDay(start, today);
    });
    const upcoming = events.filter(e => {
      const start = e.startAt instanceof Date ? e.startAt : parseISO(e.startAt);
      return start > today;
    });

    return {
      today: todayEvents.length,
      upcoming: upcoming.length,
      total: events.length,
    };
  }, [events]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Calendar</h2>
          <p className="text-muted-foreground">Manage your events and schedule</p>
        </div>
        <Button onClick={() => { setSelectedEvent(null); setDialogMode('create'); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={navigateToday}>
                Today
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold ml-2">
                {view === 'month' && format(currentDate, 'MMMM yyyy')}
                {view === 'week' && `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`}
                {view === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(type => (
              <Badge
                key={type}
                variant="outline"
                className="gap-1"
                style={{ borderColor: EVENT_TYPE_COLORS[type], color: EVENT_TYPE_COLORS[type] }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[type] }}
                />
                {EVENT_TYPE_LABELS[type]}
              </Badge>
            ))}
          </div>

          {/* Calendar View */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {view === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onDateClick={handleDateClick}
                />
              )}
              {view === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              )}
              {view === 'day' && (
                <DayView
                  currentDate={currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={handleTimeSlotClick}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <EventDialog
        key={selectedEvent?.id || (dialogMode === 'create' ? 'new' : '')}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        mode={dialogMode}
        defaultDate={defaultDate}
        defaultHour={defaultHour}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

export default CalendarView;
