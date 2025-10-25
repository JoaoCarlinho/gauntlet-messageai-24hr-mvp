import { Router } from 'express';
import * as productsController from '../controllers/products.controller';
import * as icpsController from '../controllers/icps.controller';
import { authenticate } from '../middleware/auth';

/**
 * Product Routes
 * Routes for product and ICP management
 * All routes require authentication
 */

const router = Router();

// Apply authentication middleware to all product routes
router.use(authenticate);

/**
 * Product Routes
 */

/**
 * POST /api/v1/products
 * Create a new product
 */
router.post('/', productsController.createProduct);

/**
 * GET /api/v1/products
 * List all products
 */
router.get('/', productsController.listProducts);

/**
 * GET /api/v1/products/search
 * Search products (must come before /:id route)
 */
router.get('/search', productsController.searchProducts);

/**
 * GET /api/v1/products/:id
 * Get specific product
 */
router.get('/:id', productsController.getProduct);

/**
 * PUT /api/v1/products/:id
 * Update a product
 */
router.put('/:id', productsController.updateProduct);

/**
 * DELETE /api/v1/products/:id
 * Delete a product
 */
router.delete('/:id', productsController.deleteProduct);

/**
 * Nested ICP Routes
 */

/**
 * POST /api/v1/products/:productId/icps
 * Create an ICP for a product
 */
router.post('/:productId/icps', icpsController.createICP);

/**
 * GET /api/v1/products/:productId/icps
 * List all ICPs for a product
 */
router.get('/:productId/icps', icpsController.listICPs);

export default router;
