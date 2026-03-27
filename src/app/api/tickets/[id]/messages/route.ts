/**
 * OMNI-CRM Ticket Messages API
 * Operations for ticket messages/threading
 */

import { NextRequest, NextResponse } from 'next/server';
import { ticketManager } from '@/lib/ticket-service';

// ============================================
// GET /api/tickets/[id]/messages - Get ticket messages
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const includeInternal = searchParams.get('includeInternal') === 'true';

    const messages = await ticketManager.getTicketMessages(id, includeInternal);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('Error fetching ticket messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ticket messages' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/tickets/[id]/messages - Add message to ticket
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validate required fields
    if (!body.senderId) {
      return NextResponse.json(
        { success: false, error: 'senderId is required' },
        { status: 400 }
      );
    }

    if (!body.senderType || !['client', 'staff', 'system'].includes(body.senderType)) {
      return NextResponse.json(
        { success: false, error: 'senderType must be one of: client, staff, system' },
        { status: 400 }
      );
    }

    if (!body.content) {
      return NextResponse.json(
        { success: false, error: 'content is required' },
        { status: 400 }
      );
    }

    const message = await ticketManager.addMessage({
      ticketId: id,
      senderId: body.senderId,
      senderType: body.senderType,
      content: body.content,
      attachments: body.attachments,
      isInternal: body.isInternal,
    });

    return NextResponse.json({
      success: true,
      data: message,
      message: 'Message added successfully',
    });
  } catch (error: any) {
    console.error('Error adding ticket message:', error);
    
    if (error.message === 'Ticket not found') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add message' },
      { status: 500 }
    );
  }
}
