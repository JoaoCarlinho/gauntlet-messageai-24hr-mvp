import * as Sentry from '@sentry/node';
import { Express } from 'express';

/**
 * Sentry Error Monitoring Configuration
 */

export const initSentry = (app: Express) => {
  const SENTRY_DSN = process.env.SENTRY_DSN;
  const NODE_ENV = process.env.NODE_ENV || 'development';

  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      // Prisma integration
      new Sentry.Integrations.Prisma({ client: true })
    ],
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.data) {
        delete event.request.data.password;
        delete event.request.data.apiKey;
        delete event.request.data.token;
      }
      return event;
    }
  });

  // Request handler must be first middleware
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());

  console.log('✅ Sentry error monitoring initialized');
};

export const setupSentryErrorHandler = (app: Express) => {
  // Error handler must be before any other error middleware
  app.use(Sentry.Handlers.errorHandler());
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