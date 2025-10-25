/**
 * AI Agents Type Definitions
 *
 * TypeScript interfaces for all AI agent endpoints and data structures
 */

// ============================================================================
// Agent Types & Enums
// ============================================================================

export type AgentType =
  | 'product_definer'
  | 'campaign_advisor'
  | 'content_generator'
  | 'discovery_bot'
  | 'performance_analyzer';

export type ConversationStatus = 'active' | 'completed' | 'archived';

export type MessageRole = 'user' | 'assistant' | 'system';

export type Platform =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'x'
  | 'google';

export type ContentType =
  | 'ad_copy'
  | 'social_post'
  | 'landing_page'
  | 'image_prompt';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'converted';

// ============================================================================
// Conversation & Message Types
// ============================================================================

export interface AgentConversation {
  id: string;
  userId: string;
  teamId: string;
  agentType: AgentType;
  contextId?: string; // Related product/campaign/lead ID
  status: ConversationStatus;
  messages: AgentMessage[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: MessageMetadata;
  createdAt: Date;
}

export interface MessageMetadata {
  toolCalls?: ToolCall[];
  functionResults?: Record<string, any>;
  [key: string]: any;
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

// ============================================================================
// Product Definer Types
// ============================================================================

export interface ProductData {
  name: string;
  description: string;
  features: string[];
  pricing: {
    model: string;
    amount?: number;
    currency?: string;
  };
  usps: string[];
  targetMarket?: string;
  category?: string;
}

export interface ICPData {
  name: string;
  demographics: {
    ageRange?: string;
    gender?: string;
    location?: string;
    income?: string;
    education?: string;
    jobTitle?: string;
  };
  psychographics: {
    interests?: string[];
    values?: string[];
    lifestyle?: string;
  };
  painPoints: string[];
  goals: string[];
  preferredChannels: Platform[];
  buyingBehavior?: string;
}

export interface ProductDefinerSummary {
  conversationId: string;
  status: ConversationStatus;
  productSaved: boolean;
  icpSaved: boolean;
  productId?: string;
  icpId?: string;
  product?: ProductData;
  icp?: ICPData;
}

// ============================================================================
// Campaign Advisor Types
// ============================================================================

export interface CampaignData {
  name: string;
  description: string;
  platforms: Platform[];
  budget: number;
  startDate: Date;
  endDate?: Date;
  status: CampaignStatus;
  targetingStrategy: Record<string, any>;
}

export interface CampaignStrategy {
  recommendedPlatforms: Platform[];
  budgetAllocation: Record<Platform, number>;
  targetAudience: string;
  campaignObjective: string;
  keyMessages: string[];
  timeline: {
    startDate: Date;
    endDate?: Date;
    phases?: string[];
  };
}

export interface CampaignAdvisorSummary {
  conversationId: string;
  status: ConversationStatus;
  campaignSaved: boolean;
  campaignId?: string;
  campaign?: CampaignData;
  strategy?: CampaignStrategy;
}

// ============================================================================
// Content Generator Types
// ============================================================================

export interface AdCopyVariation {
  headline: string;
  body: string;
  cta: string;
  characterCounts: {
    headline: number;
    body: number;
    cta: number;
  };
}

export interface AdCopyResult {
  productId: string;
  platform: Platform;
  variations: AdCopyVariation[];
  platformLimits: {
    headline: number;
    body: number;
    cta: number;
  };
  savedContentId?: string;
}

export interface SocialPost {
  text: string;
  hashtags: string[];
  characterCount: number;
}

export interface SocialPostsResult {
  productId: string;
  platform: Platform;
  posts: SocialPost[];
  platformLimit: number;
  savedContentId?: string;
}

export interface LandingPageSection {
  section: string;
  content: string;
}

export interface LandingPageResult {
  productId: string;
  sections: LandingPageSection[];
  savedContentId?: string;
}

export interface ImagePrompt {
  prompt: string;
  style: string;
  aspectRatio: string;
}

export interface ImagePromptsResult {
  productId: string;
  concept: string;
  prompts: ImagePrompt[];
  savedContentId?: string;
}

export interface RegeneratedContent {
  originalContentId: string;
  instruction: string;
  result: any; // Type depends on content type
  savedContentId?: string;
}

// ============================================================================
// Performance Analyzer Types
// ============================================================================

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface PerformanceMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number; // Click-through rate (%)
  cpc: number; // Cost per click
  cpa: number; // Cost per acquisition
  roas: number; // Return on ad spend
}

export interface Benchmark {
  min?: number;
  avg: number;
  good?: number;
  max?: number;
}

export interface PlatformBenchmarks {
  ctr: Benchmark;
  cpc: Benchmark;
  conversionRate: Benchmark;
}

export interface TrendData {
  ctrChange: number;
  cpcChange: number;
  conversionChange: number;
  spendChange: number;
}

export interface PerformanceAnalysis {
  campaignId: string;
  campaignName: string;
  platforms: Platform[];
  timeRange?: TimeRange;
  metrics: PerformanceMetrics;
  trends: TrendData;
  benchmarks: PlatformBenchmarks;
  insights: string;
}

export interface OptimizationRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  actionItems: string[];
}

export interface OptimizationRecommendations {
  campaignId: string;
  campaignName: string;
  redFlags: string[];
  recommendations: OptimizationRecommendation[];
  predictedOutcome: string;
}

export interface CampaignPerformanceData {
  campaignId: string;
  campaignName: string;
  metrics: PerformanceMetrics;
  vsAverage: {
    ctr: number; // Percentage difference
    cpc: number;
    roas: number;
  };
  rank: number;
}

export interface CampaignComparison {
  comparison: CampaignPerformanceData[];
  averages: PerformanceMetrics;
  insights: string;
}

export interface ExecutiveSummary {
  totalCampaigns: number;
  timeRange?: TimeRange;
  overallMetrics: PerformanceMetrics;
  summary: string; // AI-generated summary with key takeaways
}

// ============================================================================
// Discovery Bot Types (Public API)
// ============================================================================

export interface DiscoverySessionData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
}

export interface DiscoverySession {
  sessionId: string;
  productId: string;
  teamId: string;
  leadData: DiscoverySessionData;
  messages: AgentMessage[];
  status: 'active' | 'completed';
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoverySessionSummary {
  sessionId: string;
  status: 'active' | 'completed';
  score?: number;
  summary?: string;
  leadId?: string;
}

// ============================================================================
// Lead Types
// ============================================================================

export interface Lead {
  id: string;
  teamId: string;
  campaignId?: string;
  discoverySessionId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status: LeadStatus;
  score: number;
  source: string;
  claimedBy?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  activityType: string;
  description: string;
  createdAt: Date;
}

// ============================================================================
// Campaign Types
// ============================================================================

export interface Campaign {
  id: string;
  teamId: string;
  productId: string;
  icpId?: string;
  name: string;
  description?: string;
  platforms: Platform[];
  budget: number;
  startDate: Date;
  endDate?: Date;
  status: CampaignStatus;
  targetingStrategy: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignMetric {
  id: string;
  campaignId: string;
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AdCreative {
  id: string;
  campaignId: string;
  platform: Platform;
  type: 'image' | 'video' | 'carousel' | 'text';
  headline: string;
  body: string;
  cta: string;
  mediaUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// Product & ICP Types
// ============================================================================

export interface Product {
  id: string;
  teamId: string;
  name: string;
  description: string;
  features: string[];
  pricing: {
    model: string;
    amount?: number;
    currency?: string;
  };
  usps: string[];
  targetMarket?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICP {
  id: string;
  teamId: string;
  productId?: string;
  name: string;
  demographics: {
    ageRange?: string;
    gender?: string;
    location?: string;
    income?: string;
    education?: string;
    jobTitle?: string;
  };
  psychographics: {
    interests?: string[];
    values?: string[];
    lifestyle?: string;
  };
  painPoints: string[];
  goals: string[];
  preferredChannels: Platform[];
  buyingBehavior?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Content Library Types
// ============================================================================

export interface ContentLibraryItem {
  id: string;
  teamId: string;
  productId?: string;
  campaignId?: string;
  contentType: ContentType;
  platform?: Platform;
  title: string;
  content: any; // JSON content varies by type
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SSE (Server-Sent Events) Types
// ============================================================================

export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
}

export interface SSEMessageData {
  type: 'text' | 'tool_call' | 'complete' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}

export interface SSEErrorData {
  error: string;
  code?: string;
}

// ============================================================================
// API Request Types
// ============================================================================

export interface StartConversationRequest {
  // No body required for Product Definer
  productId?: string; // Required for Campaign Advisor
  icpId?: string; // Required for Campaign Advisor
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
}

export interface CompleteConversationRequest {
  conversationId: string;
}

export interface GenerateAdCopyRequest {
  productId: string;
  platform: Platform;
  variations?: number;
  saveToLibrary?: boolean;
}

export interface GenerateSocialPostsRequest {
  productId: string;
  platform: Platform;
  count?: number;
  saveToLibrary?: boolean;
}

export interface GenerateLandingPageRequest {
  productId: string;
  saveToLibrary?: boolean;
}

export interface GenerateImagePromptsRequest {
  productId: string;
  concept: string;
  count?: number;
  saveToLibrary?: boolean;
}

export interface RegenerateContentRequest {
  contentId: string;
  instruction: string;
  saveToLibrary?: boolean;
}

export interface AnalyzeCampaignRequest {
  campaignId: string;
  timeRange?: TimeRange;
}

export interface GetOptimizationRecommendationsRequest {
  campaignId: string;
}

export interface CompareCampaignsRequest {
  campaignIds: string[]; // 2-5 campaigns
}

export interface GenerateExecutiveSummaryRequest {
  timeRange?: TimeRange;
}

// Discovery Bot (Public API)
export interface StartDiscoverySessionRequest {
  productId: string;
  teamId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
}

export interface SendDiscoveryMessageRequest {
  sessionId: string;
  message: string;
}

export interface CompleteDiscoverySessionRequest {
  sessionId: string;
  teamId: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface StartConversationResponse {
  conversationId: string;
  message?: string;
}

export interface CompleteConversationResponse {
  conversationId: string;
  status: ConversationStatus;
  productSaved?: boolean;
  icpSaved?: boolean;
  productId?: string;
  icpId?: string;
  campaignSaved?: boolean;
  campaignId?: string;
}

export interface StartDiscoverySessionResponse {
  sessionId: string;
  message: string;
}

export interface CompleteDiscoverySessionResponse {
  sessionId: string;
  status: 'active' | 'completed';
  score?: number;
  summary?: string;
  message?: string;
}

// ============================================================================
// Socket.io Event Types for AI Agents
// ============================================================================

export interface NewLeadEvent {
  lead: Lead;
  discoverySession?: DiscoverySession;
}

export interface LeadQualifiedEvent {
  leadId: string;
  score: number;
  status: LeadStatus;
}

export interface CampaignCreatedEvent {
  campaign: Campaign;
  conversationId: string;
}

export interface ContentGeneratedEvent {
  contentId: string;
  contentType: ContentType;
  productId: string;
}

export interface AnalysisCompleteEvent {
  campaignId: string;
  analysisType: 'performance' | 'optimization' | 'comparison' | 'summary';
}

// ============================================================================
// Error Types
// ============================================================================

export interface AIAgentError {
  message: string;
  code?: string;
  statusCode?: number;
  conversationId?: string;
  agentType?: AgentType;
}

// ============================================================================
// Utility Types
// ============================================================================

export type StreamingState = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export interface StreamingProgress {
  state: StreamingState;
  accumulatedText: string;
  error?: string;
}

// Character limits by platform
export const PLATFORM_LIMITS: Record<Platform, {
  headline: number;
  body: number;
  cta: number;
  socialPost: number;
}> = {
  facebook: {
    headline: 40,
    body: 125,
    cta: 30,
    socialPost: 63206,
  },
  instagram: {
    headline: 30,
    body: 125,
    cta: 30,
    socialPost: 2200,
  },
  linkedin: {
    headline: 70,
    body: 150,
    cta: 30,
    socialPost: 3000,
  },
  tiktok: {
    headline: 100,
    body: 100,
    cta: 20,
    socialPost: 2200,
  },
  x: {
    headline: 50,
    body: 280,
    cta: 20,
    socialPost: 280,
  },
  google: {
    headline: 30,
    body: 90,
    cta: 30,
    socialPost: 0, // Not applicable
  },
};
