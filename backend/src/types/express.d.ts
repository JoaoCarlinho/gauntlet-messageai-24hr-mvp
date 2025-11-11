import { RateLimitInfo } from 'express-rate-limit';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        teamId?: string;
      };
      rateLimit?: RateLimitInfo;
    }
  }
}

export {};
