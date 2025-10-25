import { streamText } from 'ai';
import { openai, AI_CONFIG } from '../../config/openai';
import { PRODUCT_DEFINER_SYSTEM_PROMPT, AgentType } from '../../utils/prompts';
import * as conversationService from '../aiConversations.service';
import * as productService from '../products.service';
import * as icpService from '../icps.service';
import prisma from '../../config/database';

/**
 * Product Definer AI Agent Service
 *
 * Conversational AI agent that helps users define their products and ICPs
 * through guided conversation. Uses function calling to save structured data.
 */

/**
 * Verify product access for a team
 *
 * @param productId - Product ID
 * @param teamId - Team ID
 * @returns True if product exists and belongs to team
 */
export async function verifyProductAccess(
  productId: string,
  teamId: string
): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      teamId: teamId,
    },
  });

  return !!product;
}

/**
 * Start a new product definition conversation
 *
 * Creates a new conversation session for the product definer agent.
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @param mode - Conversation mode: 'new_product' or 'new_icp'
 * @param productId - Product ID (required if mode is 'new_icp')
 * @returns Conversation ID
 */
export async function startConversation(
  userId: string,
  teamId: string,
  mode?: 'new_product' | 'new_icp',
  productId?: string
): Promise<string> {
  // Default mode to 'new_product' if not specified
  const conversationMode = mode || 'new_product';

  // Prepare metadata for conversation
  const metadata: any = {
    mode: conversationMode,
  };

  // If mode is new_icp, fetch product details for context
  let productName = '';
  if (conversationMode === 'new_icp' && productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (product) {
      metadata.productId = productId;
      metadata.productName = product.name;
      metadata.productDescription = product.description;
      productName = product.name;
    }
  }

  const conversation = await conversationService.createConversation({
    userId,
    teamId,
    agentType: AgentType.PRODUCT_DEFINER,
    contextType: 'general',
    metadata,
  });

  // Add initial system message based on mode
  let initialMessage = '';

  if (conversationMode === 'new_icp' && productName) {
    initialMessage = `Perfect! Let's define a new Ideal Customer Profile for **${productName}**.

Who specifically is this product for? Let's start with job titles - what roles do your ideal customers hold?`;
  } else {
    // Default to new product mode
    initialMessage = `Hello! I'm here to help you define your product and identify your ideal customers.

Let's start with your product. Could you tell me:
1. What is the name of your product or service?
2. What does it do or what problem does it solve?`;
  }

  // Don't add initial message here - it's handled by mobile app
  // The mobile app adds the appropriate message based on mode selection
  // await conversationService.addMessage(
  //   conversation.id,
  //   userId,
  //   teamId,
  //   {
  //     role: 'assistant',
  //     content: initialMessage,
  //   }
  // );

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

  // Get conversation to check mode
  const conversation = await conversationService.getConversation(
    conversationId,
    userId,
    teamId
  );

  const metadata = conversation?.metadata as any || {};
  const mode = metadata.mode || 'new_product';
  const contextProductId = metadata.productId;
  const contextProductName = metadata.productName;

  // Build system prompt based on mode
  let systemPrompt = PRODUCT_DEFINER_SYSTEM_PROMPT;

  if (mode === 'new_icp' && contextProductId) {
    // Custom system prompt for ICP-only mode
    systemPrompt = `You are a helpful AI assistant specialized in defining Ideal Customer Profiles (ICPs).

The user is creating a new ICP for an existing product: **${contextProductName}**.

${metadata.productDescription ? `Product Description: ${metadata.productDescription}` : ''}

Your goal is to help the user define a comprehensive ICP by gathering:

1. **Demographics**: Age range, location, job titles, education level, income level
2. **Firmographics**: Company size, industry, revenue, geography
3. **Psychographics**: Pain points, goals, motivations, challenges, values
4. **Behaviors**: Buying triggers, decision-making process, preferred channels

Ask one question at a time and keep the conversation natural and conversational.

IMPORTANT: When you have gathered sufficient information, use the save_icp tool with productId: "${contextProductId}"

Do NOT ask about product details - the product already exists. Focus ONLY on defining the ideal customer.`;
  }

  // Build conversation context with appropriate system prompt
  const messages = await conversationService.buildConversationContext(
    conversationId,
    userId,
    teamId,
    systemPrompt,
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

  const metadata = conversation?.metadata as any || {};
  const mode = metadata.mode || 'new_product';

  // For new_icp mode, return the productId from metadata (existing product)
  let productId = productMessage?.metadata?.productId;
  if (mode === 'new_icp' && metadata.productId) {
    productId = metadata.productId;
  }

  return {
    status: conversation?.status || 'active',
    productSaved: mode === 'new_product' ? !!productMessage : false,
    icpSaved: !!icpMessage,
    productId: productId,
    icpId: icpMessage?.metadata?.icpId,
  };
}
