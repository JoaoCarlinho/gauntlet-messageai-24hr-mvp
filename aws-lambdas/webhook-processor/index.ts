import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { PrismaClient } from '@prisma/client';
import * as https from 'https';

/**
 * Webhook Processor Lambda
 * Processes webhook events from SQS queue and creates leads in database
 */

// Initialize Prisma Client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Environment variables
const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend-domain.com';
const SOCKET_NOTIFICATION_ENDPOINT = `${BACKEND_URL}/api/v1/internal/notify-lead`;

interface WebhookPayload {
  platform: string; // 'facebook', 'linkedin', 'tiktok', 'x'
  leadData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
  };
  campaignId?: string;
  teamId: string;
  source: string;
  rawData: any;
}

interface ProcessResult {
  success: boolean;
  leadId?: string;
  error?: string;
  messageId: string;
}

/**
 * Parse lead data from webhook payload
 */
function parseLeadData(payload: WebhookPayload) {
  const { leadData, campaignId, teamId, source, rawData } = payload;

  return {
    teamId,
    campaignId,
    email: leadData.email,
    firstName: leadData.firstName,
    lastName: leadData.lastName,
    phone: leadData.phone,
    company: leadData.company,
    jobTitle: leadData.jobTitle,
    source: source || payload.platform,
    status: 'new' as const,
    qualificationScore: 0,
    rawData: rawData || {},
  };
}

/**
 * Create lead in database
 */
async function createLead(data: ReturnType<typeof parseLeadData>) {
  try {
    const lead = await prisma.lead.create({
      data,
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            platforms: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`✅ Lead created successfully: ${lead.id}`);
    return lead;
  } catch (error) {
    console.error('❌ Failed to create lead:', error);
    throw error;
  }
}

/**
 * Trigger Socket.io notification via HTTP request
 */
async function triggerSocketNotification(teamId: string, leadId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      teamId,
      leadId,
      event: 'lead:new',
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || '',
      },
    };

    const req = https.request(SOCKET_NOTIFICATION_ENDPOINT, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Socket notification sent for lead ${leadId}`);
          resolve();
        } else {
          console.error(`⚠️  Socket notification failed with status ${res.statusCode}: ${data}`);
          // Don't reject - notification failure shouldn't fail the whole process
          resolve();
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Socket notification request error:', error);
      // Don't reject - notification failure shouldn't fail the whole process
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Process a single SQS message
 */
async function processMessage(record: SQSRecord): Promise<ProcessResult> {
  const messageId = record.messageId;

  try {
    console.log(`📨 Processing message: ${messageId}`);

    // Parse message body
    const payload: WebhookPayload = JSON.parse(record.body);
    console.log(`Platform: ${payload.platform}, TeamId: ${payload.teamId}`);

    // Validate required fields
    if (!payload.teamId) {
      throw new Error('Missing teamId in webhook payload');
    }

    if (!payload.leadData || !payload.leadData.email) {
      throw new Error('Missing or invalid leadData in webhook payload');
    }

    // Parse lead data
    const leadData = parseLeadData(payload);

    // Create lead in database
    const lead = await createLead(leadData);

    // Trigger Socket.io notification
    await triggerSocketNotification(payload.teamId, lead.id);

    console.log(`✅ Message processed successfully: ${messageId}`);

    return {
      success: true,
      leadId: lead.id,
      messageId,
    };
  } catch (error) {
    console.error(`❌ Failed to process message ${messageId}:`, error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      messageId,
    };
  }
}

/**
 * Lambda handler
 * Processes batch of SQS messages
 */
export async function handler(event: SQSEvent, context: Context) {
  console.log(`🚀 Webhook processor started. Processing ${event.Records.length} messages`);
  console.log(`Request ID: ${context.awsRequestId}`);

  const results: ProcessResult[] = [];
  const failedMessages: string[] = [];

  // Process all messages in the batch
  for (const record of event.Records) {
    const result = await processMessage(record);
    results.push(result);

    if (!result.success) {
      failedMessages.push(result.messageId);
    }
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(`📊 Processing complete: ${successCount} succeeded, ${failureCount} failed`);

  // If there are failures, throw error to move messages to DLQ
  if (failedMessages.length > 0) {
    console.error(`❌ Failed messages: ${failedMessages.join(', ')}`);

    // Return batch item failures for partial batch processing
    return {
      batchItemFailures: failedMessages.map((messageId) => ({
        itemIdentifier: messageId,
      })),
    };
  }

  console.log(`✅ All messages processed successfully`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      processed: successCount,
      failed: failureCount,
    }),
  };
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
