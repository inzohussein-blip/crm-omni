/**
 * OMNI-CRM Single Ticket API
 * Operations for individual tickets
 */

import { NextRequest, NextResponse } from 'next/server';
import { ticketManager } from '@/lib/ticket-service';

// ============================================
// GET /api/tickets/[id] - Get ticket by ID
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if it's a ticket number (starts with TKT-)
    const ticket = id.startsWith('TKT-')
      ? await ticketManager.getTicketByNumber(id)
      : await ticketManager.getTicketById(id);

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/tickets/[id] - Update ticket
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const updateData: any = {};

    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId;
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.feedback !== undefined) updateData.feedback = body.feedback;

    const ticket = await ticketManager.updateTicket(id, updateData, body.actorId);

    return NextResponse.json({
      success: true,
      data: ticket,
      message: 'Ticket updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating ticket:', error);
    
    if (error.message === 'Ticket not found') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    if (error.message.includes('Invalid status transition')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/tickets/[id] - Assign/Reassign ticket
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (body.action === 'assign' && body.agentId) {
      const ticket = await ticketManager.assignTicket(id, body.agentId);
      return NextResponse.json({
        success: true,
        data: ticket,
        message: 'Ticket assigned successfully',
      });
    }

    if (body.action === 'unassign') {
      const ticket = await ticketManager.unassignTicket(id);
      return NextResponse.json({
        success: true,
        data: ticket,
        message: 'Ticket unassigned successfully',
      });
    }

    if (body.action === 'reassign' && body.agentId) {
      const ticket = await ticketManager.reassignTicket(id, body.agentId, body.reason);
      return NextResponse.json({
        success: true,
        data: ticket,
        message: 'Ticket reassigned successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error managing ticket assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to manage ticket assignment' },
      { status: 500 }
    );
  }
}
