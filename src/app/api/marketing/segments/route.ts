/**
 * OMNI-CRM Marketing Segments API
 * CRUD operations for marketing segments
 */

import { NextRequest, NextResponse } from 'next/server';
import { segmentService, SEGMENT_TEMPLATES } from '@/lib/segment-service';
import type { SegmentCriteria } from '@/lib/segment-service';

// ============================================
// GET /api/marketing/segments
// List all segments with optional filtering
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeMembers = searchParams.get('includeMembers') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const templates = searchParams.get('templates') === 'true';

    // Return templates if requested
    if (templates) {
      return NextResponse.json({
        success: true,
        data: {
          templates: segmentService.getTemplates(),
        },
      });
    }

    const { segments, total } = await segmentService.getSegments({
      isActive: isActive !== null ? isActive === 'true' : undefined,
      limit,
      offset,
    });

    // Parse criteria for each segment
    const parsedSegments = segments.map((s) => ({
      ...s,
      criteria: JSON.parse(s.criteria),
    }));

    // Include members if requested
    const segmentsWithMembers = includeMembers
      ? await Promise.all(
          parsedSegments.map(async (segment) => {
            try {
              const { members, total: memberTotal } = await segmentService.getSegmentMembers(
                segment.id,
                { limit: 10 }
              );
              return {
                ...segment,
                members,
                memberTotal,
              };
            } catch {
              return segment;
            }
          })
        )
      : parsedSegments;

    // Include stats if requested
    const segmentsWithStats = includeStats
      ? await Promise.all(
          segmentsWithMembers.map(async (segment) => {
            try {
              const stats = await segmentService.getSegmentStats(segment.id);
              return {
                ...segment,
                stats,
              };
            } catch {
              return segment;
            }
          })
        )
      : segmentsWithMembers;

    return NextResponse.json({
      success: true,
      data: {
        segments: segmentsWithStats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching segments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch segments' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/marketing/segments
// Create a new segment
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if creating from template
    if (body.fromTemplate) {
      const segment = await segmentService.createFromTemplate(
        body.fromTemplate,
        body.name
      );
      return NextResponse.json({
        success: true,
        data: {
          ...segment,
          criteria: JSON.parse(segment.criteria),
        },
      }, { status: 201 });
    }

    // Validate required fields
    if (!body.name || !body.criteria) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, criteria' },
        { status: 400 }
      );
    }

    // Create the segment
    const segment = await segmentService.createSegment({
      name: body.name,
      description: body.description,
      criteria: body.criteria as SegmentCriteria,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...segment,
        criteria: JSON.parse(segment.criteria),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating segment:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create segment' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/marketing/segments
// Update or preview a segment
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const segmentId = searchParams.get('id');

    const body = await request.json();

    // Preview segment (no ID needed)
    if (action === 'preview') {
      if (!body.criteria) {
        return NextResponse.json(
          { success: false, error: 'Criteria is required for preview' },
          { status: 400 }
        );
      }

      const result = await segmentService.previewSegment(body.criteria as SegmentCriteria);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (!segmentId) {
      return NextResponse.json(
        { success: false, error: 'Segment ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'update': {
        const segment = await segmentService.updateSegment(segmentId, {
          name: body.name,
          description: body.description,
          criteria: body.criteria as SegmentCriteria,
          isActive: body.isActive,
        });
        return NextResponse.json({
          success: true,
          data: {
            ...segment,
            criteria: JSON.parse(segment.criteria),
          },
        });
      }

      case 'refresh': {
        const segment = await segmentService.refreshSegmentStats(segmentId);
        return NextResponse.json({
          success: true,
          data: {
            ...segment,
            criteria: JSON.parse(segment.criteria),
          },
        });
      }

      case 'stats': {
        const stats = await segmentService.getSegmentStats(segmentId);
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      case 'members': {
        const limit = parseInt(searchParams.get('memberLimit') || '50');
        const offset = parseInt(searchParams.get('memberOffset') || '0');
        
        const { members, total } = await segmentService.getSegmentMembers(segmentId, {
          limit,
          offset,
        });
        
        return NextResponse.json({
          success: true,
          data: {
            members,
            total,
            pagination: {
              limit,
              offset,
              hasMore: offset + limit < total,
            },
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating segment:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update segment' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/marketing/segments
// Delete a segment
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const segmentId = searchParams.get('id');

    if (!segmentId) {
      return NextResponse.json(
        { success: false, error: 'Segment ID is required' },
        { status: 400 }
      );
    }

    await segmentService.deleteSegment(segmentId);

    return NextResponse.json({
      success: true,
      message: 'Segment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting segment:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete segment' },
      { status: 500 }
    );
  }
}
