/**
 * OMNI-CRM Disputes API
 * RESTful endpoints for dispute management
 */

import { NextRequest, NextResponse } from 'next/server';
import { disputeManager, CreateDisputeData, DisputeFilter } from '@/lib/dispute-service';
import { DisputeCategory, DisputeStatus } from '@prisma/client';

// ============================================
// GET /api/disputes - List disputes
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse query parameters
    const action = searchParams.get('action');
    
    // Handle specific actions
    switch (action) {
      case 'stats': {
        const dateFrom = searchParams.get('dateFrom') 
          ? new Date(searchParams.get('dateFrom')!) 
          : undefined;
        const dateTo = searchParams.get('dateTo') 
          ? new Date(searchParams.get('dateTo')!) 
          : undefined;
        
        const stats = await disputeManager.getStats(dateFrom, dateTo);
        return NextResponse.json({ success: true, data: { stats } });
      }
      
      case 'overdue': {
        const days = parseInt(searchParams.get('days') || '30', 10);
        const disputes = await disputeManager.getOverdueDisputes(days);
        return NextResponse.json({ success: true, data: { disputes } });
      }
      
      case 'high_value': {
        const threshold = parseFloat(searchParams.get('threshold') || '10000');
        const result = await disputeManager.getHighValueDisputes(threshold);
        return NextResponse.json({ success: true, data: result });
      }
      
      case 'by_client': {
        const clientId = searchParams.get('clientId');
        if (!clientId) {
          return NextResponse.json(
            { success: false, error: 'clientId is required' },
            { status: 400 }
          );
        }
        const result = await disputeManager.getDisputesByClient(clientId);
        return NextResponse.json({ success: true, data: result });
      }
      
      case 'by_number': {
        const caseNumber = searchParams.get('caseNumber');
        if (!caseNumber) {
          return NextResponse.json(
            { success: false, error: 'caseNumber is required' },
            { status: 400 }
          );
        }
        const dispute = await disputeManager.getDisputeByCaseNumber(caseNumber);
        if (!dispute) {
          return NextResponse.json(
            { success: false, error: 'Dispute not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'get': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json(
            { success: false, error: 'id is required' },
            { status: 400 }
          );
        }
        const dispute = await disputeManager.getDisputeById(id);
        if (!dispute) {
          return NextResponse.json(
            { success: false, error: 'Dispute not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'messages': {
        const disputeId = searchParams.get('disputeId');
        const includeInternal = searchParams.get('includeInternal') === 'true';
        
        if (!disputeId) {
          return NextResponse.json(
            { success: false, error: 'disputeId is required' },
            { status: 400 }
          );
        }
        
        const messages = await disputeManager.getDisputeMessages(disputeId, includeInternal);
        return NextResponse.json({ success: true, data: { messages } });
      }
      
      case 'evidence': {
        const disputeId = searchParams.get('disputeId');
        if (!disputeId) {
          return NextResponse.json(
            { success: false, error: 'disputeId is required' },
            { status: 400 }
          );
        }
        
        const evidence = await disputeManager.getEvidence(disputeId);
        return NextResponse.json({ success: true, data: { evidence } });
      }
    }
    
    // Default: list disputes with filters
    const filter: DisputeFilter = {};
    
    if (searchParams.get('status')) {
      filter.status = searchParams.get('status') as DisputeStatus;
    }
    if (searchParams.get('category')) {
      filter.category = searchParams.get('category') as DisputeCategory;
    }
    if (searchParams.get('clientId')) {
      filter.clientId = searchParams.get('clientId')!;
    }
    if (searchParams.get('againstType')) {
      filter.againstType = searchParams.get('againstType')!;
    }
    if (searchParams.get('againstId')) {
      filter.againstId = searchParams.get('againstId')!;
    }
    if (searchParams.get('search')) {
      filter.search = searchParams.get('search')!;
    }
    if (searchParams.get('dateFrom')) {
      filter.dateFrom = new Date(searchParams.get('dateFrom')!);
    }
    if (searchParams.get('dateTo')) {
      filter.dateTo = new Date(searchParams.get('dateTo')!);
    }
    if (searchParams.get('minAmount')) {
      filter.minAmount = parseFloat(searchParams.get('minAmount')!);
    }
    if (searchParams.get('maxAmount')) {
      filter.maxAmount = parseFloat(searchParams.get('maxAmount')!);
    }
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    
    const result = await disputeManager.listDisputes(filter, page, limit, sortBy, sortOrder);
    
    return NextResponse.json({ success: true, data: result });
    
  } catch (error: any) {
    console.error('Disputes API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/disputes - Create dispute
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;
    
    switch (action) {
      case 'create': {
        const data: CreateDisputeData = {
          clientId: body.clientId,
          againstType: body.againstType,
          againstId: body.againstId,
          title: body.title,
          description: body.description,
          category: body.category as DisputeCategory,
          amount: body.amount,
          currency: body.currency,
          initialEvidence: body.initialEvidence,
        };
        
        if (!data.clientId || !data.title || !data.description || !data.category) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: clientId, title, description, category' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.createDispute(data);
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'update': {
        const { id, ...updateData } = body;
        
        if (!id) {
          return NextResponse.json(
            { success: false, error: 'id is required' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.updateDispute(
          id,
          {
            status: updateData.status as DisputeStatus,
            resolution: updateData.resolution,
            resolutionType: updateData.resolutionType,
            resolvedById: updateData.resolvedById,
          },
          updateData.actorId
        );
        
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'resolve': {
        const { id, resolution, resolutionType, refundAmount, resolvedBy } = body;
        
        if (!id || !resolution || !resolutionType || !resolvedBy) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: id, resolution, resolutionType, resolvedBy' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.resolveDispute(
          id,
          { resolution, resolutionType, refundAmount },
          resolvedBy
        );
        
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'close': {
        const { id, closedBy } = body;
        
        if (!id || !closedBy) {
          return NextResponse.json(
            { success: false, error: 'id and closedBy are required' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.closeDispute(id, closedBy);
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'reopen': {
        const { id, reason, reopenedBy } = body;
        
        if (!id || !reason || !reopenedBy) {
          return NextResponse.json(
            { success: false, error: 'id, reason, and reopenedBy are required' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.reopenDispute(id, reason, reopenedBy);
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'escalate': {
        const { id, reason, escalatedBy } = body;
        
        if (!id || !reason || !escalatedBy) {
          return NextResponse.json(
            { success: false, error: 'id, reason, and escalatedBy are required' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.escalateDispute(id, reason, escalatedBy);
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'add_message': {
        const { disputeId, senderId, senderType, content, attachments, isInternal } = body;
        
        if (!disputeId || !senderId || !senderType || !content) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: disputeId, senderId, senderType, content' },
            { status: 400 }
          );
        }
        
        const message = await disputeManager.addMessage({
          disputeId,
          senderId,
          senderType,
          content,
          attachments,
          isInternal,
        });
        
        return NextResponse.json({ success: true, data: { message } });
      }
      
      case 'add_evidence': {
        const { disputeId, evidence } = body;
        
        if (!disputeId || !evidence) {
          return NextResponse.json(
            { success: false, error: 'disputeId and evidence are required' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.addEvidence(disputeId, evidence);
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      case 'remove_evidence': {
        const { disputeId, evidenceId, removedBy } = body;
        
        if (!disputeId || !evidenceId || !removedBy) {
          return NextResponse.json(
            { success: false, error: 'disputeId, evidenceId, and removedBy are required' },
            { status: 400 }
          );
        }
        
        const dispute = await disputeManager.removeEvidence(disputeId, evidenceId, removedBy);
        return NextResponse.json({ success: true, data: { dispute } });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error: any) {
    console.error('Disputes API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
