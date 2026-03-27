/**
 * OMNI-CRM Tasks API
 * Smart Task Manager with Priority Scoring and SLA Tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditService } from '@/lib/audit';
import { parseSecureRequest, secureResponse } from '@/lib/security';
import { Task, TaskStatus, Priority, TaskCategory, PlatformSource } from '@prisma/client';

// ============================================
// GET TASKS - List with Filtering
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Filters
    const status = searchParams.get('status') as TaskStatus | null;
    const priority = searchParams.get('priority') as Priority | null;
    const category = searchParams.get('category') as TaskCategory | null;
    const assigneeId = searchParams.get('assigneeId');
    const platformSource = searchParams.get('platformSource') as PlatformSource | null;
    const search = searchParams.get('search');
    const slaBreached = searchParams.get('slaBreached') === 'true';
    
    // Date range
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assigneeId) where.assigneeId = assigneeId;
    if (platformSource) where.platformSource = platformSource;
    if (slaBreached) where.slaBreached = true;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { sourceReference: { contains: search } },
      ];
    }
    
    // Execute query
    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
          assignee: {
            select: { id: true, name: true, email: true },
          },
          comments: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              userId: true,
              createdAt: true,
            },
          },
          _count: {
            select: { comments: true },
          },
        },
        orderBy: [
          { priorityScore: 'desc' },
          { slaDeadline: 'asc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      db.task.count({ where }),
    ]);
    
    // Calculate SLA remaining for each task
    const tasksWithSLA = tasks.map(task => ({
      ...task,
      slaRemaining: calculateSLARemaining(task),
      isOverdue: isTaskOverdue(task),
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        tasks: tasksWithSLA,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// ============================================
// CREATE TASK
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Parse encrypted request if needed
    let data = body;
    if (body.encrypted) {
      data = parseSecureRequest(body.encrypted) as Record<string, unknown>;
    }
    
    // Validate required fields
    const {
      title,
      description,
      category,
      priority = 'MEDIUM',
      creatorId,
      assigneeId,
      platformSource = 'WEB',
      sourceReference,
      entityType,
      entityId,
      slaMinutes = 60,
    } = data as Record<string, unknown>;
    
    if (!title || !category || !creatorId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Calculate priority score
    const priorityScore = calculatePriorityScore(
      priority as Priority,
      category as TaskCategory
    );
    
    // Calculate SLA deadline
    const slaDeadline = new Date(Date.now() + (slaMinutes as number) * 60 * 1000);
    
    // Create task
    const task = await db.task.create({
      data: {
        title: title as string,
        description: description as string,
        category: category as TaskCategory,
        priority: priority as Priority,
        priorityScore,
        creatorId: creatorId as string,
        assigneeId: assigneeId as string | undefined,
        platformSource: platformSource as PlatformSource,
        sourceReference: sourceReference as string | undefined,
        entityType: entityType as string | undefined,
        entityId: entityId as string | undefined,
        slaMinutes: slaMinutes as number,
        slaDeadline,
        status: 'NEW',
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    
    // Audit log
    await auditService.log({
      action: 'CREATE',
      entityType: 'Task',
      entityId: task.id,
      newValue: task,
      context: {
        userId: creatorId as string,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
      taskId: task.id,
    });
    
    // Return encrypted response if requested
    if (body.encrypted) {
      return NextResponse.json(secureResponse({ success: true, data: task }));
    }
    
    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculatePriorityScore(priority: Priority, category: TaskCategory): number {
  const priorityWeights: Record<Priority, number> = {
    CRITICAL: 100,
    HIGH: 75,
    MEDIUM: 50,
    LOW: 25,
  };
  
  const categoryWeights: Record<TaskCategory, number> = {
    KYC_VERIFICATION: 80,
    WITHDRAWAL: 90,
    DEPOSIT: 85,
    ACCOUNT_OPENING: 60,
    SUPPORT: 50,
    COMPLAINT: 95,
    COMPLIANCE: 70,
    OTHER: 30,
  };
  
  const priorityWeight = priorityWeights[priority] || 50;
  const categoryWeight = categoryWeights[category] || 50;
  
  // Combined score (weighted average)
  return Math.round((priorityWeight * 0.6 + categoryWeight * 0.4));
}

function calculateSLARemaining(task: Task): number {
  if (!task.slaDeadline) return 0;
  
  const now = new Date();
  const remaining = task.slaDeadline.getTime() - now.getTime();
  
  return Math.max(0, Math.floor(remaining / 1000 / 60)); // Minutes
}

function isTaskOverdue(task: Task): boolean {
  if (!task.slaDeadline) return false;
  
  return new Date() > task.slaDeadline && 
    !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(task.status);
}
