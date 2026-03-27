'use client';

/**
 * Calendar Component
 * Event scheduling with reminders and Google Calendar sync
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  Bell,
  MoreHorizontal,
  Video,
  Phone,
  FileText,
  CalendarDays,
  List,
  Grid3X3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';

// ============================================
// Types
// ============================================

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: 'MEETING' | 'CALL' | 'REMINDER' | 'DEADLINE' | 'TRAINING' | 'MARKETING' | 'COMPLIANCE' | 'OTHER';
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  location?: string;
  isOnline: boolean;
  meetingUrl?: string;
  organizerId: string;
  organizerName: string;
  attendees: { id: string; name: string; email: string; status: 'pending' | 'accepted' | 'declined' }[];
  reminders: { minutes: number; type: 'email' | 'push' | 'both' }[];
  color: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: Date;
}

// ============================================
// Dummy Data
// ============================================

const dummyEvents: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Client Onboarding Call',
    description: 'Initial call with new VIP client from UAE',
    type: 'CALL',
    startAt: new Date(new Date().setHours(10, 0, 0, 0)),
    endAt: new Date(new Date().setHours(11, 0, 0, 0)),
    isAllDay: false,
    isOnline: true,
    meetingUrl: 'https://meet.omnicrm.com/abc123',
    organizerId: 'u1',
    organizerName: 'John Smith',
    attendees: [
      { id: 'a1', name: 'Client A', email: 'client@example.com', status: 'accepted' },
    ],
    reminders: [{ minutes: 15, type: 'both' }],
    color: '#10B981',
    isRecurring: false,
    createdAt: new Date(),
  },
  {
    id: 'e2',
    title: 'Compliance Review Meeting',
    description: 'Monthly compliance review with the team',
    type: 'MEETING',
    startAt: new Date(new Date().setHours(14, 0, 0, 0)),
    endAt: new Date(new Date().setHours(15, 30, 0, 0)),
    isAllDay: false,
    location: 'Conference Room A',
    isOnline: false,
    organizerId: 'u2',
    organizerName: 'Sarah Connor',
    attendees: [
      { id: 'a2', name: 'Mike Johnson', email: 'mike@omnicrm.com', status: 'accepted' },
      { id: 'a3', name: 'Emily Davis', email: 'emily@omnicrm.com', status: 'pending' },
    ],
    reminders: [{ minutes: 30, type: 'email' }],
    color: '#3B82F6',
    isRecurring: true,
    recurrenceRule: 'FREQ=MONTHLY;BYDAY=2TH',
    createdAt: new Date(),
  },
  {
    id: 'e3',
    title: 'Deposit Approval Deadline',
    description: 'Review pending high-value deposits',
    type: 'DEADLINE',
    startAt: new Date(new Date().setHours(17, 0, 0, 0)),
    endAt: new Date(new Date().setHours(17, 30, 0, 0)),
    isAllDay: false,
    isOnline: false,
    organizerId: 'u1',
    organizerName: 'System',
    attendees: [],
    reminders: [{ minutes: 60, type: 'push' }],
    color: '#EF4444',
    isRecurring: false,
    createdAt: new Date(),
  },
  {
    id: 'e4',
    title: 'Training: New Compliance Rules',
    description: 'Training session on updated AML regulations',
    type: 'TRAINING',
    startAt: new Date(Date.now() + 86400000 * 2),
    endAt: new Date(Date.now() + 86400000 * 2 + 7200000),
    isAllDay: false,
    location: 'Training Room',
    isOnline: true,
    meetingUrl: 'https://meet.omnicrm.com/training',
    organizerId: 'u3',
    organizerName: 'HR Team',
    attendees: [
      { id: 'a4', name: 'All Staff', email: 'all@omnicrm.com', status: 'pending' },
    ],
    reminders: [{ minutes: 60, type: 'email' }],
    color: '#8B5CF6',
    isRecurring: false,
    createdAt: new Date(),
  },
];

// Event type colors
const eventTypeColors: Record<CalendarEvent['type'], string> = {
  MEETING: '#3B82F6',
  CALL: '#10B981',
  REMINDER: '#F59E0B',
  DEADLINE: '#EF4444',
  TRAINING: '#8B5CF6',
  MARKETING: '#EC4899',
  COMPLIANCE: '#06B6D4',
  OTHER: '#6B7280',
};

const eventTypeIcons: Record<CalendarEvent['type'], React.ElementType> = {
  MEETING: Users,
  CALL: Phone,
  REMINDER: Bell,
  DEADLINE: Clock,
  TRAINING: FileText,
  MARKETING: CalendarIcon,
  COMPLIANCE: FileText,
  OTHER: CalendarIcon,
};

// ============================================
// Calendar Component
// ============================================

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(dummyEvents);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const { toast } = useToast();

  // Get calendar days for month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.startAt), date));
  };

  // Navigate months
  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Get upcoming events
  const upcomingEvents = events
    .filter(e => new Date(e.startAt) >= new Date())
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar</h2>
          <p className="text-muted-foreground">Manage events and reminders</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
              <DialogDescription>Schedule a new event or meeting</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="Event title" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue="MEETING">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="REMINDER">Reminder</SelectItem>
                    <SelectItem value="DEADLINE">Deadline</SelectItem>
                    <SelectItem value="TRAINING">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="datetime-local" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Location or meeting URL" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Event description" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="text-lg font-semibold">
                  {format(currentDate, 'MMMM yyyy')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'day')}>
                  <TabsList className="grid grid-cols-3 h-8">
                    <TabsTrigger value="month" className="text-xs">
                      <Grid3X3 className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="week" className="text-xs">
                      <CalendarDays className="h-3 w-3" />
                    </TabsTrigger>
                    <TabsTrigger value="day" className="text-xs">
                      <List className="h-3 w-3" />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={index}
                    className={cn(
                      'min-h-[80px] p-1 rounded-lg text-left transition-colors hover:bg-muted/50',
                      !isCurrentMonth && 'opacity-40',
                      isSelected && 'bg-primary/10 border border-primary',
                      isTodayDate && 'bg-muted'
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className={cn(
                      'text-sm font-medium mb-1',
                      isTodayDate && 'text-primary'
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate text-white"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Today's Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today&apos;s Events</CardTitle>
            </CardHeader>
            <CardContent>
              {getEventsForDay(new Date()).length > 0 ? (
                <div className="space-y-2">
                  {getEventsForDay(new Date()).map((event) => {
                    const Icon = eventTypeIcons[event.type];
                    return (
                      <div
                        key={event.id}
                        className="p-2 rounded-lg bg-muted/50 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-3 w-3" style={{ color: event.color }} />
                          <span className="font-medium truncate">{event.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.startAt), 'h:mm a')} - {format(new Date(event.endAt), 'h:mm a')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events today
                </p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const Icon = eventTypeIcons[event.type];
                    return (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border hover:shadow-sm transition-shadow cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="p-1.5 rounded"
                            style={{ backgroundColor: `${event.color}20` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: event.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.startAt), 'MMM d, h:mm a')}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </p>
                            )}
                            {event.isOnline && (
                              <p className="text-xs text-primary flex items-center gap-1 mt-1">
                                <Video className="h-3 w-3" />
                                Online Meeting
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Event Types Legend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(eventTypeColors).map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: color }}
                    />
                    <span className="capitalize">{type.toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
