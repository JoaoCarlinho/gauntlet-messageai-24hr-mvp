# Post-Database Redeploy Setup Guide

This guide outlines the steps needed after manually redeploying the database in Railway UI to ensure all database models are properly created and the application functions correctly.

## Overview

After manually redeploying the database in Railway UI, the database is completely reset and empty. This guide provides a clean slate approach that creates all necessary database models without requiring migrations.

## What Happens During Manual Database Redeploy

1. **Database Reset**: All data and schema are completely removed
2. **Fresh State**: Database returns to a clean, empty state
3. **No Migration History**: Previous migration records are lost
4. **Connection Reset**: All existing connections are terminated

## Required Changes After Manual Redeploy

### 1. Updated Railway Configuration

The `railway.json` file has been updated to use the new deployment strategy:

```json
{
  "deploy": {
    "startCommand": "npm run deploy:production"
  }
}
```

### 2. New Deployment Scripts

#### Post-Redeploy Setup Script
- **File**: `scripts/post-redeploy-setup.js`
- **Purpose**: Handles database setup after manual redeploy
- **Features**:
  - Verifies database connection
  - Creates all database models from Prisma schema
  - Generates Prisma client
  - Verifies all models are properly created
  - Runs comprehensive health checks

#### Database Verification Script
- **File**: `scripts/verify-database-models.js`
- **Purpose**: Verifies all database models are properly created
- **Features**:
  - Tests model accessibility
  - Verifies table structure
  - Checks constraints and indexes
  - Tests basic operations
  - Validates relationships

### 3. Updated Package.json Scripts

New scripts added for post-redeploy operations:

```json
{
  "post-redeploy": "node scripts/post-redeploy-setup.js",
  "start:railway": "npm run post-redeploy && npm start",
  "prisma:push": "prisma db push"
}
```

## Database Models Created

The following models will be automatically created from the Prisma schema:

### 1. User Model
- **Fields**: id, email, phoneNumber, password, displayName, avatarUrl, lastSeen, isOnline, pushTokens, createdAt, updatedAt
- **Relationships**: sentMessages, conversations, readReceipts
- **Constraints**: Unique email and phoneNumber

### 2. Conversation Model
- **Fields**: id, type, name, createdAt, updatedAt
- **Relationships**: members, messages
- **Types**: "direct" or "group"

### 3. ConversationMember Model
- **Fields**: id, conversationId, userId, joinedAt, lastReadAt
- **Relationships**: conversation, user
- **Constraints**: Unique combination of conversationId and userId

### 4. Message Model
- **Fields**: id, conversationId, senderId, content, type, mediaUrl, status, createdAt, updatedAt
- **Relationships**: conversation, sender, readReceipts
- **Types**: "text", "image", "system"
- **Status**: "sending", "sent", "delivered", "read"

### 5. ReadReceipt Model
- **Fields**: id, messageId, userId, readAt
- **Relationships**: message, user
- **Constraints**: Unique combination of messageId and userId

## Deployment Process

### Automatic Deployment (Recommended)

When Railway deploys your application, it will automatically:

1. **Build**: Compile TypeScript and generate Prisma client
2. **Setup**: Run post-redeploy setup script
3. **Verify**: Ensure all models are created correctly
4. **Start**: Launch the application

### Manual Deployment (If Needed)

If you need to manually run the setup:

```bash
# Navigate to backend directory
cd backend

# Run post-redeploy setup
npm run post-redeploy

# Verify models are created
node scripts/verify-database-models.js

# Start the application
npm start
```

## Verification Steps

### 1. Check Database Connection
```bash
# Test database connectivity
npx prisma db execute --stdin
# Enter: SELECT 1 as test;
```

### 2. Verify Models
```bash
# Run verification script
node scripts/verify-database-models.js
```

### 3. Test Application
```bash
# Check health endpoint
curl https://your-app.up.railway.app/health
```

Expected health response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "database": "connected",
  "aws": "configured"
}
```

## Environment Variables Required

Ensure these environment variables are set in Railway:

### Database
- `DATABASE_URL` (automatically provided by Railway PostgreSQL)

### Application
- `NODE_ENV=production`
- `PORT=3000`
- `JWT_SECRET=your-secure-secret`
- `JWT_EXPIRES_IN=7d`

### CORS
- `CORS_ORIGIN=*`
- `SOCKET_CORS_ORIGIN=*`

### AWS (if using S3/SQS)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_SQS_QUEUE_URL`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `DATABASE_URL` environment variable
   - Verify Railway PostgreSQL service is running
   - Check database permissions

2. **Schema Creation Failed**
   - Review Prisma schema for syntax errors
   - Check database connection
   - Verify Prisma client generation

3. **Model Verification Failed**
   - Run verification script manually
   - Check database logs
   - Verify all required fields are present

4. **Application Startup Failed**
   - Check Railway deployment logs
   - Verify all environment variables
   - Test health endpoint

### Debug Commands

```bash
# Check Prisma schema
npx prisma validate

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Check database status
npx prisma db execute --stdin
# Enter: SELECT version();
```

## Benefits of This Approach

1. **No Migration Dependencies**: Creates schema directly from current Prisma schema
2. **Clean Slate**: Ensures consistent database state
3. **Comprehensive Verification**: Validates all models and relationships
4. **Automated Process**: Handles setup automatically during deployment
5. **Error Handling**: Provides detailed error messages and troubleshooting

## Next Steps

After successful deployment:

1. **Test API Endpoints**: Verify all endpoints are working
2. **Test Authentication**: Ensure user registration/login works
3. **Test Messaging**: Verify conversation and message functionality
4. **Monitor Logs**: Check Railway logs for any issues
5. **Update Frontend**: Ensure frontend can connect to new database

## Support

If you encounter issues:

1. Check Railway deployment logs
2. Run verification scripts manually
3. Review this guide for troubleshooting steps
4. Check Prisma documentation for schema issues
5. Verify all environment variables are set correctly
