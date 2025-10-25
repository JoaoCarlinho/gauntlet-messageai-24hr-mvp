import { Request, Response } from 'express';
import * as icpsService from '../services/icps.service';

/**
 * ICP Controller
 * Handles HTTP requests for ICP (Ideal Customer Profile) management
 */

/**
 * POST /api/v1/products/:productId/icps
 * Create a new ICP for a product
 */
export const createICP = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { teamId, name, demographics, firmographics, psychographics, behaviors } = req.body;

    // Validation
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const icp = await icpsService.createICP(productId, teamId, {
      name,
      demographics,
      firmographics,
      psychographics,
      behaviors,
    });

    res.status(201).json({ icp });
  } catch (error) {
    console.error('Error creating ICP:', error);
    const message = error instanceof Error ? error.message : 'Failed to create ICP';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/products/:productId/icps
 * List all ICPs for a product
 */
export const listICPs = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const icps = await icpsService.listICPs(productId, teamId);

    res.status(200).json({ icps });
  } catch (error) {
    console.error('Error listing ICPs:', error);
    const message = error instanceof Error ? error.message : 'Failed to list ICPs';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/icps/:id
 * Get a specific ICP by ID
 */
export const getICP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const icp = await icpsService.getICP(id, teamId);

    if (!icp) {
      return res.status(404).json({ error: 'ICP not found' });
    }

    res.status(200).json({ icp });
  } catch (error) {
    console.error('Error getting ICP:', error);
    const message = error instanceof Error ? error.message : 'Failed to get ICP';
    res.status(500).json({ error: message });
  }
};

/**
 * PUT /api/v1/icps/:id
 * Update an ICP
 */
export const updateICP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, name, demographics, firmographics, psychographics, behaviors } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (demographics !== undefined) updateData.demographics = demographics;
    if (firmographics !== undefined) updateData.firmographics = firmographics;
    if (psychographics !== undefined) updateData.psychographics = psychographics;
    if (behaviors !== undefined) updateData.behaviors = behaviors;

    const icp = await icpsService.updateICP(id, teamId, updateData);

    res.status(200).json({ icp });
  } catch (error) {
    console.error('Error updating ICP:', error);
    const message = error instanceof Error ? error.message : 'Failed to update ICP';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * DELETE /api/v1/icps/:id
 * Delete an ICP
 */
export const deleteICP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    await icpsService.deleteICP(id, teamId);

    res.status(200).json({ message: 'ICP deleted successfully' });
  } catch (error) {
    console.error('Error deleting ICP:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete ICP';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/icps/search?q=query&teamId=xxx
 * Semantic search across ICPs
 */
export const searchICPs = async (req: Request, res: Response) => {
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

    const results = await icpsService.searchICPs(teamId, q, topK);

    res.status(200).json({ results });
  } catch (error) {
    console.error('Error searching ICPs:', error);
    const message = error instanceof Error ? error.message : 'Failed to search ICPs';
    res.status(500).json({ error: message });
  }
};

export default {
  createICP,
  listICPs,
  getICP,
  updateICP,
  deleteICP,
  searchICPs,
};
