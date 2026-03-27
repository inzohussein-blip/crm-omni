/**
 * OMNI-CRM Calendar Service
 * Comprehensive event management with recurring events, attendees, and sync capabilities
 */

import { db } from '@/lib/db';
import { EventType } from '@prisma/client';
import { addMinutes, addDays, addWeeks, addMonths, addYears, parseISO, format, isAfter, isBefore, isEqual, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';

// ============================================
// TYPES & INTERFACES
// ============================================

export type EventResponseType = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface CreateEventData {
  title: string;
  description?: string;
  type: EventType;
  color?: string;
  startAt: Date | string;
  endAt?: Date | string | null;
  isAllDay?: boolean;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  organizerId: string;
  attendeeIds?: string[];
  reminders?: Reminder[];
  entityType?: string;
  entityId?: string;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  type?: EventType;
  color?: string;
  startAt?: Date | string;
  endAt?: Date | string | null;
  isAllDay?: boolean;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
  reminders?: Reminder[];
}

export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval?: number;
  count?: number;
  until?: Date | string;
  byDay?: number[]; // 0-6 for Sunday-Saturday
  byMonthDay?: number[]; // 1-31
  byMonth?: number[]; // 1-12
}

export interface Reminder {
  minutes: number; // Minutes before event
  type: 'email' | 'push' | 'both';
}

export interface EventAttendeeData {
  eventId: string;
  userId: string;
  responseStatus?: EventResponseType;
}

export interface CalendarQuery {
  userId: string;
  startDate?: Date | string;
  endDate?: Date | string;
  type?: EventType;
  organizerId?: string;
  attendeeId?: string;
  entityType?: string;
  entityId?: string;
}

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
  events: CalendarEventData[];
}

export interface CalendarEventData {
  id: string;
  title: string;
  description?: string | null;
  type: EventType;
  color: string;
  startAt: Date;
  endAt?: Date | null;
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
  attendees?: EventAttendeeData[];
  reminders?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  googleEventId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isException?: boolean;
  originalEventId?: string;
  exceptionDate?: Date;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: { email: string; responseStatus?: string }[];
  reminders?: { useDefault: boolean; overrides?: { minutes: number; method: string }[] };
  recurrence?: string[];
  extendedProperties?: { private?: { omniEventId?: string } };
}

// ============================================
// RRULE PARSER & GENERATOR
// ============================================

class RRuleParser {
  /**
   * Parse RRULE string to RecurrenceRule object
   */
  static parse(rrule: string): RecurrenceRule | null {
    if (!rrule) return null;

    const result: RecurrenceRule = { freq: 'DAILY' };
    const parts = rrule.split(';');

    for (const part of parts) {
      const [key, value] = part.split('=');
      switch (key) {
        case 'FREQ':
          result.freq = value as RecurrenceRule['freq'];
          break;
        case 'INTERVAL':
          result.interval = parseInt(value);
          break;
        case 'COUNT':
          result.count = parseInt(value);
          break;
        case 'UNTIL':
          result.until = new Date(value);
          break;
        case 'BYDAY':
          result.byDay = value.split(',').map(d => {
            const dayMap: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
            return dayMap[d] ?? parseInt(d);
          });
          break;
        case 'BYMONTHDAY':
          result.byMonthDay = value.split(',').map(parseInt);
          break;
        case 'BYMONTH':
          result.byMonth = value.split(',').map(parseInt);
          break;
      }
    }

    return result;
  }

  /**
   * Convert RecurrenceRule to RRULE string
   */
  static stringify(rule: RecurrenceRule): string {
    const parts: string[] = [];

    parts.push(`FREQ=${rule.freq}`);
    if (rule.interval) parts.push(`INTERVAL=${rule.interval}`);
    if (rule.count) parts.push(`COUNT=${rule.count}`);
    if (rule.until) parts.push(`UNTIL=${format(rule.until instanceof Date ? rule.until : parseISO(rule.until as string), 'yyyyMMdd\'T\'HHmmss\'Z\'')}`);
    if (rule.byDay) {
      const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      parts.push(`BYDAY=${rule.byDay.map(d => dayMap[d]).join(',')}`);
    }
    if (rule.byMonthDay) parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
    if (rule.byMonth) parts.push(`BYMONTH=${rule.byMonth.join(',')}`);

    return parts.join(';');
  }

  /**
   * Generate occurrences for a recurring event
   */
  static generateOccurrences(
    startDate: Date,
    rule: RecurrenceRule,
    rangeStart: Date,
    rangeEnd: Date,
    maxOccurrences: number = 100
  ): Date[] {
    const occurrences: Date[] = [];
    let current = new Date(startDate);
    let count = 0;

    const addDate = {
      DAILY: addDays,
      WEEKLY: addWeeks,
      MONTHLY: addMonths,
      YEARLY: addYears,
    };

    while (count < maxOccurrences) {
      // Check if within range
      if (isAfter(current, rangeEnd)) break;
      if (!isBefore(current, rangeStart) || isEqual(current, rangeStart) || isAfter(current, rangeStart)) {
        if (!isBefore(current, rangeStart)) {
          occurrences.push(new Date(current));
        }
      }

      // Check termination conditions
      if (rule.count && count >= rule.count - 1) break;
      if (rule.until && isAfter(current, rule.until)) break;

      // Move to next occurrence
      current = addDate[rule.freq](current, rule.interval || 1);
      count++;

      // Apply BYDAY filter for weekly
      if (rule.freq === 'WEEKLY' && rule.byDay && rule.byDay.length > 0) {
        // Generate occurrences for each day in byDay
        for (const dayOfWeek of rule.byDay) {
          const nextOccurrence = new Date(current);
          const currentDay = nextOccurrence.getDay();
          const diff = (dayOfWeek - currentDay + 7) % 7;
          nextOccurrence.setDate(nextOccurrence.getDate() + diff);
          
          if (!isBefore(nextOccurrence, rangeStart) && !isAfter(nextOccurrence, rangeEnd)) {
            occurrences.push(nextOccurrence);
          }
        }
      }
    }

    return occurrences.filter(o => !isBefore(o, rangeStart) && !isAfter(o, rangeEnd));
  }
}

// ============================================
// GOOGLE CALENDAR SYNC SERVICE (MOCK)
// ============================================

class GoogleCalendarSync {
  private accessToken: string | null = null;
  private isConfigured: boolean = false;

  constructor() {
    // Mock configuration check
    this.isConfigured = process.env.GOOGLE_CALENDAR_ENABLED === 'true';
  }

  /**
   * Initialize Google Calendar connection (mock)
   */
  async initialize(userId: string): Promise<{ success: boolean; authUrl?: string }> {
    // In production, this would initiate OAuth flow
    console.log(`[GoogleCalendar] Initializing for user: ${userId}`);
    
    // Mock successful initialization
    return {
      success: true,
      authUrl: this.isConfigured 
        ? `https://accounts.google.com/o/oauth2/v2/auth?...mock...`
        : undefined
    };
  }

  /**
   * Sync event to Google Calendar (mock)
   */
  async createEvent(event: CalendarEventData): Promise<{ googleEventId: string } | null> {
    if (!this.isConfigured) {
      console.log('[GoogleCalendar] Not configured, skipping sync');
      return null;
    }

    // Mock Google Calendar API call
    const googleEventId = `gcal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[GoogleCalendar] Created event: ${event.title}`, {
      googleEventId,
      summary: event.title,
      start: event.startAt,
      end: event.endAt,
    });

    return { googleEventId };
  }

  /**
   * Update event in Google Calendar (mock)
   */
  async updateEvent(googleEventId: string, event: CalendarEventData): Promise<boolean> {
    if (!this.isConfigured || !googleEventId) return false;

    console.log(`[GoogleCalendar] Updated event: ${googleEventId}`, {
      summary: event.title,
      start: event.startAt,
    });

    return true;
  }

  /**
   * Delete event from Google Calendar (mock)
   */
  async deleteEvent(googleEventId: string): Promise<boolean> {
    if (!this.isConfigured || !googleEventId) return false;

    console.log(`[GoogleCalendar] Deleted event: ${googleEventId}`);
    return true;
  }

  /**
   * Fetch events from Google Calendar (mock)
   */
  async fetchEvents(startDate: Date, endDate: Date): Promise<GoogleCalendarEvent[]> {
    if (!this.isConfigured) return [];

    // Return mock events
    return [
      {
        id: 'gcal_mock_1',
        summary: 'Team Meeting (from Google)',
        start: { dateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss") },
        end: { dateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss") },
      }
    ];
  }

  /**
   * Check if sync is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }
}

// ============================================
// REMINDER SCHEDULER
// ============================================

class ReminderScheduler {
  private scheduledReminders: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule reminders for an event
   */
  scheduleReminders(event: CalendarEventData, userIds: string[]): void {
    if (!event.reminders) return;

    const reminders: Reminder[] = JSON.parse(event.reminders);
    const eventStart = event.startAt instanceof Date ? event.startAt : parseISO(event.startAt as string);

    for (const reminder of reminders) {
      const reminderTime = addMinutes(eventStart, -reminder.minutes);
      const now = new Date();
      const delay = differenceInMinutes(reminderTime, now) * 60 * 1000;

      if (delay > 0) {
        const reminderId = `${event.id}_${reminder.minutes}`;
        
        const timeout = setTimeout(() => {
          this.sendReminder(event, reminder, userIds);
          this.scheduledReminders.delete(reminderId);
        }, delay);

        this.scheduledReminders.set(reminderId, timeout);
      }
    }
  }

  /**
   * Send reminder notification
   */
  private async sendReminder(event: CalendarEventData, reminder: Reminder, userIds: string[]): Promise<void> {
    console.log(`[Reminder] Sending ${reminder.type} reminder for event: ${event.title}`, {
      userIds,
      eventStart: event.startAt,
    });

    // In production, this would:
    // 1. Send push notification via WebSocket
    // 2. Send email notification
    // 3. Create in-app notification

    // Mock notification creation
    for (const userId of userIds) {
      await db.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: `Reminder: ${event.title}`,
          message: `Event starts in ${reminder.minutes} minutes`,
          channels: JSON.stringify([reminder.type === 'both' ? ['email', 'push'] : [reminder.type]]),
          entityType: 'calendar_event',
          entityId: event.id,
        }
      });
    }
  }

  /**
   * Cancel reminders for an event
   */
  cancelReminders(eventId: string): void {
    for (const [reminderId, timeout] of this.scheduledReminders) {
      if (reminderId.startsWith(eventId)) {
        clearTimeout(timeout);
        this.scheduledReminders.delete(reminderId);
      }
    }
  }
}

// ============================================
// EVENT MANAGER CLASS
// ============================================

export class EventManager {
  private googleSync: GoogleCalendarSync;
  private reminderScheduler: ReminderScheduler;

  constructor() {
    this.googleSync = new GoogleCalendarSync();
    this.reminderScheduler = new ReminderScheduler();
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  /**
   * Create a new event
   */
  async createEvent(data: CreateEventData): Promise<CalendarEventData> {
    const startAt = data.startAt instanceof Date ? data.startAt : parseISO(data.startAt as string);
    const endAt = data.endAt 
      ? (data.endAt instanceof Date ? data.endAt : parseISO(data.endAt as string))
      : null;

    // Calculate duration for recurring events
    const duration = endAt ? differenceInMinutes(endAt, startAt) : 60;

    // Prepare recurrence rule
    let recurrenceRule: string | null = null;
    if (data.isRecurring && data.recurrenceRule) {
      recurrenceRule = RRuleParser.stringify(data.recurrenceRule);
    }

    // Create event in database
    const event = await db.calendarEvent.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        color: data.color || this.getDefaultColor(data.type),
        startAt,
        endAt,
        isAllDay: data.isAllDay || false,
        timezone: data.timezone || 'UTC',
        isRecurring: data.isRecurring || false,
        recurrenceRule,
        organizerId: data.organizerId,
        reminders: data.reminders ? JSON.stringify(data.reminders) : null,
        entityType: data.entityType,
        entityId: data.entityId,
      },
      include: {
        attendees: true,
      }
    });

    // Add attendees
    if (data.attendeeIds && data.attendeeIds.length > 0) {
      await this.addAttendees(event.id, data.attendeeIds);
    }

    // Sync to Google Calendar
    const googleResult = await this.googleSync.createEvent(event as unknown as CalendarEventData);
    if (googleResult) {
      await db.calendarEvent.update({
        where: { id: event.id },
        data: { googleEventId: googleResult.googleEventId }
      });
    }

    // Schedule reminders
    this.reminderScheduler.scheduleReminders(
      event as unknown as CalendarEventData, 
      [data.organizerId, ...(data.attendeeIds || [])]
    );

    return this.formatEvent(event);
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEventData | null> {
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        attendees: true,
      }
    });

    if (!event) return null;

    return this.formatEvent(event);
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, data: UpdateEventData): Promise<CalendarEventData | null> {
    const existingEvent = await db.calendarEvent.findUnique({
      where: { id: eventId },
      include: { attendees: true }
    });

    if (!existingEvent) return null;

    const updateData: Record<string, unknown> = {};

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type) updateData.type = data.type;
    if (data.color) updateData.color = data.color;
    if (data.startAt) {
      updateData.startAt = data.startAt instanceof Date ? data.startAt : parseISO(data.startAt as string);
    }
    if (data.endAt !== undefined) {
      updateData.endAt = data.endAt 
        ? (data.endAt instanceof Date ? data.endAt : parseISO(data.endAt as string))
        : null;
    }
    if (data.isAllDay !== undefined) updateData.isAllDay = data.isAllDay;
    if (data.timezone) updateData.timezone = data.timezone;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurrenceRule) {
      updateData.recurrenceRule = RRuleParser.stringify(data.recurrenceRule);
    }
    if (data.reminders !== undefined) {
      updateData.reminders = JSON.stringify(data.reminders);
    }

    const event = await db.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: { attendees: true }
    });

    // Sync to Google Calendar
    if (event.googleEventId) {
      await this.googleSync.updateEvent(event.googleEventId, event as unknown as CalendarEventData);
    }

    // Reschedule reminders
    this.reminderScheduler.cancelReminders(eventId);
    this.reminderScheduler.scheduleReminders(
      event as unknown as CalendarEventData,
      [event.organizerId, ...event.attendees.map(a => a.userId)]
    );

    return this.formatEvent(event);
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) return false;

    // Delete from Google Calendar
    if (event.googleEventId) {
      await this.googleSync.deleteEvent(event.googleEventId);
    }

    // Cancel reminders
    this.reminderScheduler.cancelReminders(eventId);

    // Delete from database (cascade deletes attendees)
    await db.calendarEvent.delete({
      where: { id: eventId }
    });

    return true;
  }

  /**
   * Get events for a date range
   */
  async getEvents(query: CalendarQuery): Promise<CalendarEventData[]> {
    const startDate = query.startDate 
      ? (query.startDate instanceof Date ? query.startDate : parseISO(query.startDate as string))
      : startOfMonth(new Date());
    const endDate = query.endDate 
      ? (query.endDate instanceof Date ? query.endDate : parseISO(query.endDate as string))
      : endOfMonth(new Date());

    const whereClause: Record<string, unknown> = {
      OR: [
        { organizerId: query.userId },
        { attendees: { some: { userId: query.userId } } }
      ],
      startAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate)
      }
    };

    if (query.type) whereClause.type = query.type;
    if (query.organizerId) whereClause.organizerId = query.organizerId;
    if (query.entityType) whereClause.entityType = query.entityType;
    if (query.entityId) whereClause.entityId = query.entityId;

    const events = await db.calendarEvent.findMany({
      where: whereClause,
      include: {
        attendees: true,
      },
      orderBy: { startAt: 'asc' }
    });

    // Process recurring events
    const allEvents: CalendarEventData[] = [];
    for (const event of events) {
      const formattedEvent = this.formatEvent(event);
      
      if (event.isRecurring && event.recurrenceRule) {
        const rule = RRuleParser.parse(event.recurrenceRule);
        if (rule) {
          const occurrences = RRuleParser.generateOccurrences(
            event.startAt,
            rule,
            startDate,
            endDate
          );

          for (const occurrence of occurrences) {
            const duration = event.endAt 
              ? differenceInMinutes(event.endAt, event.startAt)
              : 60;
            
            allEvents.push({
              ...formattedEvent,
              id: `${event.id}_${format(occurrence, 'yyyyMMdd')}`,
              startAt: occurrence,
              endAt: addMinutes(occurrence, duration),
              isException: false,
              originalEventId: event.id,
              exceptionDate: occurrence,
            });
          }
        }
      } else {
        allEvents.push(formattedEvent);
      }
    }

    return allEvents;
  }

  /**
   * Get calendar view
   */
  async getCalendarView(
    userId: string,
    viewType: 'month' | 'week' | 'day',
    date: Date
  ): Promise<CalendarView> {
    let startDate: Date;
    let endDate: Date;

    switch (viewType) {
      case 'month':
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
        break;
      case 'week':
        startDate = startOfWeek(date, { weekStartsOn: 1 });
        endDate = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case 'day':
        startDate = startOfDay(date);
        endDate = endOfDay(date);
        break;
    }

    const events = await this.getEvents({
      userId,
      startDate,
      endDate
    });

    return {
      type: viewType,
      date,
      events
    };
  }

  // ============================================
  // ATTENDEE MANAGEMENT
  // ============================================

  /**
   * Add attendees to an event
   */
  async addAttendees(eventId: string, userIds: string[]): Promise<void> {
    const attendeesData = userIds.map(userId => ({
      eventId,
      userId,
      responseStatus: 'pending' as EventResponseType
    }));

    await db.eventAttendee.createMany({
      data: attendeesData,
      skipDuplicates: true
    });

    // Send notifications to new attendees
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId }
    });

    if (event) {
      for (const userId of userIds) {
        await db.notification.create({
          data: {
            userId,
            type: 'SYSTEM',
            title: 'New Event Invitation',
            message: `You've been invited to: ${event.title}`,
            channels: JSON.stringify(['push', 'in_app']),
            entityType: 'calendar_event',
            entityId: eventId
          }
        });
      }
    }
  }

  /**
   * Remove attendee from event
   */
  async removeAttendee(eventId: string, userId: string): Promise<boolean> {
    try {
      await db.eventAttendee.delete({
        where: {
          eventId_userId: { eventId, userId }
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update attendee response status
   */
  async updateAttendeeResponse(
    eventId: string,
    userId: string,
    status: EventResponseType
  ): Promise<boolean> {
    try {
      await db.eventAttendee.update({
        where: {
          eventId_userId: { eventId, userId }
        },
        data: { responseStatus: status }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get attendees for an event
   */
  async getEventAttendees(eventId: string): Promise<EventAttendeeData[]> {
    const attendees = await db.eventAttendee.findMany({
      where: { eventId },
      include: {
        event: {
          include: {
            attendees: true
          }
        }
      }
    });

    return attendees.map(a => ({
      eventId: a.eventId,
      userId: a.userId,
      responseStatus: a.responseStatus as EventResponseType
    }));
  }

  // ============================================
  // DRAG & DROP SUPPORT
  // ============================================

  /**
   * Move event to new date/time (drag & drop)
   */
  async moveEvent(
    eventId: string,
    newStart: Date,
    newEnd?: Date
  ): Promise<CalendarEventData | null> {
    const event = await db.calendarEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) return null;

    // Calculate duration if end not provided
    const duration = event.endAt 
      ? differenceInMinutes(event.endAt, event.startAt)
      : 60;
    const newEndDate = newEnd || addMinutes(newStart, duration);

    return this.updateEvent(eventId, {
      startAt: newStart,
      endAt: newEndDate
    });
  }

  /**
   * Resize event (drag end time)
   */
  async resizeEvent(
    eventId: string,
    newEnd: Date
  ): Promise<CalendarEventData | null> {
    return this.updateEvent(eventId, {
      endAt: newEnd
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get event statistics
   */
  async getEventStats(userId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    upcoming: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const events = await db.calendarEvent.findMany({
      where: {
        OR: [
          { organizerId: userId },
          { attendees: { some: { userId } } }
        ]
      }
    });

    const byType: Record<string, number> = {};
    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
    }

    const upcoming = events.filter(e => isAfter(e.startAt, now)).length;
    const thisWeek = events.filter(e => 
      !isBefore(e.startAt, weekStart) && !isAfter(e.startAt, weekEnd)
    ).length;
    const thisMonth = events.filter(e =>
      !isBefore(e.startAt, monthStart) && !isAfter(e.startAt, monthEnd)
    ).length;

    return {
      total: events.length,
      byType,
      upcoming,
      thisWeek,
      thisMonth
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get default color for event type
   */
  private getDefaultColor(type: EventType): string {
    const colors: Record<EventType, string> = {
      MEETING: '#3b82f6',     // blue
      CALL: '#10b981',        // green
      REMINDER: '#f59e0b',    // amber
      DEADLINE: '#ef4444',    // red
      TRAINING: '#8b5cf6',    // purple
      MARKETING: '#ec4899',   // pink
      COMPLIANCE: '#06b6d4',  // cyan
      OTHER: '#6b7280'        // gray
    };
    return colors[type] || colors.OTHER;
  }

  /**
   * Format event for API response
   */
  private formatEvent(event: Record<string, unknown>): CalendarEventData {
    return {
      id: event.id as string,
      title: event.title as string,
      description: event.description as string | null,
      type: event.type as EventType,
      color: event.color as string,
      startAt: event.startAt as Date,
      endAt: event.endAt as Date | null,
      isAllDay: event.isAllDay as boolean,
      timezone: event.timezone as string,
      isRecurring: event.isRecurring as boolean,
      recurrenceRule: event.recurrenceRule as string | null,
      organizerId: event.organizerId as string,
      reminders: event.reminders as string | null,
      entityType: event.entityType as string | null,
      entityId: event.entityId as string | null,
      googleEventId: event.googleEventId as string | null,
      createdAt: event.createdAt as Date,
      updatedAt: event.updatedAt as Date,
      attendees: (event.attendees as Array<{ eventId: string; userId: string; responseStatus: string }>)?.map(a => ({
        eventId: a.eventId,
        userId: a.userId,
        responseStatus: a.responseStatus as EventResponseType
      }))
    };
  }

  /**
   * Check if Google Calendar sync is available
   */
  isGoogleSyncAvailable(): boolean {
    return this.googleSync.isAvailable();
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const eventManager = new EventManager();
