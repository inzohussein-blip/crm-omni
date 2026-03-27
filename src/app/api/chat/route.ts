/**
 * OMNI-CRM Chat System API
 * Internal team chat and client support
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============================================
// GET CHAT ROOMS/MESSAGES
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Return mock data for demo
    const mockRooms = [
      {
        id: 'room_1',
        type: 'GROUP',
        name: 'Support Team',
        participants: ['user_1', 'user_2', 'user_3'],
        lastMessage: {
          content: 'New deposit request from client #12345',
          createdAt: new Date().toISOString(),
          userId: 'user_1',
        },
        unreadCount: 3,
      },
      {
        id: 'room_2',
        type: 'DIRECT',
        name: 'John Smith',
        participants: [userId, 'user_2'],
        lastMessage: {
          content: 'The KYC documents have been verified',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          userId: 'user_2',
        },
        unreadCount: 0,
      },
    ];

    if (roomId) {
      const mockMessages = [
        {
          id: 'msg_1',
          roomId,
          userId: 'user_1',
          userName: 'Admin User',
          content: 'Welcome to the support channel!',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'msg_2',
          roomId,
          userId: 'user_2',
          userName: 'John Smith',
          content: 'Thanks! I have a question about the new withdrawal process.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'msg_3',
          roomId,
          userId: 'user_1',
          userName: 'Admin User',
          content: 'Sure, what do you need to know?',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ];

      return NextResponse.json({
        success: true,
        data: {
          room: mockRooms.find(r => r.id === roomId),
          messages: mockMessages,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: mockRooms,
    });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat data' },
      { status: 500 }
    );
  }
}

// ============================================
// CREATE/SEND MESSAGE
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'create_room':
        return NextResponse.json({
          success: true,
          data: {
            roomId: `room_${Date.now()}`,
            isNew: true,
          },
        });

      case 'send_message':
        return NextResponse.json({
          success: true,
          data: {
            messageId: `msg_${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
        });

      case 'mark_read':
        return NextResponse.json({ success: true });

      case 'typing':
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process chat action' },
      { status: 500 }
    );
  }
}
