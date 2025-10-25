import { Request, Response } from 'express';
import * as campaignsService from '../services/campaigns.service';
import * as adCreativesService from '../services/adCreatives.service';

/**
 * Campaign Controller
 * Handles HTTP requests for campaign and ad creative management
 */

/**
 * POST /api/v1/campaigns
 * Create a new campaign
 */
export const createCampaign = async (req: Request, res: Response) => {
  try {
    const { teamId, productId, icpId, name, description, platforms, budget, startDate, endDate, targetingStrategy } = req.body;

    // Validation
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'Platforms array is required and must not be empty' });
    }

    if (!budget || budget <= 0) {
      return res.status(400).json({ error: 'Budget is required and must be greater than 0' });
    }

    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    // Parse dates
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    // Validate dates
    if (isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }

    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }

    if (parsedEndDate && parsedEndDate <= parsedStartDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const campaign = await campaignsService.createCampaign(teamId, {
      productId,
      icpId,
      name,
      description,
      platforms,
      budget,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      targetingStrategy,
    });

    res.status(201).json({ campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    const message = error instanceof Error ? error.message : 'Failed to create campaign';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/campaigns
 * List campaigns with optional filters
 */
export const listCampaigns = async (req: Request, res: Response) => {
  try {
    const { teamId, status, platform, productId, icpId, startDate, endDate } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const filters: any = {};

    if (status && typeof status === 'string') {
      filters.status = status;
    }

    if (platform && typeof platform === 'string') {
      filters.platform = platform;
    }

    if (productId && typeof productId === 'string') {
      filters.productId = productId;
    }

    if (icpId && typeof icpId === 'string') {
      filters.icpId = icpId;
    }

    if (startDate && typeof startDate === 'string') {
      filters.startDate = new Date(startDate);
    }

    if (endDate && typeof endDate === 'string') {
      filters.endDate = new Date(endDate);
    }

    const campaigns = await campaignsService.listCampaigns(teamId, filters);

    res.status(200).json({ campaigns });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    const message = error instanceof Error ? error.message : 'Failed to list campaigns';
    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/campaigns/:id
 * Get campaign details
 */
export const getCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId } = req.query;

    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const campaign = await campaignsService.getCampaign(id, teamId);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.status(200).json({ campaign });
  } catch (error) {
    console.error('Error getting campaign:', error);
    const message = error instanceof Error ? error.message : 'Failed to get campaign';
    res.status(500).json({ error: message });
  }
};

/**
 * PUT /api/v1/campaigns/:id
 * Update campaign
 */
export const updateCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, name, description, platforms, budget, startDate, endDate, status, targetingStrategy } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Validate platforms if provided
    if (platforms !== undefined && (!Array.isArray(platforms) || platforms.length === 0)) {
      return res.status(400).json({ error: 'Platforms must be a non-empty array' });
    }

    // Validate budget if provided
    if (budget !== undefined && budget <= 0) {
      return res.status(400).json({ error: 'Budget must be greater than 0' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (platforms !== undefined) updateData.platforms = platforms;
    if (budget !== undefined) updateData.budget = budget;
    if (status !== undefined) updateData.status = status;
    if (targetingStrategy !== undefined) updateData.targetingStrategy = targetingStrategy;

    // Parse dates if provided
    if (startDate) {
      const parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({ error: 'Invalid start date format' });
      }
      updateData.startDate = parsedStartDate;
    }

    if (endDate) {
      const parsedEndDate = new Date(endDate);
      if (isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: 'Invalid end date format' });
      }
      updateData.endDate = parsedEndDate;
    }

    const campaign = await campaignsService.updateCampaign(id, teamId, updateData);

    res.status(200).json({ campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    const message = error instanceof Error ? error.message : 'Failed to update campaign';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * DELETE /api/v1/campaigns/:id
 * Delete campaign
 */
export const deleteCampaign = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    await campaignsService.deleteCampaign(id, teamId);

    res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete campaign';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/campaigns/:id/metrics
 * Get campaign metrics
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    let dateRange;
    if (startDate && endDate) {
      const parsedStartDate = new Date(startDate as string);
      const parsedEndDate = new Date(endDate as string);

      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }

      dateRange = {
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      };
    }

    const metrics = await campaignsService.getMetrics(id, dateRange);

    res.status(200).json({ metrics });
  } catch (error) {
    console.error('Error getting metrics:', error);
    const message = error instanceof Error ? error.message : 'Failed to get metrics';
    res.status(500).json({ error: message });
  }
};

/**
 * POST /api/v1/campaigns/:id/metrics
 * Add metrics for a campaign
 */
export const addMetrics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, impressions, clicks, conversions, spend, metadata } = req.body;

    // Validation
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    if (impressions === undefined || impressions < 0) {
      return res.status(400).json({ error: 'Impressions must be >= 0' });
    }

    if (clicks === undefined || clicks < 0) {
      return res.status(400).json({ error: 'Clicks must be >= 0' });
    }

    if (conversions === undefined || conversions < 0) {
      return res.status(400).json({ error: 'Conversions must be >= 0' });
    }

    if (spend === undefined || spend < 0) {
      return res.status(400).json({ error: 'Spend must be >= 0' });
    }

    // Parse date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const metricsData = {
      date: parsedDate,
      impressions,
      clicks,
      conversions,
      spend,
      metadata,
    };

    const metrics = await campaignsService.addMetrics(id, metricsData);

    res.status(201).json({ metrics });
  } catch (error) {
    console.error('Error adding metrics:', error);
    const message = error instanceof Error ? error.message : 'Failed to add metrics';

    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/campaigns/:id/roi
 * Calculate campaign ROI
 */
export const calculateROI = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const roi = await campaignsService.calculateROI(id);

    res.status(200).json({ roi });
  } catch (error) {
    console.error('Error calculating ROI:', error);
    const message = error instanceof Error ? error.message : 'Failed to calculate ROI';

    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * POST /api/v1/campaigns/:id/creatives
 * Create ad creative for a campaign
 */
export const createAdCreative = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { teamId, platform, type, headline, body, cta, mediaUrl, metadata } = req.body;

    // Validation
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    if (!type) {
      return res.status(400).json({ error: 'Creative type is required' });
    }

    if (!headline) {
      return res.status(400).json({ error: 'Headline is required' });
    }

    if (!body) {
      return res.status(400).json({ error: 'Body is required' });
    }

    if (!cta) {
      return res.status(400).json({ error: 'Call to action (CTA) is required' });
    }

    const creative = await adCreativesService.createAdCreative(id, teamId, {
      platform,
      type,
      headline,
      body,
      cta,
      mediaUrl,
      metadata,
    });

    res.status(201).json({ creative });
  } catch (error) {
    console.error('Error creating ad creative:', error);
    const message = error instanceof Error ? error.message : 'Failed to create ad creative';

    if (message.includes('not found') || message.includes('access denied')) {
      return res.status(404).json({ error: message });
    }

    res.status(500).json({ error: message });
  }
};

/**
 * GET /api/v1/campaigns/:id/creatives
 * List ad creatives for a campaign
 */
export const listAdCreatives = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { platform } = req.query;

    const creatives = await adCreativesService.listAdCreatives(
      id,
      platform && typeof platform === 'string' ? platform : undefined
    );

    res.status(200).json({ creatives });
  } catch (error) {
    console.error('Error listing ad creatives:', error);
    const message = error instanceof Error ? error.message : 'Failed to list ad creatives';
    res.status(500).json({ error: message });
  }
};

export default {
  createCampaign,
  listCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  getMetrics,
  addMetrics,
  calculateROI,
  createAdCreative,
  listAdCreatives,
};
