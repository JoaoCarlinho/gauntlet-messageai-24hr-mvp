import { Router } from 'express';
import * as icpsController from '../controllers/icps.controller';
import { authenticate } from '../middleware/auth';

/**
 * ICP Routes
 * Routes for Ideal Customer Profile management
 * All routes require authentication
 */

const router = Router();

// Apply authentication middleware to all ICP routes
router.use(authenticate);

/**
 * GET /api/v1/icps/:id
 * Get specific ICP by ID
 */
router.get('/:id', icpsController.getICP);

/**
 * PUT /api/v1/icps/:id
 * Update an ICP
 */
router.put('/:id', icpsController.updateICP);

/**
 * DELETE /api/v1/icps/:id
 * Delete an ICP
 */
router.delete('/:id', icpsController.deleteICP);

/**
 * GET /api/v1/icps/search
 * Search ICPs
 */
router.get('/search', icpsController.searchICPs);

export default router;
