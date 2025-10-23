import { Platform } from 'react-native';
import { User, Conversation, Message, ReadReceipt, ConversationMember } from '../types';

/**
 * Web-compatible database implementation using localStorage
 * This is a fallback for when SQLite is not available on web
 */
export class WebDatabase {
  private storage: Storage;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      throw new Error('WebDatabase can only be used on web platform');
    }
  }

  private getKey(prefix: string, id: string): string {
    return `messageai_${prefix}_${id}`;
  }

  private getListKey(prefix: string): string {
    return `messageai_${prefix}_list`;
  }

  private getList<T>(prefix: string): T[] {
    try {
      const data = this.storage.getItem(this.getListKey(prefix));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error getting ${prefix} list:`, error);
      return [];
    }
  }

  private setList<T>(prefix: string, items: T[]): void {
    try {
      this.storage.setItem(this.getListKey(prefix), JSON.stringify(items));
    } catch (error) {
      console.error(`Error setting ${prefix} list:`, error);
    }
  }

  private getItem<T>(prefix: string, id: string): T | null {
    try {
      const data = this.storage.getItem(this.getKey(prefix, id));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting ${prefix} item:`, error);
      return null;
    }
  }

  private setItem<T>(prefix: string, id: string, item: T): void {
    try {
      this.storage.setItem(this.getKey(prefix, id), JSON.stringify(item));
    } catch (error) {
      console.error(`Error setting ${prefix} item:`, error);
    }
  }

  private removeItem(prefix: string, id: string): void {
    try {
      this.storage.removeItem(this.getKey(prefix, id));
    } catch (error) {
      console.error(`Error removing ${prefix} item:`, error);
    }
  }

  // ==================== USER OPERATIONS ====================

  async insertUser(user: User): Promise<void> {
    this.setItem('user', user.id, user);
    const users = this.getList<User>('user');
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    this.setList('user', users);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.getItem<User>('user', id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = this.getList<User>('user');
    return users.find(u => u.email === email) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return this.getList<User>('user');
  }

  async updateUser(user: User): Promise<void> {
    await this.insertUser(user);
  }

  async deleteUser(id: string): Promise<void> {
    this.removeItem('user', id);
    const users = this.getList<User>('user');
    const filteredUsers = users.filter(u => u.id !== id);
    this.setList('user', filteredUsers);
  }

  // ==================== CONVERSATION OPERATIONS ====================

  async insertConversation(conversation: Conversation): Promise<void> {
    this.setItem('conversation', conversation.id, conversation);
    const conversations = this.getList<Conversation>('conversation');
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.push(conversation);
    }
    this.setList('conversation', conversations);
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    return this.getItem<Conversation>('conversation', id);
  }

  async getAllConversations(): Promise<Conversation[]> {
    return this.getList<Conversation>('conversation');
  }

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    const conversations = this.getList<Conversation>('conversation');
    const members = this.getList<ConversationMember>('conversation_member');
    const userConversationIds = members
      .filter(m => m.userId === userId)
      .map(m => m.conversationId);
    
    return conversations.filter(c => userConversationIds.includes(c.id));
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    await this.insertConversation(conversation);
  }

  async deleteConversation(id: string): Promise<void> {
    this.removeItem('conversation', id);
    const conversations = this.getList<Conversation>('conversation');
    const filteredConversations = conversations.filter(c => c.id !== id);
    this.setList('conversation', filteredConversations);
  }

  // ==================== CONVERSATION MEMBER OPERATIONS ====================

  async addConversationMember(member: ConversationMember): Promise<void> {
    this.setItem('conversation_member', member.id, member);
    const members = this.getList<ConversationMember>('conversation_member');
    const existingIndex = members.findIndex(m => m.id === member.id);
    if (existingIndex >= 0) {
      members[existingIndex] = member;
    } else {
      members.push(member);
    }
    this.setList('conversation_member', members);
  }

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    const members = this.getList<ConversationMember>('conversation_member');
    return members.filter(m => m.conversationId === conversationId);
  }

  async getConversationMember(conversationId: string, userId: string): Promise<ConversationMember | null> {
    const members = this.getList<ConversationMember>('conversation_member');
    return members.find(m => m.conversationId === conversationId && m.userId === userId) || null;
  }

  async updateLastReadAt(conversationId: string, userId: string, lastReadAt: Date): Promise<void> {
    const member = await this.getConversationMember(conversationId, userId);
    if (member) {
      member.lastReadAt = lastReadAt;
      await this.addConversationMember(member);
    }
  }

  async removeConversationMember(conversationId: string, userId: string): Promise<void> {
    const members = this.getList<ConversationMember>('conversation_member');
    const filteredMembers = members.filter(m => !(m.conversationId === conversationId && m.userId === userId));
    this.setList('conversation_member', filteredMembers);
  }

  // ==================== MESSAGE OPERATIONS ====================

  async insertMessage(message: Message): Promise<void> {
    this.setItem('message', message.id, message);
    const messages = this.getList<Message>('message');
    const existingIndex = messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }
    this.setList('message', messages);
  }

  async getMessageById(id: string): Promise<Message | null> {
    return this.getItem<Message>('message', id);
  }

  async getMessagesForConversation(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    const messages = this.getList<Message>('message');
    const conversationMessages = messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(offset, offset + limit);
    
    console.log(`Web Database: Retrieved ${conversationMessages.length} messages for conversation ${conversationId}`);
    return conversationMessages;
  }

  async getUnreadMessagesForUser(userId: string): Promise<Message[]> {
    const messages = this.getList<Message>('message');
    const members = this.getList<ConversationMember>('conversation_member');
    
    return messages.filter(message => {
      const member = members.find(m => m.conversationId === message.conversationId && m.userId === userId);
      if (!member || !member.lastReadAt) return true;
      return new Date(message.createdAt) > new Date(member.lastReadAt);
    });
  }

  async updateMessageStatus(id: string, status: string): Promise<void> {
    const message = await this.getMessageById(id);
    if (message) {
      message.status = status;
      message.updatedAt = new Date();
      await this.insertMessage(message);
    }
  }

  async updateMessageSyncStatus(id: string, syncStatus: string): Promise<void> {
    const message = await this.getMessageById(id);
    if (message) {
      message.syncStatus = syncStatus;
      message.updatedAt = new Date();
      await this.insertMessage(message);
    }
  }

  async getPendingSyncMessages(): Promise<Message[]> {
    const messages = this.getList<Message>('message');
    return messages.filter(m => m.syncStatus === 'pending');
  }

  async deleteMessage(id: string): Promise<void> {
    this.removeItem('message', id);
    const messages = this.getList<Message>('message');
    const filteredMessages = messages.filter(m => m.id !== id);
    this.setList('message', filteredMessages);
  }

  // ==================== READ RECEIPT OPERATIONS ====================

  async insertReadReceipt(receipt: ReadReceipt): Promise<void> {
    this.setItem('read_receipt', receipt.id, receipt);
    const receipts = this.getList<ReadReceipt>('read_receipt');
    const existingIndex = receipts.findIndex(r => r.id === receipt.id);
    if (existingIndex >= 0) {
      receipts[existingIndex] = receipt;
    } else {
      receipts.push(receipt);
    }
    this.setList('read_receipt', receipts);
  }

  async getReadReceiptsForMessage(messageId: string): Promise<ReadReceipt[]> {
    const receipts = this.getList<ReadReceipt>('read_receipt');
    return receipts.filter(r => r.messageId === messageId);
  }

  async getReadReceiptsForUser(userId: string): Promise<ReadReceipt[]> {
    const receipts = this.getList<ReadReceipt>('read_receipt');
    return receipts.filter(r => r.userId === userId);
  }

  async deleteReadReceipt(id: string): Promise<void> {
    this.removeItem('read_receipt', id);
    const receipts = this.getList<ReadReceipt>('read_receipt');
    const filteredReceipts = receipts.filter(r => r.id !== id);
    this.setList('read_receipt', filteredReceipts);
  }

  // ==================== UTILITY METHODS ====================

  async clearAllData(): Promise<void> {
    const keys = Object.keys(this.storage);
    keys.forEach(key => {
      if (key.startsWith('messageai_')) {
        this.storage.removeItem(key);
      }
    });
  }

  async getDatabaseStats(): Promise<{
    users: number;
    conversations: number;
    messages: number;
    readReceipts: number;
  }> {
    return {
      users: this.getList<User>('user').length,
      conversations: this.getList<Conversation>('conversation').length,
      messages: this.getList<Message>('message').length,
      readReceipts: this.getList<ReadReceipt>('read_receipt').length,
    };
  }
}

// Export a factory function to create web database instance
export const createWebDatabase = (): WebDatabase => {
  return new WebDatabase();
};
