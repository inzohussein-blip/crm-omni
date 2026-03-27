/**
 * OMNI-CRM Activity Timeline API
 * RESTful endpoints for activity logging and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ActivityLogger,
  ActivityAction,
  ActivityEntityType,
  ActivityFilter,
} from '@/lib/activity-service';

// ============================================
// GET /api/activity
// Retrieve activities with filtering
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Handle different actions
    switch (action) {
      case 'stats': {
        const dateFrom = searchParams.get('dateFrom')
          ? new Date(searchParams.get('dateFrom')!)
          : undefined;
        const dateTo = searchParams.get('dateTo')
          ? new Date(searchParams.get('dateTo')!)
          : undefined;

        const logger = ActivityLogger.getInstance();
        const stats = await logger.getStats(dateFrom, dateTo);
        return NextResponse.json({ success: true, data: stats });
      }

      case 'aggregation': {
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');
        const groupBy = (searchParams.get('groupBy') || 'day') as 'day' | 'hour';

        if (!dateFrom || !dateTo) {
          return NextResponse.json(
            { success: false, error: 'dateFrom and dateTo are required for aggregation' },
            { status: 400 }
          );
        }

        const logger = ActivityLogger.getInstance();
        const aggregation = await logger.getAggregation(
          new Date(dateFrom),
          new Date(dateTo),
          groupBy
        );
        return NextResponse.json({ success: true, data: aggregation });
      }

      case 'entity': {
        const entityType = searchParams.get('entityType') as ActivityEntityType;
        const entityId = searchParams.get('entityId');
        const entityLimit = parseInt(searchParams.get('limit') || '20');

        if (!entityType || !entityId) {
          return NextResponse.json(
            { success: false, error: 'entityType and entityId are required' },
            { status: 400 }
          );
        }

        const logger = ActivityLogger.getInstance();
        const activities = await logger.getEntityActivities(entityType, entityId, entityLimit);
        return NextResponse.json({ success: true, data: activities });
      }

      case 'user': {
        const userId = searchParams.get('userId');
        const userLimit = parseInt(searchParams.get('limit') || '50');

        if (!userId) {
          return NextResponse.json(
            { success: false, error: 'userId is required' },
            { status: 400 }
          );
        }

        const logger = ActivityLogger.getInstance();
        const activities = await logger.getUserActivities(userId, userLimit);
        return NextResponse.json({ success: true, data: activities });
      }

      case 'timeline': {
        const entityType = searchParams.get('entityType') as ActivityEntityType | undefined;
        const entityId = searchParams.get('entityId') || undefined;
        const userId = searchParams.get('userId') || undefined;
        const timelineLimit = parseInt(searchParams.get('limit') || '50');

        const logger = ActivityLogger.getInstance();
        const activities = await logger.getTimeline(entityType, entityId, userId, timelineLimit);
        return NextResponse.json({ success: true, data: activities });
      }

      case 'get': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json(
            { success: false, error: 'Activity ID is required' },
            { status: 400 }
          );
        }

        const logger = ActivityLogger.getInstance();
        const activity = await logger.getById(id);
        if (!activity) {
          return NextResponse.json(
            { success: false, error: 'Activity not found' },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: activity });
      }

      default: {
        // List activities with filters
        const filter: ActivityFilter = {};

        if (searchParams.get('userId')) {
          filter.userId = searchParams.get('userId')!;
        }
        if (searchParams.get('entityType')) {
          filter.entityType = searchParams.get('entityType') as ActivityEntityType;
        }
        if (searchParams.get('entityId')) {
          filter.entityId = searchParams.get('entityId')!;
        }
        if (searchParams.get('filterAction')) {
          filter.action = searchParams.get('filterAction') as ActivityAction;
        }
        if (searchParams.get('dateFrom')) {
          filter.dateFrom = new Date(searchParams.get('dateFrom')!);
        }
        if (searchParams.get('dateTo')) {
          filter.dateTo = new Date(searchParams.get('dateTo')!);
        }
        if (searchParams.get('isPublic')) {
          filter.isPublic = searchParams.get('isPublic') === 'true';
        }
        if (searchParams.get('search')) {
          filter.search = searchParams.get('search')!;
        }

        const logger = ActivityLogger.getInstance();
        const result = await logger.getActivities(filter, page, limit);

        return NextResponse.json({
          success: true,
          data: result.activities,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
          },
        });
      }
    }
  } catch (error) {
    console.error('Activity API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/activity
// Create new activity log
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle batch logging
    if (body.action === 'batch') {
      const { activities } = body;
      if (!Array.isArray(activities) || activities.length === 0) {
        return NextResponse.json(
          { success: false, error: 'activities array is required' },
          { status: 400 }
        );
      }

      // Validate each activity
      for (const activity of activities) {
        if (!activity.action || !activity.entityType || !activity.title) {
          return NextResponse.json(
            { success: false, error: 'Each activity must have action, entityType, and title' },
            { status: 400 }
          );
        }
      }

      const logger = ActivityLogger.getInstance();
      const count = await logger.logBatch(activities);
      return NextResponse.json({ success: true, data: { count } });
    }

    // Single activity logging
    const { userId, userName, action, entityType, entityId, title, description, metadata, ipAddress, userAgent, isPublic } = body;

    if (!action || !entityType || !title) {
      return NextResponse.json(
        { success: false, error: 'action, entityType, and title are required' },
        { status: 400 }
      );
    }

    const logger = ActivityLogger.getInstance();
    const activity = await logger.log({
      userId,
      userName,
      action,
      entityType,
      entityId,
      title,
      description,
      metadata,
      ipAddress,
      userAgent,
      isPublic,
    });

    return NextResponse.json({ success: true, data: activity });
  } catch (error) {
    console.error('Activity API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/activity
// Delete old activities (data retention)
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90');

    if (days < 30) {
      return NextResponse.json(
        { success: false, error: 'Minimum retention period is 30 days' },
        { status: 400 }
      );
    }

    const logger = ActivityLogger.getInstance();
    const count = await logger.deleteOlderThan(days);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: count,
        olderThanDays: days,
      },
    });
  } catch (error) {
    console.error('Activity API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
