import { streamText } from 'ai';
import { openai, AI_CONFIG } from '../../config/openai';
import { PRODUCT_DEFINER_SYSTEM_PROMPT, AgentType } from '../../utils/prompts';
import * as conversationService from '../aiConversations.service';
import * as productService from '../products.service';
import * as icpService from '../icps.service';

/**
 * Product Definer AI Agent Service
 *
 * Conversational AI agent that helps users define their products and ICPs
 * through guided conversation. Uses function calling to save structured data.
 */

/**
 * Start a new product definition conversation
 *
 * Creates a new conversation session for the product definer agent.
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Conversation ID
 */
export async function startConversation(
  userId: string,
  teamId: string
): Promise<string> {
  const conversation = await conversationService.createConversation({
    userId,
    teamId,
    agentType: AgentType.PRODUCT_DEFINER,
    contextType: 'general',
  });

  // Add initial system message to set context
  await conversationService.addMessage(
    conversation.id,
    userId,
    teamId,
    {
      role: 'assistant',
      content: `Hello! I'm here to help you define your product and identify your ideal customers.

Let's start with your product. Could you tell me:
1. What is the name of your product or service?
2. What does it do or what problem does it solve?`,
    }
  );

  return conversation.id;
}

/**
 * Process a user message in the product definition conversation
 *
 * Handles the conversational flow, calls AI with function calling,
 * and executes tools when requested by the AI.
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
    PRODUCT_DEFINER_SYSTEM_PROMPT,
    20 // Last 20 messages for context
  );

  // Stream AI response with function calling
  const result = streamText({
    model: openai(AI_CONFIG.model),
    messages: messages as any,
    temperature: AI_CONFIG.temperature.balanced,
    // Tools will be added in Task 10.2 when we integrate with controller
    onFinish: async (event: any) => {
      const { text, toolCalls } = event;
      // Save assistant's response to conversation
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

      // Handle tool calls and save to database
      if (toolCalls && toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          const tc = toolCall as any;

          // Save product
          if (tc.toolName === 'save_product') {
            try {
              const product = await productService.createProduct(
                teamId,
                {
                  name: tc.args.name,
                  description: tc.args.description,
                  features: tc.args.features,
                  pricing: tc.args.pricing,
                  usps: tc.args.usps,
                }
              );

              // Store product ID in conversation context for ICP creation
              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: `Product saved with ID: ${product.id}`,
                  metadata: { productId: product.id },
                }
              );
            } catch (error) {
              console.error('Error saving product:', error);
              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: 'Error saving product. Please try again.',
                }
              );
            }
          }

          // Save ICP
          if (tc.toolName === 'save_icp') {
            try {
              const icp = await icpService.createICP(
                tc.args.productId,
                teamId,
                {
                  name: tc.args.name,
                  demographics: tc.args.demographics,
                  firmographics: tc.args.firmographics,
                  psychographics: tc.args.psychographics,
                  behaviors: tc.args.behaviors,
                }
              );

              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: `ICP saved with ID: ${icp.id}`,
                  metadata: { icpId: icp.id },
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
              console.error('Error saving ICP:', error);
              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: 'Error saving ICP. Please try again.',
                }
              );
            }
          }

          // Search similar products
          if (tc.toolName === 'search_similar_products') {
            try {
              const results = await productService.searchProducts(
                teamId,
                tc.args.query,
                3
              );

              // Add search results as system message for context
              await conversationService.addMessage(
                conversationId,
                userId,
                teamId,
                {
                  role: 'system',
                  content: `Search results: ${JSON.stringify(
                    results.map((r) => ({
                      name: r.product.name,
                      description: r.product.description,
                    }))
                  )}`,
                  metadata: { searchResults: results },
                }
              );
            } catch (error) {
              console.error('Error searching products:', error);
            }
          }
        }
      }
    },
  });

  return result;
}

/**
 * Get conversation summary and status
 *
 * Returns information about the current conversation state,
 * including whether product and ICP have been saved.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Conversation summary
 */
export async function getConversationSummary(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<{
  status: string;
  productSaved: boolean;
  icpSaved: boolean;
  productId?: string;
  icpId?: string;
}> {
  const messages = await conversationService.getMessages(
    conversationId,
    userId,
    teamId
  );

  // Find system messages indicating saved entities
  const productMessage = messages.find(
    (m) => m.role === 'system' && m.content.includes('Product saved')
  );
  const icpMessage = messages.find(
    (m) => m.role === 'system' && m.content.includes('ICP saved')
  );

  const conversation = await conversationService.getConversation(
    conversationId,
    userId,
    teamId
  );

  return {
    status: conversation?.status || 'active',
    productSaved: !!productMessage,
    icpSaved: !!icpMessage,
    productId: productMessage?.metadata?.productId,
    icpId: icpMessage?.metadata?.icpId,
  };
}
