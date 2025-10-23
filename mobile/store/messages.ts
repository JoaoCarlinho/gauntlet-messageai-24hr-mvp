import { kea } from 'kea';
import { Message, MessageStatus, SendMessageData, MessageStatusUpdateData, ReadReceiptData } from '../types';
import { getDatabaseQueries } from '../db/database';

// Messages state interface
interface MessagesState {
  messages: { [conversationId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
  typingUsers: { [conversationId: string]: string[] };
  pendingMessages: { [tempId: string]: Message };
  queuedMessages: { [tempId: string]: Message };
  lastMessageIds: { [conversationId: string]: string };
  isOffline: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
}

// Messages actions
interface MessagesActions {
  // Message operations
  sendMessage: (data: SendMessageData) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  updateMessageStatus: (data: MessageStatusUpdateData) => void;
  markMessageAsRead: (data: ReadReceiptData) => void;
  
  // Optimistic UI actions
  confirmMessageSent: (tempId: string, realId: string) => void;
  markMessageFailed: (tempId: string, error: string) => void;
  retryMessage: (tempId: string) => void;
  
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
  
  // Offline queue management
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting') => void;
  queueMessage: (message: Message) => void;
  processQueuedMessages: () => void;
  removeQueuedMessage: (tempId: string) => void;
  retryQueuedMessage: (tempId: string) => void;
}

// Helper function to generate temporary ID (UUID-like)
const generateTempId = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to create optimistic message
const createOptimisticMessage = (data: SendMessageData, currentUserId: string): Message => {
  const tempId = data.tempId || generateUUID();
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
    queuedMessages: {},
    lastMessageIds: {},
    isOffline: false,
    connectionStatus: 'disconnected',
  },
  
  actions: {
    // Message operations
    sendMessage: (data: SendMessageData) => ({ data }),
    addMessage: (message: Message) => ({ message }),
    updateMessage: (messageId: string, updates: Partial<Message>) => ({ messageId, updates }),
    updateMessageStatus: (data: MessageStatusUpdateData) => ({ data }),
    markMessageAsRead: (data: ReadReceiptData) => ({ data }),
    
    // Optimistic UI actions
    confirmMessageSent: (tempId: string, realId: string, conversationId?: string) => ({ tempId, realId, conversationId }),
    markMessageFailed: (tempId: string, error: string) => ({ tempId, error }),
    retryMessage: (tempId: string) => ({ tempId }),
    
    // Message loading
    loadMessages: (conversationId: string, limit?: number, beforeMessageId?: string) => ({ 
      conversationId, 
      limit: limit || 50, 
      beforeMessageId 
    }),
    setMessages: (conversationId: string, messages: Message[]) => ({ 
      conversationId, 
      messages 
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
    updateConversationLastMessage: (message: Message) => ({ message }),
    clearMessages: (conversationId: string) => ({ conversationId }),
    clearAllMessages: true,
    
    // Database sync
    syncMessageToDatabase: (message: Message) => ({ message }),
    updateMessageInDatabase: (messageId: string, updates: Partial<Message>) => ({ messageId, updates }),
    
    // Offline queue management
    setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting') => ({ status }),
    queueMessage: (message: Message) => ({ message }),
    processQueuedMessages: true,
    removeQueuedMessage: (tempId: string) => ({ tempId }),
    retryQueuedMessage: (tempId: string) => ({ tempId }),
  },
  
  reducers: {
    messages: {
      addMessage: (state, { message }) => {
        const conversationId = message.conversationId;
        const existingMessages = state[conversationId] || [];
        
        console.log(`Store: Adding message ${message.id} to conversation ${conversationId}, current count: ${existingMessages.length}`);
        
        // Check if message already exists (avoid duplicates)
        const messageExists = existingMessages.some(m => m.id === message.id);
        if (messageExists) {
          console.log(`Store: Message ${message.id} already exists, skipping`);
          return state;
        }
        
        // Add message and sort by creation time
        const updatedMessages = [...existingMessages, message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        console.log(`Store: Message ${message.id} added successfully, new count: ${updatedMessages.length}`);
        
        return {
          ...state,
          [conversationId]: updatedMessages,
        };
      },
      
      updateMessage: (state, { messageId, updates }) => {
        const newState = { ...state };
        let messageFound = false;
        
        // Find and update the message in all conversations
        Object.keys(newState).forEach(conversationId => {
          const messages = newState[conversationId];
          const messageIndex = messages.findIndex(m => m.id === messageId);
          
          if (messageIndex !== -1) {
            messageFound = true;
            console.log(`Store: Updating message ${messageId} in conversation ${conversationId} with updates:`, updates);
            newState[conversationId] = [
              ...messages.slice(0, messageIndex),
              { ...messages[messageIndex], ...updates, updatedAt: new Date() },
              ...messages.slice(messageIndex + 1),
            ];
          }
        });
        
        if (!messageFound) {
          console.log(`Store: WARNING - Message ${messageId} not found for update`);
        }
        
        return newState;
      },
      
      confirmMessageSent: (state, { tempId, realId }) => {
        const newState = { ...state };
        let messageFound = false;
        
        // Check if we've already processed this confirmation
        const alreadyConfirmed = Object.values(newState).some(messages => 
          messages.some(m => m.id === realId && m.status === 'sent')
        );
        
        if (alreadyConfirmed) {
          console.log(`Store: Message ${realId} already confirmed, ignoring duplicate confirmation`);
          return state;
        }
        
        // Find and update the message with temp ID to real ID
        Object.keys(newState).forEach(conversationId => {
          const messages = newState[conversationId];
          const messageIndex = messages.findIndex(m => m.id === tempId);
          
          if (messageIndex !== -1) {
            messageFound = true;
            console.log(`Store: Updating message status from ${tempId} to ${realId} in conversation ${conversationId}`);
            newState[conversationId] = [
              ...messages.slice(0, messageIndex),
              { 
                ...messages[messageIndex], 
                id: realId, 
                status: 'sent',
                updatedAt: new Date() 
              },
              ...messages.slice(messageIndex + 1),
            ];
          }
        });
        
        if (!messageFound) {
          console.log(`Store: WARNING - Message with tempId ${tempId} not found in any conversation`);
        }
        
        return newState;
      },
      
      markMessageFailed: (state, { tempId, error }) => {
        const newState = { ...state };
        
        // Find and update the message status to failed
        Object.keys(newState).forEach(conversationId => {
          const messages = newState[conversationId];
          const messageIndex = messages.findIndex(m => m.id === tempId);
          
          if (messageIndex !== -1) {
            newState[conversationId] = [
              ...messages.slice(0, messageIndex),
              { 
                ...messages[messageIndex], 
                status: 'failed',
                error: error,
                updatedAt: new Date() 
              },
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
      setMessages: (state, { conversationId, messages }) => {
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
      
      confirmMessageSent: (state, { tempId }) => {
        // Remove from pending when message is confirmed
        const newState = { ...state };
        delete newState[tempId];
        return newState;
      },
      
      markMessageFailed: (state, { tempId }) => {
        // Keep in pending for retry, but mark as failed
        return state;
      },
      
      retryMessage: (state, { tempId }) => {
        // Reset status to sending for retry
        const newState = { ...state };
        if (newState[tempId]) {
          newState[tempId] = {
            ...newState[tempId],
            status: 'sending',
            error: undefined,
            updatedAt: new Date(),
          };
        }
        return newState;
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
    
    queuedMessages: {
      queueMessage: (state, { message }) => ({
        ...state,
        [message.id]: message,
      }),
      
      removeQueuedMessage: (state, { tempId }) => {
        const newState = { ...state };
        delete newState[tempId];
        return newState;
      },
      
      processQueuedMessages: (state) => {
        // Clear all queued messages when processing
        return {};
      },
    },
    
    isOffline: {
      setConnectionStatus: (state, { status }) => {
        return status === 'disconnected' || status === 'reconnecting';
      },
    },
    
    connectionStatus: {
      setConnectionStatus: (_, { status }) => status,
    },
  },
  
  listeners: ({ actions, values }: any) => ({
    // Send message listener
    sendMessage: ({ data }: any) => {
      try {
        // Get current user ID from auth store synchronously
        const { authLogic } = require('./auth');
        const authState = authLogic.values;
        const currentUserId = authState.user?.id;
        
        console.log('Store: Auth state:', { hasUser: !!authState.user, userId: currentUserId });
        
        if (!currentUserId) {
          console.log('Store: No current user found, setting error');
          actions.setError('User not authenticated');
          actions.setLoading(false);
          return;
        }
        
        // Create optimistic message
        const optimisticMessage = createOptimisticMessage(data, currentUserId);
        
        // Add optimistic message to state IMMEDIATELY (synchronous)
        actions.addMessage(optimisticMessage);
        
        // Update conversation's lastMessage
        actions.updateConversationLastMessage(optimisticMessage);
        
        // Check if we're offline
        if (values.isOffline || values.connectionStatus === 'disconnected') {
          // Queue message for later sending
          const queuedMessage = { ...optimisticMessage, status: 'queued' as MessageStatus };
          actions.queueMessage(queuedMessage);
          actions.updateMessage(optimisticMessage.id, { status: 'queued' });
          // Async database sync
          actions.syncMessageToDatabase(queuedMessage);
          console.log('Message queued for offline sending:', queuedMessage.id);
        } else {
          // Store in pending messages and send immediately
          actions.updateMessage(optimisticMessage.id, { status: 'sending' });
          console.log('Store: Syncing optimistic message to database:', optimisticMessage.id);
          // Async database sync
          actions.syncMessageToDatabase(optimisticMessage);
          
          // Emit socket event (this will be handled by the socket hook)
          // The socket hook will emit the 'send_message' event
        }
        
        actions.setLoading(false);
      } catch (error) {
        console.error('Send message error:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to send message');
        actions.setLoading(false);
      }
    },
    
    // Confirm message sent listener
    confirmMessageSent: async ({ tempId, realId, conversationId }: any) => {
      try {
        console.log('Store: Confirming message sent:', tempId, '->', realId);
        
        // Update message with real ID and sent status
        console.log('Store: Updating message in state with real ID');
        actions.updateMessage(tempId, { 
          id: realId, 
          status: 'sent',
          updatedAt: new Date() 
        });
        
        // Update in database
        console.log('Store: Updating message in database with real ID');
        actions.updateMessageInDatabase(tempId, { 
          id: realId, 
          status: 'sent' 
        });
        
        // Update conversation's lastMessage if we have the conversationId
        if (conversationId) {
          const { messages } = values;
          const conversationMessages = messages[conversationId] || [];
          const message = conversationMessages.find((msg: any) => msg.id === tempId || msg.id === realId);
          if (message) {
            console.log('Store: Updating conversation lastMessage');
            actions.updateConversationLastMessage({ ...message, conversationId });
          }
        } else {
          // Fallback: search through all conversations (less efficient but works)
          const { messages } = values;
          const foundConversationId = Object.keys(messages).find(id => 
            messages[id].some((msg: any) => msg.id === tempId || msg.id === realId)
          );
          
          if (foundConversationId) {
            const message = messages[foundConversationId].find((msg: any) => msg.id === tempId || msg.id === realId);
            if (message) {
              console.log('Store: Updating conversation lastMessage (fallback)');
              actions.updateConversationLastMessage({ ...message, conversationId: foundConversationId });
            }
          }
        }
        
        console.log('Store: Message confirmation completed successfully');
      } catch (error) {
        console.error('Confirm message sent error:', error);
      }
    },
    
    // Mark message failed listener
    markMessageFailed: async ({ tempId, error }: any) => {
      try {
        // Update message status to failed
        actions.updateMessage(tempId, { 
          status: 'failed',
          error: error,
          updatedAt: new Date() 
        });
        
        // Update in database
        actions.updateMessageInDatabase(tempId, { 
          status: 'failed',
          error: error 
        });
      } catch (error) {
        console.error('Mark message failed error:', error);
      }
    },
    
    // Retry message listener
    retryMessage: async ({ tempId }: any) => {
      try {
        // Reset message status to sending
        actions.updateMessage(tempId, { 
          status: 'sending',
          error: undefined,
          updatedAt: new Date() 
        });
        
        // Update in database
        actions.updateMessageInDatabase(tempId, { 
          status: 'sending',
          error: undefined 
        });
        
        // Re-emit socket event (this will be handled by the socket hook)
        // The socket hook will re-emit the 'send_message' event
      } catch (error) {
        console.error('Retry message error:', error);
      }
    },
    
    // Load messages listener
    loadMessages: async ({ conversationId, limit, beforeMessageId }: any) => {
      try {
        // Get database queries instance (ensures tables are created)
        const queries = getDatabaseQueries();
        
        // Load messages from database (offset is 0 for initial load)
        let messages = await queries.getMessagesForConversation(
          conversationId,
          limit,
          0 // offset parameter, not beforeMessageId
        );
        
        console.log(`Store: Retrieved ${messages.length} messages for conversation ${conversationId}`);
        
        // If no messages in local database, try to load from API
        if (messages.length === 0) {
          console.log(`Store: No messages in local database, fetching from API for conversation ${conversationId}`);
          try {
            const { messagesAPI } = await import('../lib/api');
            const apiMessages = await messagesAPI.getMessages(conversationId, {
              limit: limit,
              page: 1
            });
            
            console.log(`Store: API retrieved ${apiMessages.length} messages for conversation ${conversationId}`);
            
            // Convert API messages to local format and store in database
            for (const apiMessage of apiMessages) {
              const localMessage = {
                id: apiMessage.id,
                conversationId: apiMessage.conversationId,
                senderId: apiMessage.senderId,
                content: apiMessage.content,
                type: apiMessage.type,
                mediaUrl: apiMessage.mediaUrl,
                status: apiMessage.status,
                createdAt: new Date(apiMessage.createdAt),
                updatedAt: new Date(apiMessage.updatedAt),
                sender: apiMessage.sender
              };
              
              // Store in database
              await queries.insertMessage(localMessage);
              
              // Store sender information if available
              if (apiMessage.sender) {
                await queries.insertUser({
                  id: apiMessage.sender.id,
                  email: apiMessage.sender.email || 'user@example.com',
                  phoneNumber: undefined,
                  displayName: apiMessage.sender.displayName,
                  avatarUrl: apiMessage.sender.avatarUrl,
                  lastSeen: new Date(),
                  isOnline: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            }
            
            // Reload from database after syncing
            messages = await queries.getMessagesForConversation(
              conversationId,
              limit,
              0
            );
            
            console.log(`Store: After API sync, retrieved ${messages.length} messages for conversation ${conversationId}`);
            
          } catch (apiError) {
            console.error('Store: Failed to load messages from API:', apiError);
            // Continue with empty messages from database
          }
        }
        
        // Update state
        actions.setMessages(conversationId, messages);
        
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
        // Get database queries instance (ensures tables are created)
        const queries = getDatabaseQueries();
        
        // Get existing messages to calculate offset
        const existingMessages = values.messages[conversationId] || [];
        const offset = existingMessages.length;
        
        // Load more messages from database
        const messages = await queries.getMessagesForConversation(
          conversationId,
          50,
          offset
        );
        
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
        
        // Update conversation's lastMessage
        actions.updateConversationLastMessage(message);
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
        console.log('Store: Syncing message to database:', message.id, message.content.substring(0, 20) + '...');
        const queries = getDatabaseQueries();
        
        // Insert or update message in database
        await queries.insertMessage(message);
        console.log('Store: Successfully synced message to database:', message.id);
      } catch (error) {
        console.error('Sync message to database error:', error);
      }
    },
    
    // Update message in database
    updateMessageInDatabase: async ({ messageId, updates }: any) => {
      try {
        console.log('Store: Updating message in database:', messageId, updates);
        const queries = getDatabaseQueries();
        
        // If we're updating the ID (from tempId to realId), we need to handle this specially
        if (updates.id && updates.id !== messageId) {
          console.log('Store: Updating message ID from', messageId, 'to', updates.id);
          // First, get the current message
          const currentMessage = await queries.getMessageById(messageId);
          console.log('Store: Retrieved current message:', currentMessage ? 'found' : 'not found');
          
          if (currentMessage) {
            // Create a new message with the real ID
            const updatedMessage = {
              ...currentMessage,
              id: updates.id,
              status: updates.status || currentMessage.status,
              updatedAt: updates.updatedAt || new Date()
            };
            
            console.log('Store: Inserting updated message with real ID');
            // Insert the message with the new ID
            await queries.insertMessage(updatedMessage);
            
            console.log('Store: Deleting old message with temp ID');
            // Delete the old message with temp ID
            await queries.deleteMessage(messageId);
            
            console.log('Store: Successfully updated message ID in database');
          } else {
            console.log('Store: ERROR - Could not find message with tempId:', messageId);
          }
        } else {
          // Regular status update
          if (updates.status) {
            await queries.updateMessageStatus(messageId, updates.status);
          }
        }
      } catch (error) {
        console.error('Update message in database error:', error);
      }
    },
    
    // Update conversation's lastMessage
    updateConversationLastMessage: async ({ message }: any) => {
      try {
        // Import conversations logic to update the conversation
        const { conversationsLogic } = await import('./conversations');
        const { updateConversation } = conversationsLogic.actions;
        
        // Get current conversations from the conversations store, not messages store
        const conversationsState = conversationsLogic.values;
        const conversations = conversationsState.conversations || [];
        const conversation = conversations.find((c: any) => c.id === message.conversationId);
        
        if (conversation) {
          // Create updated conversation with new lastMessage
          const updatedConversation = {
            ...conversation,
            lastMessage: {
              id: message.id,
              content: message.content,
              type: message.type,
              createdAt: message.createdAt,
              sender: {
                id: message.sender.id,
                displayName: message.sender.displayName,
              }
            },
            updatedAt: new Date().toISOString()
          };
          
          // Update the conversation
          updateConversation(updatedConversation);
        }
      } catch (error) {
        console.error('Update conversation lastMessage error:', error);
      }
    },
    
    // Set connection status listener
    setConnectionStatus: async ({ status }: any) => {
      console.log('Connection status changed to:', status);
      
      // If we just reconnected, process queued messages
      if (status === 'connected' && values.connectionStatus === 'disconnected') {
        console.log('Reconnected, processing queued messages...');
        actions.processQueuedMessages();
      }
    },
    
    // Queue message listener
    queueMessage: async ({ message }: any) => {
      try {
        // Store queued message in database
        const queries = getDatabaseQueries();
        
        await queries.insertMessage(message, message.id);
        console.log('Message queued in database:', message.id);
      } catch (error) {
        console.error('Queue message error:', error);
      }
    },
    
    // Process queued messages listener
    processQueuedMessages: async () => {
      try {
        const queuedMessages = values.queuedMessages;
        const queuedMessageIds = Object.keys(queuedMessages);
        
        if (queuedMessageIds.length === 0) {
          console.log('No queued messages to process');
          return;
        }
        
        console.log(`Processing ${queuedMessageIds.length} queued messages...`);
        
        // Process each queued message
        for (const tempId of queuedMessageIds) {
          const message = queuedMessages[tempId];
          
          // Update status to sending
          actions.updateMessage(tempId, { status: 'sending' });
          actions.updateMessageInDatabase(tempId, { status: 'sending' });
          
          // Remove from queued messages
          actions.removeQueuedMessage(tempId);
          
          // Emit socket event to send the message
          // This will be handled by the socket hook
          console.log('Re-sending queued message:', tempId);
        }
        
        console.log('Finished processing queued messages');
      } catch (error) {
        console.error('Process queued messages error:', error);
      }
    },
    
    // Remove queued message listener
    removeQueuedMessage: async ({ tempId }: any) => {
      try {
        // Remove from database
        const queries = getDatabaseQueries();
        
        await queries.deleteMessage(tempId);
        console.log('Queued message removed from database:', tempId);
      } catch (error) {
        console.error('Remove queued message error:', error);
      }
    },
    
    // Retry queued message listener
    retryQueuedMessage: async ({ tempId }: any) => {
      try {
        const queuedMessage = values.queuedMessages[tempId];
        
        if (!queuedMessage) {
          console.log('Queued message not found:', tempId);
          return;
        }
        
        // Update status to sending
        actions.updateMessage(tempId, { status: 'sending' });
        actions.updateMessageInDatabase(tempId, { status: 'sending' });
        
        // Remove from queued messages
        actions.removeQueuedMessage(tempId);
        
        // Emit socket event to retry sending
        console.log('Retrying queued message:', tempId);
      } catch (error) {
        console.error('Retry queued message error:', error);
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
    
    getQueuedMessages: [
      (selectors: any) => [selectors.queuedMessages],
      (queuedMessages: any) => Object.values(queuedMessages),
    ],
    
    getQueuedMessageCount: [
      (selectors: any) => [selectors.queuedMessages],
      (queuedMessages: any) => Object.keys(queuedMessages).length,
    ],
    
    hasQueuedMessages: [
      (selectors: any) => [selectors.queuedMessages],
      (queuedMessages: any) => Object.keys(queuedMessages).length > 0,
    ],
    
    getConnectionStatus: [
      (selectors: any) => [selectors.connectionStatus],
      (connectionStatus: any) => connectionStatus,
    ],
    
  },
});

// Export the logic for use in components
export default messagesLogic;
