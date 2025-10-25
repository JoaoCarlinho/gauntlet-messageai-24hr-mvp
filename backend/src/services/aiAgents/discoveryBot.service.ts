import { streamText, generateText } from 'ai';
import { openai, AI_CONFIG } from '../../config/openai';
import { AgentType } from '../../utils/prompts';
import prisma from '../../config/database';
import * as vectorDbService from '../vectorDb.service';
import * as productService from '../products.service';

/**
 * Discovery Bot AI Agent Service
 *
 * Public-facing RAG-powered conversational agent that:
 * - Engages prospects in discovery conversations
 * - Answers product questions using vector search
 * - Qualifies leads through structured questions
 * - Scores lead quality and notifies sales team
 */

interface LeadData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  source: string;
}

interface DiscoveryResponse {
  challenge?: string;
  timeline?: string;
  decisionMakers?: string;
  budget?: string;
  previousSolutions?: string;
}

/**
 * Discovery Bot System Prompt
 */
const DISCOVERY_BOT_SYSTEM_PROMPT = `You are a helpful sales discovery assistant. Your goal is to:
1. Build rapport with prospects
2. Answer their questions about the product using the provided context
3. Ask discovery questions to understand their needs
4. Qualify them as potential customers

Guidelines:
- Be friendly, professional, and conversational
- Listen actively and show empathy for their challenges
- Use the search_product_info tool when you need product details
- Use the search_faq tool for common questions
- Ask discovery questions naturally in the conversation flow
- Don't ask all questions at once - make it conversational
- When you have enough information, use calculate_qualification_score
- After scoring, use generate_discovery_summary to create a summary
- Finally, notify the sales team if the lead is qualified

Discovery Questions to Cover:
1. What challenges are you facing? (challenges)
2. What's your timeline for solving this? (timeline)
3. Who else is involved in this decision? (decision_makers)
4. What's your budget range? (budget)
5. What have you tried before? (previous_solutions)

Be natural - don't make it feel like an interrogation!`;

/**
 * Start a discovery session for a prospect
 *
 * @param productId - Product ID for the discovery session
 * @param teamId - Team ID
 * @param leadData - Initial lead information
 * @returns Discovery session ID
 */
export async function startDiscoverySession(
  productId: string,
  teamId: string,
  leadData: LeadData
): Promise<string> {
  try {
    console.log(`🔍 Starting discovery session for product ${productId}`);

    // Get product details
    const product = await productService.getProduct(productId, teamId);

    if (!product) {
      throw new Error('Product not found');
    }

    // Create Lead record
    const lead = await prisma.lead.create({
      data: {
        teamId,
        email: leadData.email,
        phone: leadData.phone,
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        company: leadData.company,
        jobTitle: leadData.jobTitle,
        source: leadData.source,
        status: 'new',
        rawData: leadData as any,
      },
    });

    // Create DiscoverySession record
    const session = await prisma.discoverySession.create({
      data: {
        leadId: lead.id,
        transcript: {
          messages: [],
          responses: {},
        } as any,
        status: 'active',
      },
    });

    console.log(`✅ Discovery session created: ${session.id}`);

    return session.id;
  } catch (error) {
    console.error('Error starting discovery session:', error);
    throw new Error('Failed to start discovery session');
  }
}

/**
 * Search product information using vector search
 */
async function searchProductInfo(
  query: string,
  productId: string,
  teamId: string
): Promise<string> {
  try {
    console.log(`🔍 Searching product info for: "${query}"`);

    const namespace = vectorDbService.getTeamNamespace(teamId, 'PRODUCTS');
    const results = await vectorDbService.searchByText(
      query,
      namespace,
      3,
      { productId }
    );

    if (results.length === 0) {
      return 'No specific product information found for that query.';
    }

    // Combine results into a context string
    const context = results
      .map((r) => r.metadata?.text || '')
      .filter((text) => text)
      .join('\n\n');

    return context || 'Product information available but no detailed match found.';
  } catch (error) {
    console.error('Error searching product info:', error);
    return 'Unable to retrieve product information at this time.';
  }
}

/**
 * Search FAQ using vector search
 */
async function searchFAQ(
  query: string,
  teamId: string
): Promise<string> {
  try {
    console.log(`🔍 Searching FAQ for: "${query}"`);

    // Search in knowledge namespace for FAQs
    const namespace = vectorDbService.getTeamNamespace(teamId, 'KNOWLEDGE');
    const results = await vectorDbService.searchByText(
      query,
      namespace,
      2,
      { type: 'faq' }
    );

    if (results.length === 0) {
      return 'No FAQ found for that question. I can help answer based on product knowledge.';
    }

    const faqAnswers = results
      .map((r) => r.metadata?.text || '')
      .filter((text) => text)
      .join('\n\n');

    return faqAnswers || 'FAQ available but no specific answer found.';
  } catch (error) {
    console.error('Error searching FAQ:', error);
    return 'Unable to retrieve FAQ at this time.';
  }
}

/**
 * Calculate lead qualification score
 */
function calculateQualificationScore(responses: DiscoveryResponse): {
  score: number;
  classification: 'hot' | 'warm' | 'cold';
  breakdown: Record<string, number>;
  reasoning: string;
} {
  let score = 0;
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  // Budget fit (30 points)
  if (responses.budget) {
    const budgetLower = responses.budget.toLowerCase();
    if (budgetLower.includes('$10k') || budgetLower.includes('10,000') || budgetLower.includes('high') || budgetLower.includes('unlimited')) {
      breakdown.budget = 30;
      reasons.push('Strong budget fit');
    } else if (budgetLower.includes('$5k') || budgetLower.includes('5,000') || budgetLower.includes('medium')) {
      breakdown.budget = 20;
      reasons.push('Moderate budget fit');
    } else if (budgetLower.includes('$1k') || budgetLower.includes('1,000') || budgetLower.includes('low') || budgetLower.includes('small')) {
      breakdown.budget = 10;
      reasons.push('Limited budget');
    } else {
      breakdown.budget = 15;
      reasons.push('Budget mentioned');
    }
    score += breakdown.budget;
  }

  // Timeline (25 points)
  if (responses.timeline) {
    const timelineLower = responses.timeline.toLowerCase();
    if (timelineLower.includes('asap') || timelineLower.includes('urgent') || timelineLower.includes('immediate') || timelineLower.includes('now')) {
      breakdown.timeline = 25;
      reasons.push('Urgent timeline');
    } else if (timelineLower.includes('1 month') || timelineLower.includes('2 month') || timelineLower.includes('3 month') || timelineLower.includes('soon')) {
      breakdown.timeline = 20;
      reasons.push('Near-term timeline (1-3 months)');
    } else if (timelineLower.includes('6 month') || timelineLower.includes('year') || timelineLower.includes('long')) {
      breakdown.timeline = 10;
      reasons.push('Long-term timeline (6+ months)');
    } else {
      breakdown.timeline = 15;
      reasons.push('Timeline mentioned');
    }
    score += breakdown.timeline;
  }

  // Decision makers (20 points)
  if (responses.decisionMakers) {
    const dmLower = responses.decisionMakers.toLowerCase();
    if (dmLower.includes('i am') || dmLower.includes('me') || dmLower.includes('sole') || dmLower.includes('owner') || dmLower.includes('ceo')) {
      breakdown.decisionMakers = 20;
      reasons.push('Primary decision maker');
    } else if (dmLower.includes('team') || dmLower.includes('committee') || dmLower.includes('manager')) {
      breakdown.decisionMakers = 15;
      reasons.push('Part of decision team');
    } else {
      breakdown.decisionMakers = 10;
      reasons.push('Influencer role');
    }
    score += breakdown.decisionMakers;
  }

  // Challenge clarity (15 points)
  if (responses.challenge) {
    const challengeLength = responses.challenge.length;
    if (challengeLength > 100) {
      breakdown.challenge = 15;
      reasons.push('Clear, detailed challenge');
    } else if (challengeLength > 50) {
      breakdown.challenge = 10;
      reasons.push('Challenge identified');
    } else {
      breakdown.challenge = 5;
      reasons.push('Vague challenge description');
    }
    score += breakdown.challenge;
  }

  // Previous solutions (10 points)
  if (responses.previousSolutions) {
    const prevLower = responses.previousSolutions.toLowerCase();
    if (prevLower.includes('tried') || prevLower.includes('using') || prevLower.includes('currently')) {
      breakdown.previousSolutions = 10;
      reasons.push('Has context from previous solutions');
    } else if (prevLower.includes('nothing') || prevLower.includes('none')) {
      breakdown.previousSolutions = 5;
      reasons.push('No previous solutions (greenfield)');
    } else {
      breakdown.previousSolutions = 7;
      reasons.push('Some experience with solutions');
    }
    score += breakdown.previousSolutions;
  }

  const reasoning = reasons.join('; ');

  // Classify lead based on score
  let classification: 'hot' | 'warm' | 'cold';
  if (score >= 80) {
    classification = 'hot';
  } else if (score >= 60) {
    classification = 'warm';
  } else {
    classification = 'cold';
  }

  return { score, classification, breakdown, reasoning };
}

/**
 * Generate discovery summary using AI
 */
async function generateDiscoverySummary(
  transcript: any,
  responses: DiscoveryResponse,
  score: number
): Promise<string> {
  try {
    console.log(`📝 Generating discovery summary (score: ${score})`);

    const prompt = `Based on the following discovery conversation, create a concise summary for the sales team:

Qualification Score: ${score}/100

Responses:
- Challenge: ${responses.challenge || 'Not discussed'}
- Timeline: ${responses.timeline || 'Not discussed'}
- Decision Makers: ${responses.decisionMakers || 'Not discussed'}
- Budget: ${responses.budget || 'Not discussed'}
- Previous Solutions: ${responses.previousSolutions || 'Not discussed'}

Recent Conversation:
${JSON.stringify(transcript.messages?.slice(-5) || [], null, 2)}

Create a summary that includes:
1. Key pain points and challenges
2. Buying signals and urgency
3. Decision-making process
4. Budget and timeline expectations
5. Recommended next steps for sales team

Keep it concise (200 words max).`;

    const result = await generateText({
      model: openai(AI_CONFIG.model),
      prompt,
      temperature: 0.5,
    });

    return result.text;
  } catch (error) {
    console.error('Error generating summary:', error);
    return `Lead qualified with score ${score}/100. Manual review recommended.`;
  }
}

/**
 * Notify sales team about qualified lead
 */
async function notifySalesTeam(
  leadId: string,
  summary: string,
  score: number
): Promise<void> {
  try {
    console.log(`📢 Notifying sales team about lead ${leadId} (score: ${score})`);

    // Create a lead activity for the notification
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error('Lead not found');
    }

    // Update lead qualification score
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        qualificationScore: score,
        status: score >= 60 ? 'qualified' : 'new',
      },
    });

    // In a real implementation, you would:
    // 1. Send Socket.io notification to sales team
    // 2. Send email/Slack notification
    // 3. Create task in CRM
    // For now, we'll just log it

    console.log(`✅ Sales team notified. Lead status updated.`);
  } catch (error) {
    console.error('Error notifying sales team:', error);
    // Don't throw - notification failure shouldn't break the flow
  }
}

/**
 * Process a message in the discovery conversation
 *
 * @param sessionId - Discovery session ID
 * @param userMessage - User's message
 * @returns Streaming AI response
 */
export async function processMessage(
  sessionId: string,
  userMessage: string
) {
  try {
    console.log(`💬 Processing message for session ${sessionId}`);

    // Get discovery session with lead data
    const session = await prisma.discoverySession.findUnique({
      where: { id: sessionId },
      include: {
        lead: true,
      },
    });

    if (!session) {
      throw new Error('Discovery session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Discovery session is not active');
    }

    // Get transcript
    const transcript = (session.transcript as any) || { messages: [], responses: {} };
    const messages = transcript.messages || [];
    const responses: DiscoveryResponse = transcript.responses || {};

    // Add user message to transcript
    messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Extract team and product info from lead
    const teamId = session.lead.teamId;
    const productId = session.lead.campaignId || ''; // Using campaignId as a proxy for productId

    // Build conversation history for AI
    const conversationHistory = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Stream AI response with tools
    const result = await streamText({
      model: openai(AI_CONFIG.model),
      system: DISCOVERY_BOT_SYSTEM_PROMPT,
      messages: conversationHistory,
      temperature: 0.7,
      onFinish: async ({ text, toolCalls }) => {
        // Add assistant message to transcript
        messages.push({
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
        });

        // Handle tool calls
        if (toolCalls && toolCalls.length > 0) {
          for (const tc of toolCalls) {
            if (tc.toolName === 'calculate_qualification_score') {
              const { score, classification, breakdown, reasoning } = calculateQualificationScore(responses);

              // Generate summary
              const summary = await generateDiscoverySummary(transcript, responses, score);

              // Update session
              await prisma.discoverySession.update({
                where: { id: sessionId },
                data: {
                  score,
                  summary,
                  status: 'completed',
                  completedAt: new Date(),
                  transcript: {
                    messages,
                    responses,
                    classification,
                    qualificationBreakdown: breakdown,
                    reasoning,
                  } as any,
                },
              });

              // Notify sales team
              await notifySalesTeam(session.leadId, summary, score);
            }
          }
        } else {
          // Extract discovery responses from conversation
          const textLower = text.toLowerCase();

          // Try to detect which question was answered
          if (textLower.includes('challenge') || textLower.includes('problem') || textLower.includes('pain')) {
            if (!responses.challenge && userMessage.length > 20) {
              responses.challenge = userMessage;
            }
          }

          if (textLower.includes('timeline') || textLower.includes('when')) {
            if (!responses.timeline && userMessage.length > 5) {
              responses.timeline = userMessage;
            }
          }

          if (textLower.includes('decision') || textLower.includes('who')) {
            if (!responses.decisionMakers && userMessage.length > 5) {
              responses.decisionMakers = userMessage;
            }
          }

          if (textLower.includes('budget') || textLower.includes('price')) {
            if (!responses.budget && userMessage.length > 3) {
              responses.budget = userMessage;
            }
          }

          if (textLower.includes('tried') || textLower.includes('using') || textLower.includes('previous')) {
            if (!responses.previousSolutions && userMessage.length > 10) {
              responses.previousSolutions = userMessage;
            }
          }

          // Update transcript
          await prisma.discoverySession.update({
            where: { id: sessionId },
            data: {
              transcript: {
                messages,
                responses,
              } as any,
            },
          });
        }
      },
    });

    return result;
  } catch (error) {
    console.error('Error processing discovery message:', error);
    throw error;
  }
}

/**
 * Get discovery session summary
 */
export async function getSessionSummary(
  sessionId: string,
  teamId: string
): Promise<any> {
  try {
    const session = await prisma.discoverySession.findFirst({
      where: {
        id: sessionId,
        lead: {
          teamId,
        },
      },
      include: {
        lead: true,
      },
    });

    if (!session) {
      throw new Error('Discovery session not found');
    }

    return {
      sessionId: session.id,
      leadId: session.leadId,
      status: session.status,
      score: session.score,
      summary: session.summary,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      transcript: session.transcript,
      lead: {
        email: session.lead.email,
        firstName: session.lead.firstName,
        lastName: session.lead.lastName,
        company: session.lead.company,
        status: session.lead.status,
      },
    };
  } catch (error) {
    console.error('Error getting session summary:', error);
    throw error;
  }
}

export default {
  startDiscoverySession,
  processMessage,
  getSessionSummary,
};
