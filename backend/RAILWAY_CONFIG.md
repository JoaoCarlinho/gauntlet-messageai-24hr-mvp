# Railway Deployment Configuration

This document outlines the environment variables and configuration needed for Railway deployment.

## Required Environment Variables

Set these in your Railway project settings:

### Server Configuration
```
NODE_ENV=production
PORT=3000
```

### Database Configuration
```
# DATABASE_URL is automatically provided by Railway PostgreSQL service
# No manual configuration needed
```

### JWT Configuration
```
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d
```

### AWS Configuration (if using S3/SQS)
```
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
AWS_SQS_QUEUE_URL=your-sqs-queue-url
```

### CORS Configuration
```
CORS_ORIGIN=*
SOCKET_CORS_ORIGIN=*
```

### Logging Configuration
```
LOG_LEVEL=info
```

### Health Check Configuration
```
HEALTH_CHECK_TIMEOUT=5000
```

### Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### File Upload Configuration
```
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

### Notification Configuration
```
EXPO_ACCESS_TOKEN=your-expo-access-token
```

### Railway Specific
```
RAILWAY_ENVIRONMENT=production
RAILWAY_PUBLIC_DOMAIN=your-app.up.railway.app
```

## Railway Service Configuration

### PostgreSQL Database
1. Add PostgreSQL service to your Railway project
2. Railway will automatically provide `DATABASE_URL`
3. Run migrations: `npx prisma migrate deploy`

### Environment Variables Setup
1. Go to your Railway project settings
2. Navigate to "Variables" tab
3. Add all required environment variables listed above
4. Use strong, unique values for secrets

### Build Configuration
- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

## Deployment Checklist

- [ ] PostgreSQL service added and connected
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Health check endpoint responding
- [ ] CORS configured for your frontend domain
- [ ] AWS credentials configured (if using S3/SQS)
- [ ] JWT secret set to a secure value
- [ ] Expo access token configured (if using push notifications)

## Troubleshooting

### Common Issues
1. **Database Connection Failed**: Check `DATABASE_URL` is set correctly
2. **Build Failed**: Ensure all dependencies are in `package.json`
3. **Health Check Failed**: Verify `/health` endpoint is accessible
4. **CORS Errors**: Update `CORS_ORIGIN` to match your frontend domain

### Logs
Check Railway deployment logs for detailed error information:
```bash
railway logs
```

### Health Check
Test the health endpoint:
```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "database": "connected",
  "aws": "configured"
}
```
