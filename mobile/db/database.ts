import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { migrateDatabase } from './schema';
import { createDatabaseQueries } from './queries';
import { createWebDatabase, WebDatabase } from './web-database';

// Singleton database instance
let dbInstance: SQLite.SQLiteDatabase | null = null;
let webDbInstance: WebDatabase | null = null;
let queriesInstance: ReturnType<typeof createDatabaseQueries> | null = null;

/**
 * Check if we're running on web platform
 */
const isWeb = Platform.OS === 'web';

/**
 * Get or create the database instance with proper initialization
 */
export const getDatabase = (): SQLite.SQLiteDatabase | WebDatabase => {
  if (isWeb) {
    if (!webDbInstance) {
      try {
        console.log('Initializing web database fallback');
        webDbInstance = createWebDatabase();
      } catch (error) {
        console.error('Failed to initialize web database:', error);
        throw new Error('Web database initialization failed');
      }
    }
    return webDbInstance;
  } else {
    if (!dbInstance) {
      try {
        dbInstance = SQLite.openDatabaseSync('messageai.db');
        // Ensure tables are created
        migrateDatabase(dbInstance);
      } catch (error) {
        console.error('Failed to initialize SQLite database:', error);
        throw error;
      }
    }
    return dbInstance;
  }
};

/**
 * Get or create the database queries instance
 */
export const getDatabaseQueries = () => {
  if (!queriesInstance) {
    const db = getDatabase();
    if (isWeb) {
      // For web, we'll use the WebDatabase directly since it has the same interface
      queriesInstance = db as any;
    } else {
      queriesInstance = createDatabaseQueries(db as SQLite.SQLiteDatabase);
    }
  }
  return queriesInstance;
};

/**
 * Verify database state and tables
 */
export const verifyDatabaseState = (): boolean => {
  try {
    if (isWeb) {
      // On web, we'll skip database verification for now
      console.log('Web platform detected - skipping database verification');
      return true;
    }
    
    const db = getDatabase();
    
    // Check if all required tables exist
    const tables = ['users', 'conversations', 'conversation_members', 'messages', 'read_receipts'];
    
    for (const table of tables) {
      const result = db.getFirstSync(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`
      );
      if (!result) {
        console.error(`Table ${table} does not exist!`);
        return false;
      }
    }
    
    console.log('All database tables verified successfully');
    return true;
  } catch (error) {
    console.error('Database verification failed:', error);
    if (isWeb) {
      // On web, return true to allow app to continue
      console.log('Web platform - allowing app to continue despite database error');
      return true;
    }
    return false;
  }
};

/**
 * Reset the database (for testing or debugging)
 */
export const resetDatabase = () => {
  if (isWeb) {
    if (webDbInstance) {
      webDbInstance.clearAllData();
      webDbInstance = null;
      queriesInstance = null;
    }
  } else {
    if (dbInstance) {
      dbInstance.closeSync();
      dbInstance = null;
      queriesInstance = null;
    }
  }
};
