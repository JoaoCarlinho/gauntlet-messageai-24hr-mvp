import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { WebhookLog } from '@prisma/client';
import { prisma } from '../config/database';
import { createSQSInstance } from '../config/aws';

/**
 * Webhook Service
 * Processes and normalizes webhook payloads from social media platforms
 */

interface NormalizedLeadData {
  platform: string;
  leadId: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  source: string;
  campaignId?: string;
  adId?: string;
  formId?: string;
  rawData: any;
  timestamp: Date;
}

interface WebhookPayload {
  platform: string;
  eventType: string;
  data: any;
  timestamp: Date;
}

class WebhookService {
  private sqs: SQSClient;

  constructor() {
    this.sqs = createSQSInstance();
  }

  /**
   * Process Facebook Lead Ads webhook payload
   */
  async processFacebookLeadWebhook(payload: any): Promise<NormalizedLeadData | null> {
    try {
      console.log('Processing Facebook lead webhook:', JSON.stringify(payload, null, 2));

      // Facebook Lead Ads webhook structure
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value || value.field !== 'leadgen') {
        console.log('Not a lead generation webhook, skipping');
        return null;
      }

      const leadgenId = value.leadgen_id;
      if (!leadgenId) {
        console.error('No leadgen_id found in Facebook webhook');
        return null;
      }

      // Extract lead data from Facebook response
      const leadData = {
        platform: 'facebook',
        leadId: leadgenId,
        email: this.extractFieldValue(value, 'email'),
        phone: this.extractFieldValue(value, 'phone_number'),
        firstName: this.extractFieldValue(value, 'first_name'),
        lastName: this.extractFieldValue(value, 'last_name'),
        company: this.extractFieldValue(value, 'company_name'),
        jobTitle: this.extractFieldValue(value, 'job_title'),
        source: 'facebook_lead_ads',
        campaignId: value.adgroup_id,
        adId: value.ad_id,
        formId: value.form_id,
        rawData: payload,
        timestamp: new Date()
      };

      return leadData;
    } catch (error) {
      console.error('Error processing Facebook lead webhook:', error);
      throw error;
    }
  }

  /**
   * Process LinkedIn Lead Gen Forms webhook payload
   */
  async processLinkedInLeadWebhook(payload: any): Promise<NormalizedLeadData | null> {
    try {
      console.log('Processing LinkedIn lead webhook:', JSON.stringify(payload, null, 2));

      const leadData = {
        platform: 'linkedin',
        leadId: payload.leadId || payload.id,
        email: payload.email || payload.contactEmail,
        phone: payload.phone || payload.phoneNumber,
        firstName: payload.firstName || payload.first_name,
        lastName: payload.lastName || payload.last_name,
        company: payload.company || payload.companyName,
        jobTitle: payload.jobTitle || payload.job_title,
        source: 'linkedin_lead_gen',
        campaignId: payload.campaignId,
        adId: payload.adId,
        formId: payload.formId,
        rawData: payload,
        timestamp: new Date()
      };

      return leadData;
    } catch (error) {
      console.error('Error processing LinkedIn lead webhook:', error);
      throw error;
    }
  }

  /**
   * Process TikTok Lead Generation webhook payload
   */
  async processTikTokLeadWebhook(payload: any): Promise<NormalizedLeadData | null> {
    try {
      console.log('Processing TikTok lead webhook:', JSON.stringify(payload, null, 2));

      const leadData = {
        platform: 'tiktok',
        leadId: payload.leadId || payload.id,
        email: payload.email || payload.contact_email,
        phone: payload.phone || payload.phone_number,
        firstName: payload.firstName || payload.first_name,
        lastName: payload.lastName || payload.last_name,
        company: payload.company || payload.company_name,
        jobTitle: payload.jobTitle || payload.job_title,
        source: 'tiktok_lead_gen',
        campaignId: payload.campaignId,
        adId: payload.adId,
        formId: payload.formId,
        rawData: payload,
        timestamp: new Date()
      };

      return leadData;
    } catch (error) {
      console.error('Error processing TikTok lead webhook:', error);
      throw error;
    }
  }

  /**
   * Process X (Twitter) webhook payload
   */
  async processXWebhook(payload: any): Promise<NormalizedLeadData | null> {
    try {
      console.log('Processing X webhook:', JSON.stringify(payload, null, 2));

      // X webhooks are typically for engagement, not lead generation
      // This is a placeholder for future lead generation features
      const leadData = {
        platform: 'x',
        leadId: payload.id || payload.tweet_id,
        email: payload.email,
        phone: payload.phone,
        firstName: payload.firstName,
        lastName: payload.lastName,
        company: payload.company,
        jobTitle: payload.jobTitle,
        source: 'x_engagement',
        campaignId: payload.campaignId,
        adId: payload.adId,
        formId: payload.formId,
        rawData: payload,
        timestamp: new Date()
      };

      return leadData;
    } catch (error) {
      console.error('Error processing X webhook:', error);
      throw error;
    }
  }

  /**
   * Normalize lead data from different platforms into a standard format
   */
  normalizeLeadData(rawData: any, platform: string): NormalizedLeadData {
    const baseData = {
      platform,
      leadId: rawData.leadId || rawData.id || `unknown_${Date.now()}`,
      email: rawData.email || '',
      phone: rawData.phone || rawData.phoneNumber || rawData.phone_number,
      firstName: rawData.firstName || rawData.first_name,
      lastName: rawData.lastName || rawData.last_name,
      company: rawData.company || rawData.companyName || rawData.company_name,
      jobTitle: rawData.jobTitle || rawData.job_title,
      source: `${platform}_lead_gen`,
      campaignId: rawData.campaignId || rawData.campaign_id,
      adId: rawData.adId || rawData.ad_id,
      formId: rawData.formId || rawData.form_id,
      rawData,
      timestamp: new Date()
    };

    return baseData;
  }

  /**
   * Log webhook attempt for audit trail
   */
  async logWebhook(platform: string, eventType: string, payload: any): Promise<WebhookLog> {
    try {
      const webhookLog = await prisma.webhookLog.create({
        data: {
          platform,
          eventType,
          payload: JSON.stringify(payload),
          status: 'received',
          timestamp: new Date()
        }
      });

      console.log(`Webhook logged: ${platform} - ${eventType} - ID: ${webhookLog.id}`);
      return webhookLog;
    } catch (error) {
      console.error('Error logging webhook:', error);
      throw error;
    }
  }

  /**
   * Queue lead processing message to SQS
   */
  async queueLeadProcessing(leadData: NormalizedLeadData): Promise<void> {
    try {
      const queueUrl = process.env.WEBHOOK_QUEUE_URL;
      if (!queueUrl) {
        throw new Error('WEBHOOK_QUEUE_URL environment variable not set');
      }

      const messageBody = {
        type: 'lead_processing',
        data: leadData,
        timestamp: new Date().toISOString()
      };

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: {
          platform: {
            DataType: 'String',
            StringValue: leadData.platform
          },
          leadId: {
            DataType: 'String',
            StringValue: leadData.leadId
          }
        }
      });

      const result = await this.sqs.send(command);
      console.log(`Lead processing queued: ${leadData.leadId} - MessageId: ${result.MessageId}`);
    } catch (error) {
      console.error('Error queueing lead processing:', error);
      throw error;
    }
  }

  /**
   * Check if lead already exists to prevent duplicates
   */
  async checkLeadExists(leadId: string, platform: string): Promise<boolean> {
    try {
      const existingLead = await prisma.lead.findFirst({
        where: {
          externalId: leadId,
          source: platform
        }
      });

      return !!existingLead;
    } catch (error) {
      console.error('Error checking if lead exists:', error);
      return false;
    }
  }

  /**
   * Extract field value from Facebook webhook data
   */
  private extractFieldValue(value: any, fieldName: string): string | undefined {
    const fieldData = value.field_data?.find((field: any) => field.name === fieldName);
    return fieldData?.values?.[0] || undefined;
  }

  /**
   * Send batch messages to SQS
   */
  async sendBatchMessages(queueUrl: string, messages: any[]): Promise<void> {
    try {
      const entries = messages.map((message, index) => ({
        Id: `message-${index}`,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          platform: {
            DataType: 'String',
            StringValue: message.platform || 'unknown'
          }
        }
      }));

      const command = new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries
      });

      const result = await this.sqs.send(command);
      console.log(`Batch messages sent: ${result.Successful?.length} successful, ${result.Failed?.length} failed`);
    } catch (error) {
      console.error('Error sending batch messages:', error);
      throw error;
    }
  }
}

export const webhookService = new WebhookService();
export default webhookService;
