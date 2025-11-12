/**
 * Logger utility for graceful error handling
 * Suppresses verbose stack traces in production while maintaining debug info in development
 */

const isDevelopment = __DEV__;

export const logger = {
  /**
   * Log info messages (always shown)
   */
  info: (message: string, ...args: any[]) => {
    console.log(message, ...args);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Log errors gracefully
   * - In production: Clean message only
   * - In development: Full error details
   */
  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, just log the message without the full error object/stack
      console.log(`⚠️ ${message}`);
    }
  },

  /**
   * Log network errors gracefully
   * Common scenarios: token refresh, API calls, socket connections
   */
  networkError: (context: string, error?: any) => {
    if (isDevelopment) {
      console.error(`[Network Error] ${context}:`, error);
    } else {
      // Extract user-friendly message
      const status = error?.response?.status;
      const isAuthError = status === 401 || status === 403;

      if (isAuthError) {
        console.log(`🔐 Authentication required - please log in again`);
      } else if (status === 404) {
        console.log(`📡 Service temporarily unavailable`);
      } else if (status >= 500) {
        console.log(`⚠️ Server error - please try again later`);
      } else if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
        console.log(`⏱️ Request timed out - check your connection`);
      } else if (error?.message === 'Network Error') {
        console.log(`📶 No internet connection`);
      } else {
        console.log(`⚠️ ${context} - please try again`);
      }
    }
  },

  /**
   * Silent error - log only in development
   * Use for expected errors that don't need user attention
   */
  silent: (message: string, error?: any) => {
    if (isDevelopment) {
      console.log(`[Silent] ${message}`, error);
    }
    // No logging in production
  },

  /**
   * Warn - always shown but less alarming
   */
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(message, ...args);
    } else {
      console.log(`💡 ${message}`);
    }
  },
};

export default logger;
