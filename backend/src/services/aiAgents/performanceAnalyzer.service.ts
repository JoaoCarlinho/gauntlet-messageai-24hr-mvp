import { generateText } from 'ai';
import { openai, AI_CONFIG } from '../../config/openai';
import { PERFORMANCE_ANALYZER_SYSTEM_PROMPT } from '../../utils/prompts';
import prisma from '../../config/database';

/**
 * Performance Analyzer AI Agent Service
 *
 * Analyzes campaign performance metrics and provides:
 * - Detailed performance analysis with KPIs
 * - Optimization recommendations
 * - Cross-campaign comparisons
 * - Executive summaries
 */

interface TimeRange {
  startDate: Date;
  endDate: Date;
}

interface PerformanceMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number; // Click-Through Rate
  cpc: number; // Cost Per Click
  cpa: number; // Cost Per Acquisition
  roas: number; // Return on Ad Spend
}

interface BenchmarkData {
  ctr: { min: number; avg: number; good: number };
  cpc: { min: number; avg: number; max: number };
  conversionRate: { min: number; avg: number; good: number };
}

/**
 * Industry benchmarks by platform
 */
const PLATFORM_BENCHMARKS: Record<string, BenchmarkData> = {
  facebook: {
    ctr: { min: 0.5, avg: 0.9, good: 2.0 },
    cpc: { min: 0.50, avg: 1.25, max: 2.00 },
    conversionRate: { min: 2, avg: 4, good: 6 },
  },
  linkedin: {
    ctr: { min: 0.3, avg: 0.4, good: 1.0 },
    cpc: { min: 2.00, avg: 4.50, max: 7.00 },
    conversionRate: { min: 2, avg: 3, good: 5 },
  },
  instagram: {
    ctr: { min: 0.5, avg: 0.9, good: 2.0 },
    cpc: { min: 0.50, avg: 1.25, max: 2.00 },
    conversionRate: { min: 2, avg: 4, good: 6 },
  },
  x: {
    ctr: { min: 1.0, avg: 1.5, good: 3.0 },
    cpc: { min: 0.50, avg: 1.25, max: 2.00 },
    conversionRate: { min: 1, avg: 2, good: 4 },
  },
  tiktok: {
    ctr: { min: 1.0, avg: 1.5, good: 3.0 },
    cpc: { min: 0.50, avg: 1.00, max: 1.50 },
    conversionRate: { min: 2, avg: 3, good: 5 },
  },
};

/**
 * Calculate performance metrics from campaign data
 */
function calculateMetrics(metrics: any[]): PerformanceMetrics {
  const totals = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
      spend: acc.spend + m.spend,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const roas = totals.spend > 0 ? (totals.conversions * 100) / totals.spend : 0; // Simplified ROAS calculation

  return {
    ...totals,
    ctr: Number(ctr.toFixed(2)),
    cpc: Number(cpc.toFixed(2)),
    cpa: Number(cpa.toFixed(2)),
    roas: Number(roas.toFixed(2)),
  };
}

/**
 * Get benchmark context for a platform
 */
function getBenchmarkContext(platform: string): string {
  const benchmarks = PLATFORM_BENCHMARKS[platform.toLowerCase()] || PLATFORM_BENCHMARKS.facebook;

  return `
Platform Benchmarks for ${platform}:
- CTR: ${benchmarks.ctr.avg}% (average), ${benchmarks.ctr.good}%+ (good)
- CPC: $${benchmarks.cpc.avg} (average), $${benchmarks.cpc.min}-$${benchmarks.cpc.max} (range)
- Conversion Rate: ${benchmarks.conversionRate.avg}% (average), ${benchmarks.conversionRate.good}%+ (good)
`;
}

/**
 * Analyze campaign performance
 */
export async function analyzeCampaignPerformance(
  campaignId: string,
  teamId: string,
  timeRange?: TimeRange
): Promise<any> {
  try {
    console.log(`📊 Analyzing performance for campaign ${campaignId}`);

    // Get campaign details
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        teamId,
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Build date filter
    const dateFilter: any = {};
    if (timeRange) {
      dateFilter.gte = timeRange.startDate;
      dateFilter.lte = timeRange.endDate;
    }

    // Get campaign metrics
    const metrics = await prisma.campaignMetric.findMany({
      where: {
        campaignId,
        ...(timeRange && { date: dateFilter }),
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (metrics.length === 0) {
      return {
        campaignId,
        campaignName: campaign.name,
        status: 'no_data',
        message: 'No performance data available for this campaign yet.',
      };
    }

    // Calculate overall metrics
    const overallMetrics = calculateMetrics(metrics);

    // Calculate trends (compare first half vs second half)
    const midpoint = Math.floor(metrics.length / 2);
    const firstHalfMetrics = calculateMetrics(metrics.slice(0, midpoint));
    const secondHalfMetrics = calculateMetrics(metrics.slice(midpoint));

    const trends = {
      ctrChange: ((secondHalfMetrics.ctr - firstHalfMetrics.ctr) / firstHalfMetrics.ctr) * 100,
      cpcChange: ((secondHalfMetrics.cpc - firstHalfMetrics.cpc) / firstHalfMetrics.cpc) * 100,
      cpaChange: ((secondHalfMetrics.cpa - firstHalfMetrics.cpa) / firstHalfMetrics.cpa) * 100,
    };

    // Get benchmark context
    const primaryPlatform = campaign.platforms[0] || 'facebook';
    const benchmarkContext = getBenchmarkContext(primaryPlatform);

    // Generate AI insights
    const analysisPrompt = `Analyze the following campaign performance data and provide detailed insights:

Campaign: ${campaign.name}
Platform(s): ${campaign.platforms.join(', ')}
Duration: ${metrics.length} days
Budget: $${campaign.budget}

Overall Performance:
- Impressions: ${overallMetrics.impressions.toLocaleString()}
- Clicks: ${overallMetrics.clicks.toLocaleString()}
- Conversions: ${overallMetrics.conversions.toLocaleString()}
- Total Spend: $${overallMetrics.spend.toLocaleString()}
- CTR: ${overallMetrics.ctr}%
- CPC: $${overallMetrics.cpc}
- CPA: $${overallMetrics.cpa}
- ROAS: ${overallMetrics.roas}x

Trends (First Half vs Second Half):
- CTR Change: ${trends.ctrChange.toFixed(1)}%
- CPC Change: ${trends.cpcChange.toFixed(1)}%
- CPA Change: ${trends.cpaChange.toFixed(1)}%

${benchmarkContext}

Provide:
1. Executive Summary (3-5 key takeaways)
2. What's Working Well (positive insights)
3. Areas of Concern (issues to address)
4. Performance vs Benchmarks (how metrics compare)
5. Trends Analysis (what the trends indicate)

Format as JSON with these sections.`;

    const aiResponse = await generateText({
      model: openai(AI_CONFIG.model),
      system: PERFORMANCE_ANALYZER_SYSTEM_PROMPT,
      prompt: analysisPrompt,
      temperature: 0.5, // Lower temperature for analytical content
    });

    let insights;
    try {
      insights = JSON.parse(aiResponse.text);
    } catch (e) {
      // If AI didn't return valid JSON, structure it manually
      insights = {
        executiveSummary: aiResponse.text.substring(0, 500),
        rawAnalysis: aiResponse.text,
      };
    }

    return {
      campaignId,
      campaignName: campaign.name,
      platforms: campaign.platforms,
      timeRange: {
        start: metrics[0].date,
        end: metrics[metrics.length - 1].date,
        days: metrics.length,
      },
      metrics: overallMetrics,
      trends,
      benchmarks: PLATFORM_BENCHMARKS[primaryPlatform],
      insights,
    };
  } catch (error) {
    console.error('Error analyzing campaign performance:', error);
    throw error;
  }
}

/**
 * Get optimization recommendations for a campaign
 */
export async function getOptimizationRecommendations(
  campaignId: string,
  teamId: string
): Promise<any> {
  try {
    console.log(`🔧 Generating optimization recommendations for campaign ${campaignId}`);

    // First get the performance analysis
    const analysis = await analyzeCampaignPerformance(campaignId, teamId);

    if (analysis.status === 'no_data') {
      return {
        campaignId,
        recommendations: [],
        message: 'Insufficient data to generate recommendations.',
      };
    }

    // Identify red flags
    const redFlags: string[] = [];
    const { metrics, benchmarks } = analysis;

    if (metrics.ctr < benchmarks.ctr.avg) {
      redFlags.push(`Low CTR (${metrics.ctr}% vs ${benchmarks.ctr.avg}% avg) - Creative or targeting issue`);
    }

    if (metrics.cpc > benchmarks.cpc.avg) {
      redFlags.push(`High CPC ($${metrics.cpc} vs $${benchmarks.cpc.avg} avg) - Consider audience optimization`);
    }

    if (analysis.trends.ctrChange < -20) {
      redFlags.push(`Declining CTR (-${Math.abs(analysis.trends.ctrChange).toFixed(1)}%) - Creative fatigue likely`);
    }

    if (metrics.roas < 2.0) {
      redFlags.push(`Low ROAS (${metrics.roas}x) - Review targeting and conversion path`);
    }

    // Generate AI recommendations
    const recommendationPrompt = `Based on this campaign performance analysis, provide specific, prioritized optimization recommendations:

Campaign Performance:
${JSON.stringify(metrics, null, 2)}

Trends:
${JSON.stringify(analysis.trends, null, 2)}

Identified Issues:
${redFlags.join('\n')}

Provide 5-7 specific, actionable recommendations prioritized by:
1. Impact (High/Medium/Low)
2. Effort (Quick Win/Medium/Complex)
3. Expected Results

Format as JSON array with structure:
[{
  "priority": 1,
  "title": "recommendation title",
  "description": "detailed description",
  "impact": "high|medium|low",
  "effort": "quick_win|medium|complex",
  "expectedImprovement": "what metrics will improve and by how much",
  "implementation": "how to implement this"
}]`;

    const aiResponse = await generateText({
      model: openai(AI_CONFIG.model),
      system: PERFORMANCE_ANALYZER_SYSTEM_PROMPT,
      prompt: recommendationPrompt,
      temperature: 0.6,
    });

    let recommendations;
    try {
      recommendations = JSON.parse(aiResponse.text);
    } catch (e) {
      // Fallback if AI doesn't return valid JSON
      recommendations = [{
        priority: 1,
        title: 'Review Campaign Performance',
        description: aiResponse.text,
        impact: 'medium',
        effort: 'medium',
      }];
    }

    return {
      campaignId,
      campaignName: analysis.campaignName,
      redFlags,
      recommendations,
      predictedOutcome: 'Implementing high-priority recommendations could improve CTR by 15-30% and reduce CPA by 10-20%.',
    };
  } catch (error) {
    console.error('Error generating optimization recommendations:', error);
    throw error;
  }
}

/**
 * Compare performance across multiple campaigns
 */
export async function comparePerformance(
  campaignIds: string[],
  teamId: string
): Promise<any> {
  try {
    console.log(`📊 Comparing performance for ${campaignIds.length} campaigns`);

    // Get analysis for each campaign
    const analyses = await Promise.all(
      campaignIds.map(id => analyzeCampaignPerformance(id, teamId))
    );

    // Filter out campaigns with no data
    const validAnalyses = analyses.filter(a => a.status !== 'no_data');

    if (validAnalyses.length === 0) {
      return {
        comparison: [],
        message: 'No performance data available for the selected campaigns.',
      };
    }

    // Calculate relative performance
    const avgCtr = validAnalyses.reduce((sum, a) => sum + a.metrics.ctr, 0) / validAnalyses.length;
    const avgCpc = validAnalyses.reduce((sum, a) => sum + a.metrics.cpc, 0) / validAnalyses.length;
    const avgRoas = validAnalyses.reduce((sum, a) => sum + a.metrics.roas, 0) / validAnalyses.length;

    const comparison = validAnalyses.map(a => ({
      campaignId: a.campaignId,
      campaignName: a.campaignName,
      metrics: a.metrics,
      vsAverage: {
        ctr: ((a.metrics.ctr - avgCtr) / avgCtr) * 100,
        cpc: ((a.metrics.cpc - avgCpc) / avgCpc) * 100,
        roas: ((a.metrics.roas - avgRoas) / avgRoas) * 100,
      },
      rank: 0, // Will be calculated
    }));

    // Rank campaigns by overall performance (weighted score)
    comparison.forEach(c => {
      const ctrScore = c.metrics.ctr / avgCtr;
      const cpcScore = avgCpc / c.metrics.cpc; // Lower is better
      const roasScore = c.metrics.roas / avgRoas;
      c.rank = (ctrScore + cpcScore + roasScore) / 3;
    });

    // Sort by rank
    comparison.sort((a, b) => b.rank - a.rank);

    // Assign ranking positions
    comparison.forEach((c, index) => {
      c.rank = index + 1;
    });

    // Generate AI insights for comparison
    const comparisonPrompt = `Compare these campaign performances and identify key insights:

${comparison.map(c => `
Campaign: ${c.campaignName}
CTR: ${c.metrics.ctr}% (${c.vsAverage.ctr > 0 ? '+' : ''}${c.vsAverage.ctr.toFixed(1)}% vs avg)
CPC: $${c.metrics.cpc} (${c.vsAverage.cpc > 0 ? '+' : ''}${c.vsAverage.cpc.toFixed(1)}% vs avg)
ROAS: ${c.metrics.roas}x (${c.vsAverage.roas > 0 ? '+' : ''}${c.vsAverage.roas.toFixed(1)}% vs avg)
`).join('\n')}

Identify:
1. Best performing campaign and why
2. Worst performing campaign and what to improve
3. Key differences driving performance
4. Learnings to apply across campaigns`;

    const aiResponse = await generateText({
      model: openai(AI_CONFIG.model),
      system: PERFORMANCE_ANALYZER_SYSTEM_PROMPT,
      prompt: comparisonPrompt,
      temperature: 0.5,
    });

    return {
      comparison,
      averages: {
        ctr: avgCtr,
        cpc: avgCpc,
        roas: avgRoas,
      },
      insights: aiResponse.text,
    };
  } catch (error) {
    console.error('Error comparing campaign performance:', error);
    throw error;
  }
}

/**
 * Generate executive summary for all campaigns
 */
export async function generateExecutiveSummary(
  teamId: string,
  timeRange?: TimeRange
): Promise<any> {
  try {
    console.log(`📋 Generating executive summary for team ${teamId}`);

    // Get all campaigns for the team
    const campaigns = await prisma.campaign.findMany({
      where: { teamId },
      select: { id: true, name: true },
    });

    if (campaigns.length === 0) {
      return {
        summary: 'No campaigns found for this team.',
        campaigns: [],
      };
    }

    // Build date filter
    const dateFilter: any = {};
    if (timeRange) {
      dateFilter.gte = timeRange.startDate;
      dateFilter.lte = timeRange.endDate;
    }

    // Get all metrics for the team
    const allMetrics = await prisma.campaignMetric.findMany({
      where: {
        campaign: {
          teamId,
        },
        ...(timeRange && { date: dateFilter }),
      },
    });

    if (allMetrics.length === 0) {
      return {
        summary: 'No performance data available yet.',
        totalCampaigns: campaigns.length,
      };
    }

    // Calculate team-wide metrics
    const overallMetrics = calculateMetrics(allMetrics);

    // Generate executive summary using AI
    const summaryPrompt = `Generate an executive summary for this marketing team's performance:

Total Campaigns: ${campaigns.length}
Time Period: ${timeRange ? `${timeRange.startDate.toLocaleDateString()} - ${timeRange.endDate.toLocaleDateString()}` : 'All time'}

Overall Performance:
- Total Spend: $${overallMetrics.spend.toLocaleString()}
- Impressions: ${overallMetrics.impressions.toLocaleString()}
- Clicks: ${overallMetrics.clicks.toLocaleString()}
- Conversions: ${overallMetrics.conversions.toLocaleString()}
- Average CTR: ${overallMetrics.ctr}%
- Average CPC: $${overallMetrics.cpc}
- Average CPA: $${overallMetrics.cpa}
- ROAS: ${overallMetrics.roas}x

Provide an executive summary with:
1. 3-5 key takeaways (most important insights)
2. Overall performance assessment (excellent/good/needs improvement)
3. Top priorities for the next period
4. Strategic recommendations

Keep it concise and executive-friendly (max 300 words).`;

    const aiResponse = await generateText({
      model: openai(AI_CONFIG.model),
      system: PERFORMANCE_ANALYZER_SYSTEM_PROMPT,
      prompt: summaryPrompt,
      temperature: 0.5,
    });

    return {
      totalCampaigns: campaigns.length,
      timeRange: timeRange ? {
        start: timeRange.startDate,
        end: timeRange.endDate,
      } : 'all_time',
      overallMetrics,
      summary: aiResponse.text,
    };
  } catch (error) {
    console.error('Error generating executive summary:', error);
    throw error;
  }
}

export default {
  analyzeCampaignPerformance,
  getOptimizationRecommendations,
  comparePerformance,
  generateExecutiveSummary,
};
