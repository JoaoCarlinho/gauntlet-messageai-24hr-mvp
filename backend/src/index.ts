import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import prisma, { connectWithRetry, disconnectDatabase, checkDatabaseConnection } from './config/database';
import { configureAWS } from './config/aws';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import conversationRoutes from './routes/conversations.routes';
import messageRoutes from './routes/messages.routes';
import { initializeSocketServer } from './socket';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Database initialization function
async function initializeDatabase() {
  try {
    logger.info('Initializing database connection...');
    
    // Use enhanced connection with retry logic
    await connectWithRetry();
    
    // Check if User table exists and fix schema issues
    try {
      const userCount = await prisma.user.count();
      logger.info(`Found ${userCount} users in database`);
    } catch (schemaError) {
      logger.info('Database schema issue detected, attempting to fix...');
      
      // Check if pushTokens column is missing
      if (schemaError instanceof Error && schemaError.message.includes('pushTokens')) {
        logger.info('Adding missing pushTokens column to User table...');
        try {
          await prisma.$executeRaw`
            ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pushTokens" TEXT[] DEFAULT ARRAY[]::TEXT[]
          `;
          logger.info('✅ pushTokens column added successfully');
          
          // Retry user count
          const userCount = await prisma.user.count();
          logger.info(`Found ${userCount} users in database after schema fix`);
        } catch (fixError) {
          logger.logError(fixError as Error, { operation: 'schema_fix' });
          throw fixError;
        }
      } else {
        throw schemaError;
      }
    }
    
  } catch (error) {
    logger.logError(error as Error, { operation: 'database_initialization' });
    
    // If it's a table not found error, try to run migrations
    if (error instanceof Error && error.message.includes('does not exist')) {
      logger.info('Attempting to run database migrations...');
      try {
        const { execSync } = require('child_process');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        logger.info('Database migrations completed');
        
        // Retry connection
        await prisma.$connect();
        logger.info('Database connected after migrations');
      } catch (migrationError) {
        logger.logError(migrationError as Error, { operation: 'database_migration' });
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
// Enhanced logging middleware
app.use(logger.requestLogger());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    
    // Check AWS configuration
    const awsConfigured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    
    // Check JWT configuration
    const jwtConfigured = !!process.env.JWT_SECRET;
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      responseTime: `${responseTime}ms`,
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        aws: awsConfigured ? 'configured' : 'not_configured',
        jwt: jwtConfigured ? 'configured' : 'not_configured',
        socket: 'active'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      },
      railway: {
        environment: process.env.RAILWAY_ENVIRONMENT || 'unknown',
        publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost'
      }
    };
    
    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      uptime: process.uptime()
    });
  }
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
  const requestId = (req as any).requestId;
  const userId = (req as any).user?.id;
  
  logger.logError(err, {
    method: req.method,
    url: req.url,
    statusCode: err.status || 500
  }, requestId, userId);
  
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

// Graceful shutdown will be defined later

// Initialize Socket.io server
const io = initializeSocketServer(httpServer);

// Start server with database initialization
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API base: http://localhost:${PORT}/api/v1`);
      logger.info(`Socket.io server initialized and ready for connections`);
    });
  } catch (error) {
    logger.logError(error as Error, { operation: 'server_startup' });
    process.exit(1);
  }
}

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }
    
    // Close Socket.io server
    if (io) {
      io.close(() => {
        logger.info('Socket.io server closed');
      });
    }
    
    // Disconnect database
    await disconnectDatabase();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.logError(error as Error, { operation: 'graceful_shutdown' });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.logError(error, { operation: 'uncaught_exception' });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { promise: promise.toString(), reason });
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export default app;
