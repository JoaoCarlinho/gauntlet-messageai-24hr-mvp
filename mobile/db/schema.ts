import * as SQLite from 'expo-sqlite';

export interface DatabaseSchema {
  users: {
    id: string;
    email: string;
    phone_number?: string;
    display_name: string;
    avatar_url?: string;
    last_seen: string; // ISO string
    is_online: number; // SQLite boolean as integer
    created_at: string; // ISO string
    updated_at: string; // ISO string
  };
  
  conversations: {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    created_at: string; // ISO string
    updated_at: string; // ISO string
  };
  
  conversation_members: {
    id: string;
    conversation_id: string;
    user_id: string;
    joined_at: string; // ISO string
    last_read_at?: string; // ISO string
  };
  
  messages: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'image' | 'system';
    media_url?: string;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    created_at: string; // ISO string
    updated_at: string; // ISO string
    temp_id?: string; // For optimistic updates
    sync_status: 'pending' | 'synced' | 'failed'; // For offline sync
  };
  
  read_receipts: {
    id: string;
    message_id: string;
    user_id: string;
    read_at: string; // ISO string
  };
}

// Database version management
export const DATABASE_VERSION = 1;

export const createTables = (db: SQLite.SQLiteDatabase): void => {
  try {
    // Users table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        last_seen TEXT NOT NULL,
        is_online INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Conversations table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
        name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Conversation members table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS conversation_members (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at TEXT NOT NULL,
        last_read_at TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (conversation_id, user_id)
      );
    `);

    // Messages table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('text', 'image', 'system')),
        media_url TEXT,
        status TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        temp_id TEXT,
        sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Read receipts table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS read_receipts (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        read_at TEXT NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (message_id, user_id)
      );
    `);

    // Database version table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS db_version (version INTEGER PRIMARY KEY);
    `);

    // Create indexes for performance
    createIndexes(db);
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const createIndexes = (db: SQLite.SQLiteDatabase): void => {
  try {
    // Users indexes
    db.execSync('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_users_online ON users (is_online);');

    // Conversations indexes
    db.execSync('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations (type);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations (updated_at);');

    // Conversation members indexes
    db.execSync('CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members (conversation_id);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members (user_id);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_conversation_members_joined ON conversation_members (joined_at);');

    // Messages indexes
    db.execSync('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON messages (sync_status);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_messages_temp_id ON messages (temp_id);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at);');

    // Read receipts indexes
    db.execSync('CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON read_receipts (message_id);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON read_receipts (user_id);');
    db.execSync('CREATE INDEX IF NOT EXISTS idx_read_receipts_read_at ON read_receipts (read_at);');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
};

export const dropTables = (db: SQLite.SQLiteDatabase): void => {
  try {
    // Drop tables in reverse order due to foreign key constraints
    db.execSync('DROP TABLE IF EXISTS read_receipts;');
    db.execSync('DROP TABLE IF EXISTS messages;');
    db.execSync('DROP TABLE IF EXISTS conversation_members;');
    db.execSync('DROP TABLE IF EXISTS conversations;');
    db.execSync('DROP TABLE IF EXISTS users;');
    db.execSync('DROP TABLE IF EXISTS db_version;');
  } catch (error) {
    console.error('Error dropping tables:', error);
    throw error;
  }
};

export const resetDatabase = (db: SQLite.SQLiteDatabase): void => {
  dropTables(db);
  createTables(db);
};

export const getDatabaseVersion = (db: SQLite.SQLiteDatabase): number => {
  try {
    const result = db.getFirstSync('SELECT version FROM db_version ORDER BY version DESC LIMIT 1;');
    return result ? (result as any).version : 0;
  } catch (error) {
    console.error('Error getting database version:', error);
    return 0;
  }
};

export const setDatabaseVersion = (db: SQLite.SQLiteDatabase, version: number): void => {
  try {
    db.runSync('INSERT OR REPLACE INTO db_version (version) VALUES (?);', [version]);
  } catch (error) {
    console.error('Error setting database version:', error);
    throw error;
  }
};

export const migrateDatabase = (db: SQLite.SQLiteDatabase): void => {
  try {
    const currentVersion = getDatabaseVersion(db);
    
    if (currentVersion < DATABASE_VERSION) {
      // For now, we'll just recreate the tables
      // In a real app, you'd have specific migration scripts
      resetDatabase(db);
      setDatabaseVersion(db, DATABASE_VERSION);
    }
  } catch (error) {
    console.error('Error migrating database:', error);
    throw error;
  }
};

// Database queries factory
export const createDatabaseQueries = (db: SQLite.SQLiteDatabase) => {
  return {
    // User queries
    createUser: (user: DatabaseSchema['users']) => {
      db.runSync(
        'INSERT OR REPLACE INTO users (id, email, phone_number, display_name, avatar_url, last_seen, is_online, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.id, user.email, user.phone_number || null, user.display_name, user.avatar_url || null, user.last_seen, user.is_online, user.created_at, user.updated_at]
      );
    },
    
    getUser: (id: string) => {
      return db.getFirstSync('SELECT * FROM users WHERE id = ?', [id]);
    },
    
    getAllUsers: () => {
      return db.getAllSync('SELECT * FROM users ORDER BY display_name');
    },
    
    // Conversation queries
    createConversation: (conversation: DatabaseSchema['conversations']) => {
      db.runSync(
        'INSERT OR REPLACE INTO conversations (id, type, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [conversation.id, conversation.type, conversation.name || null, conversation.created_at, conversation.updated_at]
      );
    },
    
    getConversation: (id: string) => {
      return db.getFirstSync('SELECT * FROM conversations WHERE id = ?', [id]);
    },
    
    getAllConversations: () => {
      return db.getAllSync('SELECT * FROM conversations ORDER BY updated_at DESC');
    },
    
    // Message queries
    createMessage: (message: DatabaseSchema['messages']) => {
      db.runSync(
        'INSERT OR REPLACE INTO messages (id, conversation_id, sender_id, content, type, media_url, status, created_at, updated_at, temp_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [message.id, message.conversation_id, message.sender_id, message.content, message.type, message.media_url || null, message.status, message.created_at, message.updated_at, message.temp_id || null, message.sync_status]
      );
    },
    
    getMessages: (conversationId: string, limit: number = 50, offset: number = 0) => {
      return db.getAllSync(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [conversationId, limit, offset]
      );
    },
    
    updateMessageStatus: (id: string, status: string) => {
      db.runSync(
        'UPDATE messages SET status = ?, updated_at = ? WHERE id = ?',
        [status, new Date().toISOString(), id]
      );
    },
    
    // Conversation member queries
    addConversationMember: (member: DatabaseSchema['conversation_members']) => {
      db.runSync(
        'INSERT OR REPLACE INTO conversation_members (id, conversation_id, user_id, joined_at, last_read_at) VALUES (?, ?, ?, ?, ?)',
        [member.id, member.conversation_id, member.user_id, member.joined_at, member.last_read_at || null]
      );
    },
    
    getConversationMembers: (conversationId: string) => {
      return db.getAllSync(
        'SELECT * FROM conversation_members WHERE conversation_id = ?',
        [conversationId]
      );
    },
    
    // Read receipt queries
    createReadReceipt: (receipt: DatabaseSchema['read_receipts']) => {
      db.runSync(
        'INSERT OR REPLACE INTO read_receipts (id, message_id, user_id, read_at) VALUES (?, ?, ?, ?)',
        [receipt.id, receipt.message_id, receipt.user_id, receipt.read_at]
      );
    },
    
    getReadReceipts: (messageId: string) => {
      return db.getAllSync(
        'SELECT * FROM read_receipts WHERE message_id = ?',
        [messageId]
      );
    }
  };
};