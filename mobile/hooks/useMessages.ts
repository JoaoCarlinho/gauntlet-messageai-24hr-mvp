import { useEffect, useCallback, useRef } from 'react';
import { useValues, useActions } from 'kea';
import { messagesLogic } from '../store/messages';
import { authLogic } from '../store/auth';
import { useSocket, MessageEvent as SocketMessageEvent } from './useSocket';
import { Message, SendMessageData, MessageStatusUpdateData, ReadReceiptData } from '../types';
import { getDatabaseQueries } from '../db/database';

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
  retryMessage: (messageId: string) => void;
  
  // Socket operations
  joinConversation: () => void;
  leaveConversation: () => void;
  
  // State management
  clearMessages: () => void;
  refreshMessages: () => void;
}

export const useMessages = (options: UseMessagesOptions): UseMessagesReturn => {
  const { conversationId, autoLoad = true, loadLimit = 50 } = options;
  
  // Get current user from auth store
  const { user: currentUser } = useValues(authLogic);
  
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
    setMessages: setMessagesAction,
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
    confirmMessageSent,
    markMessageFailed,
    retryMessage,
    addTypingUser,
    removeTypingUser,
  } = useActions(messagesLogic);
  
  // Get socket hook
  const {
    sendMessage: socketSendMessage,
    markMessageAsRead: socketMarkMessageAsRead,
    joinRoom,
    leaveRoom,
    isConnected,
  } = useSocket({
    onMessage: (msg: SocketMessageEvent) => {
      handleMessageReceived({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        content: msg.content,
        type: msg.type,
        mediaUrl: msg.mediaUrl,
        status: msg.status,
        createdAt: new Date(msg.createdAt),
        updatedAt: new Date(msg.updatedAt),
        sender: msg.sender
      } as Message);
    },
    onMessageSent: (data: any) => {
      console.log('useMessages: Received message_sent confirmation:', data);
      // This is a confirmation that our message was sent successfully
      // We need to update the optimistic message with the real ID and status
      if (data.tempId) {
        // Check if we've already processed this confirmation
        const existingMessage = messages.find((m: Message) => m.id === data.messageId);
        if (existingMessage) {
          console.log('useMessages: Message already confirmed, ignoring duplicate confirmation');
          return;
        }
        
        // Also check if we have a message with the tempId that's already been confirmed
        const tempMessage = messages.find((m: Message) => m.id === data.tempId);
        if (tempMessage && tempMessage.status === 'sent') {
          console.log('useMessages: Message with tempId already confirmed, ignoring duplicate confirmation');
          return;
        }
        
        console.log('useMessages: Confirming message with tempId:', data.tempId, 'realId:', data.messageId);
        confirmMessageSent(data.tempId, data.messageId, data.conversationId);
        // Clear any error state since message was sent successfully
        setError(null);
      } else {
        console.log('useMessages: No tempId in message_sent confirmation, ignoring');
      }
    },
    onMessageStatus: (messageId: string, status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed') => {
      handleMessageStatusUpdate({ messageId, status, conversationId });
    },
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
  
  // Debug logging
  console.log(`useMessages: conversationId=${conversationId}, messageCount=${messageCount}, hasMessages=${hasMessages}, error=${error}`);
  
  // Socket event handlers
  function handleMessageReceived(message: Message) {
    console.log('useMessages: handleMessageReceived called with:', {
      messageId: message.id,
      conversationId: message.conversationId,
      currentConversationId: conversationId,
      content: message.content ? message.content.substring(0, 20) + '...' : 'undefined',
      senderId: message.senderId,
      status: message.status
    });
    
    if (message.conversationId === conversationId) {
      // Check if this is a confirmation of a message we sent optimistically
      const existingMessage = messages.find((m: Message) => 
        m.content === message.content && 
        m.senderId === message.senderId &&
        m.status === 'sending'
      );
      
      if (existingMessage) {
        // This is a confirmation of our optimistic message
        console.log('useMessages: Confirming optimistic message:', existingMessage.id, '->', message.id);
        confirmMessageSent(existingMessage.id, message.id);
      } else {
        // This is a new message from another user
        console.log('useMessages: Adding new message from another user:', message.id);
        addMessage(message);
        syncMessageToDatabase(message);
      }
    } else {
      console.log('useMessages: Message for different conversation, ignoring');
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
      // Handle typing indicators
      if (event.isTyping) {
        // User started typing
        addTypingUser(conversationId, event.userId);
      } else {
        // User stopped typing
        removeTypingUser(conversationId, event.userId);
      }
    }
  }
  
  // Load messages from database and API
  const loadMessagesFromDB = useCallback(async (limit?: number, beforeMessageId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const queries = getDatabaseQueries();
      
      // First try to load from local database
      let messages = await queries.getMessagesForConversation(
        conversationId,
        limit || loadLimit,
        0 // offset parameter, not beforeMessageId
      );
      
      console.log(`Database: Retrieved ${messages.length} messages for conversation ${conversationId}`);
      
      // If no messages in local database, try to load from API
      if (messages.length === 0) {
        console.log(`No messages in local database, fetching from API for conversation ${conversationId}`);
        try {
          const { messagesAPI } = await import('../lib/api');
          const apiMessages = await messagesAPI.getMessages(conversationId, {
            limit: limit || loadLimit,
            page: 1
          });
          
          console.log(`API: Retrieved ${apiMessages.length} messages for conversation ${conversationId}`);
          
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
            limit || loadLimit,
            0
          );
          
          console.log(`After API sync: Retrieved ${messages.length} messages for conversation ${conversationId}`);
          
        } catch (apiError) {
          console.error('Failed to load messages from API:', apiError);
          console.error('API Error details:', {
            message: apiError.message,
            status: apiError.response?.status,
            data: apiError.response?.data
          });
          // Continue with empty messages from database
        }
      }
      
      // Update store with loaded messages (already in correct order)
      setMessagesAction(conversationId, messages);
      
      // Clear any previous errors since messages loaded successfully
      setError(null);
      
      console.log(`Loaded ${messages.length} messages for conversation ${conversationId}`);
      
      // If still no messages, try to get the last message from conversation data
      if (messages.length === 0) {
        console.log('No messages found, checking if conversation has lastMessage data');
        // This will be handled by the chat screen fallback
      }
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Only set error if we don't have any messages loaded
      if (messages.length === 0) {
        setError(error instanceof Error ? error.message : 'Failed to load messages');
      } else {
        console.log('Error occurred but messages are already loaded, not setting error state');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, loadLimit, setMessagesAction, setLoading, setError]);
  
  // Send message function
  const sendMessage = useCallback((content: string, type: 'text' | 'image' = 'text', mediaUrl?: string) => {
    if (!content.trim() || !currentUser) return;
    
    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const messageData: SendMessageData = {
      conversationId,
      content: content.trim(),
      type,
      mediaUrl,
      tempId,
    };
    
    // Send via store first (optimistic update)
    console.log('useMessages: Adding optimistic message to store:', tempId);
    sendMessageAction(messageData);
    console.log('useMessages: Store action completed, sending socket event:', tempId);
    
    // Then send via socket with the same tempId
    socketSendMessage(conversationId, content.trim(), type, mediaUrl, tempId);
  }, [conversationId, currentUser, socketSendMessage, sendMessageAction]);
  
  // Load more messages
  const loadMoreMessages = useCallback((beforeMessageId: string) => {
    loadMoreMessagesAction(conversationId, beforeMessageId);
  }, [conversationId, loadMoreMessagesAction]);
  
  // Mark message as read
  const markMessageAsRead = useCallback((messageId: string) => {
    if (!currentUser) return;
    
    // Update locally
    markMessageAsReadAction({ messageId, userId: currentUser.id });
    
    // Send via socket
    socketMarkMessageAsRead(messageId);
  }, [currentUser, markMessageAsReadAction, socketMarkMessageAsRead]);
  
  // Mark all messages as read
  const markAllMessagesAsRead = useCallback(() => {
    // Mark the last message as read (this will mark all previous messages as read)
    if (lastMessage) {
      markMessageAsRead(lastMessage.id);
    }
  }, [lastMessage, markMessageAsRead]);
  
  // Retry failed message
  const retryFailedMessage = useCallback((messageId: string) => {
    // Retry the message in store
    retryMessage(messageId);
    
    // Re-send via socket
    const message = messages.find((m: Message) => m.id === messageId);
    if (message) {
      socketSendMessage(conversationId, message.content, message.type, message.mediaUrl);
    }
  }, [messages, socketSendMessage, conversationId, retryMessage]);
  
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
    retryMessage: retryFailedMessage,
    
    // Socket operations
    joinConversation,
    leaveConversation,
    
    // State management
    clearMessages,
    refreshMessages,
  };
};

export default useMessages;
