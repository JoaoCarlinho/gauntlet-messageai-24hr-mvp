import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/database';
import { configureAWS } from './config/aws';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import conversationRoutes from './routes/conversations.routes';
import messageRoutes from './routes/messages.routes';

// Load environment variables
dotenv.config();

// Configure AWS services
try {
  configureAWS();
} catch (error) {
  console.warn('⚠️ AWS configuration failed:', error);
  console.warn('File upload features will not be available');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base: http://localhost:${PORT}/api/v1`);
});

export default app;
