/**
 * OMNI-CRM Single Task API
 * Get, Update, Delete individual tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditService } from '@/lib/audit';
import { TaskStatus, Priority } from '@prisma/client';

// ============================================
// GET SINGLE TASK
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const task = await db.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            userId: true,
            isInternal: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            action: true,
            userId: true,
            oldValue: true,
            newValue: true,
            createdAt: true,
          },
        },
      },
    });
    
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Calculate SLA remaining
    const slaRemaining = task.slaDeadline 
      ? Math.max(0, Math.floor((task.slaDeadline.getTime() - Date.now()) / 1000 / 60))
      : 0;
    
    return NextResponse.json({
      success: true,
      data: {
        ...task,
        slaRemaining,
        isOverdue: slaRemaining === 0 && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(task.status),
      },
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// ============================================
// UPDATE TASK
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Get existing task
    const existingTask = await db.task.findUnique({
      where: { id },
    });
    
    if (!existingTask) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority) {
      updateData.priority = body.priority;
      // Recalculate priority score
      const priorityWeights: Record<Priority, number> = {
        CRITICAL: 100,
        HIGH: 75,
        MEDIUM: 50,
        LOW: 25,
      };
      const categoryWeights: Record<string, number> = {
        KYC_VERIFICATION: 80,
        WITHDRAWAL: 90,
        DEPOSIT: 85,
        ACCOUNT_OPENING: 60,
        SUPPORT: 50,
        COMPLAINT: 95,
        COMPLIANCE: 70,
        OTHER: 30,
      };
      const pw = priorityWeights[body.priority as Priority] || 50;
      const cw = categoryWeights[existingTask.category] || 50;
      updateData.priorityScore = Math.round(pw * 0.6 + cw * 0.4);
    }
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;
    
    // Status change logic
    if (body.status && body.status !== existingTask.status) {
      updateData.status = body.status;
      
      // Track timestamps
      if (body.status === 'IN_PROGRESS' && !existingTask.startedAt) {
        updateData.startedAt = new Date();
      }
      if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(body.status)) {
        updateData.completedAt = new Date();
      }
    }
    
    // Update task
    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    
    // Audit log for status change
    if (body.status && body.status !== existingTask.status) {
      await auditService.logTaskChange({
        taskId: id,
        userId: body.actorId || 'system',
        oldStatus: existingTask.status,
        newStatus: body.status,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });
    }
    
    return NextResponse.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE TASK (Soft Delete - Cancel)
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Cancel task instead of hard delete
    const task = await db.task.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });
    
    // Audit log
    await auditService.log({
      action: 'DELETE',
      entityType: 'Task',
      entityId: id,
      oldValue: { status: task.status },
      context: {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
      taskId: id,
    });
    
    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
