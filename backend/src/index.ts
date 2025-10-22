import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import prisma from './config/database';
import { configureAWS } from './config/aws';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import conversationRoutes from './routes/conversations.routes';
import messageRoutes from './routes/messages.routes';
import { initializeSocketServer } from './socket';

// Load environment variables
dotenv.config();

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database connection...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test basic query to ensure tables exist
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database schema verified');
    
    // Check if User table exists
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    // If it's a table not found error, try to run migrations
    if (error instanceof Error && error.message.includes('does not exist')) {
      console.log('🔄 Attempting to run database migrations...');
      try {
        const { execSync } = require('child_process');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        console.log('✅ Database migrations completed');
        
        // Retry connection
        await prisma.$connect();
        console.log('✅ Database connected after migrations');
      } catch (migrationError) {
        console.error('❌ Migration failed:', migrationError);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

// Configure AWS services
try {
  configureAWS();
} catch (error) {
  console.warn('⚠️ AWS configuration failed:', error);
  console.warn('File upload features will not be available');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server from Express app
const httpServer = createServer(app);

// CORS configuration for both Express and Socket.io
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://yourdomain.com'
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://localhost:8081'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/conversations', messageRoutes);

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'MessageAI API v1',
    version: '1.0.0',
    features: {
      rest: true,
      websockets: true,
      realTimeMessaging: true,
      presence: true,
      typingIndicators: true
    },
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      conversations: '/api/v1/conversations',
      messages: '/api/v1/conversations/:id/messages',
      register: 'POST /api/v1/auth/register',
      login: 'POST /api/v1/auth/login',
      refresh: 'POST /api/v1/auth/refresh',
      logout: 'POST /api/v1/auth/logout',
      profile: 'GET /api/v1/auth/profile',
      getCurrentUser: 'GET /api/v1/users/me',
      updateProfile: 'PUT /api/v1/users/me',
      uploadAvatar: 'POST /api/v1/users/avatar',
      searchUsers: 'GET /api/v1/users/search',
      getConversations: 'GET /api/v1/conversations',
      createConversation: 'POST /api/v1/conversations',
      getConversation: 'GET /api/v1/conversations/:id',
      getMessages: 'GET /api/v1/conversations/:id/messages',
      createMessage: 'POST /api/v1/conversations/:id/messages',
      uploadMessageMedia: 'POST /api/v1/conversations/:id/messages/upload'
    },
    websocket: {
      url: `ws://localhost:${PORT}`,
      events: {
        connection: 'Socket connection established',
        send_message: 'Send a message to conversation',
        message_received: 'Receive new message',
        typing_start: 'User started typing',
        typing_stop: 'User stopped typing',
        join_conversation: 'Join a conversation room',
        leave_conversation: 'Leave a conversation room',
        heartbeat: 'Keep connection alive',
        presence_update: 'Update user presence status'
      }
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close Socket.io server
  io.close(() => {
    console.log('Socket.io server closed');
  });
  
  // Disconnect from database
  await prisma.$disconnect();
  console.log('Database disconnected');
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize Socket.io server
const io = initializeSocketServer(httpServer);

// Start server with database initialization
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API base: http://localhost:${PORT}/api/v1`);
      console.log(`🔌 Socket.io server initialized and ready for connections`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
