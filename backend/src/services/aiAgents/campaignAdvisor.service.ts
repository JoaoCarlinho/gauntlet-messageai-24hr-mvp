import { streamText } from 'ai';
import { openai, AI_CONFIG } from '../../config/openai';
import { CAMPAIGN_ADVISOR_SYSTEM_PROMPT, AgentType } from '../../utils/prompts';
import * as conversationService from '../aiConversations.service';
import * as campaignService from '../campaigns.service';
import * as productService from '../products.service';
import * as icpService from '../icps.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Campaign Advisor AI Agent Service
 *
 * AI agent that helps users plan campaigns and optimize budget allocation
 * across platforms (Facebook, LinkedIn, TikTok, X) based on their ICP.
 */

/**
 * Start a new campaign planning conversation
 *
 * Creates a conversation session for campaign strategy with product/ICP context.
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @param productId - Product ID for campaign
 * @param icpId - ICP ID for targeting
 * @returns Conversation ID
 */
export async function startCampaignPlanning(
  userId: string,
  teamId: string,
  productId: string,
  icpId: string
): Promise<string> {
  // Retrieve product and ICP data
  const product = await productService.getProduct(productId, teamId);
  const icp = await icpService.getICP(icpId, teamId);

  if (!product || !icp) {
    throw new Error('Product or ICP not found');
  }

  const conversation = await conversationService.createConversation({
    userId,
    teamId,
    agentType: AgentType.CAMPAIGN_ADVISOR,
    contextId: productId,
    contextType: 'product',
  });

  // Store product and ICP context in conversation
  await conversationService.addMessage(
    conversation.id,
    userId,
    teamId,
    {
      role: 'system',
      content: `Product context: ${JSON.stringify({
        productId: product.id,
        name: product.name,
        description: product.description,
      })}`,
      metadata: { productId: product.id, icpId: icp.id },
    }
  );

  // Add initial greeting with context
  await conversationService.addMessage(
    conversation.id,
    userId,
    teamId,
    {
      role: 'assistant',
      content: `Hello! I'm here to help you plan an effective campaign for "${product.name}".

I can see you're targeting ${icp.name}. Let's create a data-driven campaign strategy together.

To get started, could you tell me:
1. What are your main campaign objectives? (e.g., lead generation, brand awareness, conversions)
2. What's your total budget for this campaign?
3. What's your campaign timeline?`,
    }
  );

  return conversation.id;
}

/**
 * Process a user message in the campaign planning conversation
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param teamId - Team ID
 * @param userMessage - User's message
 * @returns Streaming AI response
 */
export async function processMessage(
  conversationId: string,
  userId: string,
  teamId: string,
  userMessage: string
) {
  // Add user message to conversation history
  await conversationService.addMessage(
    conversationId,
    userId,
    teamId,
    {
      role: 'user',
      content: userMessage,
    }
  );

  // Build conversation context with system prompt
  const messages = await conversationService.buildConversationContext(
    conversationId,
    userId,
    teamId,
    CAMPAIGN_ADVISOR_SYSTEM_PROMPT,
    20
  );

  // Stream AI response
  const result = streamText({
    model: openai(AI_CONFIG.model),
    messages: messages as any,
    temperature: AI_CONFIG.temperature.balanced,
    // Tools will be added for campaign strategy functions
    onFinish: async ({ text, toolCalls }) => {
      // Save assistant's response
      await conversationService.addMessage(
        conversationId,
        userId,
        teamId,
        {
          role: 'assistant',
          content: text,
          metadata: {
            toolCalls: toolCalls?.map((tc: any) => ({
              name: tc.toolName,
              args: tc.args,
            })),
          },
        }
      );

      // Handle tool calls
      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const tc = toolCall as any;

          // Save campaign strategy
          if (tc.toolName === 'save_campaign_strategy') {
            try {
              const campaign = await campaignService.createCampaign(
                teamId,
                {
                  name: tc.args.name,
                  productId: tc.args.productId,
                  icpId: tc.args.icpId,
                  platforms: tc.args.platforms || [tc.args.platform],
                  description: tc.args.objective,
                  budget: parseFloat(tc.args.budget),
                  startDate: new Date(tc.args.startDate),
                  endDate: tc.args.endDate ? new Date(tc.args.endDate) : undefined,
                  targetingStrategy: tc.args.targetAudience,
                }
              );

              // Store campaign ID
              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: `Campaign strategy saved with ID: ${campaign.id}`,
                  metadata: { campaignId: campaign.id },
                }
              );

              // Mark conversation as completed
              await conversationService.updateConversationStatus(
                conversationId,
                userId,
                teamId,
                'completed'
              );
            } catch (error) {
              console.error('Error saving campaign strategy:', error);
              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: 'Error saving campaign strategy. Please try again.',
                }
              );
            }
          }

          // Get product and ICP details
          if (tc.toolName === 'get_product_and_icp') {
            try {
              const product = await productService.getProduct(
                tc.args.productId,
                teamId
              );
              const icp = await icpService.getICP(tc.args.icpId, teamId);

              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: `Product and ICP data: ${JSON.stringify({
                    product: {
                      name: product?.name,
                      description: product?.description,
                      features: product?.features,
                      pricing: product?.pricing,
                    },
                    icp: {
                      name: icp?.name,
                      demographics: icp?.demographics,
                      firmographics: icp?.firmographics,
                      psychographics: icp?.psychographics,
                      behaviors: icp?.behaviors,
                    },
                  })}`,
                  metadata: { product, icp },
                }
              );
            } catch (error) {
              console.error('Error retrieving product/ICP:', error);
            }
          }

          // Calculate budget allocation
          if (tc.toolName === 'calculate_budget_allocation') {
            try {
              const allocation = calculateBudgetAllocation(
                parseFloat(tc.args.totalBudget),
                tc.args.platforms,
                tc.args.icp
              );

              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: `Budget allocation: ${JSON.stringify(allocation)}`,
                  metadata: { budgetAllocation: allocation },
                }
              );
            } catch (error) {
              console.error('Error calculating budget:', error);
            }
          }
        }
      }
    },
  });

  return result;
}

/**
 * Load platform demographics data
 */
function loadPlatformData(): any {
  const dataPath = path.join(__dirname, '../data/platformDemographics.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(rawData);
}

/**
 * Calculate optimal budget allocation across platforms
 *
 * Enhanced algorithm that:
 * - Scores platforms based on ICP match (0-100)
 * - Factors in CPL benchmarks from industry data
 * - Ensures minimum budget thresholds
 * - Allocates budget proportionally to scores
 *
 * @param totalBudget - Total campaign budget
 * @param platforms - Array of platform names
 * @param icp - ICP data for scoring
 * @param industry - Industry for benchmark lookup (default: 'saas')
 * @returns Budget allocation per platform with rationale
 */
function calculateBudgetAllocation(
  totalBudget: number,
  platforms: string[],
  icp: any,
  industry: string = 'saas'
): Record<string, {
  budget: number;
  percentage: number;
  rationale: string;
  estimatedCPL?: number;
  estimatedLeads?: number;
}> {
  const platformData = loadPlatformData();
  const platformScores: Record<string, number> = {};
  const minimumBudgets = platformData.minimumBudgets;

  // Score each platform (0-100)
  for (const platform of platforms) {
    let score = 50; // Base score

    // Demographics scoring
    if (icp.demographics) {
      const ageRange = icp.demographics.ageRange || '';

      // LinkedIn - B2B and professional
      if (platform === 'linkedin' && icp.firmographics) {
        score += 30; // Strong B2B match
        if (icp.firmographics.companySizes || icp.firmographics.industries) {
          score += 10; // Has firmographic data
        }
      }

      // Facebook - Broad demographics
      if (platform === 'facebook') {
        score += 20; // Good baseline for most audiences
        if (ageRange.includes('25-') || ageRange.includes('35-')) {
          score += 10; // Strong Facebook demographics
        }
      }

      // TikTok - Young demographics
      if (platform === 'tiktok') {
        if (ageRange.includes('18-24') || ageRange.includes('13-17')) {
          score += 35; // Perfect for Gen Z
        } else if (ageRange.includes('25-34')) {
          score += 20; // Still relevant for millennials
        } else {
          score -= 10; // Poor match for older demographics
        }
      }

      // Instagram - Visual and younger
      if (platform === 'instagram') {
        if (ageRange.includes('18-') || ageRange.includes('25-')) {
          score += 25; // Strong Instagram demographics
        }
        score += 15; // Visual platform bonus
      }

      // X (Twitter) - Thought leadership
      if (platform === 'x') {
        score += 15; // Baseline for conversation
        if (icp.psychographics?.values?.includes('innovation') ||
            icp.firmographics?.industries?.includes('Technology')) {
          score += 15; // Tech-savvy audience
        }
      }
    }

    // Factor in CPL efficiency (lower CPL = higher score)
    const benchmarks = platformData.industryBenchmarks[industry];
    if (benchmarks && benchmarks[platform]) {
      const platformCPL = benchmarks[platform].avgCPL;
      const avgCPL = Object.values(benchmarks).reduce((sum: number, p: any) => sum + p.avgCPL, 0) /
                     Object.keys(benchmarks).length;

      // Lower CPL gets bonus points
      if (platformCPL < avgCPL) {
        score += 15; // Efficient platform
      } else if (platformCPL > avgCPL * 1.5) {
        score -= 10; // Expensive platform
      }
    }

    // Ensure score is within bounds
    platformScores[platform] = Math.max(10, Math.min(100, score));
  }

  // Filter out platforms below minimum budget
  const viablePlatforms = platforms.filter(
    (p) => totalBudget >= (minimumBudgets[p] || 500)
  );

  if (viablePlatforms.length === 0) {
    const minBudget = Math.min(...Object.values(minimumBudgets).map(v => Number(v)));
    throw new Error(`Total budget too low. Minimum required: $${minBudget}`);
  }

  // Calculate total score for viable platforms
  const totalScore = viablePlatforms.reduce(
    (sum, p) => sum + platformScores[p],
    0
  );

  // Initial proportional allocation
  const allocation: Record<string, {
    budget: number;
    percentage: number;
    rationale: string;
    estimatedCPL?: number;
    estimatedLeads?: number;
  }> = {};

  const platformsNeedingAdjustment: string[] = [];

  // First pass: allocate proportionally
  for (const platform of viablePlatforms) {
    const percentage = (platformScores[platform] / totalScore) * 100;
    let budget = (totalBudget * percentage) / 100;
    const minBudget = minimumBudgets[platform] || 500;

    if (budget < minBudget && viablePlatforms.length > 1) {
      // Mark for exclusion if budget too low
      platformsNeedingAdjustment.push(platform);
      continue;
    }

    allocation[platform] = {
      budget: Math.round(budget * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      rationale: getBudgetRationale(platform, icp, platformScores[platform]),
    };

    // Add benchmark estimates
    const benchmarks = platformData.industryBenchmarks[industry];
    if (benchmarks && benchmarks[platform]) {
      const cpl = benchmarks[platform].avgCPL;
      allocation[platform].estimatedCPL = cpl;
      allocation[platform].estimatedLeads = Math.floor(budget / cpl);
    }
  }

  // Second pass: redistribute if platforms can't meet minimum
  if (platformsNeedingAdjustment.length > 0 && viablePlatforms.length > platformsNeedingAdjustment.length) {
    const remainingPlatforms = viablePlatforms.filter(
      (p) => !platformsNeedingAdjustment.includes(p)
    );
    return calculateBudgetAllocation(totalBudget, remainingPlatforms, icp, industry);
  }

  return allocation;
}

/**
 * Generate rationale for budget allocation
 */
function getBudgetRationale(platform: string, icp: any, score: number): string {
  const baseRationales: Record<string, string> = {
    linkedin: 'LinkedIn optimal for B2B targeting with professional demographics and firmographic data',
    facebook: 'Facebook offers broad demographic reach and detailed interest-based targeting',
    instagram: 'Instagram excels with visual content and strong engagement from younger demographics',
    tiktok: 'TikTok provides viral potential and dominates younger demographics with high engagement',
    x: 'X (Twitter) effective for thought leadership, real-time engagement, and industry conversations',
  };

  let rationale = baseRationales[platform] || 'Platform aligns with ICP characteristics';

  // Add score-based context
  if (score >= 80) {
    rationale += '. Excellent ICP match and cost efficiency';
  } else if (score >= 60) {
    rationale += '. Good ICP alignment';
  } else if (score < 50) {
    rationale += '. Consider as supplementary channel';
  }

  return rationale;
}

/**
 * Get conversation summary
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Conversation summary with campaign details
 */
export async function getConversationSummary(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<{
  status: string;
  campaignSaved: boolean;
  campaignId?: string;
}> {
  const messages = await conversationService.getMessages(
    conversationId,
    userId,
    teamId
  );

  const campaignMessage = messages.find(
    (m) => m.role === 'system' && m.content.includes('Campaign strategy saved')
  );

  const conversation = await conversationService.getConversation(
    conversationId,
    userId,
    teamId
  );

  return {
    status: conversation?.status || 'active',
    campaignSaved: !!campaignMessage,
    campaignId: campaignMessage?.metadata?.campaignId,
  };
}
