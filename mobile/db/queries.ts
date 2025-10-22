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
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
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
            ],
            () => resolve(),
            (_, error) => {
              console.error('Error inserting user:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM users WHERE id = ?',
            [id],
            (_, result) => {
              if (result.rows.length > 0) {
                const row = result.rows.item(0);
                resolve(this.mapUserFromRow(row));
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              console.error('Error getting user by ID:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean, lastSeen?: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          const lastSeenValue = lastSeen ? lastSeen.toISOString() : new Date().toISOString();
          tx.executeSql(
            'UPDATE users SET is_online = ?, last_seen = ?, updated_at = ? WHERE id = ?',
            [isOnline ? 1 : 0, lastSeenValue, new Date().toISOString(), id],
            () => resolve(),
            (_, error) => {
              console.error('Error updating user online status:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  // ==================== CONVERSATION OPERATIONS ====================

  async insertConversation(conversation: Conversation): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT OR REPLACE INTO conversations 
             (id, type, name, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              conversation.id,
              conversation.type,
              conversation.name || null,
              conversation.createdAt.toISOString(),
              conversation.updatedAt.toISOString(),
            ],
            () => resolve(),
            (_, error) => {
              console.error('Error inserting conversation:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'SELECT * FROM conversations WHERE id = ?',
            [id],
            (_, result) => {
              if (result.rows.length > 0) {
                const row = result.rows.item(0);
                resolve(this.mapConversationFromRow(row));
              } else {
                resolve(null);
              }
            },
            (_, error) => {
              console.error('Error getting conversation by ID:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `SELECT DISTINCT c.*, 
                    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ?) as unread_count,
                    (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_content,
                    (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_created_at,
                    (SELECT u.display_name FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_sender_name
             FROM conversations c
             JOIN conversation_members cm ON c.id = cm.conversation_id
             WHERE cm.user_id = ?
             ORDER BY COALESCE(last_message_created_at, c.updated_at) DESC`,
            [userId, userId],
            (_, result) => {
              const conversations: Conversation[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                conversations.push(this.mapConversationWithLastMessageFromRow(row));
              }
              resolve(conversations);
            },
            (_, error) => {
              console.error('Error getting conversations for user:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  // ==================== CONVERSATION MEMBER OPERATIONS ====================

  async insertConversationMember(member: ConversationMember): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT OR REPLACE INTO conversation_members 
             (id, conversation_id, user_id, joined_at, last_read_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              member.id,
              member.conversationId,
              member.userId,
              member.joinedAt.toISOString(),
              member.lastReadAt ? member.lastReadAt.toISOString() : null,
            ],
            () => resolve(),
            (_, error) => {
              console.error('Error inserting conversation member:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `SELECT cm.*, u.display_name, u.avatar_url, u.is_online, u.last_seen
             FROM conversation_members cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.conversation_id = ?
             ORDER BY cm.joined_at ASC`,
            [conversationId],
            (_, result) => {
              const members: ConversationMember[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                members.push(this.mapConversationMemberFromRow(row));
              }
              resolve(members);
            },
            (_, error) => {
              console.error('Error getting conversation members:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async updateLastReadAt(conversationId: string, userId: string, lastReadAt: Date): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?',
            [lastReadAt.toISOString(), conversationId, userId],
            () => resolve(),
            (_, error) => {
              console.error('Error updating last read at:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  // ==================== MESSAGE OPERATIONS ====================

  async insertMessage(message: Message, tempId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT OR REPLACE INTO messages 
             (id, conversation_id, sender_id, content, type, media_url, status, created_at, updated_at, temp_id, sync_status)
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
              tempId || null,
              tempId ? 'pending' : 'synced',
            ],
            () => resolve(),
            (_, error) => {
              console.error('Error inserting message:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getMessagesForConversation(
    conversationId: string,
    limit: number = 50,
    beforeMessageId?: string
  ): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          let query = `
            SELECT m.*, u.display_name, u.avatar_url
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.conversation_id = ?
          `;
          const params: any[] = [conversationId];

          if (beforeMessageId) {
            query += ' AND m.created_at < (SELECT created_at FROM messages WHERE id = ?)';
            params.push(beforeMessageId);
          }

          query += ' ORDER BY m.created_at DESC LIMIT ?';
          params.push(limit);

          tx.executeSql(
            query,
            params,
            (_, result) => {
              const messages: Message[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                messages.push(this.mapMessageFromRow(row));
              }
              resolve(messages.reverse()); // Reverse to get chronological order
            },
            (_, error) => {
              console.error('Error getting messages for conversation:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async updateMessageStatus(messageId: string, status: Message['status']): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'UPDATE messages SET status = ?, updated_at = ? WHERE id = ?',
            [status, new Date().toISOString(), messageId],
            () => resolve(),
            (_, error) => {
              console.error('Error updating message status:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async updateMessageByTempId(tempId: string, messageId: string, status: Message['status'] = 'sent'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'UPDATE messages SET id = ?, status = ?, sync_status = ?, updated_at = ? WHERE temp_id = ?',
            [messageId, status, 'synced', new Date().toISOString(), tempId],
            () => resolve(),
            (_, error) => {
              console.error('Error updating message by temp ID:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getPendingMessages(): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `SELECT m.*, u.display_name, u.avatar_url
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.sync_status = 'pending'
             ORDER BY m.created_at ASC`,
            [],
            (_, result) => {
              const messages: Message[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                messages.push(this.mapMessageFromRow(row));
              }
              resolve(messages);
            },
            (_, error) => {
              console.error('Error getting pending messages:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            'DELETE FROM messages WHERE id = ?',
            [messageId],
            () => resolve(),
            (_, error) => {
              console.error('Error deleting message:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  // ==================== READ RECEIPT OPERATIONS ====================

  async insertReadReceipt(readReceipt: ReadReceipt): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `INSERT OR REPLACE INTO read_receipts 
             (id, message_id, user_id, read_at)
             VALUES (?, ?, ?, ?)`,
            [
              readReceipt.id,
              readReceipt.messageId,
              readReceipt.userId,
              readReceipt.readAt.toISOString(),
            ],
            () => resolve(),
            (_, error) => {
              console.error('Error inserting read receipt:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async getReadReceiptsForMessage(messageId: string): Promise<ReadReceipt[]> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql(
            `SELECT rr.*, u.display_name, u.avatar_url
             FROM read_receipts rr
             JOIN users u ON rr.user_id = u.id
             WHERE rr.message_id = ?
             ORDER BY rr.read_at ASC`,
            [messageId],
            (_, result) => {
              const readReceipts: ReadReceipt[] = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                readReceipts.push(this.mapReadReceiptFromRow(row));
              }
              resolve(readReceipts);
            },
            (_, error) => {
              console.error('Error getting read receipts for message:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          // First, check if read receipt already exists
          tx.executeSql(
            'SELECT id FROM read_receipts WHERE message_id = ? AND user_id = ?',
            [messageId, userId],
            (_, result) => {
              if (result.rows.length === 0) {
                // Create new read receipt
                const readReceiptId = `rr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                tx.executeSql(
                  `INSERT INTO read_receipts (id, message_id, user_id, read_at)
                   VALUES (?, ?, ?, ?)`,
                  [readReceiptId, messageId, userId, new Date().toISOString()],
                  () => resolve(),
                  (_, error) => {
                    console.error('Error creating read receipt:', error);
                    reject(error);
                    return false;
                  }
                );
              } else {
                resolve();
              }
            },
            (_, error) => {
              console.error('Error checking read receipt:', error);
              reject(error);
              return false;
            }
          );
        }
      );
    });
  }

  // ==================== UTILITY OPERATIONS ====================

  async clearAllData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          tx.executeSql('DELETE FROM read_receipts');
          tx.executeSql('DELETE FROM messages');
          tx.executeSql('DELETE FROM conversation_members');
          tx.executeSql('DELETE FROM conversations');
          tx.executeSql('DELETE FROM users');
        },
        (error) => {
          console.error('Error clearing all data:', error);
          reject(error);
        },
        () => {
          console.log('All data cleared successfully');
          resolve();
        }
      );
    });
  }

  async getDatabaseStats(): Promise<{
    users: number;
    conversations: number;
    messages: number;
    readReceipts: number;
    pendingMessages: number;
  }> {
    return new Promise((resolve, reject) => {
      this.db.transaction(
        (tx) => {
          let completed = 0;
          const stats = {
            users: 0,
            conversations: 0,
            messages: 0,
            readReceipts: 0,
            pendingMessages: 0,
          };

          const checkComplete = () => {
            completed++;
            if (completed === 5) {
              resolve(stats);
            }
          };

          tx.executeSql('SELECT COUNT(*) as count FROM users', [], (_, result) => {
            stats.users = result.rows.item(0).count;
            checkComplete();
          });

          tx.executeSql('SELECT COUNT(*) as count FROM conversations', [], (_, result) => {
            stats.conversations = result.rows.item(0).count;
            checkComplete();
          });

          tx.executeSql('SELECT COUNT(*) as count FROM messages', [], (_, result) => {
            stats.messages = result.rows.item(0).count;
            checkComplete();
          });

          tx.executeSql('SELECT COUNT(*) as count FROM read_receipts', [], (_, result) => {
            stats.readReceipts = result.rows.item(0).count;
            checkComplete();
          });

          tx.executeSql('SELECT COUNT(*) as count FROM messages WHERE sync_status = "pending"', [], (_, result) => {
            stats.pendingMessages = result.rows.item(0).count;
            checkComplete();
          });
        },
        (error) => {
          console.error('Error getting database stats:', error);
          reject(error);
        }
      );
    });
  }

  // ==================== MAPPING FUNCTIONS ====================

  private mapUserFromRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      lastSeen: new Date(row.last_seen),
      isOnline: Boolean(row.is_online),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapConversationFromRow(row: any): Conversation {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      members: [], // Will be populated separately if needed
    };
  }

  private mapConversationWithLastMessageFromRow(row: any): Conversation {
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      members: [], // Will be populated separately if needed
      unreadCount: row.unread_count || 0,
      lastMessage: row.last_message_content ? {
        id: '',
        conversationId: row.id,
        senderId: '',
        content: row.last_message_content,
        type: 'text' as const,
        status: 'read' as const,
        createdAt: new Date(row.last_message_created_at),
        updatedAt: new Date(row.last_message_created_at),
        sender: {
          id: '',
          email: '',
          displayName: row.last_message_sender_name,
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } : undefined,
    };
  }

  private mapConversationMemberFromRow(row: any): ConversationMember {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      joinedAt: new Date(row.joined_at),
      lastReadAt: row.last_read_at ? new Date(row.last_read_at) : undefined,
      user: {
        id: row.user_id,
        email: '',
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        lastSeen: new Date(row.last_seen),
        isOnline: Boolean(row.is_online),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  private mapMessageFromRow(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      content: row.content,
      type: row.type,
      mediaUrl: row.media_url,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      sender: {
        id: row.sender_id,
        email: '',
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        lastSeen: new Date(),
        isOnline: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  private mapReadReceiptFromRow(row: any): ReadReceipt {
    return {
      id: row.id,
      messageId: row.message_id,
      userId: row.user_id,
      readAt: new Date(row.read_at),
      user: {
        id: row.user_id,
        email: '',
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        lastSeen: new Date(),
        isOnline: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }
}

// Export a factory function to create database queries instance
export const createDatabaseQueries = (db: SQLite.SQLiteDatabase): DatabaseQueries => {
  return new DatabaseQueries(db);
};
