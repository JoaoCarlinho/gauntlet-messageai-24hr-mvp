/**
 * Performance Analyzer AI Agent Hook
 *
 * Custom hook for Performance Analyzer AI agent
 * Provides access to campaign analytics state and actions through Kea logic
 */

import { useValues, useActions } from 'kea';
import { performanceAnalyzerLogic } from '../store/aiAgents/performanceAnalyzer';
import {
  CampaignPerformanceAnalysis,
  OptimizationRecommendations,
  CampaignComparison,
  ExecutiveSummary,
  PerformanceMetric,
  OptimizationRecommendation,
} from '../types/aiAgents';

// Performance Analyzer hook interface
interface UsePerformanceAnalyzerReturn {
  // State
  analysis: CampaignPerformanceAnalysis | null;
  recommendations: OptimizationRecommendations | null;
  comparison: CampaignComparison | null;
  executiveSummary: ExecutiveSummary | null;
  isAnalyzing: boolean;
  error: string | null;
  selectedCampaignId: string | null;
  selectedMetric: PerformanceMetric;
  prioritizedRecommendations: OptimizationRecommendation[];
  bestPerformers: any[];
  worstPerformers: any[];
  trendIndicators: any;

  // Actions
  analyzeCampaign: (campaignId: string, dateRange: { start: Date; end: Date }) => void;
  getRecommendations: (campaignId: string) => void;
  compareCampaigns: (campaignIds: string[], metric: PerformanceMetric) => void;
  getExecutiveSummary: (teamId: string, dateRange: { start: Date; end: Date }) => void;
  setSelectedCampaign: (campaignId: string) => void;
  setSelectedMetric: (metric: PerformanceMetric) => void;
  clearAnalysis: () => void;
  clearError: () => void;
}

/**
 * Custom hook for Performance Analyzer AI agent operations
 * Provides access to campaign analytics, optimization recommendations, and comparisons
 */
export const usePerformanceAnalyzer = (): UsePerformanceAnalyzerReturn => {
  // Get values from Kea store
  const {
    analysis,
    recommendations,
    comparison,
    executiveSummary,
    isAnalyzing,
    error,
    selectedCampaignId,
    selectedMetric,
  } = useValues(performanceAnalyzerLogic);

  // Get selectors
  const {
    getPrioritizedRecommendations,
    getBestPerformers,
    getWorstPerformers,
    getTrendIndicators,
  } = useValues(performanceAnalyzerLogic);

  // Get actions from Kea store
  const {
    analyzeCampaign: analyzeCampaignAction,
    getRecommendations: getRecommendationsAction,
    compareCampaigns: compareCampaignsAction,
    getExecutiveSummary: getExecutiveSummaryAction,
    setSelectedCampaign: setSelectedCampaignAction,
    setSelectedMetric: setSelectedMetricAction,
    clearAnalysis: clearAnalysisAction,
    setError,
  } = useActions(performanceAnalyzerLogic);

  // Wrapper functions with additional functionality
  const analyzeCampaign = (campaignId: string, dateRange: { start: Date; end: Date }) => {
    // Validate inputs
    if (!campaignId) {
      setError('Campaign ID is required for analysis');
      return;
    }

    if (!dateRange.start || !dateRange.end) {
      setError('Date range (start and end) is required for analysis');
      return;
    }

    if (dateRange.start > dateRange.end) {
      setError('Start date must be before end date');
      return;
    }

    // Clear any existing errors
    setError(null);
    analyzeCampaignAction(campaignId, dateRange);
  };

  const getRecommendations = (campaignId: string) => {
    // Validate input
    if (!campaignId) {
      setError('Campaign ID is required for recommendations');
      return;
    }

    // Clear any existing errors
    setError(null);
    getRecommendationsAction(campaignId);
  };

  const compareCampaigns = (campaignIds: string[], metric: PerformanceMetric) => {
    // Validate inputs
    if (!campaignIds || campaignIds.length < 2) {
      setError('At least 2 campaign IDs are required for comparison');
      return;
    }

    if (campaignIds.length > 10) {
      setError('Maximum 10 campaigns can be compared at once');
      return;
    }

    if (!metric) {
      setError('Performance metric is required for comparison');
      return;
    }

    // Clear any existing errors
    setError(null);
    compareCampaignsAction(campaignIds, metric);
  };

  const getExecutiveSummary = (teamId: string, dateRange: { start: Date; end: Date }) => {
    // Validate inputs
    if (!teamId) {
      setError('Team ID is required for executive summary');
      return;
    }

    if (!dateRange.start || !dateRange.end) {
      setError('Date range (start and end) is required for executive summary');
      return;
    }

    if (dateRange.start > dateRange.end) {
      setError('Start date must be before end date');
      return;
    }

    // Clear any existing errors
    setError(null);
    getExecutiveSummaryAction(teamId, dateRange);
  };

  const setSelectedCampaign = (campaignId: string) => {
    setSelectedCampaignAction(campaignId);
  };

  const setSelectedMetric = (metric: PerformanceMetric) => {
    setSelectedMetricAction(metric);
  };

  const clearAnalysis = () => {
    clearAnalysisAction();
  };

  const clearError = () => {
    setError(null);
  };

  return {
    // State
    analysis,
    recommendations,
    comparison,
    executiveSummary,
    isAnalyzing,
    error,
    selectedCampaignId,
    selectedMetric,
    prioritizedRecommendations: getPrioritizedRecommendations,
    bestPerformers: getBestPerformers,
    worstPerformers: getWorstPerformers,
    trendIndicators: getTrendIndicators,

    // Actions
    analyzeCampaign,
    getRecommendations,
    compareCampaigns,
    getExecutiveSummary,
    setSelectedCampaign,
    setSelectedMetric,
    clearAnalysis,
    clearError,
  };
};

// Export default for convenience
export default usePerformanceAnalyzer;
