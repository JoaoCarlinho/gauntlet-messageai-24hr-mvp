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

export const createTables = (db: SQLite.SQLiteDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        // Users table
        tx.executeSql(`
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
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
            name TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);

        // Conversation members table
        tx.executeSql(`
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
        tx.executeSql(`
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
        tx.executeSql(`
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

        // Create indexes for performance
        createIndexes(tx);
      },
      (error) => {
        console.error('Error creating tables:', error);
        reject(error);
      },
      () => {
        console.log('Database tables created successfully');
        resolve();
      }
    );
  });
};

const createIndexes = (tx: SQLite.SQLTransaction) => {
  // Users indexes
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_users_online ON users (is_online);');

  // Conversations indexes
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations (type);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations (updated_at);');

  // Conversation members indexes
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation ON conversation_members (conversation_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members (user_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_conversation_members_joined ON conversation_members (joined_at);');

  // Messages indexes
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages (status);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_sync_status ON messages (sync_status);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_temp_id ON messages (temp_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages (conversation_id, created_at);');

  // Read receipts indexes
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON read_receipts (message_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON read_receipts (user_id);');
  tx.executeSql('CREATE INDEX IF NOT EXISTS idx_read_receipts_read_at ON read_receipts (read_at);');
};

export const dropTables = (db: SQLite.SQLiteDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        // Drop tables in reverse order due to foreign key constraints
        tx.executeSql('DROP TABLE IF EXISTS read_receipts;');
        tx.executeSql('DROP TABLE IF EXISTS messages;');
        tx.executeSql('DROP TABLE IF EXISTS conversation_members;');
        tx.executeSql('DROP TABLE IF EXISTS conversations;');
        tx.executeSql('DROP TABLE IF EXISTS users;');
      },
      (error) => {
        console.error('Error dropping tables:', error);
        reject(error);
      },
      () => {
        console.log('Database tables dropped successfully');
        resolve();
      }
    );
  });
};

export const resetDatabase = (db: SQLite.SQLiteDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    dropTables(db)
      .then(() => createTables(db))
      .then(() => resolve())
      .catch((error) => reject(error));
  });
};

// Database version management
export const DATABASE_VERSION = 1;

export const getDatabaseVersion = (db: SQLite.SQLiteDatabase): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'CREATE TABLE IF NOT EXISTS db_version (version INTEGER PRIMARY KEY);',
          [],
          () => {
            tx.executeSql(
              'SELECT version FROM db_version ORDER BY version DESC LIMIT 1;',
              [],
              (_, result) => {
                if (result.rows.length > 0) {
                  resolve(result.rows.item(0).version);
                } else {
                  resolve(0);
                }
              },
              (_, error) => {
                console.error('Error getting database version:', error);
                reject(error);
                return false;
              }
            );
          },
          (_, error) => {
            console.error('Error creating version table:', error);
            reject(error);
            return false;
          }
        );
      }
    );
  });
};

export const setDatabaseVersion = (db: SQLite.SQLiteDatabase, version: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          'INSERT OR REPLACE INTO db_version (version) VALUES (?);',
          [version],
          () => resolve(),
          (_, error) => {
            console.error('Error setting database version:', error);
            reject(error);
            return false;
          }
        );
      }
    );
  });
};

export const migrateDatabase = (db: SQLite.SQLiteDatabase): Promise<void> => {
  return new Promise((resolve, reject) => {
    getDatabaseVersion(db)
      .then((currentVersion) => {
        if (currentVersion < DATABASE_VERSION) {
          console.log(`Migrating database from version ${currentVersion} to ${DATABASE_VERSION}`);
          
          // For now, we'll just recreate the tables
          // In a real app, you'd have specific migration scripts
          return resetDatabase(db).then(() => setDatabaseVersion(db, DATABASE_VERSION));
        } else {
          console.log(`Database is up to date (version ${currentVersion})`);
          return Promise.resolve();
        }
      })
      .then(() => resolve())
      .catch((error) => reject(error));
  });
};
