import { useEffect, useCallback, useRef } from 'react';
import { useValues, useActions } from 'kea';
import { messagesLogic } from '../store/messages';
import { useSocket } from './useSocket';
import { Message, SendMessageData, MessageStatusUpdateData, ReadReceiptData } from '../types';
import { createDatabaseQueries } from '../db/queries';
import * as SQLite from 'expo-sqlite';

export interface UseMessagesOptions {
  conversationId: string;
  autoLoad?: boolean;
  loadLimit?: number;
}

export interface UseMessagesReturn {
  // Message data
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  hasMessages: boolean;
  messageCount: number;
  lastMessage: Message | null;
  
  // Typing indicators
  typingUsers: string[];
  
  // Message operations
  sendMessage: (content: string, type?: 'text' | 'image', mediaUrl?: string) => void;
  loadMessages: (limit?: number, beforeMessageId?: string) => void;
  loadMoreMessages: (beforeMessageId: string) => void;
  markMessageAsRead: (messageId: string) => void;
  markAllMessagesAsRead: () => void;
  
  // Socket operations
  joinConversation: () => void;
  leaveConversation: () => void;
  
  // State management
  clearMessages: () => void;
  refreshMessages: () => void;
}

export const useMessages = (options: UseMessagesOptions): UseMessagesReturn => {
  const { conversationId, autoLoad = true, loadLimit = 50 } = options;
  
  // Get values and actions from messages store
  const {
    messages: allMessages,
    isLoading,
    error,
    typingUsers: allTypingUsers,
  } = useValues(messagesLogic);
  
  const {
    sendMessage: sendMessageAction,
    loadMessages: loadMessagesAction,
    loadMoreMessages: loadMoreMessagesAction,
    addMessage,
    updateMessage,
    updateMessageStatus,
    markMessageAsRead: markMessageAsReadAction,
    clearMessages: clearMessagesAction,
    setLoading,
    setError,
    syncMessageToDatabase,
    updateMessageInDatabase,
  } = useActions(messagesLogic);
  
  // Get socket hook
  const {
    sendMessage: socketSendMessage,
    markMessageAsRead: socketMarkMessageAsRead,
    joinRoom,
    leaveRoom,
    onMessage,
    onMessageStatus,
    onReadReceipt,
    onTyping,
    isConnected,
  } = useSocket({
    onMessage: handleMessageReceived,
    onMessageStatus: handleMessageStatusUpdate,
    onReadReceipt: handleReadReceipt,
    onTyping: handleTypingUpdate,
  });
  
  // Refs for cleanup
  const isInitialized = useRef(false);
  const currentConversationId = useRef<string | null>(null);
  
  // Get messages for current conversation
  const messages = allMessages[conversationId] || [];
  const typingUsers = allTypingUsers[conversationId] || [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const hasMessages = messages.length > 0;
  const messageCount = messages.length;
  
  // Socket event handlers
  function handleMessageReceived(message: Message) {
    if (message.conversationId === conversationId) {
      addMessage(message);
      syncMessageToDatabase(message);
    }
  }
  
  function handleMessageStatusUpdate(data: MessageStatusUpdateData) {
    if (data.conversationId === conversationId) {
      updateMessageStatus(data);
    }
  }
  
  function handleReadReceipt(data: ReadReceiptData) {
    // Update message status to read
    updateMessage(data.messageId, { status: 'read' });
    updateMessageInDatabase(data.messageId, { status: 'read' });
  }
  
  function handleTypingUpdate(event: any) {
    if (event.conversationId === conversationId) {
      // Handle typing indicators - this would be managed by the messages store
      // The typing logic is already handled in the messages store
    }
  }
  
  // Load messages from database
  const loadMessagesFromDB = useCallback(async (limit?: number, beforeMessageId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const db = SQLite.openDatabaseSync('messageai.db');
      const queries = createDatabaseQueries(db);
      
      const messages = await queries.getMessagesForConversation(
        conversationId,
        limit || loadLimit,
        beforeMessageId
      );
      
      // Update store with loaded messages
      loadMessagesAction(conversationId, messages);
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError(error instanceof Error ? error.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, loadLimit, loadMessagesAction, setLoading, setError]);
  
  // Send message function
  const sendMessage = useCallback((content: string, type: 'text' | 'image' = 'text', mediaUrl?: string) => {
    if (!content.trim()) return;
    
    const messageData: SendMessageData = {
      conversationId,
      content: content.trim(),
      type,
      mediaUrl,
    };
    
    // Send via socket
    socketSendMessage(conversationId, content.trim(), type, mediaUrl);
    
    // Send via store (optimistic update)
    sendMessageAction(messageData);
  }, [conversationId, socketSendMessage, sendMessageAction]);
  
  // Load more messages
  const loadMoreMessages = useCallback((beforeMessageId: string) => {
    loadMoreMessagesAction(conversationId, beforeMessageId);
  }, [conversationId, loadMoreMessagesAction]);
  
  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string) => {
    // Update locally
    markMessageAsReadAction({ messageId, userId: 'current_user_id' }); // TODO: Get from auth store
    
    // Send via socket
    socketMarkMessageAsRead(messageId);
  }, [markMessageAsReadAction, socketMarkMessageAsRead]);
  
  // Mark all messages as read
  const markAllMessagesAsRead = useCallback(() => {
    // Mark the last message as read (this will mark all previous messages as read)
    if (lastMessage) {
      markMessageAsRead(lastMessage.id);
    }
  }, [lastMessage, markMessageAsRead]);
  
  // Join conversation
  const joinConversation = useCallback(() => {
    if (isConnected) {
      joinRoom(conversationId);
    }
  }, [conversationId, isConnected, joinRoom]);
  
  // Leave conversation
  const leaveConversation = useCallback(() => {
    if (isConnected) {
      leaveRoom(conversationId);
    }
  }, [conversationId, isConnected, leaveRoom]);
  
  // Clear messages
  const clearMessages = useCallback(() => {
    clearMessagesAction(conversationId);
  }, [conversationId, clearMessagesAction]);
  
  // Refresh messages
  const refreshMessages = useCallback(() => {
    loadMessagesFromDB();
  }, [loadMessagesFromDB]);
  
  // Initialize messages when conversation changes
  useEffect(() => {
    if (conversationId !== currentConversationId.current) {
      currentConversationId.current = conversationId;
      
      // Join the conversation room
      joinConversation();
      
      // Load messages if autoLoad is enabled
      if (autoLoad) {
        loadMessagesFromDB();
      }
      
      isInitialized.current = true;
    }
    
    // Cleanup when conversation changes
    return () => {
      if (currentConversationId.current && currentConversationId.current !== conversationId) {
        leaveConversation();
      }
    };
  }, [conversationId, autoLoad, loadMessagesFromDB, joinConversation, leaveConversation]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitialized.current) {
        leaveConversation();
      }
    };
  }, [leaveConversation]);
  
  // Auto-join conversation when socket connects
  useEffect(() => {
    if (isConnected && isInitialized.current) {
      joinConversation();
    }
  }, [isConnected, joinConversation]);
  
  return {
    // Message data
    messages,
    isLoading,
    error,
    hasMessages,
    messageCount,
    lastMessage,
    
    // Typing indicators
    typingUsers,
    
    // Message operations
    sendMessage,
    loadMessages: loadMessagesFromDB,
    loadMoreMessages,
    markMessageAsRead,
    markAllMessagesAsRead,
    
    // Socket operations
    joinConversation,
    leaveConversation,
    
    // State management
    clearMessages,
    refreshMessages,
  };
};

export default useMessages;
