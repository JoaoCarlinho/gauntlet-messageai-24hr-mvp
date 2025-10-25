import { Request, Response } from 'express';
import * as productsService from '../services/products.service';

/**
 * Product Controller
 * Handles HTTP requests for product management
 */

/**
 * POST /api/v1/products
 * Create a new product
 */
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.body;
    const { name, description, features, usps, pricing } = req.body;

    // Validation
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Validate arrays if provided
    if (features && !Array.isArray(features)) {
      return res.status(400).json({ error: 'Features must be an array' });
    }

    if (usps && !Array.isArray(usps)) {
      return res.status(400).json({ error: 'USPs must be an array' });
    }

    const product = await productsService.createProduct(teamId, {
      name,
      description,
      features,
      usps,
      pricing,
    });

    res.status(201).json({ product });
  } catch (error) {
    console.error('Error creating product:', error);
    const message = error instanceof Error ? error.message : 'Failed to create product';
    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/products
 * List all products for a team
 */
export const listProducts = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const products = await productsService.listProducts(teamId);

    res.status(200).json({ products });
  } catch (error) {
    console.error('Error listing products:', error);
    const message = error instanceof Error ? error.message : 'Failed to list products';
    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/products/:id
 * Get a specific product by ID
 */
export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const product = await productsService.getProduct(id, teamId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ product });
  } catch (error) {
    console.error('Error getting product:', error);
    const message = error instanceof Error ? error.message : 'Failed to get product';
    res.status(500).json({ error: message });
  }
};

/**
 * PUT /api/v1/products/:id
 * Update a product
 */
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, name, description, features, usps, pricing } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Validate arrays if provided
    if (features !== undefined && !Array.isArray(features)) {
      return res.status(400).json({ error: 'Features must be an array' });
    }

    if (usps !== undefined && !Array.isArray(usps)) {
      return res.status(400).json({ error: 'USPs must be an array' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (features !== undefined) updateData.features = features;
    if (usps !== undefined) updateData.usps = usps;
    if (pricing !== undefined) updateData.pricing = pricing;

    const product = await productsService.updateProduct(id, teamId, updateData);

    res.status(200).json({ product });
  } catch (error) {
    console.error('Error updating product:', error);
    const message = error instanceof Error ? error.message : 'Failed to update product';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * DELETE /api/v1/products/:id
 * Delete a product
 */
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    await productsService.deleteProduct(id, teamId);

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete product';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/products/search?q=query&teamId=xxx
 * Semantic search across products
 */
export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q, teamId, limit } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const topK = limit ? parseInt(limit as string, 10) : 5;

    if (isNaN(topK) || topK < 1 || topK > 50) {
      return res.status(400).json({ error: 'Limit must be between 1 and 50' });
    }

    const results = await productsService.searchProducts(teamId, q, topK);

    res.status(200).json({ results });
  } catch (error) {
    console.error('Error searching products:', error);
    const message = error instanceof Error ? error.message : 'Failed to search products';
    res.status(500).json({ error: message });
  }
};

export default {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
};
