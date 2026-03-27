/**
 * OMNI-CRM WebSocket Notification Service
 * Real-time updates for tasks, transactions, and notifications
 */

import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';

// Types
interface TaskUpdate {
  taskId: string;
  type: 'created' | 'updated' | 'assigned' | 'completed' | 'sla_warning' | 'sla_breached';
  data: Record<string, unknown>;
}

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

interface RoomSubscription {
  userId: string;
  roles: string[];
  rooms: string[];
}

// Store connected users
const connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const socketRooms = new Map<string, RoomSubscription>(); // socketId -> subscription

// Create Socket.IO server
function createSocketServer(httpServer: HttpServer) {
  const io = new IOServer(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
  });

  // Middleware for authentication (simplified for demo)
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId || socket.handshake.headers['x-user-id'];
    const roles = socket.handshake.auth.roles || ['user'];

    if (!userId) {
      return next(new Error('Authentication required'));
    }

    // Store user info
    socket.data.userId = userId;
    socket.data.roles = roles;

    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WS] User connected: ${socket.data.userId} (${socket.id})`);

    const userId = socket.data.userId;

    // Track connected users
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based rooms
    socket.data.roles.forEach((role: string) => {
      socket.join(`role:${role}`);
    });

    // Store subscription info
    socketRooms.set(socket.id, {
      userId,
      roles: socket.data.roles,
      rooms: [`user:${userId}`, ...socket.data.roles.map((r: string) => `role:${r}`)],
    });

    // ============================================
    // EVENT HANDLERS
    // ============================================

    // Join specific task room
    socket.on('join:task', (taskId: string) => {
      socket.join(`task:${taskId}`);
      console.log(`[WS] User ${userId} joined task:${taskId}`);
    });

    // Leave task room
    socket.on('leave:task', (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    // Join dashboard room for real-time stats
    socket.on('join:dashboard', () => {
      socket.join('dashboard');
      console.log(`[WS] User ${userId} joined dashboard`);
    });

    // Subscribe to specific entity updates
    socket.on('subscribe', (data: { entityType: string; entityId: string }) => {
      const room = `${data.entityType}:${data.entityId}`;
      socket.join(room);
      console.log(`[WS] User ${userId} subscribed to ${room}`);
    });

    // Unsubscribe from entity
    socket.on('unsubscribe', (data: { entityType: string; entityId: string }) => {
      const room = `${data.entityType}:${data.entityId}`;
      socket.leave(room);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[WS] User disconnected: ${userId} (${socket.id})`);

      // Remove from connected users
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
        }
      }

      socketRooms.delete(socket.id);
    });

    // Send welcome notification
    socket.emit('connected', {
      message: 'Connected to OMNI-CRM real-time service',
      userId,
      timestamp: new Date().toISOString(),
    });
  });

  return io;
}

// ============================================
// BROADCAST FUNCTIONS
// ============================================

/**
 * Broadcast task update to relevant users
 */
function broadcastTaskUpdate(io: IOServer, update: TaskUpdate) {
  // Broadcast to all admin/staff users
  io.to('role:admin').to('role:staff').emit('task:update', update);

  // If task is assigned, notify that user specifically
  if (update.data.assigneeId) {
    io.to(`user:${update.data.assigneeId}`).emit('task:update', update);
  }

  // Broadcast to task room
  io.to(`task:${update.taskId}`).emit('task:update', update);

  console.log(`[WS] Task update broadcast: ${update.taskId} - ${update.type}`);
}

/**
 * Send notification to specific user
 */
function sendUserNotification(io: IOServer, payload: NotificationPayload) {
  io.to(`user:${payload.userId}`).emit('notification', payload);
  console.log(`[WS] Notification sent to user:${payload.userId}`);
}

/**
 * Broadcast to all staff (admins, support, etc.)
 */
function broadcastToStaff(io: IOServer, event: string, data: unknown) {
  io.to('role:admin').to('role:staff').to('role:support').emit(event, data);
}

/**
 * Broadcast dashboard update
 */
function broadcastDashboardUpdate(io: IOServer, data: unknown) {
  io.to('dashboard').emit('dashboard:update', data);
}

/**
 * Check if user is online
 */
function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId);
}

/**
 * Get online users count
 */
function getOnlineUsersCount(): number {
  return connectedUsers.size;
}

// ============================================
// START SERVER
// ============================================

const PORT = 3003;

const httpServer = new HttpServer();
const io = createSocketServer(httpServer);

// API endpoints for internal service communication
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'http';

// Handle API requests from Next.js backend
const apiHandler = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        // Handle different notification types
        if (data.type === 'task_update') {
          broadcastTaskUpdate(io, data.payload);
        } else if (data.type === 'notification') {
          sendUserNotification(io, data.payload);
        } else if (data.type === 'dashboard_update') {
          broadcastDashboardUpdate(io, data.payload);
        } else if (data.type === 'broadcast_staff') {
          broadcastToStaff(io, data.event, data.payload);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  } else if (req.method === 'GET') {
    // Health check
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      onlineUsers: getOnlineUsersCount(),
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
};

// Start server
httpServer.listen(PORT, () => {
  console.log(`[WS] OMNI-CRM WebSocket Service running on port ${PORT}`);
  console.log(`[WS] WebSocket path: /socket.io/`);
  console.log(`[WS] API endpoint: http://localhost:${PORT}/`);
});

export {
  createSocketServer,
  broadcastTaskUpdate,
  sendUserNotification,
  broadcastToStaff,
  broadcastDashboardUpdate,
  isUserOnline,
  getOnlineUsersCount,
};
