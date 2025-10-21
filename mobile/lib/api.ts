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
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      ]);
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

  async setUserData(user: User): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
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
  async (config: AxiosRequestConfig) => {
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
          // No refresh token, redirect to login
          await tokenManager.clearTokens();
          await tokenManager.clearUserData();
          throw new Error('No refresh token available');
        }

        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await tokenManager.setTokens(accessToken, newRefreshToken);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        await tokenManager.clearTokens();
        await tokenManager.clearUserData();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Functions

// Authentication API
export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      await tokenManager.setTokens(authData.accessToken, authData.refreshToken);
      await tokenManager.setUserData(authData.user);
      return authData;
    }
    throw new Error(response.data.error || 'Login failed');
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      await tokenManager.setTokens(authData.accessToken, authData.refreshToken);
      await tokenManager.setUserData(authData.user);
      return authData;
    }
    throw new Error(response.data.error || 'Registration failed');
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', {
      refreshToken,
    });

    if (response.data.success && response.data.data) {
      const tokens = response.data.data;
      await tokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
      return tokens;
    }
    throw new Error(response.data.error || 'Token refresh failed');
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
    const response = await apiClient.get<ApiResponse<User[]>>(`/users/search?q=${encodeURIComponent(query)}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to search users');
  },
};

// Conversations API
export const conversationsAPI = {
  async getConversations(): Promise<ConversationWithLastMessage[]> {
    const response = await apiClient.get<ApiResponse<ConversationWithLastMessage[]>>('/conversations');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to get conversations');
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

// Export individual APIs for convenience
export {
  authAPI,
  usersAPI,
  conversationsAPI,
  messagesAPI,
  mediaAPI,
  healthAPI,
  tokenManager,
};
