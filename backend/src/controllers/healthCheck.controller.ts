import { Request, Response } from 'express';
import prisma from '../config/database';
import { getPineconeIndex } from '../config/pinecone';
import { getOpenAIClient } from '../config/openai';

/**
 * Health Check Controller
 * Provides health and readiness endpoints for monitoring
 */

/**
 * Basic health check
 * GET /api/v1/health
 */
export const healthCheck = async (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
};

/**
 * Detailed readiness check
 * GET /api/v1/ready
 */
export const readinessCheck = async (req: Request, res: Response) => {
  const checks = {
    database: false,
    pinecone: false,
    openai: false
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    console.error('Database check failed:', error);
  }

  try {
    // Check Pinecone connection
    const index = getPineconeIndex();
    await index.describeIndexStats();
    checks.pinecone = true;
  } catch (error) {
    console.error('Pinecone check failed:', error);
  }

  try {
    // Check OpenAI connection
    const client = getOpenAIClient();
    await client.models.list();
    checks.openai = true;
  } catch (error) {
    console.error('OpenAI check failed:', error);
  }

  const allHealthy = Object.values(checks).every(status => status);

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString()
  });
};

/**
 * Liveness probe for Kubernetes
 * GET /api/v1/live
 */
export const livenessCheck = async (req: Request, res: Response) => {
  return res.status(200).send('OK');
};

export default {
  healthCheck,
  readinessCheck,
  livenessCheck
};