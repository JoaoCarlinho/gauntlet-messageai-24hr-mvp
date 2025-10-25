import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, TokenPayload } from '../utils/jwt';
import prisma from '../config/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string; // Alias for id (for controller compatibility)
        email: string;
        displayName: string;
        teamId?: string; // User's primary team ID
      };
    }
  }
}

/**
 * Authentication middleware - requires valid JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid access token in the Authorization header'
      });
    }

    // Verify the token
    const payload: TokenPayload = verifyAccessToken(token);

    // Fetch user from database to ensure they still exist
    // Include team memberships to get the user's primary team
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isOnline: true,
        teamMemberships: {
          select: {
            teamId: true,
            role: true
          },
          orderBy: {
            joinedAt: 'asc' // Get the first team they joined
          },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
    }

    // Get the user's primary team (first team they joined)
    const primaryTeamId = user.teamMemberships[0]?.teamId;

    // Add user to request object
    req.user = {
      id: user.id,
      userId: user.id, // Alias for controller compatibility
      email: user.email,
      displayName: user.displayName,
      teamId: primaryTeamId
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your access token has expired. Please refresh your token.'
        });
      } else if (error.message.includes('Invalid')) {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided access token is invalid.'
        });
      }
    }

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Unable to authenticate the request'
    });
  }
};

/**
 * Optional authentication middleware - doesn't require token but adds user if present
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return next(); // No token provided, continue without user
    }

    // Verify the token
    const payload: TokenPayload = verifyAccessToken(token);

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isOnline: true,
        teamMemberships: {
          select: {
            teamId: true,
            role: true
          },
          orderBy: {
            joinedAt: 'asc'
          },
          take: 1
        }
      }
    });

    if (user) {
      const primaryTeamId = user.teamMemberships[0]?.teamId;

      req.user = {
        id: user.id,
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        teamId: primaryTeamId
      };
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user (optional auth)
    console.warn('Optional auth failed:', error);
    next();
  }
};

/**
 * Admin authentication middleware - requires admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Admin access requires authentication'
      });
    }

    // Check if user has admin role (you can extend the User model to include roles)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, displayName: true }
    });

    // For now, we'll implement a simple admin check based on email
    // In production, you should have a proper role system
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    
    if (!adminEmails.includes(user?.email || '')) {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'This endpoint requires admin privileges'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({
      error: 'Authorization check failed',
      message: 'Unable to verify admin privileges'
    });
  }
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Simple in-memory rate limiting (in production, use Redis)
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  // This is a simplified rate limiter - in production use a proper rate limiting library
  if (!req.app.locals.rateLimit) {
    req.app.locals.rateLimit = new Map();
  }

  const attempts = req.app.locals.rateLimit.get(clientIp) || [];
  const recentAttempts = attempts.filter((time: number) => now - time < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Too many authentication attempts. Please try again later.'
    });
  }

  // Add current attempt
  recentAttempts.push(now);
  req.app.locals.rateLimit.set(clientIp, recentAttempts);

  next();
};
