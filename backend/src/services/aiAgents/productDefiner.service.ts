import { z } from 'zod';
import { getOpenAIClient, AI_CONFIG } from '../../config/openai';
import { PRODUCT_DEFINER_SYSTEM_PROMPT, AgentType } from '../../utils/prompts';
import * as conversationService from '../aiConversations.service';
import * as productService from '../products.service';
import * as icpService from '../icps.service';
import prisma from '../../config/database';
import type { Response } from 'express';

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

  // Initial messages are handled by mobile app
  // The mobile app adds the appropriate message based on mode selection

  return conversation.id;
}

/**
 * AI Tools for Product Definer
 *
 * These tools allow the AI to save structured product and ICP data
 * to the database during the conversation.
 *
 * Defined using OpenAI's function calling format (JSON Schema)
 */
const productDefinerTools = [
  {
    type: 'function' as const,
    function: {
      name: 'save_product',
      description: 'Save a product definition to the database. Call this when you have gathered comprehensive product information including name, description, features, pricing, and unique selling propositions.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Product name',
          },
          description: {
            type: 'string',
            description: 'Detailed product description',
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of key product features',
          },
          pricing: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Pricing model (e.g., subscription, one-time, usage-based)',
              },
              details: {
                type: 'string',
                description: 'Pricing details and structure',
              },
            },
            required: ['model', 'details'],
            description: 'Pricing structure',
          },
          usps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Unique selling propositions that differentiate this product',
          },
        },
        required: ['name', 'description', 'features', 'pricing', 'usps'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'save_icp',
      description: 'Save an Ideal Customer Profile (ICP) to the database. Call this when you have gathered comprehensive information about the target customer including demographics, firmographics, psychographics, and behaviors.',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: 'ID of the product this ICP is for',
          },
          name: {
            type: 'string',
            description: 'Name/title for this ICP',
          },
          demographics: {
            type: 'object',
            properties: {
              ageRange: { type: 'string', description: 'Age range of target customers' },
              location: { type: 'string', description: 'Geographic location' },
              jobTitles: { type: 'array', items: { type: 'string' }, description: 'Common job titles' },
              education: { type: 'string', description: 'Education level' },
              income: { type: 'string', description: 'Income level or range' },
            },
            description: 'Demographic characteristics',
          },
          firmographics: {
            type: 'object',
            properties: {
              companySize: { type: 'string', description: 'Company size range' },
              industry: { type: 'array', items: { type: 'string' }, description: 'Target industries' },
              revenue: { type: 'string', description: 'Company revenue range' },
              geography: { type: 'string', description: 'Geographic market' },
            },
            description: 'Firmographic characteristics (for B2B)',
          },
          psychographics: {
            type: 'object',
            properties: {
              painPoints: { type: 'array', items: { type: 'string' }, description: 'Key pain points and challenges' },
              goals: { type: 'array', items: { type: 'string' }, description: 'Goals and objectives' },
              motivations: { type: 'array', items: { type: 'string' }, description: 'Buying motivations' },
              challenges: { type: 'array', items: { type: 'string' }, description: 'Challenges they face' },
              values: { type: 'array', items: { type: 'string' }, description: 'Core values' },
            },
            description: 'Psychographic characteristics',
          },
          behaviors: {
            type: 'object',
            properties: {
              buyingTriggers: { type: 'array', items: { type: 'string' }, description: 'Events that trigger buying decisions' },
              decisionProcess: { type: 'string', description: 'How they make buying decisions' },
              preferredChannels: { type: 'array', items: { type: 'string' }, description: 'Preferred communication and buying channels' },
              influencers: { type: 'array', items: { type: 'string' }, description: 'Who or what influences their decisions' },
            },
            description: 'Behavioral patterns',
          },
        },
        required: ['productId', 'name'],
      },
    },
  },
];

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
 * @param res - Express Response object for streaming
 */
export async function processMessage(
  conversationId: string,
  userId: string,
  teamId: string,
  userMessage: string,
  res: Response
) {
  const openaiClient = getOpenAIClient();

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

  const metadata = (conversation as any)?.metadata || {};
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

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Call OpenAI streaming API with function calling
    const stream = await openaiClient.chat.completions.create({
      model: AI_CONFIG.model,
      messages: messages as any,
      temperature: AI_CONFIG.temperature.balanced,
      tools: productDefinerTools,
      tool_choice: 'auto',
      stream: true,
    });

    let fullText = '';
    let toolCalls: any[] = [];
    let currentToolCall: any = null;

    // Process the stream
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Handle text content
      if (delta?.content) {
        fullText += delta.content;
        // Send text chunk to client (use 'content' type and 'delta' field for mobile compatibility)
        res.write(`data: ${JSON.stringify({ type: 'content', delta: delta.content })}\n\n`);
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          if (toolCallDelta.index !== undefined) {
            // New tool call or continuing existing one
            if (!currentToolCall || currentToolCall.index !== toolCallDelta.index) {
              if (currentToolCall) {
                toolCalls.push(currentToolCall);
              }
              currentToolCall = {
                index: toolCallDelta.index,
                id: toolCallDelta.id || '',
                type: 'function',
                function: {
                  name: toolCallDelta.function?.name || '',
                  arguments: toolCallDelta.function?.arguments || '',
                },
              };
            } else {
              // Accumulate arguments
              if (toolCallDelta.function?.arguments) {
                currentToolCall.function.arguments += toolCallDelta.function.arguments;
              }
              if (toolCallDelta.function?.name) {
                currentToolCall.function.name = toolCallDelta.function.name;
              }
            }
          }
        }
      }

      // Check if stream is done
      if (chunk.choices[0]?.finish_reason) {
        if (currentToolCall) {
          toolCalls.push(currentToolCall);
        }
        break;
      }
    }

    // Save assistant's response to conversation
    await conversationService.addMessage(
      conversationId,
      userId,
      teamId,
      {
        role: 'assistant',
        content: fullText,
        metadata: {
          toolCalls: toolCalls.map((tc: any) => ({
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments || '{}'),
          })),
        },
      }
    );

    // Handle tool calls and save to database
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`🔧 Tool call: ${functionName}`, functionArgs);

        // Save product
        if (functionName === 'save_product') {
          try {
            const product = await productService.createProduct(
              teamId,
              {
                name: functionArgs.name,
                description: functionArgs.description,
                features: functionArgs.features,
                pricing: functionArgs.pricing,
                usps: functionArgs.usps,
              }
            );

            console.log('✅ Product saved:', product.id);

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

            // Send tool result to client
            res.write(`data: ${JSON.stringify({
              type: 'tool_result',
              tool: 'save_product',
              success: true,
              productId: product.id
            })}\n\n`);
          } catch (error) {
            console.error('❌ Error saving product:', error);
            await conversationService.addMessage(
              conversationId,
              userId,
              teamId,
              {
                role: 'system',
                content: 'Error saving product. Please try again.',
              }
            );

            res.write(`data: ${JSON.stringify({
              type: 'tool_result',
              tool: 'save_product',
              success: false,
              error: 'Failed to save product'
            })}\n\n`);
          }
        }

        // Save ICP
        if (functionName === 'save_icp') {
          try {
            const icp = await icpService.createICP(
              functionArgs.productId,
              teamId,
              {
                name: functionArgs.name,
                demographics: functionArgs.demographics,
                firmographics: functionArgs.firmographics,
                psychographics: functionArgs.psychographics,
                behaviors: functionArgs.behaviors,
              }
            );

            console.log('✅ ICP saved:', icp.id);

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

            // Send tool result to client
            res.write(`data: ${JSON.stringify({
              type: 'tool_result',
              tool: 'save_icp',
              success: true,
              icpId: icp.id
            })}\n\n`);
          } catch (error) {
            console.error('❌ Error saving ICP:', error);
            await conversationService.addMessage(
              conversationId,
              userId,
              teamId,
              {
                role: 'system',
                content: 'Error saving ICP. Please try again.',
              }
            );

            res.write(`data: ${JSON.stringify({
              type: 'tool_result',
              tool: 'save_icp',
              success: false,
              error: 'Failed to save ICP'
            })}\n\n`);
          }
        }
      }
    }

    // Send complete event (mobile expects 'complete' type, not 'done')
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('❌ Error in processMessage:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })}\n\n`);
    res.end();
  }
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

  const metadata = (conversation as any)?.metadata || {};
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

/**
 * Complete a product definer conversation
 *
 * Marks the conversation as completed. This is called when the user
 * clicks "Complete & Save" button. The actual product/ICP saving happens
 * via AI tool calls during the conversation, not here.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID
 * @param teamId - Team ID
 * @returns Conversation summary with saved entity IDs
 */
export async function completeConversation(
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
  // Mark conversation as completed
  await conversationService.updateConversationStatus(
    conversationId,
    userId,
    teamId,
    'completed'
  );

  // Get and return summary
  const summary = await getConversationSummary(
    conversationId,
    userId,
    teamId
  );

  return {
    ...summary,
    status: 'completed',
  };
}
