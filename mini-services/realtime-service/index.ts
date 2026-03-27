/**
 * OMNI-CRM Real-time Notification Service
 * WebSocket Server for instant updates
 * 
 * Port: 3002
 * Gateway: Caddy forwards WebSocket connections
 */

import { Server } from 'socket.io';

const PORT = 3002;

// ============================================
// IN-MEMORY STATE
// ============================================

interface ConnectedUser {
  socketId: string;
  userId: string;
  userType: string;
  rooms: string[];
}

const connectedUsers = new Map<string, ConnectedUser>();

// ============================================
// SOCKET SERVER
// ============================================

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  path: '/',
});

console.log(`🚀 Real-time service running on port ${PORT}`);

// ============================================
// EVENT HANDLERS
// ============================================

io.on('connection', (socket) => {
  console.log(`📥 Client connected: ${socket.id}`);

  // User authentication
  socket.on('authenticate', (data: { userId: string; userType: string }) => {
    const { userId, userType } = data;

    // Store user connection
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId,
      userType,
      rooms: [],
    });

    // Join user's personal room
    socket.join(`user:${userId}`);
    
    // Join role-based room
    socket.join(`role:${userType.toLowerCase()}`);

    // Acknowledge authentication
    socket.emit('authenticated', { success: true });

    console.log(`✅ User authenticated: ${userId} (${userType})`);
  });

  // Join specific room
  socket.on('join_room', (room: string) => {
    socket.join(room);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.rooms.push(room);
    }

    console.log(`👥 Socket ${socket.id} joined room: ${room}`);
  });

  // Leave room
  socket.on('leave_room', (room: string) => {
    socket.leave(room);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      user.rooms = user.rooms.filter(r => r !== room);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    console.log(`📤 Client disconnected: ${socket.id}`);
  });
});

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * Send notification to specific user
 */
export function notifyUser(userId: string, event: string, data: unknown) {
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Send notification to all users of a role
 */
export function notifyRole(role: string, event: string, data: unknown) {
  io.to(`role:${role}`).emit(event, data);
}

/**
 * Send notification to all connected users
 */
export function broadcast(event: string, data: unknown) {
  io.emit(event, data);
}

/**
 * Send task update
 */
export function notifyTaskUpdate(taskId: string, data: unknown) {
  io.emit('task_update', { taskId, ...data });
}

/**
 * Send new task notification
 */
export function notifyNewTask(task: unknown) {
  io.emit('new_task', task);
}

/**
 * Send transaction update
 */
export function notifyTransaction(userId: string, transaction: unknown) {
  io.to(`user:${userId}`).emit('transaction_update', transaction);
}

/**
 * Send SLA breach alert
 */
export function notifySLABreach(task: unknown) {
  io.to('role:admin').emit('sla_breach', task);
  io.to('role:staff').emit('sla_breach', task);
}

// ============================================
// HEALTH CHECK
// ============================================

setInterval(() => {
  const stats = {
    connectedUsers: connectedUsers.size,
    uptime: process.uptime(),
  };
  
  io.emit('health_check', stats);
}, 30000);

export { io };
