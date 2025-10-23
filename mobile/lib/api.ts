import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  UserProfile,
  UpdateProfileData,
  Conversation,
  ConversationWithLastMessage,
  CreateConversationRequest,
  CreateDirectConversationData,
  CreateGroupConversationData,
  Message,
  MessageWithReadReceipts,
  CreateMessageData,
  MessagePaginationOptions,
  ReadReceiptData,
} from '../types';

// Environment configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
} as const;

// Create Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management utilities
export const tokenManager = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  },

  async setTokens(accessToken: string | null, refreshToken: string | null): Promise<void> {
    try {
      // Validate access token
      if (!accessToken || typeof accessToken !== 'string') {
        console.warn('Invalid access token provided to setTokens:', accessToken);
        return;
      }
      
      // Store access token
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      
      // Only store refresh token if provided and valid
      if (refreshToken && typeof refreshToken === 'string') {
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        console.log('Both tokens stored successfully');
      } else {
        console.log('Access token stored, refresh token not provided or invalid');
      }
    } catch (error) {
      console.error('Error setting tokens:', error);
      throw error;
    }
  },

  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      ]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  async getUserData(): Promise<User | null> {
    try {
      const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  async setUserData(user: User | null): Promise<void> {
    try {
      if (!user) {
        console.warn('Invalid user data provided to setUserData:', user);
        return;
      }
      
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      console.log('User data stored successfully');
    } catch (error) {
      console.error('Error setting user data:', error);
      throw error;
    }
  },

  async clearUserData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  },
};

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  async (config: any) => {
    const token = await tokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors and token refresh
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (!refreshToken) {
          // No refresh token - handle gracefully for push token registration
          // Don't throw error for push token endpoints as they're not critical
          if (originalRequest.url?.includes('/push-token')) {
            console.warn('Push token registration failed - no authentication tokens available');
            return Promise.reject(error);
          }
          
          // For other endpoints, clear tokens and trigger logout
          await tokenManager.clearTokens();
          await tokenManager.clearUserData();
          
          // Trigger global logout event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:logout', { 
              detail: { reason: 'No refresh token available' } 
            }));
          }
          
          throw new Error('No refresh token available');
        }

        console.log('Attempting to refresh access token...');
        
        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        if (response.data.accessToken) {
          const { accessToken } = response.data;
          
          // Update only the access token, keep existing refresh token
          await tokenManager.setTokens(accessToken, null);
          
          console.log('Access token refreshed successfully');

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Invalid refresh response: missing access token');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Refresh failed, clear tokens and trigger logout
        await tokenManager.clearTokens();
        await tokenManager.clearUserData();
        
        // Trigger global logout event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:logout', { 
            detail: { reason: 'Token refresh failed' } 
          }));
        }
        
        // For push token endpoints, don't throw error as they're not critical
        if (originalRequest.url?.includes('/push-token')) {
          console.warn('Push token registration failed - token refresh failed');
          return Promise.reject(error);
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle other HTTP errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.response.data);
    } else if (error.response?.status >= 400) {
      console.warn('Client error:', error.response.status, error.response.data);
    }

    return Promise.reject(error);
  }
);

// API Functions

// Authentication API
export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      console.log('Login response:', JSON.stringify(response.data, null, 2));
      
      // Handle backend response structure: { message, user, tokens }
      if (response.data.user && response.data.tokens) {
        const { accessToken, refreshToken } = response.data.tokens;
        
        // Validate tokens before proceeding
        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in login response:', { accessToken, refreshToken });
          throw new Error('Invalid login response: missing tokens');
        }
        
        const authData = {
          user: response.data.user,
          accessToken,
          refreshToken
        };
        
        await tokenManager.setTokens(authData.accessToken, authData.refreshToken);
        await tokenManager.setUserData(authData.user);
        return authData;
      }
      
      // Handle error response structure: { error, message }
      throw new Error(response.data.error || response.data.message || 'Login failed');
    } catch (error: any) {
      // Handle specific HTTP status codes
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.response?.status === 400) {
        const message = error.response.data?.message || error.response.data?.error;
        if (message?.includes('validation') || message?.includes('required')) {
          throw new Error('Please check your email and password format.');
        }
        throw new Error(message || 'Invalid login information.');
      } else if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please wait a moment and try again.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      // Re-throw the original error if it's not an HTTP error
      throw error;
    }
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      
      console.log('Register response:', JSON.stringify(response.data, null, 2));
      
      // Handle backend response structure: { message, user, tokens }
      if (response.data.user && response.data.tokens) {
        const { accessToken, refreshToken } = response.data.tokens;
        
        // Validate tokens before proceeding
        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in register response:', { accessToken, refreshToken });
          throw new Error('Invalid registration response: missing tokens');
        }
        
        const authData = {
          user: response.data.user,
          accessToken,
          refreshToken
        };
        
        await tokenManager.setTokens(authData.accessToken, authData.refreshToken);
        await tokenManager.setUserData(authData.user);
        return authData;
      }
      
      // Handle error response structure: { error, message }
      throw new Error(response.data.error || response.data.message || 'Registration failed');
    } catch (error: any) {
      // Handle specific HTTP status codes
      if (error.response?.status === 409) {
        throw new Error('An account with this email already exists. Please try logging in instead.');
      } else if (error.response?.status === 400) {
        const message = error.response.data?.message || error.response.data?.error;
        if (message?.includes('validation') || message?.includes('required')) {
          throw new Error('Please check your information and try again.');
        }
        throw new Error(message || 'Invalid registration information.');
      } else if (error.response?.status === 429) {
        throw new Error('Too many registration attempts. Please wait a moment and try again.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      }
      
      // Re-throw the original error if it's not an HTTP error
      throw error;
    }
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post('/auth/refresh', {
      refreshToken,
    });

    console.log('Refresh token response:', JSON.stringify(response.data, null, 2));

    // Handle backend response structure: { message, accessToken, expiresIn }
    if (response.data.accessToken) {
      const newAccessToken = response.data.accessToken;
      
      // Validate new access token
      if (!newAccessToken || typeof newAccessToken !== 'string') {
        console.error('Invalid access token in refresh response:', newAccessToken);
        throw new Error('Invalid refresh response: missing access token');
      }
      
      // Backend only returns new access token, keep existing refresh token
      const tokens = {
        accessToken: newAccessToken,
        refreshToken: refreshToken // Keep the existing refresh token
      };
      
      // Only update access token, keep existing refresh token
      await tokenManager.setTokens(tokens.accessToken, null);
      return tokens;
    }
    
    // Handle error response structure: { error, message }
    throw new Error(response.data.error || response.data.message || 'Token refresh failed');
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      await tokenManager.clearTokens();
      await tokenManager.clearUserData();
    }
  },
};

// Users API
export const usersAPI = {
  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/users/me');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get user profile');
  },

  async updateProfile(updateData: UpdateProfileData): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>('/users/me', updateData);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update profile');
  },

  async uploadAvatar(imageUri: string): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    const response = await apiClient.post<ApiResponse<{ avatarUrl: string }>>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to upload avatar');
  },

  async searchUsers(query: string): Promise<User[]> {
    try {
      const response = await apiClient.get<ApiResponse<User[]>>(`/users/search?q=${encodeURIComponent(query)}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to search users');
    } catch (error: any) {
      // Handle specific error responses
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
};

// Conversations API
export const conversationsAPI = {
  async getConversations(): Promise<ConversationWithLastMessage[]> {
    try {
      const response = await apiClient.get('/conversations');
      
      // Handle different response formats from backend
      if (response.data && response.data.conversations !== undefined) {
        // Backend returns: { message: string, conversations: [], count: number }
        return response.data.conversations || [];
      } else if (response.data && response.data.success && response.data.data) {
        // Legacy format: { success: true, data: [] }
        return response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        // Direct array response
        return response.data;
      } else {
        // No conversations found - return empty array instead of throwing error
        console.log('No conversations found - returning empty array');
        return [];
      }
    } catch (error: any) {
      // Handle authentication errors gracefully
      if (error?.response?.status === 401) {
        console.log('Authentication required - returning empty conversations list');
        return [];
      }
      
      // If it's a 404 or empty response, return empty array instead of throwing
      if (error?.response?.status === 404 || error?.response?.status === 200) {
        console.log('No conversations endpoint or empty response - returning empty array');
        return [];
      }
      
      // For other errors, still throw to maintain error handling
      console.error('Error fetching conversations:', error);
      throw new Error(error?.response?.data?.error || error?.message || 'Failed to get conversations');
    }
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await apiClient.get<ApiResponse<Conversation>>(`/conversations/${conversationId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get conversation');
  },

  async createDirectConversation(data: CreateDirectConversationData): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>('/conversations', {
      type: 'direct',
      participantId: data.participantId,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create direct conversation');
  },

  async createGroupConversation(data: CreateGroupConversationData): Promise<Conversation> {
    const response = await apiClient.post<ApiResponse<Conversation>>('/conversations', {
      type: 'group',
      name: data.name,
      participantIds: data.participantIds,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create group conversation');
  },

  async addMember(conversationId: string, userId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/conversations/${conversationId}/members`, {
      userId,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to add member');
    }
  },

  async removeMember(conversationId: string, userId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/conversations/${conversationId}/members/${userId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove member');
    }
  },
};

// Messages API
export const messagesAPI = {
  async getMessages(
    conversationId: string,
    options: MessagePaginationOptions = {}
  ): Promise<MessageWithReadReceipts[]> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.before) params.append('before', options.before);
    if (options.after) params.append('after', options.after);

    const response = await apiClient.get<ApiResponse<MessageWithReadReceipts[]>>(
      `/conversations/${conversationId}/messages?${params.toString()}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get messages');
  },

  async sendMessage(conversationId: string, messageData: CreateMessageData): Promise<Message> {
    const response = await apiClient.post<ApiResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      messageData
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to send message');
  },

  async markMessageAsRead(messageId: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/messages/${messageId}/read`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to mark message as read');
    }
  },

  async markMessagesAsRead(conversationId: string, upToMessageId?: string): Promise<void> {
    const response = await apiClient.post<ApiResponse<void>>(`/conversations/${conversationId}/read`, {
      upToMessageId,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to mark messages as read');
    }
  },

  async getUnreadCount(conversationId: string): Promise<{ count: number }> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(
      `/conversations/${conversationId}/unread-count`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get unread count');
  },
};

// Media API
export const mediaAPI = {
  async uploadImage(imageUri: string): Promise<{ mediaUrl: string }> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);

    const response = await apiClient.post<ApiResponse<{ mediaUrl: string }>>('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to upload image');
  },
};

// Health check API
export const healthAPI = {
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await apiClient.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Health check failed');
  },
};

// Export the main API client and all API functions
export default {
  client: apiClient,
  tokenManager,
  auth: authAPI,
  users: usersAPI,
  conversations: conversationsAPI,
  messages: messagesAPI,
  media: mediaAPI,
  health: healthAPI,
};
