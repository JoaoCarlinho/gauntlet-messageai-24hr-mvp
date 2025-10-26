/**
 * AI Agents API Client
 *
 * API client functions for all 20 AI agent endpoints with proper typing
 */

import axios, { AxiosInstance } from 'axios';
import { tokenManager } from './api';
import {
  // Request types
  StartConversationRequest,
  SendMessageRequest,
  CompleteConversationRequest,
  GenerateAdCopyRequest,
  GenerateSocialPostsRequest,
  GenerateLandingPageRequest,
  GenerateImagePromptsRequest,
  RegenerateContentRequest,
  AnalyzeCampaignRequest,
  GetOptimizationRecommendationsRequest,
  CompareCampaignsRequest,
  GenerateExecutiveSummaryRequest,
  StartDiscoverySessionRequest,
  SendDiscoveryMessageRequest,
  CompleteDiscoverySessionRequest,
  // Response types
  StartConversationResponse,
  CompleteConversationResponse,
  ProductDefinerSummary,
  CampaignAdvisorSummary,
  AdCopyResult,
  SocialPostsResult,
  LandingPageResult,
  ImagePromptsResult,
  RegeneratedContent,
  PerformanceAnalysis,
  OptimizationRecommendations,
  CampaignComparison,
  ExecutiveSummary,
  StartDiscoverySessionResponse,
  CompleteDiscoverySessionResponse,
  DiscoverySessionSummary,
} from '../types/aiAgents';

// Environment configuration
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://gauntlet-messageai-24hr-mvp-production.up.railway.app';

// Create Axios instance for AI agents
const aiAgentsClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 60000, // 60 seconds for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
aiAgentsClient.interceptors.request.use(
  async (config) => {
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
aiAgentsClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (!refreshToken) {
          console.log('No refresh token available for AI agent request');
          await tokenManager.clearTokens();
          await tokenManager.clearUserData();

          // Trigger logout event
          try {
            const { DeviceEventEmitter } = require('react-native');
            DeviceEventEmitter.emit('auth:logout', { reason: 'No refresh token available' });
          } catch (eventError) {
            console.warn('Could not emit auth:logout event:', eventError);
          }

          return Promise.reject(error);
        }

        console.log('Refreshing token for AI agent request...');

        // Refresh the token
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        if (response.data.accessToken) {
          const { accessToken } = response.data;

          // Update the access token
          await tokenManager.setTokens(accessToken, null);

          console.log('Token refreshed successfully for AI agent request');

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return aiAgentsClient(originalRequest);
        } else {
          console.error('Invalid refresh response:', response.data);
          throw new Error('Invalid refresh response: missing access token');
        }
      } catch (refreshError) {
        console.error('Token refresh failed for AI agent request:', refreshError);

        // Clear tokens and trigger logout
        await tokenManager.clearTokens();
        await tokenManager.clearUserData();

        try {
          const { DeviceEventEmitter } = require('react-native');
          DeviceEventEmitter.emit('auth:logout', { reason: 'Token refresh failed' });
        } catch (eventError) {
          console.warn('Could not emit auth:logout event:', eventError);
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Product Definer API
// ============================================================================

export const productDefinerAPI = {
  /**
   * Start a new product definer conversation
   * POST /ai/product-definer/start
   * @param params - Optional parameters for mode selection
   * @param params.mode - Conversation mode: 'new_product' or 'new_icp'
   * @param params.productId - Product ID (required if mode is 'new_icp')
   */
  async startConversation(params?: {
    mode?: 'new_product' | 'new_icp';
    productId?: string;
  }): Promise<StartConversationResponse> {
    const response = await aiAgentsClient.post<StartConversationResponse>(
      '/ai/product-definer/start',
      params || {}
    );
    return response.data;
  },

  /**
   * Send a message to the product definer agent (SSE streaming)
   * POST /ai/product-definer/message
   * Returns an object with response stream reader and abort controller
   */
  async sendMessage(
    conversationId: string,
    message: string,
    onDelta: (text: string) => void,
    onComplete: (fullText: string) => void,
    onError: (error: string) => void
  ): Promise<{ abort: () => void }> {
    const token = await tokenManager.getAccessToken();
    if (!token) {
      onError('No access token available');
      return { abort: () => {} };
    }

    const url = `${API_BASE_URL}/api/v1/ai/product-definer/message`;

    // Track the current XHR instance for abort support
    let currentXhr: XMLHttpRequest | null = null;

    const makeRequest = (authToken: string) => {
      return new Promise<void>((resolve, reject) => {
        // Create a NEW XMLHttpRequest for each request (important for retries)
        const xhr = new XMLHttpRequest();
        currentXhr = xhr;  // Store reference for abort
        let buffer = '';
        let accumulatedText = '';  // Track accumulated text locally

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.setRequestHeader('Accept', 'text/event-stream');

        // Track if stream has completed via SSE event
        let streamCompleted = false;

        // Handle streaming response
        xhr.onprogress = () => {
          try {
            // Get the response text so far
            const responseText = xhr.responseText;

            // Only process new data
            const newData = responseText.substring(buffer.length);
            buffer = responseText;

            console.log('📥 XHR progress - new data length:', newData.length);

            // Split by double newline to get complete SSE messages
            const lines = newData.split('\n');

            for (const line of lines) {
              if (!line.trim()) continue;

              // Parse SSE format: "event: delta" or "data: {...}"
              if (line.startsWith('event: ')) {
                const eventType = line.substring(7).trim();
                console.log('📨 SSE event type:', eventType);
                // Event type line - we'll process it with the next data line
                continue;
              } else if (line.startsWith('data: ')) {
                const data = line.substring(6);

                try {
                  const parsed = JSON.parse(data);
                  console.log('📊 SSE data parsed:', { type: parsed.type, hasData: !!parsed.delta });

                  if (parsed.type === 'content' && parsed.delta) {
                    console.log('✅ Calling onDelta with chunk length:', parsed.delta.length);
                    accumulatedText += parsed.delta;  // Accumulate locally
                    console.log('📚 Accumulated text length:', accumulatedText.length);
                    onDelta(parsed.delta);
                  } else if (parsed.type === 'complete') {
                    console.log('🏁 Stream complete event received, accumulated length:', accumulatedText.length);
                    streamCompleted = true;
                    onComplete(accumulatedText);  // Pass accumulated text
                  } else if (parsed.type === 'error') {
                    console.error('❌ Stream error received:', parsed.error);
                    onError(parsed.error || 'Unknown error');
                  }
                } catch (parseError) {
                  // Skip unparseable data (comments, etc.)
                  console.log('⏭️ Skipping unparseable SSE data:', data);
                }
              }
            }
          } catch (error: any) {
            console.error('Error processing SSE stream:', error);
          }
        };

        xhr.onload = () => {
          console.log('🔚 XHR onload called, status:', xhr.status, 'streamCompleted:', streamCompleted);

          if (xhr.status === 200) {
            // Only call onComplete if we haven't already via SSE event
            if (!streamCompleted) {
              console.log('⚠️ Stream ended without complete event, calling onComplete with accumulated text:', accumulatedText.length);
              onComplete(accumulatedText);  // Pass accumulated text
            }
            resolve();
          } else if (xhr.status === 401) {
            reject(new Error('Unauthorized'));
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error'));
        };

        xhr.send(JSON.stringify({ conversationId, message }));
      });
    };

    try {
      await makeRequest(token);
    } catch (error: any) {
      // Handle 401 - token expired, try to refresh
      if (error.message === 'Unauthorized') {
        console.log('Token expired for message stream, attempting refresh...');

        const refreshToken = await tokenManager.getRefreshToken();
        if (!refreshToken) {
          onError('No refresh token available');
          return { abort: () => currentXhr?.abort() };
        }

        try {
          // Refresh the token
          const refreshResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          if (refreshResponse.data.accessToken) {
            const newToken = refreshResponse.data.accessToken;
            await tokenManager.setTokens(newToken, null);
            console.log('Token refreshed successfully for message stream');

            // Retry with new token - will create a NEW xhr instance
            await makeRequest(newToken);
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (refreshError: any) {
          console.error('Token refresh failed:', refreshError);
          onError(refreshError.message || 'Token refresh failed');
        }
      } else {
        console.error('Error creating message stream:', error);
        onError(error.message || 'Failed to send message');
      }
    }

    return {
      abort: () => currentXhr?.abort(),
    };
  },

  // Legacy method - keeping for compatibility but not used
  _oldSendMessage(
    conversationId: string,
    message: string,
    onDelta: (text: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<{ abort: () => void }> {
    // This method uses fetch with ReadableStream which doesn't work in React Native
    throw new Error('This method is not supported in React Native - use XMLHttpRequest version');
  },


  /**
   * Complete a product definer conversation
   * POST /ai/product-definer/complete
   */
  async completeConversation(
    conversationId: string
  ): Promise<CompleteConversationResponse> {
    const response = await aiAgentsClient.post<CompleteConversationResponse>(
      '/ai/product-definer/complete',
      { conversationId }
    );
    return response.data;
  },

  /**
   * Get product definer conversation status
   * GET /ai/product-definer/status/:conversationId
   */
  async getStatus(conversationId: string): Promise<ProductDefinerSummary> {
    const response = await aiAgentsClient.get<ProductDefinerSummary>(
      `/ai/product-definer/status/${conversationId}`
    );
    return response.data;
  },
};

// ============================================================================
// Campaign Advisor API
// ============================================================================

export const campaignAdvisorAPI = {
  /**
   * Start a new campaign advisor conversation
   * POST /ai/campaign-advisor/start
   */
  async startConversation(
    productId: string,
    icpId: string
  ): Promise<StartConversationResponse> {
    const response = await aiAgentsClient.post<StartConversationResponse>(
      '/ai/campaign-advisor/start',
      { productId, icpId }
    );
    return response.data;
  },

  /**
   * Send a message to the campaign advisor agent (SSE streaming)
   * POST /ai/campaign-advisor/message
   * Returns EventSource for SSE streaming
   */
  createMessageStream(
    conversationId: string,
    message: string
  ): RNEventSource {
    const token = tokenManager.getAccessToken();
    const url = `${API_BASE_URL}/api/v1/ai/campaign-advisor/message`;

    const eventSource = new RNEventSource(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, message }),
      method: 'POST',
    } as any);

    return eventSource;
  },

  /**
   * Complete a campaign advisor conversation
   * POST /ai/campaign-advisor/complete
   */
  async completeConversation(
    conversationId: string
  ): Promise<CompleteConversationResponse> {
    const response = await aiAgentsClient.post<CompleteConversationResponse>(
      '/ai/campaign-advisor/complete',
      { conversationId }
    );
    return response.data;
  },

  /**
   * Get campaign advisor conversation status
   * GET /ai/campaign-advisor/status/:conversationId
   */
  async getStatus(conversationId: string): Promise<CampaignAdvisorSummary> {
    const response = await aiAgentsClient.get<CampaignAdvisorSummary>(
      `/ai/campaign-advisor/status/${conversationId}`
    );
    return response.data;
  },
};

// ============================================================================
// Content Generator API
// ============================================================================

export const contentGeneratorAPI = {
  /**
   * Generate ad copy for a platform
   * POST /ai/content-generator/ad-copy
   */
  async generateAdCopy(
    request: GenerateAdCopyRequest
  ): Promise<AdCopyResult> {
    const response = await aiAgentsClient.post<AdCopyResult>(
      '/ai/content-generator/ad-copy',
      request
    );
    return response.data;
  },

  /**
   * Generate social media posts
   * POST /ai/content-generator/social-posts
   */
  async generateSocialPosts(
    request: GenerateSocialPostsRequest
  ): Promise<SocialPostsResult> {
    const response = await aiAgentsClient.post<SocialPostsResult>(
      '/ai/content-generator/social-posts',
      request
    );
    return response.data;
  },

  /**
   * Generate landing page copy
   * POST /ai/content-generator/landing-page
   */
  async generateLandingPage(
    request: GenerateLandingPageRequest
  ): Promise<LandingPageResult> {
    const response = await aiAgentsClient.post<LandingPageResult>(
      '/ai/content-generator/landing-page',
      request
    );
    return response.data;
  },

  /**
   * Generate DALL-E image prompts
   * POST /ai/content-generator/image-prompts
   */
  async generateImagePrompts(
    request: GenerateImagePromptsRequest
  ): Promise<ImagePromptsResult> {
    const response = await aiAgentsClient.post<ImagePromptsResult>(
      '/ai/content-generator/image-prompts',
      request
    );
    return response.data;
  },

  /**
   * Regenerate content with modifications
   * POST /ai/content-generator/regenerate
   */
  async regenerateContent(
    request: RegenerateContentRequest
  ): Promise<RegeneratedContent> {
    const response = await aiAgentsClient.post<RegeneratedContent>(
      '/ai/content-generator/regenerate',
      request
    );
    return response.data;
  },
};

// ============================================================================
// Performance Analyzer API
// ============================================================================

export const performanceAnalyzerAPI = {
  /**
   * Analyze campaign performance
   * POST /ai/performance-analyzer/analyze
   */
  async analyzeCampaignPerformance(
    request: AnalyzeCampaignRequest
  ): Promise<PerformanceAnalysis> {
    const response = await aiAgentsClient.post<PerformanceAnalysis>(
      '/ai/performance-analyzer/analyze',
      request
    );
    return response.data;
  },

  /**
   * Get optimization recommendations
   * POST /ai/performance-analyzer/optimize
   */
  async getOptimizationRecommendations(
    request: GetOptimizationRecommendationsRequest
  ): Promise<OptimizationRecommendations> {
    const response = await aiAgentsClient.post<OptimizationRecommendations>(
      '/ai/performance-analyzer/optimize',
      request
    );
    return response.data;
  },

  /**
   * Compare multiple campaigns
   * POST /ai/performance-analyzer/compare
   */
  async compareMultipleCampaigns(
    request: CompareCampaignsRequest
  ): Promise<CampaignComparison> {
    const response = await aiAgentsClient.post<CampaignComparison>(
      '/ai/performance-analyzer/compare',
      request
    );
    return response.data;
  },

  /**
   * Generate executive summary
   * POST /ai/performance-analyzer/summary
   */
  async getExecutiveSummary(
    request: GenerateExecutiveSummaryRequest
  ): Promise<ExecutiveSummary> {
    const response = await aiAgentsClient.post<ExecutiveSummary>(
      '/ai/performance-analyzer/summary',
      request
    );
    return response.data;
  },
};

// ============================================================================
// Discovery Bot API (Public - No Authentication Required)
// ============================================================================

// Create separate client for public endpoints (no auth)
const publicClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const discoveryBotAPI = {
  /**
   * Start a public discovery session (NO AUTH)
   * POST /public/discovery/start
   */
  async startSession(
    request: StartDiscoverySessionRequest
  ): Promise<StartDiscoverySessionResponse> {
    const response = await publicClient.post<StartDiscoverySessionResponse>(
      '/public/discovery/start',
      request
    );
    return response.data;
  },

  /**
   * Send a message in discovery session (NO AUTH, SSE streaming)
   * POST /public/discovery/message
   * Returns EventSource for SSE streaming
   */
  createMessageStream(sessionId: string, message: string): RNEventSource {
    const url = `${API_BASE_URL}/api/v1/public/discovery/message`;

    const eventSource = new RNEventSource(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, message }),
      method: 'POST',
    } as any);

    return eventSource;
  },

  /**
   * Complete a discovery session (NO AUTH)
   * POST /public/discovery/complete
   */
  async completeSession(
    request: CompleteDiscoverySessionRequest
  ): Promise<CompleteDiscoverySessionResponse> {
    const response = await publicClient.post<CompleteDiscoverySessionResponse>(
      '/public/discovery/complete',
      request
    );
    return response.data;
  },
};

// ============================================================================
// AI Conversation Management API
// ============================================================================

export const conversationManagementAPI = {
  /**
   * List all AI conversations for the authenticated user
   * GET /ai/conversations
   * @param filters - Optional filters (agentType, status, limit)
   */
  async listConversations(filters?: {
    agentType?: string;
    status?: 'active' | 'completed' | 'archived';
    limit?: number;
  }): Promise<{
    conversations: Array<{
      id: string;
      agentType: string;
      status: string;
      contextId: string | null;
      metadata: Record<string, any>;
      messageCount: number;
      lastMessage: {
        role: string;
        content: string;
        createdAt: string;
      } | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.agentType) params.append('agentType', filters.agentType);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await aiAgentsClient.get(
      `/ai/conversations?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get a specific conversation with full message history
   * GET /ai/conversations/:conversationId
   */
  async getConversation(conversationId: string): Promise<{
    id: string;
    agentType: string;
    status: string;
    contextId: string | null;
    metadata: Record<string, any>;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      metadata?: Record<string, any>;
      createdAt: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const response = await aiAgentsClient.get(
      `/ai/conversations/${conversationId}`
    );
    return response.data;
  },

  /**
   * Delete (archive) a conversation
   * DELETE /ai/conversations/:conversationId
   */
  async deleteConversation(conversationId: string): Promise<{
    message: string;
    conversationId: string;
  }> {
    const response = await aiAgentsClient.delete(
      `/ai/conversations/${conversationId}`
    );
    return response.data;
  },
};

// ============================================================================
// Combined Export
// ============================================================================

export const aiAgentsAPI = {
  productDefiner: productDefinerAPI,
  campaignAdvisor: campaignAdvisorAPI,
  contentGenerator: contentGeneratorAPI,
  performanceAnalyzer: performanceAnalyzerAPI,
  discoveryBot: discoveryBotAPI,
  conversations: conversationManagementAPI,
};

export default aiAgentsAPI;
