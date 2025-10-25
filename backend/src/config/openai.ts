import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OpenAI Configuration
 * Manages OpenAI API client for embeddings, completions, and AI SDK streaming
 */

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client (for embeddings)
 */
export const initializeOpenAI = (): OpenAI => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    console.log('🔌 Initializing OpenAI client...');

    openaiClient = new OpenAI({
      apiKey,
    });

    console.log('✅ OpenAI client initialized successfully');

    return openaiClient;
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error);
    throw error;
  }
};

/**
 * Get OpenAI client instance (for embeddings)
 */
export const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    console.log('⚠️  OpenAI client not initialized, initializing now...');
    return initializeOpenAI();
  }
  return openaiClient;
};

/**
 * AI SDK Provider Configuration
 * Used for streaming chat completions with Vercel AI SDK
 */
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * AI SDK Streaming Configuration
 */
export const AI_CONFIG = {
  // Default model for AI agents
  model: 'gpt-4o-mini',

  // Streaming configuration
  streaming: {
    enabled: true,
  },

  // Retry configuration for API failures
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2,
  },

  // Temperature settings for different agent types
  temperature: {
    precise: 0.3,      // For data analysis, calculations
    balanced: 0.7,     // For general conversations
    creative: 0.9,     // For content generation
  },

  // Token limits
  maxTokens: {
    default: 2000,
    detailed: 4000,
    summary: 500,
  },
} as const;

/**
 * OpenAI model configurations
 */
export const OPENAI_MODELS = {
  // Embedding models
  EMBEDDING_ADA_002: 'text-embedding-ada-002',
  EMBEDDING_3_SMALL: 'text-embedding-3-small',
  EMBEDDING_3_LARGE: 'text-embedding-3-large',

  // Chat models
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  GPT_4: 'gpt-4',
  GPT_35_TURBO: 'gpt-3.5-turbo',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
} as const;

/**
 * Default embedding model
 */
export const DEFAULT_EMBEDDING_MODEL = OPENAI_MODELS.EMBEDDING_ADA_002;

/**
 * Default chat model
 */
export const DEFAULT_CHAT_MODEL = OPENAI_MODELS.GPT_4O_MINI;

/**
 * Model dimensions
 */
export const MODEL_DIMENSIONS = {
  [OPENAI_MODELS.EMBEDDING_ADA_002]: 1536,
  [OPENAI_MODELS.EMBEDDING_3_SMALL]: 1536,
  [OPENAI_MODELS.EMBEDDING_3_LARGE]: 3072,
} as const;

/**
 * Check OpenAI API health
 */
export const checkOpenAIHealth = async (): Promise<boolean> => {
  try {
    const client = getOpenAIClient();

    // Make a simple API call to verify connection
    await client.models.list();

    console.log('✅ OpenAI health check passed');
    return true;
  } catch (error) {
    console.error('❌ OpenAI health check failed:', error);
    return false;
  }
};

export default {
  initializeOpenAI,
  getOpenAIClient,
  checkOpenAIHealth,
  OPENAI_MODELS,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_CHAT_MODEL,
  MODEL_DIMENSIONS,
};
