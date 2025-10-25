import { getOpenAIClient, DEFAULT_EMBEDDING_MODEL, MODEL_DIMENSIONS } from '../config/openai';
import crypto from 'crypto';

/**
 * Embedding Service
 * Generates vector embeddings using OpenAI's embedding models
 */

// In-memory cache for embeddings (could be replaced with Redis)
const embeddingCache = new Map<string, number[]>();

/**
 * Generate cache key for text
 */
const getCacheKey = (text: string, model: string): string => {
  return crypto
    .createHash('sha256')
    .update(`${model}:${text}`)
    .digest('hex');
};

/**
 * Generate embedding for a single text
 * @param text - Text to embed
 * @param model - OpenAI embedding model to use
 * @returns Vector embedding
 */
export const generateEmbedding = async (
  text: string,
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<number[]> => {
  try {
    // Check cache first
    const cacheKey = getCacheKey(text, model);
    const cached = embeddingCache.get(cacheKey);

    if (cached) {
      console.log('✅ Returning cached embedding');
      return cached;
    }

    console.log(`🔄 Generating embedding for text (${text.length} chars) with model: ${model}`);

    const client = getOpenAIClient();

    const response = await client.embeddings.create({
      model,
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    // Cache the result
    embeddingCache.set(cacheKey, embedding);

    console.log(`✅ Generated embedding (dimension: ${embedding.length})`);

    return embedding;
  } catch (error) {
    console.error('❌ Failed to generate embedding:', error);

    // Check for rate limit error
    if (error instanceof Error && error.message.includes('rate_limit')) {
      throw new Error('OpenAI rate limit exceeded. Please retry later.');
    }

    throw new Error('Failed to generate embedding');
  }
};

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @param model - OpenAI embedding model to use
 * @param batchSize - Number of texts to process in each API call
 * @returns Array of vector embeddings
 */
export const generateBatchEmbeddings = async (
  texts: string[],
  model: string = DEFAULT_EMBEDDING_MODEL,
  batchSize: number = 20
): Promise<number[][]> => {
  try {
    if (texts.length === 0) {
      return [];
    }

    console.log(`🔄 Generating embeddings for ${texts.length} texts in batches of ${batchSize}`);

    const client = getOpenAIClient();
    const embeddings: number[][] = [];

    // Check which texts are already cached
    const uncachedIndices: number[] = [];
    const cachedEmbeddings: Map<number, number[]> = new Map();

    texts.forEach((text, index) => {
      const cacheKey = getCacheKey(text, model);
      const cached = embeddingCache.get(cacheKey);

      if (cached) {
        cachedEmbeddings.set(index, cached);
      } else {
        uncachedIndices.push(index);
      }
    });

    console.log(`✅ Found ${cachedEmbeddings.size} cached embeddings, generating ${uncachedIndices.length} new ones`);

    // Process uncached texts in batches with retry logic
    const uncachedTexts = uncachedIndices.map(i => texts[i]);

    for (let i = 0; i < uncachedTexts.length; i += batchSize) {
      const batch = uncachedTexts.slice(i, i + batchSize);
      const batchIndices = uncachedIndices.slice(i, i + batchSize);

      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uncachedTexts.length / batchSize)}`);

          const response = await client.embeddings.create({
            model,
            input: batch,
            encoding_format: 'float',
          });

          // Store results and cache them
          response.data.forEach((item, batchIndex) => {
            const originalIndex = batchIndices[batchIndex];
            const embedding = item.embedding;

            cachedEmbeddings.set(originalIndex, embedding);

            // Cache the embedding
            const cacheKey = getCacheKey(texts[originalIndex], model);
            embeddingCache.set(cacheKey, embedding);
          });

          break; // Success, exit retry loop
        } catch (error) {
          retries++;

          if (error instanceof Error && error.message.includes('rate_limit')) {
            if (retries <= maxRetries) {
              const delay = Math.pow(2, retries) * 1000; // Exponential backoff
              console.log(`⏳ Rate limit hit, retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw new Error('OpenAI rate limit exceeded after retries. Please try again later.');
            }
          } else {
            throw error;
          }
        }
      }
    }

    // Reconstruct embeddings in original order
    for (let i = 0; i < texts.length; i++) {
      const embedding = cachedEmbeddings.get(i);
      if (!embedding) {
        throw new Error(`Missing embedding for text at index ${i}`);
      }
      embeddings.push(embedding);
    }

    console.log(`✅ Generated ${embeddings.length} embeddings successfully`);

    return embeddings;
  } catch (error) {
    console.error('❌ Failed to generate batch embeddings:', error);
    throw new Error('Failed to generate batch embeddings');
  }
};

/**
 * Get embedding dimension for a model
 * @param model - OpenAI embedding model
 * @returns Dimension of the embedding vectors
 */
export const getEmbeddingDimension = (model: string = DEFAULT_EMBEDDING_MODEL): number => {
  return MODEL_DIMENSIONS[model as keyof typeof MODEL_DIMENSIONS] || 1536;
};

/**
 * Clear embedding cache
 */
export const clearEmbeddingCache = (): void => {
  embeddingCache.clear();
  console.log('🗑️  Embedding cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: embeddingCache.size,
    entries: Array.from(embeddingCache.keys()).slice(0, 10), // First 10 keys
  };
};

/**
 * Validate embedding vector
 * @param embedding - Vector to validate
 * @param expectedDimension - Expected dimension
 */
export const validateEmbedding = (
  embedding: number[],
  expectedDimension?: number
): boolean => {
  if (!Array.isArray(embedding)) {
    return false;
  }

  if (embedding.length === 0) {
    return false;
  }

  if (expectedDimension && embedding.length !== expectedDimension) {
    return false;
  }

  // Check if all values are numbers
  return embedding.every(val => typeof val === 'number' && !isNaN(val));
};

export default {
  generateEmbedding,
  generateBatchEmbeddings,
  getEmbeddingDimension,
  clearEmbeddingCache,
  getCacheStats,
  validateEmbedding,
};
