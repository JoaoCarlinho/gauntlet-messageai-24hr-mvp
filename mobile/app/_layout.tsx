import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { migrateDatabase } from '../db/schema';
import { createDatabaseQueries } from '../db/queries';
import { notificationManager } from '../lib/notifications';
import { ConnectionStatus } from '../components/ui/ConnectionStatus';
import { useSocket } from '../hooks/useSocket';
import { messagesAPI } from '../lib/api';
import { useValues, useActions } from 'kea';
import { conversationsLogic } from '../store/conversations';
import { messagesLogic } from '../store/messages';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuth();
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  
  // App state management for background sync
  const appState = useRef(AppState.currentState);
  const lastSyncTime = useRef<Date | null>(null);
  const isInitialized = useRef(false);
  
  // Get socket connection and message store
  const { connect: connectSocket, isConnected } = useSocket();
  const { conversations } = useValues(conversationsLogic);
  const { syncMessageToDatabase } = useActions(messagesLogic);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current) {
      return;
    }

    // Initialize database and authentication state on app load
    const initializeApp = async () => {
      try {
        isInitialized.current = true;
        
        // Initialize database first
        await initializeDatabase();
        setIsDatabaseReady(true);
        
        // Initialize notifications
        await initializeNotifications();
        
        // Then initialize authentication
        initializeAuth();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setDatabaseError(error instanceof Error ? error.message : 'Unknown database error');
        setIsDatabaseReady(true); // Still allow app to continue
        isInitialized.current = false; // Allow retry on error
      }
    };

    initializeApp();
  }, []); // Empty dependency array - run only once

  // Set up app state listener for background sync
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Set initial sync time when authenticated
    if (!lastSyncTime.current) {
      lastSyncTime.current = new Date();
    }

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, isConnected, connectSocket, syncMessageToDatabase]);

  const initializeDatabase = async (): Promise<void> => {
    try {
      // Open the database
      const db = SQLite.openDatabaseSync('messageai.db');
      
      // Run migrations (now synchronous)
      migrateDatabase(db);
      
      // Create database queries instance (this will be used throughout the app)
      const queries = createDatabaseQueries(db);
      
      // Store the database instance globally for use throughout the app
      // We'll add this to a context or store later
      console.log('Database initialized successfully');
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  };

  const initializeNotifications = async (): Promise<void> => {
    try {
      await notificationManager.initialize();
      console.log('Notifications initialized successfully');
    } catch (error) {
      console.error('Notification initialization failed:', error);
      // Don't throw error - notifications are not critical for app functionality
    }
  };

  // Background sync functions
  const syncMissedMessages = async (): Promise<void> => {
    if (!isAuthenticated) {
      return;
    }

    try {
      console.log('Syncing missed messages...');
      
      // Get the last sync time or use 5 minutes ago as fallback
      const since = lastSyncTime.current || new Date(Date.now() - 5 * 60 * 1000);
      
      // Sync messages for each conversation
      for (const conversation of conversations) {
        try {
          const messages = await messagesAPI.getMessages(conversation.id, {
            after: since.toISOString(),
            limit: 100, // Reasonable limit to avoid overwhelming the app
          });
          
          // Store messages in local database
          const db = SQLite.openDatabaseSync('messageai.db');
          const queries = createDatabaseQueries(db);
          
          for (const message of messages) {
            await queries.insertMessage(message);
            // Convert MessageWithReadReceipts to Message format for syncMessageToDatabase
            const messageForSync = {
              ...message,
              sender: {
                id: message.sender.id,
                displayName: message.sender.displayName,
                avatarUrl: message.sender.avatarUrl,
                email: '', // Add missing fields with defaults
                lastSeen: new Date().toISOString(),
                isOnline: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            };
            syncMessageToDatabase(messageForSync);
          }
          
          console.log(`Synced ${messages.length} messages for conversation ${conversation.id}`);
        } catch (error) {
          console.error(`Failed to sync messages for conversation ${conversation.id}:`, error);
        }
      }
      
      // Update last sync time
      lastSyncTime.current = new Date();
      console.log('Background sync completed');
      
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    console.log('App state changed from', appState.current, 'to', nextAppState);
    
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App came to foreground, starting sync...');
      
      // Reconnect socket if needed
      if (!isConnected) {
        try {
          await connectSocket();
          console.log('Socket reconnected on foreground');
        } catch (error) {
          console.error('Failed to reconnect socket on foreground:', error);
        }
      }
      
      // Sync missed messages
      await syncMissedMessages();
    }
    
    appState.current = nextAppState;
  };

  if (isLoading || !isDatabaseReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {!isDatabaseReady ? 'Initializing database...' : 'Loading MessageAI...'}
        </Text>
        {databaseError && (
          <Text style={styles.errorText}>
            Database warning: {databaseError}
          </Text>
        )}
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.container}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Always define all screens - conditional rendering handled by screen components */}
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="group/new" />
        </Stack>
        
        {/* Connection Status Banner - only show for authenticated users */}
        {isAuthenticated && <ConnectionStatus />}
        
        <StatusBar style="auto" />
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
