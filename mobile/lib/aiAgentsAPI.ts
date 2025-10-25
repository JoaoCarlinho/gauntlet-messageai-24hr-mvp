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

// Response interceptor for error handling
aiAgentsClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, handled by main api.ts
      console.error('Unauthorized AI agent request');
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
   */
  async startConversation(): Promise<StartConversationResponse> {
    const response = await aiAgentsClient.post<StartConversationResponse>(
      '/ai/product-definer/start'
    );
    return response.data;
  },

  /**
   * Send a message to the product definer agent (SSE streaming)
   * POST /ai/product-definer/message
   * Returns EventSource for SSE streaming
   */
  createMessageStream(
    conversationId: string,
    message: string
  ): EventSource {
    const token = tokenManager.getAccessToken();
    const url = `${API_BASE_URL}/api/v1/ai/product-definer/message`;

    // Create EventSource with auth token
    const eventSource = new EventSource(url, {
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
  ): EventSource {
    const token = tokenManager.getAccessToken();
    const url = `${API_BASE_URL}/api/v1/ai/campaign-advisor/message`;

    const eventSource = new EventSource(url, {
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
  createMessageStream(sessionId: string, message: string): EventSource {
    const url = `${API_BASE_URL}/api/v1/public/discovery/message`;

    const eventSource = new EventSource(url, {
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
// Combined Export
// ============================================================================

export const aiAgentsAPI = {
  productDefiner: productDefinerAPI,
  campaignAdvisor: campaignAdvisorAPI,
  contentGenerator: contentGeneratorAPI,
  performanceAnalyzer: performanceAnalyzerAPI,
  discoveryBot: discoveryBotAPI,
};

export default aiAgentsAPI;
