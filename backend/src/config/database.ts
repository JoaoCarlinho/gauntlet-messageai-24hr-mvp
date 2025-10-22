import { PrismaClient, Prisma } from '@prisma/client';

// Enhanced Prisma client configuration for Railway deployment
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn', 'info'] 
    : ['error', 'warn'],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool configuration for Railway
  // Note: Connection timeouts are handled at the application level
});

// Enhanced error handling
export const handlePrismaError = (error: unknown): { message: string; code?: string; statusCode: number } => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          message: 'A record with this information already exists',
          code: error.code,
          statusCode: 409,
        };
      case 'P2025':
        return {
          message: 'Record not found',
          code: error.code,
          statusCode: 404,
        };
      case 'P2003':
        return {
          message: 'Foreign key constraint failed',
          code: error.code,
          statusCode: 400,
        };
      case 'P2014':
        return {
          message: 'Invalid ID provided',
          code: error.code,
          statusCode: 400,
        };
      default:
        return {
          message: 'Database operation failed',
          code: error.code,
          statusCode: 500,
        };
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      message: 'Unknown database error occurred',
      statusCode: 500,
    };
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      message: 'Database engine crashed',
      statusCode: 500,
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      message: 'Failed to connect to database',
      statusCode: 500,
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      message: 'Invalid data provided',
      statusCode: 400,
    };
  }

  // Generic error
  return {
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    statusCode: 500,
  };
};

// Connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
};

// Connection retry logic
export const connectWithRetry = async (maxRetries: number = 5, delay: number = 2000): Promise<void> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await checkDatabaseConnection();
      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
      }
      
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
};

export default prisma;
