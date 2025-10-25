/**
 * useOffline Hook
 *
 * Manages offline state and queue processing
 * Automatically processes queue when connection is restored
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import {
  processQueue,
  getQueueCount,
  addToQueue,
  AgentType,
  QueueAction,
} from '../lib/offlineQueue';
import { initDatabase } from '../lib/database';

export default function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [lastProcessedAt, setLastProcessedAt] = useState<Date | null>(null);
  const processingRef = useRef(false);

  // Initialize database on mount
  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('Failed to initialize offline database:', error);
    });
  }, []);

  // Update queue count
  const updateQueueCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
    } catch (error) {
      console.error('Failed to get queue count:', error);
    }
  }, []);

  // Handle reconnection
  const handleReconnection = useCallback(async () => {
    if (processingRef.current) return;

    const count = await getQueueCount();
    if (count === 0) return;

    console.log(`🔄 Reconnected with ${count} queued items. Processing...`);
    processingRef.current = true;
    setIsProcessingQueue(true);

    try {
      await processQueue();
    } catch (error) {
      console.error('Failed to process queue:', error);
    } finally {
      processingRef.current = false;
      setIsProcessingQueue(false);
    }
  }, []);

  // Check network connectivity periodically and on app state change
  const checkConnectivity = useCallback(async () => {
    try {
      // Simple connectivity check - try to reach a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const online = response.ok;

      if (online !== isOnline) {
        setIsOnline(online);

        // Process queue when coming back online
        if (online && !processingRef.current) {
          handleReconnection();
        }
      }
    } catch (error) {
      // Failed to reach - assume offline
      if (isOnline) {
        setIsOnline(false);
      }
    }
  }, [isOnline, handleReconnection]);

  // Listen to app state changes to check connectivity
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkConnectivity();
      }
    });

    // Initial check
    checkConnectivity();

    // Periodic check every 30 seconds
    const interval = setInterval(checkConnectivity, 30000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [checkConnectivity]);

  // Listen to queue events
  useEffect(() => {
    const addedListener = DeviceEventEmitter.addListener('offline_queue:added', () => {
      updateQueueCount();
    });

    const processedListener = DeviceEventEmitter.addListener('offline_queue:processed', () => {
      updateQueueCount();
    });

    const completeListener = DeviceEventEmitter.addListener(
      'offline_queue:complete',
      ({ processed, failed, remaining }) => {
        console.log(`Queue processing complete: ${processed} processed, ${failed} failed, ${remaining} remaining`);
        processingRef.current = false;
        setIsProcessingQueue(false);
        setLastProcessedAt(new Date());
        updateQueueCount();
      }
    );

    return () => {
      addedListener.remove();
      processedListener.remove();
      completeListener.remove();
    };
  }, [updateQueueCount]);

  // Initial queue count
  useEffect(() => {
    updateQueueCount();
  }, [updateQueueCount]);

  // Queue an AI request
  const queueRequest = useCallback(
    async (agentType: AgentType, action: QueueAction, payload: any): Promise<string> => {
      try {
        const id = await addToQueue(agentType, action, payload);
        await updateQueueCount();
        return id;
      } catch (error: any) {
        console.error('Failed to queue request:', error);
        throw error;
      }
    },
    [updateQueueCount]
  );

  // Manually trigger queue processing
  const manualProcessQueue = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot process queue while offline');
    }

    if (processingRef.current) {
      throw new Error('Queue is already being processed');
    }

    processingRef.current = true;
    setIsProcessingQueue(true);
    try {
      const result = await processQueue();
      setLastProcessedAt(new Date());
      return result;
    } finally {
      processingRef.current = false;
      setIsProcessingQueue(false);
    }
  }, [isOnline]);

  return {
    isOnline,
    isProcessingQueue,
    queueCount,
    lastProcessedAt,
    queueRequest,
    processQueue: manualProcessQueue,
    refreshQueueCount: updateQueueCount,
  };
}
