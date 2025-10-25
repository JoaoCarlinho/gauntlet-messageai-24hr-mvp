/**
 * AI Agents Layout
 *
 * Layout wrapper for all AI agent screens
 * Provides consistent navigation and styling
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function AIAgentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="product-definer"
        options={{
          title: 'Product Definer',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="campaign-advisor"
        options={{
          title: 'Campaign Advisor',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="content-generator"
        options={{
          title: 'Content Generator',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="performance-analyzer"
        options={{
          title: 'Performance Analyzer',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
