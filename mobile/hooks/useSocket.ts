import { useEffect, useRef, useState, useCallback } from 'react';
import { socketManager, ConnectionStatus } from '../lib/socket';
import { useValues, useActions } from 'kea';
import messagesLogic from '../store/messages';

export interface SocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export interface MessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  mediaUrl?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  updatedAt: string;
  sender: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  userDisplayName: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  messageId: string;
  userId: string;
  readAt: string;
}

export interface PresenceEvent {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface SocketEventHandlers {
  onMessage?: (message: MessageEvent) => void;
  onMessageStatus?: (messageId: string, status: MessageEvent['status']) => void;
  onTyping?: (event: TypingEvent) => void;
  onReadReceipt?: (event: ReadReceiptEvent) => void;
  onPresence?: (event: PresenceEvent) => void;
  onUserJoined?: (conversationId: string, userId: string) => void;
  onUserLeft?: (conversationId: string, userId: string) => void;
  onConnectionStatusChange?: (status: SocketState) => void;
}

export interface UseSocketReturn {
  // Connection state
  socketState: SocketState;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Room management
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  
  // Message operations
  sendMessage: (conversationId: string, content: string, type?: 'text' | 'image', mediaUrl?: string) => void;
  markMessageAsRead: (messageId: string) => void;
  
  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  
  // Presence
  updatePresence: (isOnline: boolean) => void;
  
  // Event emission (for custom events)
  emit: (event: string, data?: any) => void;
}

export const useSocket = (handlers: SocketEventHandlers = {}): UseSocketReturn => {
  const [socketState, setSocketState] = useState<SocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const handlersRef = useRef<SocketEventHandlers>(handlers);
  const isInitialized = useRef(false);
  
  // Get message store values and actions
  const { connectionStatus, queuedMessages } = useValues(messagesLogic);
  const { setConnectionStatus, processQueuedMessages } = useActions(messagesLogic);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Initialize socket connection and set up listeners
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeSocket = async () => {
      try {
        // Set up connection status listener
        const unsubscribeStatus = socketManager.onConnectionStatusChange((status: ConnectionStatus) => {
          const newState: SocketState = {
            connected: status.connected,
            connecting: status.connecting,
            error: status.error,
            reconnectAttempts: status.reconnectAttempts,
          };
          
          setSocketState(newState);
          
          // Update message store connection status
          let messageStoreStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
          if (status.connected) {
            messageStoreStatus = 'connected';
          } else if (status.connecting) {
            messageStoreStatus = 'connecting';
          } else if (status.reconnectAttempts > 0) {
            messageStoreStatus = 'reconnecting';
          } else {
            messageStoreStatus = 'disconnected';
          }
          
          setConnectionStatus(messageStoreStatus);
          
          // Call handler if provided
          if (handlersRef.current.onConnectionStatusChange) {
            handlersRef.current.onConnectionStatusChange(newState);
          }
        });

        // Set up message event listeners
        socketManager.on('new_message', (message: MessageEvent) => {
          console.log('Received new message:', message);
          if (handlersRef.current.onMessage) {
            handlersRef.current.onMessage(message);
          }
        });

        socketManager.on('message_status_update', (data: { messageId: string; status: MessageEvent['status'] }) => {
          console.log('Message status update:', data);
          if (handlersRef.current.onMessageStatus) {
            handlersRef.current.onMessageStatus(data.messageId, data.status);
          }
        });

        socketManager.on('typing_start', (event: TypingEvent) => {
          console.log('User started typing:', event);
          if (handlersRef.current.onTyping) {
            handlersRef.current.onTyping(event);
          }
        });

        socketManager.on('typing_stop', (event: TypingEvent) => {
          console.log('User stopped typing:', event);
          if (handlersRef.current.onTyping) {
            handlersRef.current.onTyping(event);
          }
        });

        socketManager.on('read_receipt', (event: ReadReceiptEvent) => {
          console.log('Read receipt received:', event);
          if (handlersRef.current.onReadReceipt) {
            handlersRef.current.onReadReceipt(event);
          }
        });

        socketManager.on('presence_update', (event: PresenceEvent) => {
          console.log('Presence update:', event);
          if (handlersRef.current.onPresence) {
            handlersRef.current.onPresence(event);
          }
        });

        socketManager.on('user_joined', (data: { conversationId: string; userId: string }) => {
          console.log('User joined conversation:', data);
          if (handlersRef.current.onUserJoined) {
            handlersRef.current.onUserJoined(data.conversationId, data.userId);
          }
        });

        socketManager.on('user_left', (data: { conversationId: string; userId: string }) => {
          console.log('User left conversation:', data);
          if (handlersRef.current.onUserLeft) {
            handlersRef.current.onUserLeft(data.conversationId, data.userId);
          }
        });

        // Store cleanup function
        return () => {
          unsubscribeStatus();
          // Note: We don't remove individual event listeners here as they're managed by the socket manager
        };

      } catch (error) {
        console.error('Failed to initialize socket:', error);
        setSocketState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Socket initialization failed',
        }));
      }
    };

    const cleanup = initializeSocket();

    // Cleanup on unmount
    return () => {
      cleanup.then(cleanupFn => {
        if (cleanupFn) cleanupFn();
      });
    };
  }, []);

  // Connection management functions
  const connect = useCallback(async (): Promise<void> => {
    try {
      await socketManager.connect();
    } catch (error) {
      console.error('Failed to connect socket:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback((): void => {
    socketManager.disconnect();
  }, []);

  // Room management functions
  const joinRoom = useCallback((roomId: string): void => {
    socketManager.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string): void => {
    socketManager.leaveRoom(roomId);
  }, []);

  // Message operations
  const sendMessage = useCallback((
    conversationId: string,
    content: string,
    type: 'text' | 'image' = 'text',
    mediaUrl?: string
  ): void => {
    const messageData = {
      conversationId,
      content,
      type,
      mediaUrl,
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    console.log('Sending message:', messageData);
    
    // Check if we're connected before sending
    if (socketState.connected) {
      socketManager.emit('send_message', messageData);
    } else {
      console.log('Socket not connected, message will be queued');
      // The message store will handle queuing when offline
    }
  }, [socketState.connected]);

  const markMessageAsRead = useCallback((messageId: string): void => {
    console.log('Marking message as read:', messageId);
    socketManager.emit('mark_message_read', { messageId });
  }, []);

  // Typing indicators
  const startTyping = useCallback((conversationId: string): void => {
    console.log('Starting typing in conversation:', conversationId);
    socketManager.emit('typing_start', { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId: string): void => {
    console.log('Stopping typing in conversation:', conversationId);
    socketManager.emit('typing_stop', { conversationId });
  }, []);

  // Presence
  const updatePresence = useCallback((isOnline: boolean): void => {
    console.log('Updating presence:', isOnline);
    socketManager.emit('presence_update', { isOnline });
  }, []);

  // Generic event emission
  const emit = useCallback((event: string, data?: any): void => {
    socketManager.emit(event, data);
  }, []);
  
  // Process queued messages when reconnected
  const processQueuedMessagesOnReconnect = useCallback(() => {
    if (socketState.connected && Object.keys(queuedMessages).length > 0) {
      console.log('Processing queued messages on reconnect...');
      processQueuedMessages();
    }
  }, [socketState.connected, queuedMessages, processQueuedMessages]);
  
  // Effect to process queued messages when reconnected
  useEffect(() => {
    processQueuedMessagesOnReconnect();
  }, [processQueuedMessagesOnReconnect]);

  return {
    // Connection state
    socketState,
    isConnected: socketState.connected,
    isConnecting: socketState.connecting,
    error: socketState.error,
    
    // Connection management
    connect,
    disconnect,
    
    // Room management
    joinRoom,
    leaveRoom,
    
    // Message operations
    sendMessage,
    markMessageAsRead,
    
    // Typing indicators
    startTyping,
    stopTyping,
    
    // Presence
    updatePresence,
    
    // Event emission
    emit,
  };
};

export default useSocket;
