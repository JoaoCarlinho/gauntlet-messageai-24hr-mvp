/**
 * Error Handler Components and Utilities
 *
 * Handles various error types for AI agent interactions
 * - API errors (401, 429, 500, network)
 * - SSE errors (connection, timeout, parse)
 * - Provides user-friendly error messages and recovery actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios, { AxiosError } from 'axios';

// Error types
export enum ErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SSE_CONNECTION = 'SSE_CONNECTION',
  SSE_TIMEOUT = 'SSE_TIMEOUT',
  SSE_PARSE = 'SSE_PARSE',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number; // seconds
}

// Parse error from various sources
export const parseError = (error: any): ErrorDetails => {
  // Axios error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status;

    switch (statusCode) {
      case 401:
        return {
          type: ErrorType.UNAUTHORIZED,
          message: 'Your session has expired. Please log in again.',
          statusCode: 401,
          retryable: false,
        };

      case 429:
        const retryAfter = axiosError.response?.headers['retry-after'];
        return {
          type: ErrorType.RATE_LIMIT,
          message: `Rate limit exceeded (100 requests/hour). Please try again ${
            retryAfter ? `in ${retryAfter} seconds` : 'later'
          }.`,
          statusCode: 429,
          retryable: true,
          retryAfter: retryAfter ? parseInt(retryAfter) : 3600,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: ErrorType.SERVER_ERROR,
          message: 'Server error occurred. Please try again.',
          statusCode,
          retryable: true,
        };

      default:
        if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
          return {
            type: ErrorType.NETWORK_ERROR,
            message: 'Request timeout. Please check your connection.',
            retryable: true,
          };
        }

        if (!axiosError.response) {
          return {
            type: ErrorType.NETWORK_ERROR,
            message: 'Network error. Please check your internet connection.',
            retryable: true,
          };
        }

        return {
          type: ErrorType.UNKNOWN,
          message: axiosError.message || 'An unexpected error occurred.',
          statusCode,
          retryable: true,
        };
    }
  }

  // SSE errors (identified by message content)
  const errorMessage = error?.message || String(error);
  if (errorMessage.includes('EventSource') || errorMessage.includes('SSE')) {
    if (errorMessage.includes('timeout')) {
      return {
        type: ErrorType.SSE_TIMEOUT,
        message: 'AI response timeout. Please try again.',
        retryable: true,
      };
    }
    if (errorMessage.includes('parse') || errorMessage.includes('JSON')) {
      return {
        type: ErrorType.SSE_PARSE,
        message: 'Failed to parse AI response. Displaying raw content.',
        retryable: false,
      };
    }
    return {
      type: ErrorType.SSE_CONNECTION,
      message: 'Failed to connect to AI service. Please try again.',
      retryable: true,
    };
  }

  // Generic error
  return {
    type: ErrorType.UNKNOWN,
    message: errorMessage || 'An unexpected error occurred.',
    retryable: true,
  };
};

// Error display component
export const ErrorDisplay = ({
  error,
  onRetry,
  onDismiss,
}: {
  error: ErrorDetails | Error | any;
  onRetry?: () => void;
  onDismiss?: () => void;
}) => {
  const router = useRouter();
  const errorDetails = error instanceof Error ? parseError(error) : error;

  const handlePrimaryAction = () => {
    if (errorDetails.type === ErrorType.UNAUTHORIZED) {
      // Redirect to login
      router.replace('/login');
    } else if (errorDetails.retryable && onRetry) {
      onRetry();
    } else if (onDismiss) {
      onDismiss();
    }
  };

  const getPrimaryActionLabel = () => {
    if (errorDetails.type === ErrorType.UNAUTHORIZED) {
      return 'Log In';
    }
    if (errorDetails.retryable) {
      return 'Retry';
    }
    return 'Dismiss';
  };

  const getIcon = () => {
    switch (errorDetails.type) {
      case ErrorType.UNAUTHORIZED:
        return 'lock-closed-outline';
      case ErrorType.RATE_LIMIT:
        return 'hourglass-outline';
      case ErrorType.NETWORK_ERROR:
        return 'wifi-outline';
      case ErrorType.SERVER_ERROR:
        return 'server-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name={getIcon() as any} size={48} color="#FF3B30" />
      </View>
      <Text style={styles.errorTitle}>
        {errorDetails.type === ErrorType.UNAUTHORIZED
          ? 'Session Expired'
          : errorDetails.type === ErrorType.RATE_LIMIT
          ? 'Rate Limit Exceeded'
          : errorDetails.type === ErrorType.NETWORK_ERROR
          ? 'Connection Issue'
          : errorDetails.type === ErrorType.SERVER_ERROR
          ? 'Server Error'
          : 'Error'}
      </Text>
      <Text style={styles.errorMessage}>{errorDetails.message}</Text>
      <View style={styles.errorActions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handlePrimaryAction}>
          <Text style={styles.primaryButtonText}>{getPrimaryActionLabel()}</Text>
        </TouchableOpacity>
        {errorDetails.retryable && onDismiss && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onDismiss}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Inline error message (for forms)
export const InlineError = ({ message }: { message: string }) => {
  return (
    <View style={styles.inlineError}>
      <Ionicons name="alert-circle" size={16} color="#FF3B30" />
      <Text style={styles.inlineErrorText}>{message}</Text>
    </View>
  );
};

// Network error banner (persistent)
export const NetworkErrorBanner = ({ onDismiss }: { onDismiss?: () => void }) => {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <Ionicons name="wifi-outline" size={20} color="#fff" />
        <Text style={styles.bannerText}>You are offline. Some features may not work.</Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Rate limit banner
export const RateLimitBanner = ({ retryAfter }: { retryAfter?: number }) => {
  const [timeLeft, setTimeLeft] = React.useState(retryAfter || 3600);

  React.useEffect(() => {
    if (!retryAfter) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [retryAfter]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <View style={[styles.banner, styles.rateLimitBanner]}>
      <View style={styles.bannerContent}>
        <Ionicons name="hourglass-outline" size={20} color="#fff" />
        <Text style={styles.bannerText}>
          Rate limit reached. Retry in {formatTime(timeLeft)}
        </Text>
      </View>
    </View>
  );
};

// SSE error handler hook
export const useSSEErrorHandler = () => {
  const [error, setError] = React.useState<ErrorDetails | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleSSEError = React.useCallback((err: any) => {
    const errorDetails = parseError(err);
    setError(errorDetails);

    // Auto-retry logic for connection errors
    if (
      errorDetails.type === ErrorType.SSE_CONNECTION &&
      retryCount < 3
    ) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setError(null);
      }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
    }
  }, [retryCount]);

  const resetError = React.useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    error,
    handleSSEError,
    resetError,
    retryCount,
  };
};

// API error handler hook
export const useAPIErrorHandler = () => {
  const [error, setError] = React.useState<ErrorDetails | null>(null);
  const router = useRouter();

  const handleAPIError = React.useCallback((err: any) => {
    const errorDetails = parseError(err);
    setError(errorDetails);

    // Auto-redirect for unauthorized
    if (errorDetails.type === ErrorType.UNAUTHORIZED) {
      setTimeout(() => {
        router.replace('/login');
      }, 2000);
    }

    // Show alert for rate limit
    if (errorDetails.type === ErrorType.RATE_LIMIT) {
      Alert.alert('Rate Limit Exceeded', errorDetails.message);
    }
  }, [router]);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleAPIError,
    resetError,
  };
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    minWidth: 100,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 6,
    marginVertical: 8,
  },
  inlineErrorText: {
    fontSize: 13,
    color: '#FF3B30',
    flex: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rateLimitBanner: {
    backgroundColor: '#FF9500',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  bannerText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
});
