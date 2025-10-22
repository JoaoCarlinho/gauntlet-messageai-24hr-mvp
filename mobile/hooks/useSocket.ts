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
  sender: any;
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
  socketState: SocketState;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (conversationId: string, content: string, type?: 'text' | 'image', mediaUrl?: string) => void;
  markMessageAsRead: (messageId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  updatePresence: (isOnline: boolean) => void;
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
  const listenersRegisteredRef = useRef(false);
  
  const { connectionStatus, queuedMessages } = useValues(messagesLogic);
  const { setConnectionStatus, processQueuedMessages } = useActions(messagesLogic);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const registerSocketListeners = useCallback(() => {
    if (listenersRegisteredRef.current) return;
    listenersRegisteredRef.current = true;

    socketManager.on('new_message', (message: MessageEvent) => {
      if (handlersRef.current.onMessage) handlersRef.current.onMessage(message);
    });

    socketManager.on('message_status_update', (data: { messageId: string; status: MessageEvent['status'] }) => {
      if (handlersRef.current.onMessageStatus) handlersRef.current.onMessageStatus(data.messageId, data.status);
    });

    socketManager.on('typing_start', (event: TypingEvent) => {
      if (handlersRef.current.onTyping) handlersRef.current.onTyping(event);
    });

    socketManager.on('typing_stop', (event: TypingEvent) => {
      if (handlersRef.current.onTyping) handlersRef.current.onTyping(event);
    });

    socketManager.on('read_receipt', (event: ReadReceiptEvent) => {
      if (handlersRef.current.onReadReceipt) handlersRef.current.onReadReceipt(event);
    });

    socketManager.on('presence_update', (event: PresenceEvent) => {
      if (handlersRef.current.onPresence) handlersRef.current.onPresence(event);
    });

    socketManager.on('user_joined', (data: { conversationId: string; userId: string }) => {
      if (handlersRef.current.onUserJoined) handlersRef.current.onUserJoined(data.conversationId, data.userId);
    });

    socketManager.on('user_left', (data: { conversationId: string; userId: string }) => {
      if (handlersRef.current.onUserLeft) handlersRef.current.onUserLeft(data.conversationId, data.userId);
    });
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeSocket = async () => {
      try {
        const unsubscribeStatus = socketManager.onConnectionStatusChange((status: ConnectionStatus) => {
          const newState: SocketState = {
            connected: status.connected,
            connecting: status.connecting,
            error: status.error,
            reconnectAttempts: status.reconnectAttempts,
          };

          setSocketState(newState);

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

          if (handlersRef.current.onConnectionStatusChange) {
            handlersRef.current.onConnectionStatusChange(newState);
          }

          if (status.connected) {
            registerSocketListeners();
          }
        });

        // Only register listeners if socket is already connected
        if (socketManager.isConnected()) {
          registerSocketListeners();
        }

        return () => {
          unsubscribeStatus();
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
    return () => {
      cleanup.then(cleanFn => {
        if (cleanFn) cleanFn();
      });
    };
  }, [registerSocketListeners, setConnectionStatus]);

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

  const joinRoom = useCallback((roomId: string): void => {
    socketManager.joinRoom(roomId);
  }, []);

  const leaveRoom = useCallback((roomId: string): void => {
    socketManager.leaveRoom(roomId);
  }, []);

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

    if (socketState.connected) {
      socketManager.emit('send_message', messageData);
    } else {
      console.log('Socket not connected, message will be queued');
    }
  }, [socketState.connected]);

  const markMessageAsRead = useCallback((messageId: string): void => {
    socketManager.emit('mark_message_read', { messageId });
  }, []);

  const startTyping = useCallback((conversationId: string): void => {
    socketManager.emit('typing_start', { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId: string): void => {
    socketManager.emit('typing_stop', { conversationId });
  }, []);

  const updatePresence = useCallback((isOnline: boolean): void => {
    socketManager.emit('presence_update', { isOnline });
  }, []);

  const emit = useCallback((event: string, data?: any): void => {
    socketManager.emit(event, data);
  }, []);
  
  const processQueuedMessagesOnReconnect = useCallback(() => {
    if (socketState.connected && Object.keys(queuedMessages).length > 0) {
      console.log('Processing queued messages on reconnect...');
      processQueuedMessages();
    }
  }, [socketState.connected, queuedMessages, processQueuedMessages]);
  
  useEffect(() => {
    processQueuedMessagesOnReconnect();
  }, [processQueuedMessagesOnReconnect]);

  return {
    socketState,
    isConnected: socketState.connected,
    isConnecting: socketState.connecting,
    error: socketState.error,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    markMessageAsRead,
    startTyping,
    stopTyping,
    updatePresence,
    emit,
  };
};

export default useSocket;