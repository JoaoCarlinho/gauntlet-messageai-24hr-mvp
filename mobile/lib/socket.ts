import { io, Socket } from 'socket.io-client';
import { tokenManager } from './api';

export interface SocketConfig {
  url: string;
  transports: string[];
  timeout: number;
  reconnection: boolean;
  reconnectionAttempts: number;
  reconnectionDelay: number;
  reconnectionDelayMax: number;
  maxReconnectionAttempts: number;
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  };
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: Partial<SocketConfig> = {}) {
    this.config = {
      url: process.env.EXPO_PUBLIC_API_URL || 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app',
      transports: ['polling', 'websocket'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 10,
      ...config,
    };
  }

  /**
   * Initialize and connect to the socket server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      this.updateConnectionStatus({ connecting: true, error: null });

      // Get authentication token
      const token = await tokenManager.getAccessToken();
      if (!token) {
        console.log('No authentication token available, skipping socket connection');
        this.updateConnectionStatus({
          connecting: false,
          connected: false,
          error: null, // Don't treat this as an error, just not connected
        });
        return;
      }

      console.log('Connecting to socket server:', this.config.url);

      // Create socket connection with authentication
      this.socket = io(this.config.url, {
        transports: this.config.transports,
        timeout: this.config.timeout,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        auth: {
          token,
        },
      });

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Failed to connect to socket server:', error);
      this.updateConnectionStatus({
        connecting: false,
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
      throw error;
    }
  }

  /**
   * Reconnect with fresh token
   */
  async reconnectWithFreshToken(): Promise<void> {
    console.log('Reconnecting socket with fresh token...');
    
    // Disconnect current socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reconnect with fresh token
    await this.connect();
  }

  /**
   * Disconnect from the socket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from socket server');
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateConnectionStatus({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.updateConnectionStatus({
        connected: true,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: reason === 'io server disconnect' ? 'Server disconnected' : null,
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      
      // Handle authentication errors specifically
      if (error.message?.includes('Authentication token required') || 
          error.message?.includes('Invalid authentication token')) {
        console.log('Socket authentication failed, triggering logout');
        
        // Trigger global logout event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { reason: 'Socket authentication failed' } 
          }));
        }
      }
      
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: error.message || 'Connection error',
      });
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.updateConnectionStatus({
        connected: true,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
      });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
      this.updateConnectionStatus({
        connected: false,
        connecting: true,
        reconnectAttempts: attemptNumber,
      });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: `Reconnection failed: ${error.message}`,
      });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after maximum attempts');
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: 'Reconnection failed after maximum attempts',
      });
    });

    // Authentication events
    this.socket.on('authenticated', () => {
      console.log('Socket authentication successful');
    });

    this.socket.on('unauthorized', (error) => {
      console.error('Socket authentication failed:', error);
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: 'Authentication failed',
      });
    });
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('Cannot emit event - socket not connected:', event);
      return;
    }

    console.log('Emitting event:', event, data);
    this.socket.emit(event, data);
  }

  /**
   * Listen to an event from the server
   */
  on(event: string, callback: Function): void {
    if (!this.socket) {
      console.warn('Cannot add listener - socket not initialized:', event);
      return;
    }

    // Store listener for cleanup
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: Function): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
      // Remove from stored listeners
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.eventListeners.delete(event);
    }
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string): void {
    this.emit('join_room', { roomId });
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string): void {
    this.emit('leave_room', { roomId });
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket instance (for advanced usage)
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates };
    
    // Notify all status listeners
    this.statusListeners.forEach(callback => {
      try {
        callback(this.connectionStatus);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  /**
   * Cleanup all listeners and disconnect
   */
  cleanup(): void {
    // Remove all event listeners
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(callback => {
        this.off(event, callback);
      });
    });
    this.eventListeners.clear();

    // Clear status listeners
    this.statusListeners = [];

    // Disconnect socket
    this.disconnect();
  }
}

// Create singleton instance
export const socketManager = new SocketManager();

// Export types and manager
export { SocketManager };
export default socketManager;
