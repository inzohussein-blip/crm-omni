/**
 * OMNI-CRM Notification Templates API
 * CRUD operations for notification templates
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotificationTemplateService } from '@/lib/notification-advanced';
import { NotificationType } from '@prisma/client';

// ============================================
// GET TEMPLATES
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') as NotificationType | null;
    const channel = searchParams.get('channel');
    const language = searchParams.get('language') || 'en';
    const isActive = searchParams.get('isActive');

    const filters: {
      type?: NotificationType;
      channel?: string;
      language?: string;
      isActive?: boolean;
    } = {};

    if (type) filters.type = type;
    if (channel) filters.channel = channel;
    if (language) filters.language = language;
    if (isActive !== null && isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    const templates = await NotificationTemplateService.listTemplates(filters);

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// ============================================
// CREATE TEMPLATE
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      type,
      channel,
      subject,
      title,
      body: templateBody,
      htmlContent,
      variables,
      language,
    } = body;

    // Validation
    if (!name || !type || !channel || !title || !templateBody) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, type, channel, title, body' 
        },
        { status: 400 }
      );
    }

    // Validate channel
    const validChannels = ['email', 'sms', 'push', 'in_app'];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: NotificationType[] = [
      'DEPOSIT', 'WITHDRAWAL', 'TRADE', 'KYC', 'TASK', 
      'COMMISSION', 'SYSTEM', 'SECURITY', 'MARKETING'
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Extract variables from template if not provided
    const extractedVariables = variables || 
      NotificationTemplateService.extractVariables(
        `${title} ${templateBody} ${subject || ''} ${htmlContent || ''}`
      );

    const template = await NotificationTemplateService.createTemplate({
      name,
      type,
      channel,
      subject,
      title,
      body: templateBody,
      htmlContent,
      variables: extractedVariables,
      language: language || 'en',
    });

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  } catch (error) {
    console.error('Error creating template:', error);
    
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'Template with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// ============================================
// UPDATE TEMPLATE
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Validate channel if provided
    if (updates.channel) {
      const validChannels = ['email', 'sms', 'push', 'in_app'];
      if (!validChannels.includes(updates.channel)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` 
          },
          { status: 400 }
        );
      }
    }

    // Validate type if provided
    if (updates.type) {
      const validTypes: NotificationType[] = [
        'DEPOSIT', 'WITHDRAWAL', 'TRADE', 'KYC', 'TASK', 
        'COMMISSION', 'SYSTEM', 'SECURITY', 'MARKETING'
      ];
      if (!validTypes.includes(updates.type)) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
          },
          { status: 400 }
        );
      }
    }

    const template = await NotificationTemplateService.updateTemplate(id, updates);

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE TEMPLATE
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const deleted = await NotificationTemplateService.deleteTemplate(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
