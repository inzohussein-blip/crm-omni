/**
 * OMNI-CRM Marketing Campaigns API
 * CRUD operations for marketing campaigns
 */

import { NextRequest, NextResponse } from 'next/server';
import { campaignManager, emailTemplateService } from '@/lib/marketing-service';
import { segmentService } from '@/lib/segment-service';
import { db } from '@/lib/db';

// ============================================
// GET /api/marketing/campaigns
// List all campaigns with optional filtering
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED' | null;
    const type = searchParams.get('type') as 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | null;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeStats = searchParams.get('includeStats') === 'true';

    const { campaigns, total } = await campaignManager.getCampaigns({
      status: status || undefined,
      type: type || undefined,
      limit,
      offset,
    });

    // Include statistics if requested
    const campaignsWithStats = includeStats
      ? await Promise.all(
          campaigns.map(async (campaign) => {
            try {
              const stats = await campaignManager.getStatistics(campaign.id);
              return {
                ...campaign,
                targetAudience: JSON.parse(campaign.targetAudience),
                stats,
              };
            } catch {
              return {
                ...campaign,
                targetAudience: JSON.parse(campaign.targetAudience),
                stats: null,
              };
            }
          })
        )
      : campaigns.map((c) => ({
          ...c,
          targetAudience: JSON.parse(c.targetAudience),
        }));

    return NextResponse.json({
      success: true,
      data: {
        campaigns: campaignsWithStats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/marketing/campaigns
// Create a new campaign
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.type || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, type, content' },
        { status: 400 }
      );
    }

    // Create the campaign
    const campaign = await campaignManager.createCampaign({
      name: body.name,
      type: body.type,
      subject: body.subject,
      content: body.content,
      htmlContent: body.htmlContent,
      templateId: body.templateId,
      targetAudience: body.targetAudience || {},
      segmentId: body.segmentId,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      abTestId: body.abTestId,
      abVariant: body.abVariant,
      createdById: body.createdById,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        targetAudience: JSON.parse(campaign.targetAudience),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/marketing/campaigns
// Update a campaign (for bulk operations via query param)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'schedule': {
        const body = await request.json();
        if (!body.scheduledAt) {
          return NextResponse.json(
            { success: false, error: 'scheduledAt is required for scheduling' },
            { status: 400 }
          );
        }
        const campaign = await campaignManager.scheduleCampaign(
          campaignId,
          new Date(body.scheduledAt)
        );
        return NextResponse.json({
          success: true,
          data: {
            ...campaign,
            targetAudience: JSON.parse(campaign.targetAudience),
          },
        });
      }

      case 'cancel': {
        const campaign = await campaignManager.cancelCampaign(campaignId);
        return NextResponse.json({
          success: true,
          data: {
            ...campaign,
            targetAudience: JSON.parse(campaign.targetAudience),
          },
        });
      }

      case 'send': {
        const result = await campaignManager.sendCampaign(campaignId);
        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      case 'update': {
        const body = await request.json();
        const campaign = await campaignManager.updateCampaign(campaignId, body);
        return NextResponse.json({
          success: true,
          data: {
            ...campaign,
            targetAudience: JSON.parse(campaign.targetAudience),
          },
        });
      }

      case 'track-open': {
        await campaignManager.trackOpen(campaignId);
        return NextResponse.json({ success: true });
      }

      case 'track-click': {
        await campaignManager.trackClick(campaignId);
        return NextResponse.json({ success: true });
      }

      case 'track-bounce': {
        await campaignManager.trackBounce(campaignId);
        return NextResponse.json({ success: true });
      }

      case 'track-unsubscribe': {
        await campaignManager.trackUnsubscribe(campaignId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/marketing/campaigns
// Delete a campaign
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('id');

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    await campaignManager.deleteCampaign(campaignId);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
