import { getPineconeIndex } from '../config/pinecone';
import { generateEmbedding } from './embedding.service';
import { RecordMetadata } from '@pinecone-database/pinecone';

/**
 * Vector Database Service
 * CRUD operations for vector storage in Pinecone
 */

export interface VectorMetadata extends RecordMetadata {
  teamId?: string;
  type?: string;
  text?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: VectorMetadata;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

export interface QueryFilter {
  teamId?: string;
  type?: string;
  [key: string]: any;
}

/**
 * Upsert a single vector into Pinecone
 * @param namespace - Namespace for data isolation (e.g., team_{teamId}_products)
 * @param id - Unique identifier for the vector
 * @param vector - Embedding vector
 * @param metadata - Associated metadata
 */
export const upsertVector = async (
  namespace: string,
  id: string,
  vector: number[],
  metadata: VectorMetadata = {}
): Promise<void> => {
  try {
    const index = getPineconeIndex();

    console.log(`📝 Upserting vector to namespace "${namespace}" with id: ${id}`);

    await index.namespace(namespace).upsert([
      {
        id,
        values: vector,
        metadata,
      },
    ]);

    console.log(`✅ Vector upserted successfully`);
  } catch (error) {
    console.error('❌ Failed to upsert vector:', error);
    throw new Error('Failed to upsert vector');
  }
};

/**
 * Upsert multiple vectors in batch
 * @param namespace - Namespace for data isolation
 * @param vectors - Array of vector records
 */
export const upsertBatch = async (
  namespace: string,
  vectors: VectorRecord[]
): Promise<void> => {
  try {
    if (vectors.length === 0) {
      console.log('⚠️  No vectors to upsert');
      return;
    }

    const index = getPineconeIndex();

    console.log(`📝 Upserting batch of ${vectors.length} vectors to namespace "${namespace}"`);

    // Pinecone recommends batches of 100 vectors
    const batchSize = 100;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);

      await index.namespace(namespace).upsert(batch);

      console.log(`✅ Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    }

    console.log(`✅ All ${vectors.length} vectors upserted successfully`);
  } catch (error) {
    console.error('❌ Failed to upsert batch:', error);
    throw new Error('Failed to upsert batch');
  }
};

/**
 * Query vectors for semantic search
 * @param namespace - Namespace to query
 * @param queryVector - Query embedding vector
 * @param topK - Number of results to return
 * @param filter - Metadata filters
 * @param includeMetadata - Whether to include metadata in results
 */
export const queryVectors = async (
  namespace: string,
  queryVector: number[],
  topK: number = 10,
  filter?: QueryFilter,
  includeMetadata: boolean = true
): Promise<QueryResult[]> => {
  try {
    const index = getPineconeIndex();

    console.log(`🔍 Querying namespace "${namespace}" for top ${topK} results`);

    const queryResponse = await index.namespace(namespace).query({
      vector: queryVector,
      topK,
      filter,
      includeMetadata,
    });

    const results: QueryResult[] = queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as VectorMetadata,
    }));

    console.log(`✅ Found ${results.length} results`);

    return results;
  } catch (error) {
    console.error('❌ Failed to query vectors:', error);
    throw new Error('Failed to query vectors');
  }
};

/**
 * Delete a single vector
 * @param namespace - Namespace containing the vector
 * @param id - Vector ID to delete
 */
export const deleteVector = async (
  namespace: string,
  id: string
): Promise<void> => {
  try {
    const index = getPineconeIndex();

    console.log(`🗑️  Deleting vector "${id}" from namespace "${namespace}"`);

    await index.namespace(namespace).deleteOne(id);

    console.log(`✅ Vector deleted successfully`);
  } catch (error) {
    console.error('❌ Failed to delete vector:', error);
    throw new Error('Failed to delete vector');
  }
};

/**
 * Delete multiple vectors
 * @param namespace - Namespace containing the vectors
 * @param ids - Array of vector IDs to delete
 */
export const deleteVectors = async (
  namespace: string,
  ids: string[]
): Promise<void> => {
  try {
    if (ids.length === 0) {
      console.log('⚠️  No vectors to delete');
      return;
    }

    const index = getPineconeIndex();

    console.log(`🗑️  Deleting ${ids.length} vectors from namespace "${namespace}"`);

    await index.namespace(namespace).deleteMany(ids);

    console.log(`✅ Vectors deleted successfully`);
  } catch (error) {
    console.error('❌ Failed to delete vectors:', error);
    throw new Error('Failed to delete vectors');
  }
};

/**
 * Delete entire namespace (clear all team data)
 * @param namespace - Namespace to delete
 */
export const deleteNamespace = async (namespace: string): Promise<void> => {
  try {
    const index = getPineconeIndex();

    console.log(`🗑️  Deleting all vectors from namespace "${namespace}"`);

    await index.namespace(namespace).deleteAll();

    console.log(`✅ Namespace cleared successfully`);
  } catch (error) {
    console.error('❌ Failed to delete namespace:', error);
    throw new Error('Failed to delete namespace');
  }
};

/**
 * Helper: Vectorize text and store in one operation
 * @param text - Text to vectorize and store
 * @param namespace - Namespace for storage
 * @param id - Unique identifier
 * @param metadata - Associated metadata
 */
export const vectorizeAndStore = async (
  text: string,
  namespace: string,
  id: string,
  metadata: VectorMetadata = {}
): Promise<void> => {
  try {
    console.log(`🔄 Vectorizing and storing text (${text.length} chars)`);

    // Generate embedding
    const vector = await generateEmbedding(text);

    // Add text to metadata for reference
    const enrichedMetadata: VectorMetadata = {
      ...metadata,
      text,
      createdAt: new Date().toISOString(),
    };

    // Store in Pinecone
    await upsertVector(namespace, id, vector, enrichedMetadata);

    console.log(`✅ Text vectorized and stored successfully`);
  } catch (error) {
    console.error('❌ Failed to vectorize and store:', error);
    throw new Error('Failed to vectorize and store text');
  }
};

/**
 * Helper: Search by text (generates embedding and queries)
 * @param text - Query text
 * @param namespace - Namespace to search
 * @param topK - Number of results
 * @param filter - Metadata filters
 */
export const searchByText = async (
  text: string,
  namespace: string,
  topK: number = 10,
  filter?: QueryFilter
): Promise<QueryResult[]> => {
  try {
    console.log(`🔍 Searching by text: "${text.substring(0, 50)}..."`);

    // Generate embedding for query text
    const queryVector = await generateEmbedding(text);

    // Query Pinecone
    const results = await queryVectors(namespace, queryVector, topK, filter);

    console.log(`✅ Search completed, found ${results.length} results`);

    return results;
  } catch (error) {
    console.error('❌ Failed to search by text:', error);
    throw new Error('Failed to search by text');
  }
};

/**
 * Namespace helper functions
 */
export const buildNamespace = (teamId: string, type: string): string => {
  return `team_${teamId}_${type}`;
};

export const NAMESPACE_TYPES = {
  PRODUCTS: 'products',
  ICPS: 'icps',
  CAMPAIGNS: 'campaigns',
  DISCOVERY: 'discovery',
  KNOWLEDGE: 'knowledge',
} as const;

/**
 * Get namespace for a team and type
 */
export const getTeamNamespace = (
  teamId: string,
  type: keyof typeof NAMESPACE_TYPES
): string => {
  return buildNamespace(teamId, NAMESPACE_TYPES[type]);
};

/**
 * Fetch vector by ID
 * @param namespace - Namespace containing the vector
 * @param id - Vector ID
 */
export const fetchVector = async (
  namespace: string,
  id: string
): Promise<VectorRecord | null> => {
  try {
    const index = getPineconeIndex();

    console.log(`📥 Fetching vector "${id}" from namespace "${namespace}"`);

    const fetchResponse = await index.namespace(namespace).fetch([id]);

    const record = fetchResponse.records[id];

    if (!record) {
      console.log(`⚠️  Vector not found`);
      return null;
    }

    console.log(`✅ Vector fetched successfully`);

    return {
      id: record.id,
      values: record.values || [],
      metadata: record.metadata as VectorMetadata,
    };
  } catch (error) {
    console.error('❌ Failed to fetch vector:', error);
    throw new Error('Failed to fetch vector');
  }
};

/**
 * Update vector metadata (upsert with same vector)
 * @param namespace - Namespace containing the vector
 * @param id - Vector ID
 * @param metadata - New metadata
 */
export const updateVectorMetadata = async (
  namespace: string,
  id: string,
  metadata: VectorMetadata
): Promise<void> => {
  try {
    // Fetch existing vector
    const existing = await fetchVector(namespace, id);

    if (!existing) {
      throw new Error('Vector not found');
    }

    // Upsert with updated metadata
    await upsertVector(namespace, id, existing.values, {
      ...existing.metadata,
      ...metadata,
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Vector metadata updated successfully`);
  } catch (error) {
    console.error('❌ Failed to update vector metadata:', error);
    throw new Error('Failed to update vector metadata');
  }
};

export default {
  upsertVector,
  upsertBatch,
  queryVectors,
  deleteVector,
  deleteVectors,
  deleteNamespace,
  vectorizeAndStore,
  searchByText,
  buildNamespace,
  getTeamNamespace,
  fetchVector,
  updateVectorMetadata,
  NAMESPACE_TYPES,
};
