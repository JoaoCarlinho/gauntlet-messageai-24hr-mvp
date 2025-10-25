import { streamText } from 'ai';
import { openai, AI_CONFIG } from '../../config/openai';
import { CAMPAIGN_ADVISOR_SYSTEM_PROMPT, AgentType } from '../../utils/prompts';
import * as conversationService from '../aiConversations.service';
import * as campaignService from '../campaigns.service';
import * as productService from '../products.service';
import * as icpService from '../icps.service';

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
 * Calculate optimal budget allocation across platforms
 *
 * Scores platforms based on ICP match and allocates budget proportionally.
 *
 * @param totalBudget - Total campaign budget
 * @param platforms - Array of platform names
 * @param icp - ICP data for scoring
 * @returns Budget allocation per platform with rationale
 */
function calculateBudgetAllocation(
  totalBudget: number,
  platforms: string[],
  icp: any
): Record<string, { budget: number; percentage: number; rationale: string }> {
  // Platform scoring based on ICP characteristics
  const platformScores: Record<string, number> = {};

  for (const platform of platforms) {
    let score = 50; // Base score

    // Score based on demographics
    if (platform === 'linkedin' && icp.firmographics) {
      score += 30; // LinkedIn is great for B2B
    }

    if (platform === 'facebook' && icp.demographics) {
      score += 25; // Facebook has broad demographic reach
    }

    if (platform === 'tiktok') {
      // Check if ICP includes younger demographics
      const ageRange = icp.demographics?.ageRange || '';
      if (ageRange.includes('18-') || ageRange.includes('25-')) {
        score += 30;
      }
    }

    if (platform === 'x') {
      score += 20; // X (Twitter) for thought leadership
    }

    platformScores[platform] = score;
  }

  // Calculate total score
  const totalScore = Object.values(platformScores).reduce(
    (sum, score) => sum + score,
    0
  );

  // Allocate budget proportionally
  const allocation: Record<
    string,
    { budget: number; percentage: number; rationale: string }
  > = {};

  for (const platform of platforms) {
    const percentage = (platformScores[platform] / totalScore) * 100;
    const budget = (totalBudget * percentage) / 100;

    allocation[platform] = {
      budget: Math.round(budget * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      rationale: getBudgetRationale(platform, icp),
    };
  }

  return allocation;
}

/**
 * Generate rationale for budget allocation
 */
function getBudgetRationale(platform: string, icp: any): string {
  const rationales: Record<string, string> = {
    linkedin:
      'LinkedIn is optimal for B2B targeting with professional demographics and firmographic data',
    facebook:
      'Facebook offers broad demographic reach and detailed interest-based targeting',
    tiktok:
      'TikTok excels for younger demographics with high engagement rates',
    x: 'X (Twitter) is effective for thought leadership and industry conversations',
  };

  return rationales[platform] || 'Platform aligns with ICP characteristics';
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
