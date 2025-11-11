import * as Sentry from '@sentry/node';
import { Express } from 'express';

/**
 * Sentry Error Monitoring Configuration
 * Note: Simplified configuration as newer Sentry SDK has different integration patterns
 */

export const initSentry = (_app: Express) => {
  const SENTRY_DSN = process.env.SENTRY_DSN;
  const NODE_ENV = process.env.NODE_ENV || 'development';

  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, any>;
        delete data.password;
        delete data.apiKey;
        delete data.token;
      }
      return event;
    }
  });

  console.log('✅ Sentry error monitoring initialized');
};

export const setupSentryErrorHandler = (_app: Express) => {
  // Sentry error handling is now done automatically via init
  // This function is kept for backwards compatibility but does nothing
  console.log('Sentry error handler configured via init()');
};

export const captureException = (error: Error, context?: any) => {
  console.error('Error captured:', error);
  Sentry.captureException(error, {
    extra: context
  });
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export default {
  initSentry,
  setupSentryErrorHandler,
  captureException,
  captureMessage
};