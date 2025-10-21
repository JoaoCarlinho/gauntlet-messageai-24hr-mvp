import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to a crash reporting service
    // Example: crashlytics().recordError(error);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    // Force reload the app
    // Note: This is a simple approach. In a real app, you might want to
    // use a more sophisticated reload mechanism
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.errorContainer}>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                We're sorry, but something unexpected happened. Please try again.
              </Text>

              <View style={styles.buttonContainer}>
                <Button
                  title="Try Again"
                  onPress={this.handleRetry}
                  variant="primary"
                  style={styles.button}
                />
                <Button
                  title="Reload App"
                  onPress={this.handleReload}
                  variant="outline"
                  style={styles.button}
                />
              </View>

              {this.props.showDetails && this.state.error && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Error Details:</Text>
                  <Text style={styles.detailsText}>
                    {this.state.error.toString()}
                  </Text>
                  {this.state.errorInfo && (
                    <Text style={styles.detailsText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Simple error boundary for specific use cases
export const SimpleErrorBoundary: React.FC<{
  children: ReactNode;
  message?: string;
  onRetry?: () => void;
}> = ({ children, message = "Something went wrong", onRetry }) => (
  <ErrorBoundary
    fallback={
      <View style={styles.simpleContainer}>
        <Text style={styles.simpleMessage}>{message}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    }
  >
    {children}
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
  detailsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    width: '100%',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  simpleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  simpleMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
