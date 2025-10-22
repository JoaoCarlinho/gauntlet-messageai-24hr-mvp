import { kea } from 'kea';
import { Message, MessageStatus, SendMessageData, MessageStatusUpdateData, ReadReceiptData } from '../types';
import { createDatabaseQueries } from '../db/queries';
import * as SQLite from 'expo-sqlite';

// Messages state interface
interface MessagesState {
  messages: { [conversationId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
  typingUsers: { [conversationId: string]: string[] };
  pendingMessages: { [tempId: string]: Message };
  lastMessageIds: { [conversationId: string]: string };
}

// Messages actions
interface MessagesActions {
  // Message operations
  sendMessage: (data: SendMessageData) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  updateMessageStatus: (data: MessageStatusUpdateData) => void;
  markMessageAsRead: (data: ReadReceiptData) => void;
  
  // Message loading
  loadMessages: (conversationId: string, limit?: number, beforeMessageId?: string) => void;
  loadMoreMessages: (conversationId: string, beforeMessageId: string) => void;
  
  // Socket event handlers
  handleMessageReceived: (message: Message) => void;
  handleMessageStatusUpdate: (data: MessageStatusUpdateData) => void;
  handleReadReceipt: (data: ReadReceiptData) => void;
  
  // Typing indicators
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: (conversationId: string) => void;
  clearAllMessages: () => void;
  
  // Database sync
  syncMessageToDatabase: (message: Message) => void;
  updateMessageInDatabase: (messageId: string, updates: Partial<Message>) => void;
}

// Helper function to generate temporary ID
const generateTempId = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create optimistic message
const createOptimisticMessage = (data: SendMessageData, currentUserId: string): Message => {
  const tempId = data.tempId || generateTempId();
  const now = new Date();
  
  return {
    id: tempId,
    conversationId: data.conversationId,
    senderId: currentUserId,
    content: data.content,
    type: data.type || 'text',
    mediaUrl: data.mediaUrl,
    status: 'sending',
    createdAt: now,
    updatedAt: now,
    sender: {
      id: currentUserId,
      email: '',
      displayName: 'You', // Will be updated with actual user data
      lastSeen: now,
      isOnline: true,
      createdAt: now,
      updatedAt: now,
    },
  };
};

// Messages logic
export const messagesLogic = kea({
  path: ['messages'],
  
  defaults: {
    messages: {},
    isLoading: false,
    error: null,
    typingUsers: {},
    pendingMessages: {},
    lastMessageIds: {},
  },
  
  actions: {
    // Message operations
    sendMessage: (data: SendMessageData) => ({ data }),
    addMessage: (message: Message) => ({ message }),
    updateMessage: (messageId: string, updates: Partial<Message>) => ({ messageId, updates }),
    updateMessageStatus: (data: MessageStatusUpdateData) => ({ data }),
    markMessageAsRead: (data: ReadReceiptData) => ({ data }),
    
    // Message loading
    loadMessages: (conversationId: string, limit?: number, beforeMessageId?: string) => ({ 
      conversationId, 
      limit: limit || 50, 
      beforeMessageId 
    }),
    loadMoreMessages: (conversationId: string, beforeMessageId: string) => ({ 
      conversationId, 
      beforeMessageId 
    }),
    
    // Socket event handlers
    handleMessageReceived: (message: Message) => ({ message }),
    handleMessageStatusUpdate: (data: MessageStatusUpdateData) => ({ data }),
    handleReadReceipt: (data: ReadReceiptData) => ({ data }),
    
    // Typing indicators
    setTypingUsers: (conversationId: string, userIds: string[]) => ({ conversationId, userIds }),
    addTypingUser: (conversationId: string, userId: string) => ({ conversationId, userId }),
    removeTypingUser: (conversationId: string, userId: string) => ({ conversationId, userId }),
    
    // State management
    setLoading: (loading: boolean) => ({ loading }),
    setError: (error: string | null) => ({ error }),
    clearMessages: (conversationId: string) => ({ conversationId }),
    clearAllMessages: true,
    
    // Database sync
    syncMessageToDatabase: (message: Message) => ({ message }),
    updateMessageInDatabase: (messageId: string, updates: Partial<Message>) => ({ messageId, updates }),
  },
  
  reducers: {
    messages: {
      addMessage: (state, { message }) => {
        const conversationId = message.conversationId;
        const existingMessages = state[conversationId] || [];
        
        // Check if message already exists (avoid duplicates)
        const messageExists = existingMessages.some(m => m.id === message.id);
        if (messageExists) {
          return state;
        }
        
        // Add message and sort by creation time
        const updatedMessages = [...existingMessages, message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        return {
          ...state,
          [conversationId]: updatedMessages,
        };
      },
      
      updateMessage: (state, { messageId, updates }) => {
        const newState = { ...state };
        
        // Find and update the message in all conversations
        Object.keys(newState).forEach(conversationId => {
          const messages = newState[conversationId];
          const messageIndex = messages.findIndex(m => m.id === messageId);
          
          if (messageIndex !== -1) {
            newState[conversationId] = [
              ...messages.slice(0, messageIndex),
              { ...messages[messageIndex], ...updates, updatedAt: new Date() },
              ...messages.slice(messageIndex + 1),
            ];
          }
        });
        
        return newState;
      },
      
      loadMessages: (state, { conversationId, messages }) => {
        return {
          ...state,
          [conversationId]: messages,
        };
      },
      
      clearMessages: (state, { conversationId }) => {
        const newState = { ...state };
        delete newState[conversationId];
        return newState;
      },
      
      clearAllMessages: () => ({}),
    },
    
    isLoading: {
      setLoading: (_, { loading }) => loading,
      loadMessages: () => true,
      loadMoreMessages: () => true,
      sendMessage: () => true,
    },
    
    error: {
      setError: (_, { error }) => error,
      loadMessages: () => null,
      loadMoreMessages: () => null,
      sendMessage: () => null,
      addMessage: () => null,
    },
    
    typingUsers: {
      setTypingUsers: (state, { conversationId, userIds }) => ({
        ...state,
        [conversationId]: userIds,
      }),
      
      addTypingUser: (state, { conversationId, userId }) => {
        const currentUsers = state[conversationId] || [];
        if (currentUsers.includes(userId)) {
          return state;
        }
        
        return {
          ...state,
          [conversationId]: [...currentUsers, userId],
        };
      },
      
      removeTypingUser: (state, { conversationId, userId }) => {
        const currentUsers = state[conversationId] || [];
        return {
          ...state,
          [conversationId]: currentUsers.filter(id => id !== userId),
        };
      },
    },
    
    pendingMessages: {
      sendMessage: (state, { data }) => {
        // This will be handled in the listener to create the optimistic message
        return state;
      },
      
      updateMessage: (state, { messageId, updates }) => {
        // Remove from pending if message is confirmed
        if (updates.status && updates.status !== 'sending') {
          const newState = { ...state };
          delete newState[messageId];
          return newState;
        }
        return state;
      },
    },
    
    lastMessageIds: {
      addMessage: (state, { message }) => ({
        ...state,
        [message.conversationId]: message.id,
      }),
      
      loadMessages: (state, { conversationId, messages }) => {
        if (messages && messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          return {
            ...state,
            [conversationId]: lastMessage.id,
          };
        }
        return state;
      },
    },
  },
  
  listeners: ({ actions, values }: any) => ({
    // Send message listener
    sendMessage: async ({ data }: any) => {
      try {
        // Get current user ID (you'll need to get this from auth store)
        const currentUserId = 'current_user_id'; // TODO: Get from auth store
        
        // Create optimistic message
        const optimisticMessage = createOptimisticMessage(data, currentUserId);
        
        // Add optimistic message to state
        actions.addMessage(optimisticMessage);
        
        // Store in pending messages
        actions.updateMessage(optimisticMessage.id, { status: 'sending' });
        
        // Sync to database
        actions.syncMessageToDatabase(optimisticMessage);
        
        // Emit socket event (this will be handled by the socket hook)
        // The socket hook will emit the 'send_message' event
        
        actions.setLoading(false);
      } catch (error) {
        console.error('Send message error:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to send message');
        actions.setLoading(false);
      }
    },
    
    // Load messages listener
    loadMessages: async ({ conversationId, limit, beforeMessageId }: any) => {
      try {
        // Open database
        const db = SQLite.openDatabaseSync('messageai.db');
        const queries = createDatabaseQueries(db);
        
        // Load messages from database
        const messages = await queries.getMessagesForConversation(
          conversationId,
          limit,
          beforeMessageId
        );
        
        // Update state
        actions.loadMessages(conversationId, messages);
        
        actions.setLoading(false);
      } catch (error) {
        console.error('Load messages error:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to load messages');
        actions.setLoading(false);
      }
    },
    
    // Load more messages listener
    loadMoreMessages: async ({ conversationId, beforeMessageId }: any) => {
      try {
        // Open database
        const db = SQLite.openDatabaseSync('messageai.db');
        const queries = createDatabaseQueries(db);
        
        // Load more messages from database
        const messages = await queries.getMessagesForConversation(
          conversationId,
          50,
          beforeMessageId
        );
        
        // Get existing messages
        const existingMessages = values.messages[conversationId] || [];
        
        // Merge and sort messages
        const allMessages = [...existingMessages, ...messages].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        // Update state
        actions.loadMessages(conversationId, allMessages);
        
        actions.setLoading(false);
      } catch (error) {
        console.error('Load more messages error:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to load more messages');
        actions.setLoading(false);
      }
    },
    
    // Handle message received from socket
    handleMessageReceived: async ({ message }: any) => {
      try {
        // Add message to state
        actions.addMessage(message);
        
        // Sync to database
        actions.syncMessageToDatabase(message);
        
        // Update last message ID
        actions.updateMessage(message.id, { status: 'delivered' });
      } catch (error) {
        console.error('Handle message received error:', error);
      }
    },
    
    // Handle message status update from socket
    handleMessageStatusUpdate: async ({ data }: any) => {
      try {
        // Update message status in state
        actions.updateMessage(data.messageId, { status: data.status });
        
        // Update in database
        actions.updateMessageInDatabase(data.messageId, { status: data.status });
      } catch (error) {
        console.error('Handle message status update error:', error);
      }
    },
    
    // Handle read receipt from socket
    handleReadReceipt: async ({ data }: any) => {
      try {
        // Update message status to read
        actions.updateMessage(data.messageId, { status: 'read' });
        
        // Update in database
        actions.updateMessageInDatabase(data.messageId, { status: 'read' });
      } catch (error) {
        console.error('Handle read receipt error:', error);
      }
    },
    
    // Sync message to database
    syncMessageToDatabase: async ({ message }: any) => {
      try {
        const db = SQLite.openDatabaseSync('messageai.db');
        const queries = createDatabaseQueries(db);
        
        // Insert or update message in database
        await queries.insertMessage(message, message.id.startsWith('temp_') ? message.id : undefined);
      } catch (error) {
        console.error('Sync message to database error:', error);
      }
    },
    
    // Update message in database
    updateMessageInDatabase: async ({ messageId, updates }: any) => {
      try {
        const db = SQLite.openDatabaseSync('messageai.db');
        const queries = createDatabaseQueries(db);
        
        // Update message status in database
        if (updates.status) {
          await queries.updateMessageStatus(messageId, updates.status);
        }
      } catch (error) {
        console.error('Update message in database error:', error);
      }
    },
  }),
  
  // Selectors
  selectors: {
    getMessagesForConversation: [
      (selectors: any) => [selectors.messages],
      (messages: any) => (conversationId: string) => messages[conversationId] || [],
    ],
    
    getLastMessage: [
      (selectors: any) => [selectors.messages],
      (messages: any) => (conversationId: string) => {
        const conversationMessages = messages[conversationId] || [];
        return conversationMessages.length > 0 ? conversationMessages[conversationMessages.length - 1] : null;
      },
    ],
    
    getTypingUsers: [
      (selectors: any) => [selectors.typingUsers],
      (typingUsers: any) => (conversationId: string) => typingUsers[conversationId] || [],
    ],
    
    getPendingMessages: [
      (selectors: any) => [selectors.pendingMessages],
      (pendingMessages: any) => Object.values(pendingMessages),
    ],
    
    hasMessages: [
      (selectors: any) => [selectors.messages],
      (messages: any) => (conversationId: string) => {
        const conversationMessages = messages[conversationId] || [];
        return conversationMessages.length > 0;
      },
    ],
    
    getMessageCount: [
      (selectors: any) => [selectors.messages],
      (messages: any) => (conversationId: string) => {
        const conversationMessages = messages[conversationId] || [];
        return conversationMessages.length;
      },
    ],
  },
});

// Export the logic for use in components
export default messagesLogic;
