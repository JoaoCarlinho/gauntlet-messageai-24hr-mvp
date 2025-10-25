/**
 * AI Agents Store - Barrel Export
 *
 * Central export for all AI agent Kea stores
 */

export { productDefinerLogic } from './productDefiner';
export { campaignAdvisorLogic } from './campaignAdvisor';
export { contentGeneratorLogic } from './contentGenerator';
export { performanceAnalyzerLogic } from './performanceAnalyzer';

// Re-export types for convenience
export type {
  AgentConversation,
  AgentMessage,
  ProductDefinerSummary,
  CampaignAdvisorSummary,
  AdCopyResult,
  SocialPostsResult,
  LandingPageResult,
  ImagePromptsResult,
  PerformanceAnalysis,
  OptimizationRecommendations,
  CampaignComparison,
  ExecutiveSummary,
  Platform,
  TimeRange,
} from '../../types/aiAgents';
