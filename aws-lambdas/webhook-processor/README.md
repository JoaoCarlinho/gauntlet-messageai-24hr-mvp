# Webhook Processor Lambda

AWS Lambda function that processes webhook events from SQS queue and creates leads in the database.

## Overview

This Lambda function is triggered by SQS messages containing webhook payloads from various social media platforms (Facebook, LinkedIn, TikTok, X). It processes these webhooks by:

1. Parsing lead data from the webhook payload
2. Creating a Lead record in the database
3. Triggering real-time Socket.io notifications to team members
4. Handling errors and sending failed messages to DLQ

## Architecture

```
Social Media Platform
    ↓ (webhook)
API Gateway → SQS Queue
    ↓ (trigger)
Lambda Function (this)
    ↓
PostgreSQL Database (Prisma)
    ↓
Backend API (Socket.io notification)
```

## Environment Variables

The following environment variables must be configured in the Lambda function:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `BACKEND_URL` - Backend API URL for Socket.io notifications (required)
- `INTERNAL_API_SECRET` - Secret for internal API authentication (required)

Example:
```
DATABASE_URL=postgresql://user:password@host:5432/database
BACKEND_URL=https://api.example.com
INTERNAL_API_SECRET=your-secret-key
```

## Webhook Payload Format

Expected SQS message body format:

```json
{
  "platform": "facebook",
  "leadData": {
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "company": "Acme Corp",
    "jobTitle": "CEO"
  },
  "campaignId": "uuid-of-campaign",
  "teamId": "uuid-of-team",
  "source": "facebook_lead_gen",
  "rawData": {
    "original": "webhook payload"
  }
}
```

## Dependencies

- `@prisma/client` - Database ORM for PostgreSQL
- `aws-sdk` - AWS SDK for Node.js
- `@types/aws-lambda` - TypeScript types for AWS Lambda

## Building

```bash
npm install
npm run build
```

## Deployment

Build and create deployment package:

```bash
npm run deploy
```

This creates a `webhook-processor.zip` file ready for Lambda deployment.

## Manual Deployment

1. Build the function:
   ```bash
   npm install --production
   npm run build
   ```

2. Create deployment package:
   ```bash
   zip -r webhook-processor.zip dist node_modules package.json
   ```

3. Upload to AWS Lambda or deploy via Terraform

## Error Handling

- **Parse Errors**: If the webhook payload cannot be parsed, the message is marked as failed
- **Validation Errors**: Missing required fields (teamId, email) cause message failure
- **Database Errors**: Failed lead creation sends message to DLQ
- **Notification Errors**: Socket.io notification failures are logged but don't fail the process

Failed messages are automatically sent to the configured Dead Letter Queue (DLQ) after max retries.

## Batch Processing

The Lambda processes SQS messages in batches (default: up to 10 messages). It uses partial batch failure response to ensure only failed messages are retried.

## Monitoring

Key CloudWatch metrics:
- Invocations
- Errors
- Duration
- Throttles
- Dead Letter Queue Messages

Custom logs include:
- Message processing status
- Lead creation success/failure
- Socket notification results
- Error details

## Local Development

For local testing, create a `.env` file:

```
DATABASE_URL=postgresql://localhost:5432/messageai
BACKEND_URL=http://localhost:3000
INTERNAL_API_SECRET=test-secret
```

## Security

- Database credentials via environment variables
- Internal API secret for backend communication
- VPC configuration recommended for production
- IAM role with minimal required permissions

## Terraform Integration

This Lambda is deployed via Terraform. See `terraform/lambda.tf` for configuration:

- SQS trigger configuration
- IAM role and policies
- VPC and subnet configuration
- Environment variables
- Dead Letter Queue setup

## Support

For issues or questions, contact the development team.
