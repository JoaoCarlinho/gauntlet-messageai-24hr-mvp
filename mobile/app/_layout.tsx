import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // TODO: Check authentication status from storage
    // For now, we'll simulate a loading state
    const checkAuth = async () => {
      try {
        // Simulate checking auth status
        await new Promise(resolve => setTimeout(resolve, 1000));
        // TODO: Replace with actual auth check
        setIsAuthenticated(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading...</Text>
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
