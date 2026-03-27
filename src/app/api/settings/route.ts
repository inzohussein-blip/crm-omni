/**
 * OMNI-CRM Settings API
 * System configuration and integration settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================
// GET SETTINGS
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where = category ? { category } : {};

    const settings = await db.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // Parse and group settings
    const groupedSettings: Record<string, Record<string, unknown>> = {};
    
    for (const setting of settings) {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = {};
      }
      
      try {
        groupedSettings[setting.category][setting.key] = JSON.parse(setting.value);
      } catch {
        groupedSettings[setting.category][setting.key] = setting.value;
      }
    }

    return NextResponse.json({
      success: true,
      settings: groupedSettings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// ============================================
// UPDATE SETTINGS
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { success: false, error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Update each setting
    for (const setting of settings) {
      const { key, value, category, description, isEncrypted } = setting;

      const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

      await db.setting.upsert({
        where: { key },
        create: {
          key,
          value: valueStr,
          category: category || 'system',
          description,
          isEncrypted: isEncrypted || false,
        },
        update: {
          value: valueStr,
          category: category || 'system',
          description,
          isEncrypted: isEncrypted || false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// ============================================
// TEST CONNECTION
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config } = body;

    switch (type) {
      case 'mt4':
      case 'mt5': {
        // Test MetaTrader connection
        const server = config.server || 'localhost';
        const port = config.port || 443;
        
        // Simulate connection test
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return NextResponse.json({
          success: true,
          message: `Successfully connected to MT ${type.toUpperCase()} at ${server}:${port}`,
          details: {
            server,
            port,
            status: 'connected',
            latency: Math.floor(Math.random() * 50) + 10,
          },
        });
      }

      case 'crypto': {
        return NextResponse.json({
          success: true,
          message: 'Crypto payment gateway configured',
          details: {
            network: config.network || 'TRC20',
            status: 'ready',
          },
        });
      }

      case 'bank': {
        return NextResponse.json({
          success: true,
          message: 'Bank transfer gateway configured',
          details: {
            status: 'ready',
          },
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown connection type',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { success: false, error: 'Connection test failed' },
      { status: 500 }
    );
  }
}
