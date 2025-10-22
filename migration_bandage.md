# Migration Bandage: Production Database Reset Strategy

## Overview
This document outlines the steps to modify our deployment process to recreate the database on each deployment instead of running migrations. This approach ensures a clean state but should be used with caution as it involves data loss.

## 1. Update Models and Migrations

### 1.1. Modify Prisma Schema Configuration
```prisma
// backend/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Add shadowDatabaseUrl for development only
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}

// Keep your existing models as is
```

### 1.2. Update Development vs Production Config
Create a configuration file to handle different environments:

```typescript
// backend/src/config/database-config.ts

export const getDatabaseConfig = () => {
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    skipMigrations: isProd,
    forceRecreate: isProd,
    connectionRetries: 5,
    connectionTimeout: 10000,
  };
};
```

## 2. Production Deployment Script

### 2.1. Create Database Reset Script
```typescript
// backend/scripts/reset-database.ts

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

async function resetDatabase() {
  const prisma = new PrismaClient();
  
  try {
    // 1. Drop all connections
    await prisma.$executeRaw`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = current_database()
        AND pid <> pg_backend_pid();
    `;
    
    // 2. Drop and recreate database
    await prisma.$executeRaw`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `;
    
    // 3. Push schema without migrations
    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      stdio: 'inherit',
    });
    
    console.log('✅ Database reset successful');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export { resetDatabase };
```

### 2.2. Update Deployment Script
```typescript
// backend/scripts/deploy.ts

import { resetDatabase } from './reset-database';
import { getDatabaseConfig } from '../src/config/database-config';

async function deploy() {
  const config = getDatabaseConfig();
  
  try {
    console.log('🚀 Starting deployment...');
    
    if (config.forceRecreate) {
      console.log('💥 Resetting database...');
      await resetDatabase();
    }
    
    console.log('✅ Deployment successful');
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

deploy();
```

### 2.3. Update Railway Configuration
```json
// railway.json

{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run deploy:prod",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 2.4. Update Package Scripts
```json
// package.json

{
  "scripts": {
    "deploy:prod": "node dist/scripts/deploy.js && node dist/index.js",
    "build": "tsc && npx prisma generate"
  }
}
```

## 3. Implementation Steps

1. Backup Current Data (Optional)
```bash
# If you need to preserve any production data
railway run "pg_dump -F c > backup.dump"
```

2. Update Environment Variables
```bash
# Add to Railway environment variables
DATABASE_URL=postgresql://...
NODE_ENV=production
```

3. Deploy Changes
```bash
# Deploy in order
git add .
git commit -m "feat: implement database reset deployment strategy"
git push railway main
```

## 4. Verification Steps

1. Monitor Deployment
```bash
railway logs
```

2. Verify Database State
```bash
# Connect to Railway database
railway connect postgresql

# Check tables
\dt
```

3. Verify Application Health
```bash
curl https://your-app.railway.app/health
```

## ⚠️ Important Warnings

1. **DATA LOSS**: This approach will delete all data on each deployment. Only use if:
   - You don't need to persist data between deployments
   - Data is regularly backed up elsewhere
   - Your app rebuilds data from external sources

2. **Deployment Time**: Database recreation will increase deployment time

3. **Resource Usage**: Multiple deployments will stress the database server

## 5. Rollback Plan

If you need to revert to migration-based deployments:

1. Restore Schema Management
```bash
# 1. Revert to migration-based schema
git checkout main -- prisma/migrations

# 2. Update railway.json
{
  "deploy": {
    "startCommand": "npx prisma migrate deploy && node dist/index.js"
  }
}
```

2. Restore Data (if backed up)
```bash
# If you created a backup
railway run "pg_restore -d railway backup.dump"
```

## 6. Monitoring Recommendations

1. Add Deployment Monitoring
```typescript
// Add to deploy.ts

const metrics = {
  deploymentStart: Date.now(),
  databaseResetDuration: 0,
  errors: [],
};

// Send metrics to your monitoring service
function reportMetrics() {
  const duration = Date.now() - metrics.deploymentStart;
  console.log(`
    Deployment completed in ${duration}ms
    Database reset: ${metrics.databaseResetDuration}ms
    Errors: ${metrics.errors.length}
  `);
}
```

2. Add Health Checks
```typescript
// Add to index.ts

app.get('/health', (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth.isHealthy ? 'healthy' : 'unhealthy',
    lastDeployment: process.env.RAILWAY_DEPLOYMENT_ID,
    databaseReset: process.env.LAST_DB_RESET,
  });
});
```

## 7. Maintenance Notes

1. Regular Review:
   - Monitor deployment logs for issues
   - Track deployment duration
   - Review error patterns
   - Validate data consistency

2. Documentation Updates:
   - Keep deployment documentation current
   - Document any manual interventions needed
   - Update troubleshooting guides

Remember: This is a temporary solution. Consider implementing a proper migration strategy for long-term maintainability.