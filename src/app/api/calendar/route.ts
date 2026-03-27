/**
 * OMNI-CRM Calendar API
 * RESTful endpoints for event management
 */

import { NextRequest, NextResponse } from 'next/server';
import { eventManager, CreateEventData, UpdateEventData, EventResponseType } from '@/lib/calendar-service';
import { EventType } from '@prisma/client';
import { parseISO, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';

// ============================================
// GET /api/calendar - Get Events
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list';
    const userId = searchParams.get('userId') || 'demo-user';

    switch (action) {
      case 'list':
        return await handleListEvents(searchParams, userId);
      case 'view':
        return await handleCalendarView(searchParams, userId);
      case 'get':
        return await handleGetEvent(searchParams);
      case 'stats':
        return await handleGetStats(userId);
      case 'attendees':
        return await handleGetAttendees(searchParams);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Calendar API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/calendar - Create Event
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'create';

    switch (action) {
      case 'create':
        return await handleCreateEvent(body);
      case 'update':
        return await handleUpdateEvent(body);
      case 'delete':
        return await handleDeleteEvent(body);
      case 'move':
        return await handleMoveEvent(body);
      case 'resize':
        return await handleResizeEvent(body);
      case 'add-attendees':
        return await handleAddAttendees(body);
      case 'remove-attendee':
        return await handleRemoveAttendee(body);
      case 'update-response':
        return await handleUpdateResponse(body);
      case 'sync-google':
        return await handleGoogleSync(body);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Calendar API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// HANDLERS
// ============================================

/**
 * List events with filters
 */
async function handleListEvents(searchParams: URLSearchParams, userId: string) {
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const type = searchParams.get('type') as EventType | null;
  const organizerId = searchParams.get('organizerId');
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  // Default to current month if no range specified
  const now = new Date();
  const rangeStart = startDate ? parseISO(startDate) : startOfMonth(now);
  const rangeEnd = endDate ? parseISO(endDate) : endOfMonth(now);

  const events = await eventManager.getEvents({
    userId,
    startDate: rangeStart,
    endDate: rangeEnd,
    type: type || undefined,
    organizerId: organizerId || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined
  });

  return NextResponse.json({
    success: true,
    data: {
      events,
      dateRange: {
        start: rangeStart,
        end: rangeEnd
      },
      count: events.length
    }
  });
}

/**
 * Get calendar view (month/week/day)
 */
async function handleCalendarView(searchParams: URLSearchParams, userId: string) {
  const viewType = (searchParams.get('view') || 'month') as 'month' | 'week' | 'day';
  const dateStr = searchParams.get('date');
  const date = dateStr ? parseISO(dateStr) : new Date();

  // Handle navigation
  const navigate = searchParams.get('navigate');
  let targetDate = date;

  switch (navigate) {
    case 'prev':
      if (viewType === 'month') targetDate = subMonths(date, 1);
      else if (viewType === 'week') targetDate = subWeeks(date, 1);
      else targetDate = subDays(date, 1);
      break;
    case 'next':
      if (viewType === 'month') targetDate = addMonths(date, 1);
      else if (viewType === 'week') targetDate = addWeeks(date, 1);
      else targetDate = addDays(date, 1);
      break;
    case 'today':
      targetDate = new Date();
      break;
  }

  const view = await eventManager.getCalendarView(userId, viewType, targetDate);

  return NextResponse.json({
    success: true,
    data: view
  });
}

/**
 * Get single event by ID
 */
async function handleGetEvent(searchParams: URLSearchParams) {
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID is required' },
      { status: 400 }
    );
  }

  const event = await eventManager.getEvent(eventId);

  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: event
  });
}

/**
 * Get event statistics
 */
async function handleGetStats(userId: string) {
  const stats = await eventManager.getEventStats(userId);

  return NextResponse.json({
    success: true,
    data: stats
  });
}

/**
 * Get event attendees
 */
async function handleGetAttendees(searchParams: URLSearchParams) {
  const eventId = searchParams.get('eventId');

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID is required' },
      { status: 400 }
    );
  }

  const attendees = await eventManager.getEventAttendees(eventId);

  return NextResponse.json({
    success: true,
    data: attendees
  });
}

/**
 * Create new event
 */
async function handleCreateEvent(body: Record<string, unknown>) {
  const { title, type, organizerId, startAt, endAt, description, color, isAllDay, timezone, isRecurring, recurrenceRule, attendeeIds, reminders, entityType, entityId } = body;

  // Validation
  if (!title || !type || !organizerId || !startAt) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: title, type, organizerId, startAt' },
      { status: 400 }
    );
  }

  const eventData: CreateEventData = {
    title: title as string,
    description: description as string | undefined,
    type: type as EventType,
    color: color as string | undefined,
    startAt: typeof startAt === 'string' ? parseISO(startAt) : (startAt as Date),
    endAt: endAt ? (typeof endAt === 'string' ? parseISO(endAt as string) : endAt as Date) : null,
    isAllDay: isAllDay as boolean | undefined,
    timezone: timezone as string | undefined,
    isRecurring: isRecurring as boolean | undefined,
    recurrenceRule: recurrenceRule as CreateEventData['recurrenceRule'],
    organizerId: organizerId as string,
    attendeeIds: attendeeIds as string[] | undefined,
    reminders: reminders as CreateEventData['reminders'],
    entityType: entityType as string | undefined,
    entityId: entityId as string | undefined
  };

  const event = await eventManager.createEvent(eventData);

  return NextResponse.json({
    success: true,
    data: event,
    message: 'Event created successfully'
  }, { status: 201 });
}

/**
 * Update existing event
 */
async function handleUpdateEvent(body: Record<string, unknown>) {
  const { eventId, ...updates } = body;

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID is required' },
      { status: 400 }
    );
  }

  // Parse dates if present
  if (updates.startAt && typeof updates.startAt === 'string') {
    updates.startAt = parseISO(updates.startAt);
  }
  if (updates.endAt && typeof updates.endAt === 'string') {
    updates.endAt = parseISO(updates.endAt as string);
  }

  const event = await eventManager.updateEvent(eventId as string, updates as UpdateEventData);

  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: event,
    message: 'Event updated successfully'
  });
}

/**
 * Delete event
 */
async function handleDeleteEvent(body: Record<string, unknown>) {
  const { eventId } = body;

  if (!eventId) {
    return NextResponse.json(
      { success: false, error: 'Event ID is required' },
      { status: 400 }
    );
  }

  const deleted = await eventManager.deleteEvent(eventId as string);

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Event deleted successfully'
  });
}

/**
 * Move event (drag & drop)
 */
async function handleMoveEvent(body: Record<string, unknown>) {
  const { eventId, newStart, newEnd } = body;

  if (!eventId || !newStart) {
    return NextResponse.json(
      { success: false, error: 'Event ID and new start time are required' },
      { status: 400 }
    );
  }

  const startDate = typeof newStart === 'string' ? parseISO(newStart) : (newStart as Date);
  const endDate = newEnd 
    ? (typeof newEnd === 'string' ? parseISO(newEnd as string) : newEnd as Date)
    : undefined;

  const event = await eventManager.moveEvent(eventId as string, startDate, endDate);

  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: event,
    message: 'Event moved successfully'
  });
}

/**
 * Resize event
 */
async function handleResizeEvent(body: Record<string, unknown>) {
  const { eventId, newEnd } = body;

  if (!eventId || !newEnd) {
    return NextResponse.json(
      { success: false, error: 'Event ID and new end time are required' },
      { status: 400 }
    );
  }

  const endDate = typeof newEnd === 'string' ? parseISO(newEnd) : (newEnd as Date);

  const event = await eventManager.resizeEvent(eventId as string, endDate);

  if (!event) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: event,
    message: 'Event resized successfully'
  });
}

/**
 * Add attendees to event
 */
async function handleAddAttendees(body: Record<string, unknown>) {
  const { eventId, userIds } = body;

  if (!eventId || !userIds || !Array.isArray(userIds)) {
    return NextResponse.json(
      { success: false, error: 'Event ID and user IDs array are required' },
      { status: 400 }
    );
  }

  await eventManager.addAttendees(eventId as string, userIds as string[]);

  return NextResponse.json({
    success: true,
    message: 'Attendees added successfully'
  });
}

/**
 * Remove attendee from event
 */
async function handleRemoveAttendee(body: Record<string, unknown>) {
  const { eventId, userId } = body;

  if (!eventId || !userId) {
    return NextResponse.json(
      { success: false, error: 'Event ID and user ID are required' },
      { status: 400 }
    );
  }

  const removed = await eventManager.removeAttendee(eventId as string, userId as string);

  return NextResponse.json({
    success: removed,
    message: removed ? 'Attendee removed successfully' : 'Failed to remove attendee'
  });
}

/**
 * Update attendee response status
 */
async function handleUpdateResponse(body: Record<string, unknown>) {
  const { eventId, userId, status } = body;

  if (!eventId || !userId || !status) {
    return NextResponse.json(
      { success: false, error: 'Event ID, user ID, and status are required' },
      { status: 400 }
    );
  }

  const validStatuses: EventResponseType[] = ['pending', 'accepted', 'declined', 'tentative'];
  if (!validStatuses.includes(status as EventResponseType)) {
    return NextResponse.json(
      { success: false, error: 'Invalid status. Must be: pending, accepted, declined, or tentative' },
      { status: 400 }
    );
  }

  const updated = await eventManager.updateAttendeeResponse(
    eventId as string,
    userId as string,
    status as EventResponseType
  );

  return NextResponse.json({
    success: updated,
    message: updated ? 'Response updated successfully' : 'Failed to update response'
  });
}

/**
 * Handle Google Calendar sync
 */
async function handleGoogleSync(body: Record<string, unknown>) {
  const isAvailable = eventManager.isGoogleSyncAvailable();

  return NextResponse.json({
    success: true,
    data: {
      available: isAvailable,
      message: isAvailable 
        ? 'Google Calendar sync is configured' 
        : 'Google Calendar sync is not configured. Set GOOGLE_CALENDAR_ENABLED=true to enable.'
    }
  });
}
