import { PrismaClient, AIAgentConversation } from '@prisma/client';
import { AgentType } from '../utils/prompts';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * AI Agent Conversation Service
 *
 * Manages conversation history for AI agents, including:
 * - Creating new conversations with context
 * - Adding messages to conversation history (stored as JSON)
 * - Retrieving conversation and message history
 * - Updating conversation status
 * - Archiving conversations
 *
 * Note: Messages are stored as JSON array in the conversation record
 * for simplicity and atomic updates.
 */

/**
 * Message interface for JSON storage
 */
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string; // ISO string for JSON storage
}

export interface CreateConversationData {
  userId: string;
  teamId: string;
  agentType: AgentType;
  contextId?: string; // productId, campaignId, leadId, etc.
  contextType?: 'product' | 'campaign' | 'lead' | 'general';
}

export interface AddMessageData {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface ConversationWithMessages extends AIAgentConversation {
  parsedMessages: AIMessage[];
}

/**
 * Create a new AI conversation
 *
 * Starts a new conversation session with an AI agent. The conversation
 * is tied to a specific user, team, and agent type. Optionally can be
 * linked to a context (product, campaign, lead) for contextual assistance.
 *
 * @param data - Conversation creation data
 * @returns Created conversation
 */
export async function createConversation(
  data: CreateConversationData
): Promise<AIAgentConversation> {
  const { userId, teamId, agentType, contextId } = data;

  const conversation = await prisma.aIAgentConversation.create({
    data: {
      userId,
      teamId,
      agentType,
      contextId,
      status: 'active',
      messages: [], // Initialize with empty message array
    },
  });

  return conversation;
}

/**
 * Get a conversation by ID
 *
 * Retrieves a conversation with access control. Users can only access
 * conversations they created or that belong to their team.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @returns Conversation or null if not found
 */
export async function getConversation(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<AIAgentConversation | null> {
  const conversation = await prisma.aIAgentConversation.findFirst({
    where: {
      id: conversationId,
      teamId,
      OR: [
        { userId }, // User's own conversation
        // In future: add team-wide sharing logic
      ],
    },
  });

  return conversation;
}

/**
 * Get a conversation with parsed messages
 *
 * Retrieves conversation and parses JSON messages into typed array.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @returns Conversation with parsed messages or null
 */
export async function getConversationWithMessages(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<ConversationWithMessages | null> {
  const conversation = await getConversation(conversationId, userId, teamId);

  if (!conversation) {
    return null;
  }

  return {
    ...conversation,
    parsedMessages: parseMessages(conversation.messages),
  };
}

/**
 * List conversations for a user
 *
 * Retrieves all conversations for a user, optionally filtered by:
 * - Agent type
 * - Context ID
 * - Status
 *
 * @param userId - User ID
 * @param teamId - Team ID
 * @param filters - Optional filters
 * @returns List of conversations
 */
export async function listConversations(
  userId: string,
  teamId: string,
  filters?: {
    agentType?: AgentType;
    contextId?: string;
    status?: 'active' | 'completed' | 'archived';
  }
): Promise<AIAgentConversation[]> {
  const conversations = await prisma.aIAgentConversation.findMany({
    where: {
      teamId,
      userId,
      ...(filters?.agentType && { agentType: filters.agentType }),
      ...(filters?.contextId && { contextId: filters.contextId }),
      ...(filters?.status && { status: filters.status }),
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return conversations;
}

/**
 * Add a message to a conversation
 *
 * Appends a new message to the conversation's JSON message array.
 * Updates the conversation's updatedAt timestamp.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @param data - Message data
 * @returns Updated conversation
 */
export async function addMessage(
  conversationId: string,
  userId: string,
  teamId: string,
  data: AddMessageData
): Promise<AIAgentConversation> {
  // Verify user has access to this conversation
  const conversation = await getConversation(conversationId, userId, teamId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  // Parse existing messages
  const messages = parseMessages(conversation.messages);

  // Create new message
  const newMessage: AIMessage = {
    id: uuidv4(),
    role: data.role,
    content: data.content,
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
  };

  // Append to messages array
  messages.push(newMessage);

  // Update conversation with new messages
  const updated = await prisma.aIAgentConversation.update({
    where: { id: conversationId },
    data: {
      messages: messages as any, // Prisma stores as Json
      updatedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Get message history for a conversation
 *
 * Retrieves all messages in chronological order. Useful for:
 * - Displaying chat history to users
 * - Building context for AI agents
 * - Exporting conversation transcripts
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @returns List of messages
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<AIMessage[]> {
  const conversation = await getConversation(conversationId, userId, teamId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  return parseMessages(conversation.messages);
}

/**
 * Get recent messages for a conversation
 *
 * Retrieves the N most recent messages. Useful for building
 * conversation context with a sliding window approach.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @param count - Number of recent messages to retrieve
 * @returns List of recent messages (newest last)
 */
export async function getRecentMessages(
  conversationId: string,
  userId: string,
  teamId: string,
  count: number = 10
): Promise<AIMessage[]> {
  const messages = await getMessages(conversationId, userId, teamId);

  // Return last N messages
  return messages.slice(-count);
}

/**
 * Update conversation status
 *
 * Changes the status of a conversation:
 * - active: Ongoing conversation
 * - completed: Conversation finished successfully
 * - archived: User archived the conversation
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @param status - New status
 * @returns Updated conversation
 */
export async function updateConversationStatus(
  conversationId: string,
  userId: string,
  teamId: string,
  status: 'active' | 'completed' | 'archived'
): Promise<AIAgentConversation> {
  // Verify access
  const conversation = await getConversation(conversationId, userId, teamId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const updated = await prisma.aIAgentConversation.update({
    where: { id: conversationId },
    data: { status },
  });

  return updated;
}

/**
 * Archive a conversation
 *
 * Marks a conversation as archived. Archived conversations are hidden
 * from the main list but can still be retrieved if needed.
 * This is a soft delete - data is preserved.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @returns Updated conversation
 */
export async function deleteConversation(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<AIAgentConversation> {
  return updateConversationStatus(conversationId, userId, teamId, 'archived');
}

/**
 * Hard delete a conversation
 *
 * Permanently removes a conversation.
 * Use with caution - this cannot be undone.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 */
export async function hardDeleteConversation(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<void> {
  // Verify access
  const conversation = await getConversation(conversationId, userId, teamId);
  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  // Delete conversation
  await prisma.aIAgentConversation.delete({
    where: { id: conversationId },
  });
}

/**
 * Get conversation statistics
 *
 * Returns statistics about a conversation:
 * - Total message count
 * - Message count by role
 * - Duration
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @returns Conversation statistics
 */
export async function getConversationStats(
  conversationId: string,
  userId: string,
  teamId: string
): Promise<{
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  systemMessages: number;
  durationMinutes: number;
}> {
  const conversation = await getConversationWithMessages(
    conversationId,
    userId,
    teamId
  );

  if (!conversation) {
    throw new Error('Conversation not found or access denied');
  }

  const messages = conversation.parsedMessages;
  const totalMessages = messages.length;
  const userMessages = messages.filter((m) => m.role === 'user').length;
  const assistantMessages = messages.filter((m) => m.role === 'assistant').length;
  const systemMessages = messages.filter((m) => m.role === 'system').length;

  // Calculate duration from first to last message
  let durationMinutes = 0;
  if (messages.length > 0) {
    const firstMessage = new Date(messages[0].createdAt);
    const lastMessage = new Date(messages[messages.length - 1].createdAt);
    const durationMs = lastMessage.getTime() - firstMessage.getTime();
    durationMinutes = Math.round(durationMs / 1000 / 60);
  }

  return {
    totalMessages,
    userMessages,
    assistantMessages,
    systemMessages,
    durationMinutes,
  };
}

/**
 * Build conversation context for AI
 *
 * Formats conversation messages into the structure expected by AI SDK.
 * Optionally includes a system prompt and limits message history.
 *
 * @param conversationId - Conversation ID
 * @param userId - User ID for access control
 * @param teamId - Team ID for access control
 * @param systemPrompt - Optional system prompt to prepend
 * @param maxMessages - Maximum number of messages to include (for context window)
 * @returns Formatted messages for AI
 */
export async function buildConversationContext(
  conversationId: string,
  userId: string,
  teamId: string,
  systemPrompt?: string,
  maxMessages: number = 20
): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
  const messages = await getRecentMessages(conversationId, userId, teamId, maxMessages);

  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Prepend system prompt if provided
  if (systemPrompt) {
    return [
      { role: 'system', content: systemPrompt },
      ...formattedMessages,
    ];
  }

  return formattedMessages;
}

/**
 * Parse messages from JSON storage
 *
 * Handles the conversion from Prisma's Json type to typed message array.
 * Validates message structure and filters invalid entries.
 */
function parseMessages(messagesJson: any): AIMessage[] {
  if (!Array.isArray(messagesJson)) {
    return [];
  }

  return messagesJson.filter((msg) => {
    return (
      msg &&
      typeof msg === 'object' &&
      msg.id &&
      msg.role &&
      msg.content &&
      msg.createdAt
    );
  }) as AIMessage[];
}
