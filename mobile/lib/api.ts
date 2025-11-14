import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import logger from './logger';

// Platform-specific storage imports
let platformStorage: any;

if (Platform.OS === 'web') {
  try {
    const { webStorageFallback } = require('./web-storage-fallback');
    platformStorage = webStorageFallback;
  } catch (error) {
    console.error('Failed to load web storage fallback in api:', error);
    // Fallback to a mock storage if web storage fails
    platformStorage = {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
    };
  }
} else {
  try {
    const { mobileStorage } = require('./mobile-storage');
    platformStorage = mobileStorage;
  } catch (error) {
    console.error('Failed to load mobile storage in api:', error);
    // Fallback to a mock storage if mobile storage fails
    platformStorage = {
      getItemAsync: async () => null,
      setItemAsync: async () => {},
      deleteItemAsync: async () => {},
    };
  }
}
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
  Lead,
  LeadStatus,
  LeadActivity,
  Team,
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
      return await platformStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await platformStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
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
      await platformStorage.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      
      // Only store refresh token if provided and valid
      if (refreshToken && typeof refreshToken === 'string') {
        await platformStorage.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
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
        platformStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        platformStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      ]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  async getUserData(): Promise<User | null> {
    try {
      const userData = await platformStorage.getItemAsync(STORAGE_KEYS.USER_DATA);
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
      
      await platformStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      console.log('User data stored successfully');
    } catch (error) {
      console.error('Error setting user data:', error);
      throw error;
    }
  },

  async clearUserData(): Promise<void> {
    try {
      await platformStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
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
          // No refresh token - handle gracefully
          logger.silent('No refresh token available, user needs to login');

          // Clear any stale tokens
          await tokenManager.clearTokens();
          await tokenManager.clearUserData();
          
          // For non-critical endpoints, just reject the request
          if (originalRequest.url?.includes('/push-token') || 
              originalRequest.url?.includes('/logout') ||
              originalRequest.url?.includes('/refresh')) {
            console.log('Non-critical endpoint failed due to no auth - rejecting gracefully');
            return Promise.reject(error);
          }
          
          // For critical endpoints, trigger logout event but don't throw error
          try {
            const { DeviceEventEmitter } = require('react-native');
            DeviceEventEmitter.emit('auth:logout', { reason: 'No refresh token available' });
          } catch (eventError) {
            console.warn('Could not emit auth:logout event:', eventError);
          }
          
          // Return the original error instead of throwing a new one
          return Promise.reject(error);
        }

        logger.debug('Attempting to refresh access token...');

        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        if (response.data.accessToken) {
          const { accessToken } = response.data;
          
          // Update only the access token, keep existing refresh token
          await tokenManager.setTokens(accessToken, null);
          
          logger.debug('Access token refreshed successfully');

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else {
          logger.error('Invalid refresh response', response.data);
          throw new Error('Invalid refresh response: missing access token');
        }
      } catch (refreshError) {
        logger.networkError('Token refresh failed', refreshError);
        
        // Refresh failed, clear tokens and trigger logout
        await tokenManager.clearTokens();
        await tokenManager.clearUserData();
        
        // Trigger global logout event using React Native event system
        try {
          const { DeviceEventEmitter } = require('react-native');
          DeviceEventEmitter.emit('auth:logout', { reason: 'Token refresh failed' });
        } catch (eventError) {
          console.warn('Could not emit auth:logout event:', eventError);
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

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/google', { idToken });

      console.log('Google login response:', JSON.stringify(response.data, null, 2));

      // Handle backend response structure: { message, user, tokens }
      if (response.data.user && response.data.tokens) {
        const { accessToken, refreshToken } = response.data.tokens;

        // Validate tokens before proceeding
        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in Google login response:', { accessToken, refreshToken });
          throw new Error('Invalid Google login response: missing tokens');
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
      throw new Error(response.data.error || response.data.message || 'Google login failed');
    } catch (error: any) {
      // Handle specific HTTP status codes
      if (error.response?.status === 401) {
        throw new Error('Google authentication failed. Please try again.');
      } else if (error.response?.status === 400) {
        const message = error.response.data?.message || error.response.data?.error;
        throw new Error(message || 'Invalid Google token.');
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
    const response = await apiClient.get(`/conversations/${conversationId}`);
    
    // Handle different response formats from backend
    if (response.data && response.data.conversation) {
      // Backend returns: { message: string, conversation: Conversation }
      return response.data.conversation;
    } else if (response.data && response.data.success && response.data.data) {
      // Legacy format: { success: true, data: Conversation }
      return response.data.data;
    } else {
      throw new Error(response.data?.error || 'Failed to get conversation');
    }
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

    try {
      const response = await apiClient.get(
        `/conversations/${conversationId}/messages?${params.toString()}`
      );

      console.log(`API: Response status: ${response.status}, data keys:`, Object.keys(response.data || {}));

      // Handle different response formats from backend
      if (response.data && response.data.messages !== undefined) {
        // Backend returns: { message: string, messages: [], pagination: {} }
        console.log(`API: Retrieved ${response.data.messages.length} messages from backend`);
        return response.data.messages || [];
      } else if (response.data && response.data.success && response.data.data) {
        // Legacy format: { success: true, data: [] }
        console.log(`API: Retrieved ${response.data.data.length} messages from backend (legacy format)`);
        return response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        // Direct array response
        console.log(`API: Retrieved ${response.data.length} messages from backend (direct array)`);
        return response.data;
      } else {
        // No messages found - return empty array instead of throwing error
        console.log('API: No messages found - returning empty array');
        return [];
      }
    } catch (error: any) {
      console.error('API: Error fetching messages:', error);
      console.error('API: Error response:', error.response?.data);
      console.error('API: Error status:', error.response?.status);
      
      // Handle authentication errors gracefully
      if (error?.response?.status === 401) {
        console.log('API: Authentication required - returning empty messages list');
        return [];
      }
      
      // If it's a 404 or empty response, return empty array instead of throwing
      if (error?.response?.status === 404 || error?.response?.status === 200) {
        console.log('API: No messages endpoint or empty response - returning empty array');
        return [];
      }
      
      // For other errors, log and return empty array instead of throwing
      console.warn('API: Unexpected error fetching messages, returning empty array:', error?.message);
      return [];
    }
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

// Teams API
export const teamsAPI = {
  async getTeams(): Promise<Team[]> {
    try {
      const response = await apiClient.get('/teams');
      // Handle response format: { teams: [], count: number }
      if (response.data.teams) {
        return response.data.teams;
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      throw error;
    }
  },
};

// Helper function to get effective teamId
async function getEffectiveTeamId(teamId?: string): Promise<string | null> {
  if (teamId) return teamId;

  const teams = await teamsAPI.getTeams();
  if (teams.length === 0) {
    console.warn('No teams found for user');
    return null;
  }

  console.log('Using first team:', teams[0].id);
  return teams[0].id;
}

// Products API
export const productsAPI = {
  async getProducts(teamId?: string): Promise<any[]> {
    try {
      const effectiveTeamId = await getEffectiveTeamId(teamId);
      if (!effectiveTeamId) return [];

      const response = await apiClient.get('/products', {
        params: { teamId: effectiveTeamId }
      });

      return Array.isArray(response.data) ? response.data : response.data.products || [];
    } catch (error: any) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async deleteProduct(productId: string, teamId?: string): Promise<void> {
    const effectiveTeamId = await getEffectiveTeamId(teamId);
    if (!effectiveTeamId) throw new Error('No team available');

    await apiClient.delete(`/products/${productId}`, {
      params: { teamId: effectiveTeamId }
    });
  },
};

// Campaigns API
export const campaignsAPI = {
  async getCampaigns(teamId?: string): Promise<any[]> {
    try {
      const effectiveTeamId = await getEffectiveTeamId(teamId);
      if (!effectiveTeamId) return [];

      const response = await apiClient.get('/campaigns', {
        params: { teamId: effectiveTeamId }
      });

      return Array.isArray(response.data) ? response.data : response.data.campaigns || [];
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  },

  async updateCampaignStatus(campaignId: string, status: string, teamId?: string): Promise<void> {
    const effectiveTeamId = await getEffectiveTeamId(teamId);
    if (!effectiveTeamId) throw new Error('No team available');

    await apiClient.patch(`/campaigns/${campaignId}/status`, {
      status,
      teamId: effectiveTeamId
    });
  },
};

// ICPs API
export const icpsAPI = {
  async getICPs(teamId?: string): Promise<any[]> {
    try {
      const effectiveTeamId = await getEffectiveTeamId(teamId);
      if (!effectiveTeamId) return [];

      const response = await apiClient.get('/icps', {
        params: { teamId: effectiveTeamId }
      });

      return Array.isArray(response.data) ? response.data : response.data.icps || [];
    } catch (error: any) {
      console.error('Error fetching ICPs:', error);
      throw error;
    }
  },

  async deleteICP(icpId: string, teamId?: string): Promise<void> {
    const effectiveTeamId = await getEffectiveTeamId(teamId);
    if (!effectiveTeamId) throw new Error('No team available');

    await apiClient.delete(`/icps/${icpId}`, {
      params: { teamId: effectiveTeamId }
    });
  },
};

// Content Library API
export const contentLibraryAPI = {
  async getContent(teamId?: string): Promise<any[]> {
    try {
      const effectiveTeamId = await getEffectiveTeamId(teamId);
      if (!effectiveTeamId) return [];

      const response = await apiClient.get('/content-library', {
        params: { teamId: effectiveTeamId }
      });

      return Array.isArray(response.data) ? response.data : response.data.content || [];
    } catch (error: any) {
      console.error('Error fetching content library:', error);
      throw error;
    }
  },

  async deleteContent(contentId: string, teamId?: string): Promise<void> {
    const effectiveTeamId = await getEffectiveTeamId(teamId);
    if (!effectiveTeamId) throw new Error('No team available');

    await apiClient.delete(`/content-library/${contentId}`, {
      params: { teamId: effectiveTeamId }
    });
  },
};

// Leads API
export const leadsAPI = {
  async getLeads(teamId?: string): Promise<Lead[]> {
    try {
      const effectiveTeamId = await getEffectiveTeamId(teamId);
      if (!effectiveTeamId) return [];

      const response = await apiClient.get('/leads', {
        params: { teamId: effectiveTeamId }
      });

      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data.leads) {
        return response.data.leads;
      } else if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  },

  async updateLeadStatus(leadId: string, status: LeadStatus, teamId?: string): Promise<void> {
    const effectiveTeamId = await getEffectiveTeamId(teamId);
    if (!effectiveTeamId) throw new Error('No team available');

    await apiClient.put(`/leads/${leadId}/status`, { status, teamId: effectiveTeamId });
  },

  async claimLead(leadId: string, teamId?: string): Promise<Lead> {
    const effectiveTeamId = await getEffectiveTeamId(teamId);
    if (!effectiveTeamId) throw new Error('No team available');

    const response = await apiClient.post(`/leads/${leadId}/claim`, { teamId: effectiveTeamId });
    return response.data;
  },

  async addActivity(
    leadId: string,
    activity: Omit<LeadActivity, 'id' | 'leadId' | 'userId' | 'createdAt'>,
    teamId?: string
  ): Promise<LeadActivity> {
    const effectiveTeamId = await getEffectiveTeamId(teamId);
    if (!effectiveTeamId) throw new Error('No team available');

    const response = await apiClient.post(`/leads/${leadId}/activities`, { ...activity, teamId: effectiveTeamId });
    return response.data;
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
  teams: teamsAPI,
  products: productsAPI,
  campaigns: campaignsAPI,
  icps: icpsAPI,
  contentLibrary: contentLibraryAPI,
  leads: leadsAPI,
  health: healthAPI,
};
