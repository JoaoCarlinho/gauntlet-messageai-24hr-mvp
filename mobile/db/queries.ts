import * as SQLite from 'expo-sqlite';
import { DatabaseSchema } from './schema';
import { User, Conversation, Message, ReadReceipt, ConversationMember } from '../types';

export class DatabaseQueries {
  private db: SQLite.SQLiteDatabase;

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  // ==================== USER OPERATIONS ====================

  async insertUser(user: User): Promise<void> {
    try {
      this.db.runSync(
        `INSERT OR REPLACE INTO users 
         (id, email, phone_number, display_name, avatar_url, last_seen, is_online, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.email,
          user.phoneNumber || null,
          user.displayName,
          user.avatarUrl || null,
          user.lastSeen.toISOString(),
          user.isOnline ? 1 : 0,
          user.createdAt.toISOString(),
          user.updatedAt.toISOString(),
        ]
      );
    } catch (error) {
      console.error('Error inserting user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const result = this.db.getFirstSync('SELECT * FROM users WHERE id = ?', [id]);
      return result ? this.mapUserFromDb(result) : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = this.db.getFirstSync('SELECT * FROM users WHERE email = ?', [email]);
      return result ? this.mapUserFromDb(result) : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const results = this.db.getAllSync('SELECT * FROM users ORDER BY display_name');
      return results.map(this.mapUserFromDb);
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  async updateUser(user: User): Promise<void> {
    try {
      this.db.runSync(
        `UPDATE users SET 
         email = ?, phone_number = ?, display_name = ?, avatar_url = ?, 
         last_seen = ?, is_online = ?, updated_at = ?
         WHERE id = ?`,
        [
          user.email,
          user.phoneNumber || null,
          user.displayName,
          user.avatarUrl || null,
          user.lastSeen.toISOString(),
          user.isOnline ? 1 : 0,
          user.updatedAt.toISOString(),
          user.id,
        ]
      );
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      this.db.runSync('DELETE FROM users WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // ==================== CONVERSATION OPERATIONS ====================

  async insertConversation(conversation: Conversation): Promise<void> {
    try {
      this.db.runSync(
        `INSERT OR REPLACE INTO conversations 
         (id, type, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          conversation.id,
          conversation.type,
          conversation.name || null,
          conversation.createdAt.toISOString(),
          conversation.updatedAt.toISOString(),
        ]
      );
    } catch (error) {
      console.error('Error inserting conversation:', error);
      throw error;
    }
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    try {
      const result = this.db.getFirstSync('SELECT * FROM conversations WHERE id = ?', [id]);
      return result ? this.mapConversationFromDb(result) : null;
    } catch (error) {
      console.error('Error getting conversation by ID:', error);
      throw error;
    }
  }

  async getAllConversations(): Promise<Conversation[]> {
    try {
      const results = this.db.getAllSync('SELECT * FROM conversations ORDER BY updated_at DESC');
      return results.map(this.mapConversationFromDb);
    } catch (error) {
      console.error('Error getting all conversations:', error);
      throw error;
    }
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    try {
      const results = this.db.getAllSync(
        `SELECT c.* FROM conversations c
         INNER JOIN conversation_members cm ON c.id = cm.conversation_id
         WHERE cm.user_id = ?
         ORDER BY c.updated_at DESC`,
        [userId]
      );
      return results.map(this.mapConversationFromDb);
    } catch (error) {
      console.error('Error getting conversations for user:', error);
      throw error;
    }
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    try {
      this.db.runSync(
        `UPDATE conversations SET 
         type = ?, name = ?, updated_at = ?
         WHERE id = ?`,
        [
          conversation.type,
          conversation.name || null,
          conversation.updatedAt.toISOString(),
          conversation.id,
        ]
      );
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      this.db.runSync('DELETE FROM conversations WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // ==================== CONVERSATION MEMBER OPERATIONS ====================

  async addConversationMember(member: ConversationMember): Promise<void> {
    try {
      this.db.runSync(
        `INSERT OR REPLACE INTO conversation_members 
         (id, conversation_id, user_id, joined_at, last_read_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          member.id,
          member.conversationId,
          member.userId,
          member.joinedAt.toISOString(),
          member.lastReadAt?.toISOString() || null,
        ]
      );
    } catch (error) {
      console.error('Error adding conversation member:', error);
      throw error;
    }
  }

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    try {
      const results = this.db.getAllSync(
        'SELECT * FROM conversation_members WHERE conversation_id = ? ORDER BY joined_at',
        [conversationId]
      );
      return results.map(this.mapConversationMemberFromDb);
    } catch (error) {
      console.error('Error getting conversation members:', error);
      throw error;
    }
  }

  async getConversationMember(conversationId: string, userId: string): Promise<ConversationMember | null> {
    try {
      const result = this.db.getFirstSync(
        'SELECT * FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
        [conversationId, userId]
      );
      return result ? this.mapConversationMemberFromDb(result) : null;
    } catch (error) {
      console.error('Error getting conversation member:', error);
      throw error;
    }
  }

  async updateLastReadAt(conversationId: string, userId: string, lastReadAt: Date): Promise<void> {
    try {
      this.db.runSync(
        'UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?',
        [lastReadAt.toISOString(), conversationId, userId]
      );
    } catch (error) {
      console.error('Error updating last read at:', error);
      throw error;
    }
  }

  async removeConversationMember(conversationId: string, userId: string): Promise<void> {
    try {
      this.db.runSync(
        'DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?',
        [conversationId, userId]
      );
    } catch (error) {
      console.error('Error removing conversation member:', error);
      throw error;
    }
  }

  // ==================== MESSAGE OPERATIONS ====================

  async insertMessage(message: Message): Promise<void> {
    try {
      this.db.runSync(
        `INSERT OR REPLACE INTO messages 
         (id, conversation_id, sender_id, content, type, media_url, status, 
          created_at, updated_at, temp_id, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.conversationId,
          message.senderId,
          message.content,
          message.type,
          message.mediaUrl || null,
          message.status,
          message.createdAt.toISOString(),
          message.updatedAt.toISOString(),
          message.tempId || null,
          message.syncStatus || 'synced',
        ]
      );
    } catch (error) {
      console.error('Error inserting message:', error);
      throw error;
    }
  }

  async getMessageById(id: string): Promise<Message | null> {
    try {
      const result = this.db.getFirstSync('SELECT * FROM messages WHERE id = ?', [id]);
      return result ? this.mapMessageFromDb(result) : null;
    } catch (error) {
      console.error('Error getting message by ID:', error);
      throw error;
    }
  }

  async getMessagesForConversation(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      const results = this.db.getAllSync(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [conversationId, limit, offset]
      );
      return results.map(this.mapMessageFromDb);
    } catch (error) {
      console.error('Error getting messages for conversation:', error);
      throw error;
    }
  }

  async getUnreadMessagesForUser(userId: string): Promise<Message[]> {
    try {
      const results = this.db.getAllSync(
        `SELECT m.* FROM messages m
         INNER JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
         WHERE cm.user_id = ? AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01T00:00:00.000Z')
         ORDER BY m.created_at DESC`,
        [userId]
      );
      return results.map(this.mapMessageFromDb);
    } catch (error) {
      console.error('Error getting unread messages for user:', error);
      throw error;
    }
  }

  async updateMessageStatus(id: string, status: string): Promise<void> {
    try {
      this.db.runSync(
        'UPDATE messages SET status = ?, updated_at = ? WHERE id = ?',
        [status, new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
  }

  async updateMessageSyncStatus(id: string, syncStatus: string): Promise<void> {
    try {
      this.db.runSync(
        'UPDATE messages SET sync_status = ?, updated_at = ? WHERE id = ?',
        [syncStatus, new Date().toISOString(), id]
      );
    } catch (error) {
      console.error('Error updating message sync status:', error);
      throw error;
    }
  }

  async getPendingSyncMessages(): Promise<Message[]> {
    try {
      const results = this.db.getAllSync(
        "SELECT * FROM messages WHERE sync_status = 'pending' ORDER BY created_at"
      );
      return results.map(this.mapMessageFromDb);
    } catch (error) {
      console.error('Error getting pending sync messages:', error);
      throw error;
    }
  }

  async deleteMessage(id: string): Promise<void> {
    try {
      this.db.runSync('DELETE FROM messages WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // ==================== READ RECEIPT OPERATIONS ====================

  async insertReadReceipt(receipt: ReadReceipt): Promise<void> {
    try {
      this.db.runSync(
        `INSERT OR REPLACE INTO read_receipts 
         (id, message_id, user_id, read_at)
         VALUES (?, ?, ?, ?)`,
        [
          receipt.id,
          receipt.messageId,
          receipt.userId,
          receipt.readAt.toISOString(),
        ]
      );
    } catch (error) {
      console.error('Error inserting read receipt:', error);
      throw error;
    }
  }

  async getReadReceiptsForMessage(messageId: string): Promise<ReadReceipt[]> {
    try {
      const results = this.db.getAllSync(
        'SELECT * FROM read_receipts WHERE message_id = ? ORDER BY read_at',
        [messageId]
      );
      return results.map(this.mapReadReceiptFromDb);
    } catch (error) {
      console.error('Error getting read receipts for message:', error);
      throw error;
    }
  }

  async getReadReceiptsForUser(userId: string): Promise<ReadReceipt[]> {
    try {
      const results = this.db.getAllSync(
        'SELECT * FROM read_receipts WHERE user_id = ? ORDER BY read_at DESC',
        [userId]
      );
      return results.map(this.mapReadReceiptFromDb);
    } catch (error) {
      console.error('Error getting read receipts for user:', error);
      throw error;
    }
  }

  async deleteReadReceipt(id: string): Promise<void> {
    try {
      this.db.runSync('DELETE FROM read_receipts WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting read receipt:', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  async clearAllData(): Promise<void> {
    try {
      this.db.execSync('DELETE FROM read_receipts');
      this.db.execSync('DELETE FROM messages');
      this.db.execSync('DELETE FROM conversation_members');
      this.db.execSync('DELETE FROM conversations');
      this.db.execSync('DELETE FROM users');
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  async getDatabaseStats(): Promise<{
    users: number;
    conversations: number;
    messages: number;
    readReceipts: number;
  }> {
    try {
      const users = this.db.getFirstSync('SELECT COUNT(*) as count FROM users').count;
      const conversations = this.db.getFirstSync('SELECT COUNT(*) as count FROM conversations').count;
      const messages = this.db.getFirstSync('SELECT COUNT(*) as count FROM messages').count;
      const readReceipts = this.db.getFirstSync('SELECT COUNT(*) as count FROM read_receipts').count;

      return { users, conversations, messages, readReceipts };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  // ==================== MAPPING METHODS ====================

  private mapUserFromDb(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      phoneNumber: dbUser.phone_number,
      displayName: dbUser.display_name,
      avatarUrl: dbUser.avatar_url,
      lastSeen: new Date(dbUser.last_seen),
      isOnline: Boolean(dbUser.is_online),
      createdAt: new Date(dbUser.created_at),
      updatedAt: new Date(dbUser.updated_at),
    };
  }

  private mapConversationFromDb(dbConversation: any): Conversation {
    return {
      id: dbConversation.id,
      type: dbConversation.type,
      name: dbConversation.name,
      createdAt: new Date(dbConversation.created_at),
      updatedAt: new Date(dbConversation.updated_at),
    };
  }

  private mapConversationMemberFromDb(dbMember: any): ConversationMember {
    return {
      id: dbMember.id,
      conversationId: dbMember.conversation_id,
      userId: dbMember.user_id,
      joinedAt: new Date(dbMember.joined_at),
      lastReadAt: dbMember.last_read_at ? new Date(dbMember.last_read_at) : undefined,
    };
  }

  private mapMessageFromDb(dbMessage: any): Message {
    return {
      id: dbMessage.id,
      conversationId: dbMessage.conversation_id,
      senderId: dbMessage.sender_id,
      content: dbMessage.content,
      type: dbMessage.type,
      mediaUrl: dbMessage.media_url,
      status: dbMessage.status,
      createdAt: new Date(dbMessage.created_at),
      updatedAt: new Date(dbMessage.updated_at),
      tempId: dbMessage.temp_id,
      syncStatus: dbMessage.sync_status,
    };
  }

  private mapReadReceiptFromDb(dbReceipt: any): ReadReceipt {
    return {
      id: dbReceipt.id,
      messageId: dbReceipt.message_id,
      userId: dbReceipt.user_id,
      readAt: new Date(dbReceipt.read_at),
    };
  }
}

// Export a factory function to create database queries instance
export const createDatabaseQueries = (db: SQLite.SQLiteDatabase): DatabaseQueries => {
  return new DatabaseQueries(db);
};