import { Response } from 'express';
import { StreamTextResult } from 'ai';

/**
 * SSE (Server-Sent Events) Streaming Utilities
 *
 * Helper functions for streaming AI responses to clients using Server-Sent Events.
 * SSE provides a simple way to push real-time updates from server to client over HTTP.
 */

/**
 * Initialize Server-Sent Events headers on the response
 *
 * Sets the necessary headers for SSE connection:
 * - Content-Type: text/event-stream for SSE format
 * - Cache-Control: no-cache to prevent caching
 * - Connection: keep-alive to maintain persistent connection
 * - X-Accel-Buffering: no to disable nginx buffering
 *
 * @param res - Express Response object
 */
export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial comment to establish connection
  res.write(': SSE connection established\n\n');
  res.flushHeaders();
}

/**
 * Send a single SSE message to the client
 *
 * Formats and sends data in SSE format:
 * - Optional event type for client-side filtering
 * - Data payload (automatically JSON stringified if object)
 * - Double newline to mark end of message
 *
 * @param res - Express Response object
 * @param data - Data to send (will be JSON stringified if object)
 * @param event - Optional event type (defaults to 'message')
 */
export function sendSSEMessage(
  res: Response,
  data: any,
  event: string = 'message'
): void {
  if (event !== 'message') {
    res.write(`event: ${event}\n`);
  }

  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`data: ${payload}\n\n`);
}

/**
 * Close the SSE connection gracefully
 *
 * Sends a final 'done' event and closes the response stream.
 * Clients should handle the 'done' event to know the stream has ended.
 *
 * @param res - Express Response object
 */
export function closeSSE(res: Response): void {
  sendSSEMessage(res, { status: 'complete' }, 'done');
  res.end();
}

/**
 * Stream AI SDK text stream to SSE format
 *
 * Takes a Vercel AI SDK streamText result and pipes it to the client
 * using Server-Sent Events format. Handles:
 * - Text deltas (incremental chunks)
 * - Finish event with usage stats
 * - Errors during streaming
 * - Client disconnect
 *
 * @param result - StreamTextResult from AI SDK streamText()
 * @param res - Express Response object
 * @returns Promise that resolves when stream completes
 */
export async function streamToSSE(
  result: StreamTextResult<Record<string, any>, any>,
  res: Response
): Promise<void> {
  try {
    // Handle client disconnect
    res.on('close', () => {
      console.log('Client disconnected from SSE stream');
    });

    // Stream text deltas
    for await (const textPart of result.textStream) {
      if (res.writableEnded) {
        console.log('Response already ended, stopping stream');
        break;
      }

      sendSSEMessage(res, {
        type: 'content',
        delta: textPart,
      }, 'delta');
    }

    // Wait for final result with usage stats
    const finalResult = await result;

    if (!res.writableEnded) {
      // Send completion event with metadata
      sendSSEMessage(res, {
        type: 'complete',
        usage: finalResult.usage,
        finishReason: finalResult.finishReason,
      }, 'finish');

      // Close the connection
      closeSSE(res);
    }
  } catch (error) {
    console.error('Error streaming AI response:', error);

    if (!res.writableEnded) {
      // Send error event
      sendSSEMessage(res, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'error');

      res.end();
    }
  }
}

/**
 * Stream AI SDK text stream with custom event handlers
 *
 * Advanced version of streamToSSE that allows custom handling of stream events.
 * Useful when you need to:
 * - Process chunks before sending
 * - Store messages in database during streaming
 * - Add custom metadata to events
 * - Implement custom error handling
 *
 * @param result - StreamTextResult from AI SDK streamText()
 * @param res - Express Response object
 * @param handlers - Custom event handlers
 * @returns Promise that resolves when stream completes
 */
export async function streamToSSEWithHandlers(
  result: StreamTextResult<Record<string, any>, any>,
  res: Response,
  handlers?: {
    onStart?: () => void | Promise<void>;
    onChunk?: (chunk: string) => void | Promise<void>;
    onComplete?: (usage: any, finishReason: string) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
  }
): Promise<void> {
  try {
    // Handle client disconnect
    res.on('close', () => {
      console.log('Client disconnected from SSE stream');
    });

    // Call onStart handler
    if (handlers?.onStart) {
      await handlers.onStart();
    }

    // Stream text deltas
    for await (const textPart of result.textStream) {
      if (res.writableEnded) {
        console.log('Response already ended, stopping stream');
        break;
      }

      // Call onChunk handler
      if (handlers?.onChunk) {
        await handlers.onChunk(textPart);
      }

      sendSSEMessage(res, {
        type: 'content',
        delta: textPart,
      }, 'delta');
    }

    // Wait for final result with usage stats
    const finalResult = await result;

    if (!res.writableEnded) {
      // Call onComplete handler
      if (handlers?.onComplete) {
        const finishReason = await finalResult.finishReason || 'stop';
        await handlers.onComplete(
          finalResult.usage,
          finishReason
        );
      }

      // Send completion event with metadata
      sendSSEMessage(res, {
        type: 'complete',
        usage: finalResult.usage,
        finishReason: finalResult.finishReason,
      }, 'finish');

      // Close the connection
      closeSSE(res);
    }
  } catch (error) {
    console.error('Error streaming AI response:', error);

    // Call onError handler
    if (handlers?.onError && error instanceof Error) {
      await handlers.onError(error);
    }

    if (!res.writableEnded) {
      // Send error event
      sendSSEMessage(res, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'error');

      res.end();
    }
  }
}

/**
 * Create a heartbeat function to keep SSE connection alive
 *
 * Some proxies/load balancers may close idle connections.
 * Send periodic comments to keep the connection alive.
 *
 * @param res - Express Response object
 * @param intervalMs - Heartbeat interval in milliseconds (default: 30000)
 * @returns Function to stop the heartbeat
 */
export function startSSEHeartbeat(
  res: Response,
  intervalMs: number = 30000
): () => void {
  const interval = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(interval);
      return;
    }

    // Send comment (ignored by clients, keeps connection alive)
    res.write(': heartbeat\n\n');
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * SSE Event Types for client-side handling
 */
export enum SSEEventType {
  DELTA = 'delta',      // Incremental text chunk
  FINISH = 'finish',    // Stream completed
  ERROR = 'error',      // Error occurred
  DONE = 'done',        // Connection closing
}

/**
 * SSE Message Types
 */
export interface SSEDeltaMessage {
  type: 'content';
  delta: string;
}

export interface SSEFinishMessage {
  type: 'complete';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface SSEErrorMessage {
  type: 'error';
  error: string;
}

export interface SSEDoneMessage {
  status: 'complete';
}

export type SSEMessage = SSEDeltaMessage | SSEFinishMessage | SSEErrorMessage | SSEDoneMessage;
