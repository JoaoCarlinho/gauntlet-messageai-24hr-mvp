import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, AppState, AppStateStatus, Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { getDatabase, getDatabaseQueries, verifyDatabaseState } from '../db/database';
import { notificationManager } from '../lib/notifications';
import { ConnectionStatusIndicator as ConnectionStatus } from '../components/ui/ConnectionStatusIndicator';
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

  // Initialize socket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && !isConnected) {
      const initializeSocket = async () => {
        try {
          // Add a small delay to ensure auth state is fully settled
          await new Promise(resolve => setTimeout(resolve, 500));
          await connectSocket();
          console.log('Socket connected on authentication');
        } catch (error) {
          console.error('Failed to connect socket on authentication:', error);
        }
      };
      
      initializeSocket();
    }
  }, [isAuthenticated, isConnected, connectSocket]);

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
      // Check if we're on web platform
      const isWeb = Platform.OS === 'web';
      
      if (isWeb) {
        console.log('Web platform detected - using simplified database initialization');
        // On web, we'll skip database initialization for now
        // The app will work with API-only mode
        return;
      }
      
      // Initialize the database (this will create tables if they don't exist)
      getDatabase();
      
      // Verify that all tables were created successfully
      const isVerified = verifyDatabaseState();
      if (!isVerified) {
        throw new Error('Database verification failed - tables not created properly');
      }
      
      console.log('Database initialized and verified successfully');
      
    } catch (error) {
      console.error('Database initialization failed:', error);
      const isWeb = Platform.OS === 'web';
      if (isWeb) {
        console.log('Web platform - continuing without local database');
        // Don't throw error on web, allow app to continue
        return;
      }
      throw error;
    }
  };

  const initializeNotifications = async (): Promise<void> => {
    try {
      const isWeb = Platform.OS === 'web';
      if (isWeb) {
        console.log('Web platform detected - skipping notification initialization');
        return;
      }
      
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
            limit: 100, // Reasonable limit to avoid overwhelming the app
            page: 1, // Start from first page for background sync
          });
          
          // Store messages in local database
          const queries = getDatabaseQueries();
          
          for (const message of messages) {
            // Convert MessageWithReadReceipts to Message format for database
            const messageForDB = {
              id: message.id,
              content: message.content,
              type: message.type,
              conversationId: message.conversationId,
              senderId: message.sender.id,
              status: message.status,
              createdAt: message.createdAt,
              updatedAt: message.updatedAt,
              sender: {
                id: message.sender.id,
                displayName: message.sender.displayName,
                avatarUrl: message.sender.avatarUrl || undefined,
                email: 'user@example.com', // Default value
                lastSeen: new Date(),
                isOnline: false,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            };
            await queries.insertMessage(messageForDB);
            syncMessageToDatabase(messageForDB);
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
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Always define all screens - conditional rendering handled by screen components */}
          <Stack.Screen 
            name="(auth)"
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="(tabs)"
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="chat/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="group/new"
            options={{ headerShown: false }}
          />
        </Stack>
        
        {/* Connection Status Banner - only show for authenticated users when disconnected */}
        {isAuthenticated && (
          <View style={styles.statusContainer}>
            <ConnectionStatus showWhenConnected={false} />
          </View>
        )}
        
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
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
  statusContainer: {
    position: 'absolute',
    top: 50, // Move below the status bar
    left: 0,
    right: 0,
    zIndex: 100,
    pointerEvents: 'none', // Allow touch events to pass through
  },
});
