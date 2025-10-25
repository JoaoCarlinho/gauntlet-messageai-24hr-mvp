/**
 * SQLite Database Setup
 *
 * Manages local SQLite database for offline support
 * Stores AI agent queue, cached content, and analysis
 */

import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('messageai.db');

    // Create ai_agent_queue table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ai_agent_queue (
        id TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        retry_count INTEGER DEFAULT 0,
        error TEXT
      );
    `);

    // Create cached_content table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_content (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        platform TEXT,
        product_id TEXT,
        campaign_id TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create cached_analysis table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_analysis (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        analysis_data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Create conversation_messages table for offline messages
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        created_at INTEGER NOT NULL,
        synced_at INTEGER
      );
    `);

    // Create indexes for better query performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_queue_status ON ai_agent_queue(status);
      CREATE INDEX IF NOT EXISTS idx_queue_created ON ai_agent_queue(created_at);
      CREATE INDEX IF NOT EXISTS idx_cached_content_type ON cached_content(type);
      CREATE INDEX IF NOT EXISTS idx_cached_content_campaign ON cached_content(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_sync ON conversation_messages(sync_status);
    `);

    console.log('✅ SQLite database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

// Get database instance
export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Close database
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('✅ Database closed');
  }
};

// Clear all offline data (for testing/debugging)
export const clearOfflineData = async (): Promise<void> => {
  const database = getDatabase();
  await database.execAsync(`
    DELETE FROM ai_agent_queue;
    DELETE FROM cached_content;
    DELETE FROM cached_analysis;
    DELETE FROM conversation_messages WHERE sync_status = 'pending';
  `);
  console.log('✅ Offline data cleared');
};

// Get database statistics
export const getDatabaseStats = async (): Promise<{
  queuedRequests: number;
  cachedContent: number;
  cachedAnalysis: number;
  pendingMessages: number;
}> => {
  const database = getDatabase();

  const queueResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM ai_agent_queue WHERE status = ?',
    ['pending']
  );

  const contentResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cached_content'
  );

  const analysisResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM cached_analysis'
  );

  const messagesResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM conversation_messages WHERE sync_status = ?',
    ['pending']
  );

  return {
    queuedRequests: queueResult?.count || 0,
    cachedContent: contentResult?.count || 0,
    cachedAnalysis: analysisResult?.count || 0,
    pendingMessages: messagesResult?.count || 0,
  };
};
