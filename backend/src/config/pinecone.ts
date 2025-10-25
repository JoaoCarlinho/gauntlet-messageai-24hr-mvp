import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Pinecone Configuration
 * Manages vector database connection for semantic search and embeddings
 */

let pineconeClient: Pinecone | null = null;

/**
 * Initialize Pinecone client
 */
export const initializePinecone = async (): Promise<Pinecone> => {
  try {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }

    console.log('🔌 Initializing Pinecone client...');

    pineconeClient = new Pinecone({
      apiKey,
    });

    console.log('✅ Pinecone client initialized successfully');

    // Perform health check
    await checkPineconeHealth();

    return pineconeClient;
  } catch (error) {
    console.error('❌ Failed to initialize Pinecone:', error);
    throw error;
  }
};

/**
 * Get Pinecone client instance
 */
export const getPineconeClient = (): Pinecone => {
  if (!pineconeClient) {
    throw new Error('Pinecone client not initialized. Call initializePinecone() first.');
  }
  return pineconeClient;
};

/**
 * Get Pinecone index
 * @param indexName - Name of the index to connect to
 */
export const getPineconeIndex = (indexName?: string) => {
  const client = getPineconeClient();
  const name = indexName || process.env.PINECONE_INDEX_NAME || 'messageai-vectors';

  return client.index(name);
};

/**
 * Check Pinecone connection health
 */
export const checkPineconeHealth = async (): Promise<boolean> => {
  try {
    if (!pineconeClient) {
      console.warn('⚠️  Pinecone client not initialized');
      return false;
    }

    // List indexes to verify connection
    const indexes = await pineconeClient.listIndexes();
    console.log('✅ Pinecone health check passed');
    console.log(`📊 Available indexes: ${indexes.indexes?.map(idx => idx.name).join(', ') || 'none'}`);

    // Check if our index exists
    const indexName = process.env.PINECONE_INDEX_NAME || 'messageai-vectors';
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

    if (!indexExists) {
      console.warn(`⚠️  Index "${indexName}" not found. You may need to create it.`);
      console.log('To create an index, visit: https://app.pinecone.io/');
    } else {
      console.log(`✅ Index "${indexName}" is available`);
    }

    return true;
  } catch (error) {
    console.error('❌ Pinecone health check failed:', error);
    return false;
  }
};

/**
 * Create a new Pinecone index
 * @param indexName - Name for the new index
 * @param dimension - Vector dimension (e.g., 1536 for OpenAI text-embedding-ada-002)
 * @param metric - Distance metric (cosine, euclidean, dotproduct)
 */
export const createPineconeIndex = async (
  indexName: string,
  dimension: number = 1536,
  metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
): Promise<void> => {
  try {
    const client = getPineconeClient();

    console.log(`📝 Creating Pinecone index: ${indexName}`);
    console.log(`   - Dimension: ${dimension}`);
    console.log(`   - Metric: ${metric}`);

    await client.createIndex({
      name: indexName,
      dimension,
      metric,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });

    console.log(`✅ Index "${indexName}" created successfully`);
    console.log('⏳ Note: Index may take a few moments to be fully ready');
  } catch (error) {
    console.error('❌ Failed to create Pinecone index:', error);
    throw error;
  }
};

/**
 * Delete a Pinecone index
 * @param indexName - Name of the index to delete
 */
export const deletePineconeIndex = async (indexName: string): Promise<void> => {
  try {
    const client = getPineconeClient();

    console.log(`🗑️  Deleting Pinecone index: ${indexName}`);

    await client.deleteIndex(indexName);

    console.log(`✅ Index "${indexName}" deleted successfully`);
  } catch (error) {
    console.error('❌ Failed to delete Pinecone index:', error);
    throw error;
  }
};

/**
 * Get index statistics
 * @param indexName - Name of the index
 */
export const getIndexStats = async (indexName?: string) => {
  try {
    const index = getPineconeIndex(indexName);
    const stats = await index.describeIndexStats();

    console.log('📊 Index Statistics:');
    console.log(`   - Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`   - Dimension: ${stats.dimension || 'unknown'}`);
    console.log(`   - Index fullness: ${((stats.indexFullness || 0) * 100).toFixed(2)}%`);

    return stats;
  } catch (error) {
    console.error('❌ Failed to get index stats:', error);
    throw error;
  }
};

export default {
  initializePinecone,
  getPineconeClient,
  getPineconeIndex,
  checkPineconeHealth,
  createPineconeIndex,
  deletePineconeIndex,
  getIndexStats,
};
