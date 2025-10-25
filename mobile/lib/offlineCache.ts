/**
 * Offline Cache Manager
 *
 * Manages local caching of content and analysis for offline viewing
 */

import { getDatabase } from './database';
import { ContentItem } from '../hooks/useContentLibrary';

export interface CachedAnalysis {
  id: string;
  campaignId: string;
  analysisData: any;
  createdAt: Date;
  updatedAt: Date;
}

// Cache generated content
export const cacheContent = async (content: ContentItem): Promise<void> => {
  const db = getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO cached_content
     (id, type, content, platform, product_id, campaign_id, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      content.id,
      content.type,
      content.content,
      content.platform || null,
      content.productId || null,
      content.campaignId || null,
      JSON.stringify(content.metadata || {}),
      content.createdAt.getTime(),
      content.updatedAt.getTime(),
    ]
  );

  console.log(`✅ Cached content: ${content.id}`);
};

// Get cached content
export const getCachedContent = async (): Promise<ContentItem[]> => {
  const db = getDatabase();

  const rows = await db.getAllAsync<any>(`SELECT * FROM cached_content ORDER BY created_at DESC`);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    content: row.content,
    platform: row.platform,
    productId: row.product_id,
    campaignId: row.campaign_id,
    metadata: JSON.parse(row.metadata || '{}'),
    generatedBy: 'ai' as const,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
};

// Get cached content by campaign
export const getCachedContentByCampaign = async (campaignId: string): Promise<ContentItem[]> => {
  const db = getDatabase();

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM cached_content WHERE campaign_id = ? ORDER BY created_at DESC`,
    [campaignId]
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    content: row.content,
    platform: row.platform,
    productId: row.product_id,
    campaignId: row.campaign_id,
    metadata: JSON.parse(row.metadata || '{}'),
    generatedBy: 'ai' as const,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
};

// Delete cached content
export const deleteCachedContent = async (id: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM cached_content WHERE id = ?`, [id]);
  console.log(`✅ Deleted cached content: ${id}`);
};

// Cache campaign analysis
export const cacheAnalysis = async (
  campaignId: string,
  analysisData: any
): Promise<string> => {
  const db = getDatabase();
  const id = `analysis_${campaignId}_${Date.now()}`;
  const now = Date.now();

  await db.runAsync(
    `INSERT OR REPLACE INTO cached_analysis
     (id, campaign_id, analysis_data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, campaignId, JSON.stringify(analysisData), now, now]
  );

  console.log(`✅ Cached analysis for campaign: ${campaignId}`);
  return id;
};

// Get cached analysis by campaign
export const getCachedAnalysis = async (campaignId: string): Promise<CachedAnalysis | null> => {
  const db = getDatabase();

  const row = await db.getFirstAsync<any>(
    `SELECT * FROM cached_analysis WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 1`,
    [campaignId]
  );

  if (!row) return null;

  return {
    id: row.id,
    campaignId: row.campaign_id,
    analysisData: JSON.parse(row.analysis_data),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
};

// Delete cached analysis
export const deleteCachedAnalysis = async (id: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(`DELETE FROM cached_analysis WHERE id = ?`, [id]);
  console.log(`✅ Deleted cached analysis: ${id}`);
};

// Cache conversation message
export const cacheConversationMessage = async (
  conversationId: string,
  agentType: string,
  role: 'user' | 'assistant',
  content: string,
  syncStatus: 'synced' | 'pending' = 'pending'
): Promise<string> => {
  const db = getDatabase();
  const id = `msg_${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO conversation_messages
     (id, conversation_id, agent_type, role, content, sync_status, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, conversationId, agentType, role, content, syncStatus, now, syncStatus === 'synced' ? now : null]
  );

  console.log(`✅ Cached message: ${id} (${syncStatus})`);
  return id;
};

// Get pending conversation messages
export const getPendingMessages = async (): Promise<Array<{
  id: string;
  conversationId: string;
  agentType: string;
  role: string;
  content: string;
  createdAt: Date;
}>> => {
  const db = getDatabase();

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM conversation_messages WHERE sync_status = ? ORDER BY created_at ASC`,
    ['pending']
  );

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    agentType: row.agent_type,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at),
  }));
};

// Mark message as synced
export const markMessageSynced = async (id: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE conversation_messages SET sync_status = ?, synced_at = ? WHERE id = ?`,
    ['synced', Date.now(), id]
  );
  console.log(`✅ Marked message as synced: ${id}`);
};

// Clear old cached data (older than 30 days)
export const clearOldCachedData = async (): Promise<void> => {
  const db = getDatabase();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await db.runAsync(
    `DELETE FROM cached_content WHERE created_at < ?`,
    [thirtyDaysAgo]
  );

  await db.runAsync(
    `DELETE FROM cached_analysis WHERE created_at < ?`,
    [thirtyDaysAgo]
  );

  await db.runAsync(
    `DELETE FROM conversation_messages WHERE sync_status = ? AND created_at < ?`,
    ['synced', thirtyDaysAgo]
  );

  console.log('✅ Cleared old cached data (>30 days)');
};
