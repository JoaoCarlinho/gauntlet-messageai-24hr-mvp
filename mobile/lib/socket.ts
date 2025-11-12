import { io, Socket } from 'socket.io-client';
import { tokenManager } from './api';
import logger from './logger';

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
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();
  private logoutTriggered: boolean = false;

  constructor(config: Partial<SocketConfig> = {}) {
    this.config = {
      url: process.env.EXPO_PUBLIC_API_URL || 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app',
      transports: ['polling', 'websocket'],
      timeout: 30000, // Increased timeout for better reliability
      reconnection: true,
      reconnectionAttempts: 10, // Increased attempts
      reconnectionDelay: 2000, // Start with 2 seconds
      reconnectionDelayMax: 10000, // Max 10 seconds
      maxReconnectionAttempts: 15, // More attempts for better reliability
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

      // Get authentication token and check if it's valid
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

      // Check if token is expired and refresh if needed
      const isExpired = this.isTokenExpired(token);
      if (isExpired) {
        logger.debug('Access token is expired, attempting to refresh before socket connection');
        try {
          await this.refreshTokenBeforeConnect();
        } catch (refreshError) {
          logger.networkError('Failed to refresh token before socket connection', refreshError);
          this.updateConnectionStatus({
            connecting: false,
            connected: false,
            error: 'Authentication failed - please login again',
          });
          return;
        }
      }

      console.log('Connecting to socket server:', this.config.url);

      // Get fresh token after potential refresh
      const freshToken = await tokenManager.getAccessToken();
      if (!freshToken) {
        console.log('No fresh token available after refresh, skipping socket connection');
        this.updateConnectionStatus({
          connecting: false,
          connected: false,
          error: 'Authentication failed - please login again',
        });
        return;
      }

      // Create socket connection with authentication
      this.socket = io(this.config.url, {
        transports: this.config.transports,
        timeout: this.config.timeout,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        auth: {
          token: freshToken,
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
   * Check if a JWT token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime;
      
      if (isExpired) {
        logger.debug(`Token expired at ${new Date(payload.exp * 1000).toISOString()}, current time: ${new Date().toISOString()}`);
      }

      return isExpired;
    } catch (error) {
      logger.debug('Error checking token expiration', error);
      return true; // Assume expired if we can't parse
    }
  }

  /**
   * Refresh token before connecting to socket
   */
  private async refreshTokenBeforeConnect(): Promise<void> {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Import authAPI dynamically to avoid circular dependencies
    const { authAPI } = await import('./api');
    const tokens = await authAPI.refreshToken();
    
    // Update tokens in storage
    await tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
    console.log('Token refreshed successfully before socket connection');
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
      this.logoutTriggered = false; // Reset logout flag on successful connection
      this.updateConnectionStatus({
        connected: true,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      
      // Handle different disconnect reasons
      let errorMessage = null;
      if (reason === 'io server disconnect') {
        errorMessage = 'Server disconnected';
      } else if (reason === 'transport close') {
        errorMessage = 'Connection lost - attempting to reconnect';
        console.log('Transport closed, socket will attempt to reconnect automatically');
      } else if (reason === 'ping timeout') {
        errorMessage = 'Connection timeout - attempting to reconnect';
      }
      
      this.updateConnectionStatus({
        connected: false,
        connecting: false,
        error: errorMessage,
      });
    });

    this.socket.on('connect_error', async (error) => {
      console.error('Socket connection error:', error);
      
      // Handle authentication errors specifically
      if (error.message?.includes('Authentication token required') || 
          error.message?.includes('Invalid authentication token') ||
          error.message?.includes('jwt expired') ||
          error.message?.includes('TokenExpiredError')) {
        console.log('Socket authentication failed due to token issue, attempting token refresh');
        
        try {
          // Try to refresh token and reconnect instead of immediately logging out
          await this.reconnectWithFreshToken();
          console.log('Socket reconnected successfully after token refresh');
          return; // If successful, don't update status to error
        } catch (refreshError) {
          console.error('Token refresh failed, triggering logout:', refreshError);
          
          // Only trigger logout if refresh fails and we haven't already triggered it
          if (!this.logoutTriggered) {
            this.logoutTriggered = true;
            try {
              // Use DeviceEventEmitter for React Native
              const { DeviceEventEmitter } = require('react-native');
              DeviceEventEmitter.emit('auth:logout', { reason: 'Socket authentication failed after token refresh attempt' });
            } catch (eventError) {
              console.warn('Could not emit auth:logout event:', eventError);
            }
          }
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
      this.logoutTriggered = false; // Reset logout flag on successful reconnection
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
        error: `Reconnecting... (attempt ${attemptNumber})`,
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

    // AI Agent Events
    this.setupAIAgentEvents();
  }

  /**
   * Setup AI agent-specific event handlers
   */
  private setupAIAgentEvents(): void {
    if (!this.socket) return;

    // New lead from Discovery Bot
    this.socket.on('new_lead', (data: any) => {
      console.log('New lead received:', data);
      this.notifyAIEvent('new_lead', data);
    });

    // Lead qualified
    this.socket.on('lead_qualified', (data: any) => {
      console.log('Lead qualified:', data);
      this.notifyAIEvent('lead_qualified', data);
    });

    // Campaign created by Campaign Advisor
    this.socket.on('campaign_created', (data: any) => {
      console.log('Campaign created:', data);
      this.notifyAIEvent('campaign_created', data);
    });

    // Content generated
    this.socket.on('content_generated', (data: any) => {
      console.log('Content generated:', data);
      this.notifyAIEvent('content_generated', data);
    });

    // Performance analysis complete
    this.socket.on('analysis_complete', (data: any) => {
      console.log('Analysis complete:', data);
      this.notifyAIEvent('analysis_complete', data);
    });
  }

  /**
   * Notify AI event to registered listeners
   */
  private notifyAIEvent(eventType: string, data: any): void {
    // Emit React Native event for cross-component communication
    try {
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit(`ai:${eventType}`, data);
    } catch (error) {
      console.warn('Could not emit AI event:', error);
    }
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
  on(event: string, callback: (...args: any[]) => void): void {
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
  off(event: string, callback?: (...args: any[]) => void): void {
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
