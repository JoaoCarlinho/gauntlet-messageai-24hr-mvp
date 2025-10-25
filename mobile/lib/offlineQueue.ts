/**
 * Offline Queue Manager
 *
 * Manages queueing and processing of AI agent requests when offline
 * Processes queue when connection is restored
 */

import { getDatabase } from './database';
import { aiAgentsAPI } from './aiAgentsAPI';
import { DeviceEventEmitter } from 'react-native';

export type AgentType = 'product_definer' | 'campaign_advisor' | 'content_generator' | 'performance_analyzer' | 'discovery_bot';
export type QueueAction = 'start_conversation' | 'send_message' | 'generate_content' | 'analyze_campaign';
export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueueItem {
  id: string;
  agentType: AgentType;
  action: QueueAction;
  payload: any;
  status: QueueStatus;
  createdAt: number;
  retryCount: number;
  error?: string;
}

// Add item to queue
export const addToQueue = async (
  agentType: AgentType,
  action: QueueAction,
  payload: any
): Promise<string> => {
  const db = getDatabase();
  const id = `${agentType}_${action}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  await db.runAsync(
    `INSERT INTO ai_agent_queue (id, agent_type, action, payload, status, created_at, retry_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, agentType, action, JSON.stringify(payload), 'pending', Date.now(), 0]
  );

  console.log(`✅ Added to queue: ${agentType} - ${action}`);
  DeviceEventEmitter.emit('offline_queue:added', { id, agentType, action });

  return id;
};

// Get all pending queue items
export const getPendingQueue = async (): Promise<QueueItem[]> => {
  const db = getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ai_agent_queue WHERE status = ? ORDER BY created_at ASC`,
    ['pending']
  );

  return rows.map((row) => ({
    id: row.id,
    agentType: row.agent_type as AgentType,
    action: row.action as QueueAction,
    payload: JSON.parse(row.payload),
    status: row.status as QueueStatus,
    createdAt: row.created_at,
    retryCount: row.retry_count,
    error: row.error,
  }));
};

// Update queue item status
export const updateQueueStatus = async (
  id: string,
  status: QueueStatus,
  error?: string
): Promise<void> => {
  const db = getDatabase();

  if (error) {
    await db.runAsync(
      `UPDATE ai_agent_queue SET status = ?, error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [status, error, id]
    );
  } else {
    await db.runAsync(
      `UPDATE ai_agent_queue SET status = ? WHERE id = ?`,
      [status, id]
    );
  }
};

// Delete queue item
export const deleteQueueItem = async (id: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM ai_agent_queue WHERE id = ?`, [id]);
};

// Process single queue item
const processQueueItem = async (item: QueueItem): Promise<boolean> => {
  try {
    console.log(`Processing queue item: ${item.id} (${item.agentType} - ${item.action})`);
    await updateQueueStatus(item.id, 'processing');

    // Process based on agent type and action
    switch (item.agentType) {
      case 'product_definer':
        if (item.action === 'start_conversation') {
          await aiAgentsAPI.productDefiner.startConversation();
        }
        // Note: sendMessage uses SSE streaming via createMessageStream,
        // which cannot be queued offline. Messages should be cached locally instead.
        break;

      case 'campaign_advisor':
        if (item.action === 'start_conversation') {
          await aiAgentsAPI.campaignAdvisor.startConversation(
            item.payload.productId,
            item.payload.icpId
          );
        }
        // Note: sendMessage uses SSE streaming via createMessageStream,
        // which cannot be queued offline. Messages should be cached locally instead.
        break;

      case 'content_generator':
        if (item.action === 'generate_content') {
          const { type, productId, platform, variations, count, concept } = item.payload;
          switch (type) {
            case 'ad_copy':
              await aiAgentsAPI.contentGenerator.generateAdCopy({
                productId,
                platform,
                variations,
                saveToLibrary: true,
              });
              break;
            case 'social_post':
              await aiAgentsAPI.contentGenerator.generateSocialPosts({
                productId,
                platform,
                count,
                saveToLibrary: true,
              });
              break;
            case 'landing_page':
              await aiAgentsAPI.contentGenerator.generateLandingPage({
                productId,
                saveToLibrary: true,
              });
              break;
            case 'image_prompt':
              await aiAgentsAPI.contentGenerator.generateImagePrompts({
                productId,
                concept: concept || 'Marketing visual',
                count,
                saveToLibrary: true,
              });
              break;
          }
        }
        break;

      case 'performance_analyzer':
        if (item.action === 'analyze_campaign') {
          await aiAgentsAPI.performanceAnalyzer.analyzeCampaignPerformance({
            campaignId: item.payload.campaignId,
            timeRange: item.payload.timeRange,
          });
        }
        break;

      default:
        throw new Error(`Unknown agent type: ${item.agentType}`);
    }

    await updateQueueStatus(item.id, 'completed');
    await deleteQueueItem(item.id);

    DeviceEventEmitter.emit('offline_queue:processed', {
      id: item.id,
      agentType: item.agentType,
      action: item.action,
    });

    return true;
  } catch (error: any) {
    console.error(`Failed to process queue item ${item.id}:`, error);

    // Retry logic: max 3 retries
    if (item.retryCount < 3) {
      await updateQueueStatus(item.id, 'pending', error.message);
      return false;
    } else {
      await updateQueueStatus(item.id, 'failed', error.message);
      DeviceEventEmitter.emit('offline_queue:failed', {
        id: item.id,
        agentType: item.agentType,
        action: item.action,
        error: error.message,
      });
      return false;
    }
  }
};

// Process entire queue
export const processQueue = async (): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> => {
  console.log('🔄 Starting offline queue processing...');

  const pendingItems = await getPendingQueue();
  let processed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    const success = await processQueueItem(item);
    if (success) {
      processed++;
    } else {
      failed++;
    }
  }

  const remaining = (await getPendingQueue()).length;

  console.log(`✅ Queue processing complete: ${processed} processed, ${failed} failed, ${remaining} remaining`);

  DeviceEventEmitter.emit('offline_queue:complete', { processed, failed, remaining });

  return { processed, failed, remaining };
};

// Get queue count
export const getQueueCount = async (): Promise<number> => {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ai_agent_queue WHERE status = ?`,
    ['pending']
  );
  return result?.count || 0;
};

// Clear completed items (older than 7 days)
export const clearOldCompletedItems = async (): Promise<void> => {
  const db = getDatabase();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  await db.runAsync(
    `DELETE FROM ai_agent_queue WHERE status = ? AND created_at < ?`,
    ['completed', sevenDaysAgo]
  );

  console.log('✅ Cleared old completed queue items');
};
