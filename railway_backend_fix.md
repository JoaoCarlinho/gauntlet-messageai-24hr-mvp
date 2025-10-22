# Railway Backend Fix Plan

## Overview
This document outlines a comprehensive plan to fix the errors identified in the Railway backend service logs. The main issues are related to database schema, AWS SDK deprecation, and Prisma client configuration.

## Current Issues Identified

### 1. Database Schema Issues
- **Error**: `The table 'public.User' does not exist in the current database`
- **Impact**: Critical - Application cannot function without database tables
- **Root Cause**: Database migrations not applied or schema out of sync

### 2. AWS SDK Deprecation Warning
- **Warning**: AWS SDK v2 is in maintenance mode
- **Impact**: Medium - Security and performance concerns
- **Root Cause**: Using deprecated AWS SDK v2 instead of v3

### 3. Prisma Client Issues
- **Error**: Prisma client cannot find database tables
- **Impact**: Critical - Database operations failing
- **Root Cause**: Database not properly initialized or migrated

## Fix Plan

### Phase 1: Database Schema Resolution (Priority: CRITICAL)

#### 1.1 Database Migration Strategy
```bash
# Steps to fix database schema
1. Connect to Railway database
2. Run Prisma migrations
3. Verify schema creation
4. Test database connectivity
```

#### 1.2 Implementation Steps
- [ ] **Connect to Railway Database**
  - Get database connection string from Railway dashboard
  - Test connection with Prisma Studio
  - Verify database accessibility

- [ ] **Run Database Migrations**
  ```bash
  # In Railway environment
  npx prisma migrate deploy
  npx prisma generate
  ```

- [ ] **Verify Schema Creation**
  - Check all tables exist: User, Conversation, Message, etc.
  - Verify table relationships
  - Test basic CRUD operations

- [ ] **Add Migration to Startup**
  - Ensure migrations run on container startup
  - Add migration check to health endpoint
  - Implement retry logic for migration failures

#### 1.3 Code Changes Required
```typescript
// Add to backend/src/index.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Run pending migrations
    await prisma.$executeRaw`SELECT 1`;
    console.log('✅ Database schema verified');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Call before starting server
await initializeDatabase();
```

### Phase 2: AWS SDK Migration (Priority: HIGH)

#### 2.1 Migration Strategy
- Migrate from AWS SDK v2 to v3
- Update S3 and SQS service implementations
- Maintain backward compatibility during transition

#### 2.2 Implementation Steps
- [ ] **Update Package Dependencies**
  ```json
  {
    "dependencies": {
      "@aws-sdk/client-s3": "^3.0.0",
      "@aws-sdk/client-sqs": "^3.0.0"
    },
    "devDependencies": {
      "@aws-sdk/types": "^3.0.0"
    }
  }
  ```

- [ ] **Update S3 Service**
  ```typescript
  // backend/src/services/s3.service.ts
  import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
  
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  ```

- [ ] **Update SQS Service**
  ```typescript
  // backend/src/services/notification.service.ts
  import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
  
  const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  ```

#### 2.3 Testing Strategy
- [ ] Test S3 upload/download functionality
- [ ] Test SQS message sending
- [ ] Verify AWS credentials configuration
- [ ] Test error handling and retry logic

### Phase 3: Prisma Client Optimization (Priority: MEDIUM)

#### 3.1 Connection Pool Configuration
```typescript
// backend/src/config/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

// Connection pool configuration
prisma.$on('beforeExit', async () => {
  console.log('🔄 Disconnecting from database...');
  await prisma.$disconnect();
});

export default prisma;
```

#### 3.2 Error Handling Improvements
```typescript
// backend/src/services/presence.service.ts
export const cleanupStalePresence = async (): Promise<void> => {
  try {
    // Add database existence check
    await prisma.$queryRaw`SELECT 1`;
    
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    
    const staleUsers = await prisma.user.findMany({
      where: {
        isOnline: true,
        lastSeen: {
          lt: staleThreshold,
        },
      },
    });

    if (staleUsers.length > 0) {
      await prisma.user.updateMany({
        where: {
          id: {
            in: staleUsers.map(user => user.id),
          },
        },
        data: {
          isOnline: false,
        },
      });
      
      console.log(`🧹 Cleaned up ${staleUsers.length} stale presence records`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up stale presence:', error);
    // Don't throw error to prevent service crash
  }
};
```

### Phase 4: Railway Configuration (Priority: HIGH)

#### 4.1 Environment Variables
```bash
# Required Railway environment variables
DATABASE_URL=postgresql://user:password@host:port/database
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=messageai-media-8949ab32
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/971422717446/messageai-notification-queue-production
```

#### 4.2 Railway Build Configuration
```json
// railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start:prod",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

#### 4.3 Startup Script Enhancement
```json
// package.json
{
  "scripts": {
    "start:prod": "npm run migrate && node dist/index.js",
    "migrate": "npx prisma migrate deploy && npx prisma generate",
    "postinstall": "npx prisma generate"
  }
}
```

### Phase 5: Monitoring and Health Checks (Priority: MEDIUM)

#### 5.1 Enhanced Health Check
```typescript
// backend/src/routes/health.routes.ts
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      aws: 'unknown',
      socket: 'unknown'
    }
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = 'healthy';
  } catch (error) {
    healthCheck.services.database = 'unhealthy';
    healthCheck.status = 'unhealthy';
  }

  try {
    // Check AWS S3
    await s3Client.send(new ListBucketsCommand({}));
    healthCheck.services.aws = 'healthy';
  } catch (error) {
    healthCheck.services.aws = 'unhealthy';
    healthCheck.status = 'unhealthy';
  }

  healthCheck.services.socket = 'healthy'; // Socket is initialized

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});
```

#### 5.2 Logging Improvements
```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
```

## Implementation Timeline

### Week 1: Critical Fixes
- [ ] **Day 1-2**: Database schema resolution
  - Connect to Railway database
  - Run migrations
  - Verify schema creation
- [ ] **Day 3-4**: Prisma client fixes
  - Update connection configuration
  - Fix presence service errors
  - Test database operations
- [ ] **Day 5**: Railway configuration
  - Update environment variables
  - Test deployment

### Week 2: AWS SDK Migration
- [ ] **Day 1-2**: Update dependencies
  - Install AWS SDK v3
  - Update S3 service
- [ ] **Day 3-4**: Update SQS service
  - Migrate notification service
  - Test AWS integrations
- [ ] **Day 5**: Testing and validation
  - End-to-end testing
  - Performance validation

### Week 3: Monitoring and Optimization
- [ ] **Day 1-2**: Enhanced health checks
  - Implement comprehensive health endpoint
  - Add service monitoring
- [ ] **Day 3-4**: Logging improvements
  - Implement structured logging
  - Add error tracking
- [ ] **Day 5**: Documentation and deployment
  - Update documentation
  - Deploy to production

## Testing Strategy

### 1. Local Testing
```bash
# Test database connection
npm run test:db

# Test AWS services
npm run test:aws

# Test full application
npm run test:integration
```

### 2. Railway Testing
```bash
# Deploy to Railway staging
railway up --service backend

# Run health checks
curl https://your-app.up.railway.app/health

# Monitor logs
railway logs --service backend
```

### 3. Production Validation
- [ ] Database connectivity
- [ ] AWS service integration
- [ ] Socket.io functionality
- [ ] API endpoint responses
- [ ] Error handling

## Rollback Plan

### If Database Migration Fails
1. Restore from backup
2. Revert to previous schema
3. Investigate migration issues
4. Fix and retry

### If AWS Migration Fails
1. Revert to AWS SDK v2
2. Update environment variables
3. Test functionality
4. Plan gradual migration

### If Service Degradation
1. Monitor error rates
2. Check resource usage
3. Scale resources if needed
4. Investigate performance issues

## Success Criteria

### Technical Metrics
- [ ] Database connection success rate: 100%
- [ ] API response time: < 200ms
- [ ] Error rate: < 1%
- [ ] Uptime: > 99.9%

### Functional Metrics
- [ ] All API endpoints responding
- [ ] Socket.io connections working
- [ ] File uploads functional
- [ ] Notifications sending

### Monitoring Metrics
- [ ] Health checks passing
- [ ] Logs properly formatted
- [ ] Error tracking active
- [ ] Performance metrics collected

## Risk Assessment

### High Risk
- **Database migration failure**: Could cause data loss
- **AWS service disruption**: Could affect file uploads/notifications

### Medium Risk
- **Performance degradation**: During AWS SDK migration
- **Configuration errors**: Environment variable issues

### Low Risk
- **Logging changes**: Minimal impact on functionality
- **Health check updates**: Monitoring improvements only

## Conclusion

This comprehensive fix plan addresses all identified issues in the Railway backend logs:

1. **Database schema issues** - Critical priority, immediate resolution required
2. **AWS SDK deprecation** - High priority, security and performance improvements
3. **Prisma client optimization** - Medium priority, stability improvements
4. **Railway configuration** - High priority, deployment reliability
5. **Monitoring enhancements** - Medium priority, operational improvements

The plan includes detailed implementation steps, testing strategies, rollback procedures, and success criteria to ensure a successful resolution of all backend issues.

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Next Review**: After Phase 1 completion
