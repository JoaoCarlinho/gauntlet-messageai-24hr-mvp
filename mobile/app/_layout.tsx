import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useAuth } from '../hooks/useAuth';
import { migrateDatabase } from '../db/schema';
import { createDatabaseQueries } from '../db/queries';

export default function RootLayout() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuth();
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize database and authentication state on app load
    const initializeApp = async () => {
      try {
        // Initialize database first
        await initializeDatabase();
        setIsDatabaseReady(true);
        
        // Then initialize authentication
        initializeAuth();
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setDatabaseError(error instanceof Error ? error.message : 'Unknown database error');
        setIsDatabaseReady(true); // Still allow app to continue
      }
    };

    initializeApp();
  }, [initializeAuth]);

  const initializeDatabase = async (): Promise<void> => {
    try {
      console.log('Initializing SQLite database...');
      
      // Open the database
      const db = SQLite.openDatabaseSync('messageai.db');
      
      // Run migrations
      await migrateDatabase(db);
      
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
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Authenticated user - show main app
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="group/new" />
          </>
        ) : (
          // Unauthenticated user - show auth screens
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
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
