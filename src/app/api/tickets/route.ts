/**
 * OMNI-CRM Support Tickets API
 * CRUD operations for support tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { ticketManager } from '@/lib/ticket-service';
import { Priority, TicketCategory } from '@prisma/client';

// ============================================
// GET /api/tickets - List tickets
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const status = searchParams.get('status') as any;
    const priority = searchParams.get('priority') as Priority;
    const category = searchParams.get('category') as TicketCategory;
    const assignedToId = searchParams.get('assignedToId');
    const departmentId = searchParams.get('departmentId');
    const userId = searchParams.get('userId');
    const slaBreached = searchParams.get('slaBreached');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Build filter
    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedToId) filter.assignedToId = assignedToId;
    if (departmentId) filter.departmentId = departmentId;
    if (userId) filter.userId = userId;
    if (slaBreached !== null) filter.slaBreached = slaBreached === 'true';
    if (search) filter.search = search;
    if (dateFrom) filter.dateFrom = new Date(dateFrom);
    if (dateTo) filter.dateTo = new Date(dateTo);

    const result = await ticketManager.listTickets(filter, page, limit, sortBy, sortOrder);

    return NextResponse.json({
      success: true,
      data: result.tickets,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/tickets - Create ticket
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!body.subject) {
      return NextResponse.json(
        { success: false, error: 'subject is required' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { success: false, error: 'category is required' },
        { status: 400 }
      );
    }

    if (!body.initialMessage) {
      return NextResponse.json(
        { success: false, error: 'initialMessage is required' },
        { status: 400 }
      );
    }

    const ticket = await ticketManager.createTicket({
      userId: body.userId,
      subject: body.subject,
      category: body.category,
      priority: body.priority,
      departmentId: body.departmentId,
      initialMessage: body.initialMessage,
      attachments: body.attachments,
      slaMinutes: body.slaMinutes,
    });

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket created successfully',
    });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
