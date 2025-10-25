/**
 * SSE (Server-Sent Events) Streaming Hook
 *
 * Reusable React hook for handling Server-Sent Events streaming
 * Used by AI Agent conversational interfaces for real-time text streaming
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * SSE Event Types
 */
export type SSEEventType = 'text' | 'complete' | 'error';

/**
 * SSE Event Data Structure
 */
export interface SSEEvent {
  type: SSEEventType;
  content?: string;
  error?: string;
}

/**
 * SSE Stream Options
 */
export interface SSEStreamOptions {
  headers?: Record<string, string>;
  body?: any;
  method?: 'GET' | 'POST';
  onMessage?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

/**
 * SSE Stream Hook Return Value
 */
export interface UseSSEStreamReturn {
  isStreaming: boolean;
  streamedText: string;
  error: string | null;
  startStream: (url: string, options?: SSEStreamOptions) => void;
  stopStream: () => void;
  clearStreamedText: () => void;
  clearError: () => void;
}

/**
 * useSSEStream Hook
 *
 * Provides SSE streaming functionality for AI agent conversations
 *
 * @returns {UseSSEStreamReturn} Stream state and control functions
 *
 * @example
 * ```tsx
 * const { isStreaming, streamedText, startStream, stopStream } = useSSEStream();
 *
 * const handleSendMessage = () => {
 *   startStream('/api/v1/ai/agent/message', {
 *     method: 'POST',
 *     body: { conversationId: 'abc123', message: 'Hello' },
 *     headers: { Authorization: `Bearer ${token}` },
 *     onComplete: () => console.log('Stream complete'),
 *   });
 * };
 * ```
 */
export function useSSEStream(): UseSSEStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef<SSEStreamOptions | null>(null);
  const urlRef = useRef<string | null>(null);

  /**
   * Clear streamed text
   */
  const clearStreamedText = useCallback(() => {
    setStreamedText('');
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Stop the SSE stream
   */
  const stopStream = useCallback(() => {
    // Close EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset state
    setIsStreaming(false);
    reconnectAttemptsRef.current = 0;
    optionsRef.current = null;
    urlRef.current = null;
  }, []);

  /**
   * Start the SSE stream
   */
  const startStream = useCallback(
    (url: string, options: SSEStreamOptions = {}) => {
      // Stop any existing stream
      stopStream();

      // Clear previous state
      clearStreamedText();
      clearError();

      // Store options and URL for reconnection
      optionsRef.current = options;
      urlRef.current = url;

      try {
        setIsStreaming(true);

        // Create EventSource instance
        // For POST requests, we need to use a library like eventsource or handle via fetch + stream
        // For now, we'll use native EventSource with GET and work around POST via query params
        let eventSourceUrl = url;
        let eventSourceOptions: EventSourceInit = {
          withCredentials: true,
        };

        // If headers are provided, we need to use a polyfill or fetch-based approach
        // Native EventSource doesn't support custom headers
        // For React Native, we'll use react-native-sse library pattern
        if (options.method === 'POST' && options.body) {
          // For POST with body, we need to use fetch with SSE parsing
          // This is a limitation of native EventSource API
          console.warn('POST method with body requires server to accept body via query params or use fetch-based SSE');
        }

        const eventSource = new EventSource(eventSourceUrl, eventSourceOptions);
        eventSourceRef.current = eventSource;

        // Handle incoming messages
        eventSource.onmessage = (event: MessageEvent) => {
          try {
            const data: SSEEvent = JSON.parse(event.data);

            // Call custom onMessage handler if provided
            if (options.onMessage) {
              options.onMessage(data);
            }

            // Handle different event types
            if (data.type === 'text' && data.content) {
              // Accumulate text chunks
              setStreamedText((prev) => prev + data.content);
            } else if (data.type === 'complete') {
              // Stream complete
              setIsStreaming(false);
              eventSource.close();
              eventSourceRef.current = null;

              // Call onComplete handler
              if (options.onComplete) {
                options.onComplete();
              }

              // Reset reconnect attempts
              reconnectAttemptsRef.current = 0;
            } else if (data.type === 'error') {
              // Server-side error
              const errorMessage = data.error || 'Streaming error';
              setError(errorMessage);
              setIsStreaming(false);
              eventSource.close();
              eventSourceRef.current = null;

              // Call onError handler
              if (options.onError) {
                options.onError(new Error(errorMessage));
              }
            }
          } catch (parseError) {
            console.error('Error parsing SSE message:', parseError);
            setError('Failed to parse server message');
          }
        };

        // Handle connection errors
        eventSource.onerror = (event: Event) => {
          console.error('SSE connection error:', event);

          const errorMessage = 'Connection error. Please try again.';
          setError(errorMessage);
          setIsStreaming(false);

          // Close connection
          eventSource.close();
          eventSourceRef.current = null;

          // Call onError handler
          if (options.onError) {
            options.onError(new Error(errorMessage));
          }

          // Handle auto-reconnect
          if (options.autoReconnect) {
            const maxAttempts = options.maxReconnectAttempts || 3;
            const delay = options.reconnectDelay || 2000;

            if (reconnectAttemptsRef.current < maxAttempts) {
              reconnectAttemptsRef.current += 1;

              console.log(
                `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxAttempts}) in ${delay}ms...`
              );

              reconnectTimeoutRef.current = setTimeout(() => {
                if (urlRef.current && optionsRef.current) {
                  startStream(urlRef.current, optionsRef.current);
                }
              }, delay);
            } else {
              console.error('Max reconnection attempts reached');
              setError('Connection lost. Please refresh and try again.');
            }
          }
        };

        // Handle open event
        eventSource.onopen = () => {
          console.log('SSE connection established');
          reconnectAttemptsRef.current = 0; // Reset on successful connection
        };
      } catch (err: any) {
        console.error('Error starting SSE stream:', err);
        setError(err.message || 'Failed to start stream');
        setIsStreaming(false);

        if (options.onError) {
          options.onError(err);
        }
      }
    },
    [stopStream, clearStreamedText, clearError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    isStreaming,
    streamedText,
    error,
    startStream,
    stopStream,
    clearStreamedText,
    clearError,
  };
}

/**
 * Helper function to create SSE URL with query parameters
 * Useful for POST-like requests where body needs to be in URL
 *
 * @param baseUrl - Base URL
 * @param params - Query parameters
 * @returns Full URL with query string
 */
export function createSSEUrl(baseUrl: string, params: Record<string, any>): string {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  });
  return url.toString();
}

/**
 * Enhanced SSE Hook with Fetch-based POST support
 *
 * For scenarios where we need POST with body (like AI agent messages),
 * this uses fetch() with ReadableStream instead of EventSource
 */
export interface UseSSEStreamWithFetchReturn extends UseSSEStreamReturn {
  startStreamWithFetch: (url: string, options: SSEStreamOptions) => void;
}

/**
 * useSSEStreamWithFetch Hook
 *
 * Provides SSE streaming with fetch-based POST support
 * Useful for AI agent conversations that require POST body
 */
export function useSSEStreamWithFetch(): UseSSEStreamWithFetchReturn {
  const baseHook = useSSEStream();
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopStreamWithFetch = useCallback(() => {
    // Abort fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Call base hook stop
    baseHook.stopStream();
  }, [baseHook]);

  const startStreamWithFetch = useCallback(
    async (url: string, options: SSEStreamOptions = {}) => {
      // Stop any existing stream
      stopStreamWithFetch();

      // Clear previous state
      baseHook.clearStreamedText();
      baseHook.clearError();

      try {
        baseHook.startStream(url, { ...options, method: 'GET' }); // Placeholder to set isStreaming

        // Create AbortController for cancellation
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Make fetch request
        const response = await fetch(url, {
          method: options.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();

        // Read stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode chunk
          const chunk = decoder.decode(value, { stream: true });

          // Parse SSE format: "data: {...}\n\n"
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.substring(6); // Remove "data: " prefix
              try {
                const data: SSEEvent = JSON.parse(jsonStr);

                // Call custom onMessage handler
                if (options.onMessage) {
                  options.onMessage(data);
                }

                // Handle event types (same as EventSource logic)
                if (data.type === 'text' && data.content) {
                  baseHook.clearStreamedText();
                  // Note: We need to handle accumulation in component state
                } else if (data.type === 'complete') {
                  if (options.onComplete) {
                    options.onComplete();
                  }
                  return;
                } else if (data.type === 'error') {
                  const errorMessage = data.error || 'Streaming error';
                  if (options.onError) {
                    options.onError(new Error(errorMessage));
                  }
                  return;
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted');
        } else {
          console.error('Error in fetch-based SSE stream:', err);
          if (options.onError) {
            options.onError(err);
          }
        }
      }
    },
    [baseHook, stopStreamWithFetch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreamWithFetch();
    };
  }, [stopStreamWithFetch]);

  return {
    ...baseHook,
    stopStream: stopStreamWithFetch,
    startStreamWithFetch,
  };
}

export default useSSEStream;
