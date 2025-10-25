import prisma from '../config/database';
import { Product } from '@prisma/client';
import { vectorizeAndStore, searchByText, deleteVector, getTeamNamespace } from './vectorDb.service';
import { VectorMetadata } from './vectorDb.service';

/**
 * Product Service
 * Business logic for product management with vector embeddings
 */

export interface CreateProductData {
  name: string;
  description: string;
  features?: string[];
  usps?: string[];
  pricing?: any;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  features?: string[];
  usps?: string[];
  pricing?: any;
}

/**
 * Build vectorization text from product data
 */
const buildProductVectorText = (data: CreateProductData | UpdateProductData): string => {
  const parts: string[] = [];

  if (data.name) {
    parts.push(`Product: ${data.name}`);
  }

  if (data.description) {
    parts.push(`Description: ${data.description}`);
  }

  if (data.features && data.features.length > 0) {
    parts.push(`Features: ${data.features.join(', ')}`);
  }

  if (data.usps && data.usps.length > 0) {
    parts.push(`USPs: ${data.usps.join(', ')}`);
  }

  return parts.join('\n');
};

/**
 * Create a new product and vectorize its description
 * @param teamId - Team ID
 * @param data - Product data
 * @returns Created product
 */
export const createProduct = async (
  teamId: string,
  data: CreateProductData
): Promise<Product> => {
  try {
    console.log(`📦 Creating product for team ${teamId}: ${data.name}`);

    // Create product in database
    const product = await prisma.product.create({
      data: {
        teamId,
        name: data.name,
        description: data.description,
        features: data.features || [],
        usps: data.usps || [],
        pricing: data.pricing || {},
      },
    });

    // Vectorize product information
    try {
      const vectorText = buildProductVectorText(data);
      const namespace = getTeamNamespace(teamId, 'PRODUCTS');

      const vectorMetadata: VectorMetadata = {
        teamId,
        type: 'product',
        productId: product.id,
        name: product.name,
        text: vectorText,
        createdAt: new Date().toISOString(),
      };

      await vectorizeAndStore(vectorText, namespace, product.id, vectorMetadata);

      console.log(`✅ Product vectorized and stored`);
    } catch (vectorError) {
      console.error('⚠️  Failed to vectorize product:', vectorError);
      // Don't fail product creation if vectorization fails
    }

    console.log(`✅ Product created successfully: ${product.id}`);

    return product;
  } catch (error) {
    console.error('❌ Failed to create product:', error);
    throw new Error('Failed to create product');
  }
};

/**
 * Get product by ID
 * @param productId - Product ID
 * @param teamId - Team ID for access control
 * @returns Product or null
 */
export const getProduct = async (
  productId: string,
  teamId: string
): Promise<Product | null> => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        teamId,
      },
      include: {
        icps: {
          select: {
            id: true,
            name: true,
            demographics: true,
            firmographics: true,
          },
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            platforms: true,
          },
        },
      },
    });

    return product;
  } catch (error) {
    console.error('❌ Failed to get product:', error);
    throw new Error('Failed to get product');
  }
};

/**
 * List all products for a team
 * @param teamId - Team ID
 * @returns Array of products
 */
export const listProducts = async (teamId: string): Promise<Product[]> => {
  try {
    const products = await prisma.product.findMany({
      where: { teamId },
      include: {
        _count: {
          select: {
            icps: true,
            campaigns: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products;
  } catch (error) {
    console.error('❌ Failed to list products:', error);
    throw new Error('Failed to list products');
  }
};

/**
 * Update product and re-vectorize
 * @param productId - Product ID
 * @param teamId - Team ID for access control
 * @param data - Updated product data
 * @returns Updated product
 */
export const updateProduct = async (
  productId: string,
  teamId: string,
  data: UpdateProductData
): Promise<Product> => {
  try {
    // Verify product belongs to team
    const existingProduct = await prisma.product.findFirst({
      where: { id: productId, teamId },
    });

    if (!existingProduct) {
      throw new Error('Product not found or access denied');
    }

    console.log(`📝 Updating product ${productId}`);

    // Update product in database
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Re-vectorize if relevant fields changed
    const shouldRevectorize =
      data.name ||
      data.description ||
      data.features ||
      data.usps;

    if (shouldRevectorize) {
      try {
        // Build updated vector text with all current data
        const vectorData = {
          name: product.name,
          description: product.description,
          features: product.features as string[],
          usps: product.usps as string[],
        };

        const vectorText = buildProductVectorText(vectorData);
        const namespace = getTeamNamespace(teamId, 'PRODUCTS');

        const vectorMetadata: VectorMetadata = {
          teamId,
          type: 'product',
          productId: product.id,
          name: product.name,
          text: vectorText,
          updatedAt: new Date().toISOString(),
        };

        await vectorizeAndStore(vectorText, namespace, product.id, vectorMetadata);

        console.log(`✅ Product re-vectorized`);
      } catch (vectorError) {
        console.error('⚠️  Failed to re-vectorize product:', vectorError);
        // Don't fail update if vectorization fails
      }
    }

    console.log(`✅ Product updated successfully`);

    return product;
  } catch (error) {
    console.error('❌ Failed to update product:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update product');
  }
};

/**
 * Delete product and its vectors
 * @param productId - Product ID
 * @param teamId - Team ID for access control
 */
export const deleteProduct = async (
  productId: string,
  teamId: string
): Promise<void> => {
  try {
    // Verify product belongs to team
    const product = await prisma.product.findFirst({
      where: { id: productId, teamId },
    });

    if (!product) {
      throw new Error('Product not found or access denied');
    }

    console.log(`🗑️  Deleting product ${productId}`);

    // Delete product from database (cascade will delete related ICPs and campaigns)
    await prisma.product.delete({
      where: { id: productId },
    });

    // Delete vector from Pinecone
    try {
      const namespace = getTeamNamespace(teamId, 'PRODUCTS');
      await deleteVector(namespace, productId);
      console.log(`✅ Product vector deleted`);
    } catch (vectorError) {
      console.error('⚠️  Failed to delete product vector:', vectorError);
      // Don't fail deletion if vector deletion fails
    }

    console.log(`✅ Product deleted successfully`);
  } catch (error) {
    console.error('❌ Failed to delete product:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete product');
  }
};

/**
 * Semantic search across products
 * @param teamId - Team ID
 * @param query - Search query text
 * @param topK - Number of results to return
 * @returns Array of matching products with scores
 */
export const searchProducts = async (
  teamId: string,
  query: string,
  topK: number = 5
): Promise<Array<{ product: Product; score: number }>> => {
  try {
    console.log(`🔍 Searching products for team ${teamId}: "${query}"`);

    // Perform semantic search in vector database
    const namespace = getTeamNamespace(teamId, 'PRODUCTS');
    const results = await searchByText(query, namespace, topK, { teamId });

    // Fetch full product details for matching results
    const productResults = await Promise.all(
      results.map(async (result) => {
        const productId = result.id;
        const product = await prisma.product.findUnique({
          where: { id: productId },
          include: {
            _count: {
              select: {
                icps: true,
                campaigns: true,
              },
            },
          },
        });

        return {
          product: product!,
          score: result.score,
        };
      })
    );

    // Filter out any null results (deleted products)
    const validResults = productResults.filter((r) => r.product !== null);

    console.log(`✅ Found ${validResults.length} matching products`);

    return validResults;
  } catch (error) {
    console.error('❌ Failed to search products:', error);
    throw new Error('Failed to search products');
  }
};

export default {
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
};
