import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import * as presenceService from '../services/presence.service';
import prisma from './database';

// Extend Socket interface to include user property
declare module 'socket.io' {
  interface Socket {
    user?: SocketUser;
  }
}

// Socket.io configuration interface
export interface SocketConfig {
  cors: {
    origin: string | string[];
    methods: string[];
    credentials: boolean;
  };
  transports: ('polling' | 'websocket')[];
  allowEIO3: boolean;
  pingTimeout: number;
  pingInterval: number;
}

// Default socket configuration
export const socketConfig: SocketConfig = {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://yourdomain.com'
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000  // 25 seconds
};

// JWT payload interface for socket authentication
export interface SocketJWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Socket user interface
export interface SocketUser {
  id: string;
  email: string;
  displayName: string;
  socketId: string;
  isOnline: boolean;
  lastSeen: Date;
  currentConversations: Set<string>;
}

// Socket authentication middleware
export const authenticateSocket = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Use the same JWT secret and verification options as HTTP authentication
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    
    // Verify JWT token with same options as HTTP auth
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'messageai-api',
      audience: 'messageai-client'
    }) as SocketJWTPayload;
    
    // Fetch user details from database to get displayName
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isOnline: true
      }
    });

    if (!user) {
      return next(new Error('User not found'));
    }
    
    // Attach user information to socket
    socket.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date(),
      currentConversations: new Set()
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
  }
};

// Create Socket.io server instance
export const createSocketServer = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, socketConfig);

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Set up periodic cleanup of stale presence data
  setInterval(async () => {
    try {
      await presenceService.cleanupStalePresence();
    } catch (error) {
      console.error('Error during presence cleanup:', error);
    }
  }, 60000); // Run every minute

  return io;
};

// Utility functions for socket operations
export const getSocketServer = (): SocketIOServer | null => {
  // This will be set when the server is created
  return (global as any).socketServer || null;
};

export const setSocketServer = (io: SocketIOServer): void => {
  (global as any).socketServer = io;
};

// Broadcast message to conversation
export const broadcastToConversation = (conversationId: string, event: string, data: any): void => {
  const io = getSocketServer();
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
};

// Send message to specific user
export const sendToUser = (userId: string, event: string, data: any): void => {
  const io = getSocketServer();
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Get online users in a conversation
export const getOnlineUsersInConversation = async (conversationId: string): Promise<string[]> => {
  const io = getSocketServer();
  if (!io) return [];

  const sockets = await io.in(`conversation:${conversationId}`).fetchSockets();
  return sockets.map(socket => (socket as any).user?.id).filter(Boolean) as string[];
};

// Check if user is online
export const isUserOnline = async (userId: string): Promise<boolean> => {
  const io = getSocketServer();
  if (!io) return false;

  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets.length > 0;
};
