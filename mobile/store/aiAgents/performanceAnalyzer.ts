/**
 * Performance Analyzer AI Agent Store (Kea)
 *
 * State management for Performance Analyzer AI agent
 * Handles campaign analysis, optimization recommendations, comparisons, and executive summaries
 */

import { kea } from 'kea';
import { performanceAnalyzerAPI } from '../../lib/aiAgentsAPI';
import {
  PerformanceAnalysis,
  OptimizationRecommendations,
  CampaignComparison,
  ExecutiveSummary,
  TimeRange,
  AnalyzeCampaignRequest,
  GetOptimizationRecommendationsRequest,
  CompareCampaignsRequest,
  GenerateExecutiveSummaryRequest,
  CampaignPerformanceData,
} from '../../types/aiAgents';

// State interface
interface PerformanceAnalyzerState {
  analysis: PerformanceAnalysis | null;
  recommendations: OptimizationRecommendations | null;
  comparison: CampaignComparison | null;
  executiveSummary: ExecutiveSummary | null;
  selectedCampaignId: string | null;
  selectedTimeRange: TimeRange | null;
  isAnalyzing: boolean;
  error: string | null;
}

// Actions interface
interface PerformanceAnalyzerActions {
  // Analysis actions
  analyzeCampaign: (request: AnalyzeCampaignRequest) => void;
  getRecommendations: (request: GetOptimizationRecommendationsRequest) => void;
  compareCampaigns: (request: CompareCampaignsRequest) => void;
  getExecutiveSummary: (request: GenerateExecutiveSummaryRequest) => void;

  // State setters
  setAnalysis: (analysis: PerformanceAnalysis) => void;
  setRecommendations: (recommendations: OptimizationRecommendations) => void;
  setComparison: (comparison: CampaignComparison) => void;
  setExecutiveSummary: (summary: ExecutiveSummary) => void;

  // Context management
  setSelectedCampaign: (campaignId: string | null) => void;
  setTimeRange: (timeRange: TimeRange | null) => void;

  // State management
  setAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearAnalysis: () => void;
}

// Performance Analyzer logic
export const performanceAnalyzerLogic = kea<any>({
  path: ['aiAgents', 'performanceAnalyzer'],

  defaults: {
    analysis: null,
    recommendations: null,
    comparison: null,
    executiveSummary: null,
    selectedCampaignId: null,
    selectedTimeRange: null,
    isAnalyzing: false,
    error: null,
  },

  actions: {
    // Analysis actions
    analyzeCampaign: (request: AnalyzeCampaignRequest) => ({ request }),
    getRecommendations: (request: GetOptimizationRecommendationsRequest) => ({ request }),
    compareCampaigns: (request: CompareCampaignsRequest) => ({ request }),
    getExecutiveSummary: (request: GenerateExecutiveSummaryRequest) => ({ request }),

    // State setters
    setAnalysis: (analysis: PerformanceAnalysis) => ({ analysis }),
    setRecommendations: (recommendations: OptimizationRecommendations) => ({ recommendations }),
    setComparison: (comparison: CampaignComparison) => ({ comparison }),
    setExecutiveSummary: (summary: ExecutiveSummary) => ({ summary }),

    // Context management
    setSelectedCampaign: (campaignId: string | null) => ({ campaignId }),
    setTimeRange: (timeRange: TimeRange | null) => ({ timeRange }),

    // State management
    setAnalyzing: (isAnalyzing: boolean) => ({ isAnalyzing }),
    setError: (error: string | null) => ({ error }),
    clearError: true,
    clearAnalysis: true,
  },

  reducers: {
    analysis: {
      setAnalysis: (_, { analysis }) => analysis,
      clearAnalysis: () => null,
    },

    recommendations: {
      setRecommendations: (_, { recommendations }) => recommendations,
      clearAnalysis: () => null,
    },

    comparison: {
      setComparison: (_, { comparison }) => comparison,
      clearAnalysis: () => null,
    },

    executiveSummary: {
      setExecutiveSummary: (_, { summary }) => summary,
      clearAnalysis: () => null,
    },

    selectedCampaignId: {
      setSelectedCampaign: (_, { campaignId }) => campaignId,
      analyzeCampaign: (_, { request }) => request.campaignId,
      getRecommendations: (_, { request }) => request.campaignId,
      clearAnalysis: () => null,
    },

    selectedTimeRange: {
      setTimeRange: (_, { timeRange }) => timeRange,
      analyzeCampaign: (_, { request }) => request.timeRange || null,
      getExecutiveSummary: (_, { request }) => request.timeRange || null,
      clearAnalysis: () => null,
    },

    isAnalyzing: {
      setAnalyzing: (_, { isAnalyzing }) => isAnalyzing,
      analyzeCampaign: () => true,
      getRecommendations: () => true,
      compareCampaigns: () => true,
      getExecutiveSummary: () => true,
    },

    error: {
      setError: (_, { error }) => error,
      clearError: () => null,
      analyzeCampaign: () => null,
      getRecommendations: () => null,
      compareCampaigns: () => null,
      getExecutiveSummary: () => null,
    },
  },

  listeners: ({ actions }: any) => ({
    // Analyze campaign listener
    analyzeCampaign: async ({ request }: any) => {
      try {
        const analysis: PerformanceAnalysis = await performanceAnalyzerAPI.analyzeCampaignPerformance(
          request
        );

        actions.setAnalysis(analysis);
        actions.setAnalyzing(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error analyzing campaign:', error);
        actions.setError(error.message || 'Failed to analyze campaign');
        actions.setAnalyzing(false);
      }
    },

    // Get recommendations listener
    getRecommendations: async ({ request }: any) => {
      try {
        const recommendations: OptimizationRecommendations = await performanceAnalyzerAPI.getOptimizationRecommendations(
          request
        );

        actions.setRecommendations(recommendations);
        actions.setAnalyzing(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error getting recommendations:', error);
        actions.setError(error.message || 'Failed to get recommendations');
        actions.setAnalyzing(false);
      }
    },

    // Compare campaigns listener
    compareCampaigns: async ({ request }: any) => {
      try {
        const comparison: CampaignComparison = await performanceAnalyzerAPI.compareMultipleCampaigns(
          request
        );

        actions.setComparison(comparison);
        actions.setAnalyzing(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error comparing campaigns:', error);
        actions.setError(error.message || 'Failed to compare campaigns');
        actions.setAnalyzing(false);
      }
    },

    // Get executive summary listener
    getExecutiveSummary: async ({ request }: any) => {
      try {
        const summary: ExecutiveSummary = await performanceAnalyzerAPI.getExecutiveSummary(
          request
        );

        actions.setExecutiveSummary(summary);
        actions.setAnalyzing(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error getting executive summary:', error);
        actions.setError(error.message || 'Failed to get executive summary');
        actions.setAnalyzing(false);
      }
    },
  }),

  selectors: {
    // Get current analysis
    getCurrentAnalysis: [
      (s) => [s.analysis],
      (analysis) => analysis,
    ],

    // Get red flags from recommendations
    getRedFlags: [
      (s) => [s.recommendations],
      (recommendations) => {
        return recommendations?.redFlags || [];
      },
    ],

    // Get prioritized recommendations
    getPrioritizedRecommendations: [
      (s) => [s.recommendations],
      (recommendations) => {
        if (!recommendations?.recommendations) return [];

        // Sort by priority: high -> medium -> low
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return [...recommendations.recommendations].sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
      },
    ],

    // Get best performing campaigns from comparison
    getBestPerformers: [
      (s) => [s.comparison],
      (comparison) => {
        if (!comparison?.comparison) return [];

        // Return top 3 campaigns by rank (descending)
        return [...comparison.comparison]
          .sort((a, b) => b.rank - a.rank)
          .slice(0, 3);
      },
    ],

    // Get worst performing campaigns from comparison
    getWorstPerformers: [
      (s) => [s.comparison],
      (comparison) => {
        if (!comparison?.comparison) return [];

        // Return bottom 3 campaigns by rank (ascending)
        return [...comparison.comparison]
          .sort((a, b) => a.rank - b.rank)
          .slice(0, 3);
      },
    ],

    // Get campaigns sorted by specific metric
    getCampaignsByMetric: [
      (s) => [s.comparison],
      (comparison) => (metric: 'ctr' | 'cpc' | 'roas') => {
        if (!comparison?.comparison) return [];

        // Sort campaigns by the specified metric
        return [...comparison.comparison].sort((a, b) => {
          switch (metric) {
            case 'ctr':
            case 'roas':
              // Higher is better for CTR and ROAS
              return b.metrics[metric] - a.metrics[metric];
            case 'cpc':
              // Lower is better for CPC
              return a.metrics[metric] - b.metrics[metric];
            default:
              return 0;
          }
        });
      },
    ],

    // Check if analysis data is available
    hasAnalysisData: [
      (s) => [s.analysis, s.recommendations, s.comparison, s.executiveSummary],
      (analysis, recommendations, comparison, executiveSummary) => {
        return !!(analysis || recommendations || comparison || executiveSummary);
      },
    ],

    // Get key metrics from analysis
    getKeyMetrics: [
      (s) => [s.analysis],
      (analysis) => {
        if (!analysis) return null;

        return {
          ctr: analysis.metrics.ctr,
          cpc: analysis.metrics.cpc,
          cpa: analysis.metrics.cpa,
          roas: analysis.metrics.roas,
          spend: analysis.metrics.spend,
          conversions: analysis.metrics.conversions,
        };
      },
    ],

    // Get trend indicators
    getTrendIndicators: [
      (s) => [s.analysis],
      (analysis) => {
        if (!analysis) return null;

        const { trends } = analysis;
        return {
          ctr: {
            value: trends.ctrChange,
            isPositive: trends.ctrChange > 0,
            isSignificant: Math.abs(trends.ctrChange) > 10, // >10% change
          },
          cpc: {
            value: trends.cpcChange,
            isPositive: trends.cpcChange < 0, // Lower CPC is better
            isSignificant: Math.abs(trends.cpcChange) > 10,
          },
          conversions: {
            value: trends.conversionChange,
            isPositive: trends.conversionChange > 0,
            isSignificant: Math.abs(trends.conversionChange) > 15,
          },
          spend: {
            value: trends.spendChange,
            isPositive: trends.spendChange < 0, // Lower spend is better
            isSignificant: Math.abs(trends.spendChange) > 20,
          },
        };
      },
    ],
  },
});

export default performanceAnalyzerLogic;
