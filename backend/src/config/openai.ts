import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OpenAI Configuration
 * Manages OpenAI API client for embeddings and completions
 */

let openaiClient: OpenAI | null = null;

/**
 * Initialize OpenAI client
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
 * Get OpenAI client instance
 */
export const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    console.log('⚠️  OpenAI client not initialized, initializing now...');
    return initializeOpenAI();
  }
  return openaiClient;
};

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
