/**
 * Loading State Components
 *
 * Skeleton loaders and loading indicators for AI screens
 * Provides different loading states for various scenarios
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Generic loading spinner
export const LoadingSpinner = ({ message }: { message?: string }) => {
  return (
    <View style={styles.spinnerContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      {message && <Text style={styles.spinnerMessage}>{message}</Text>}
    </View>
  );
};

// AI thinking indicator with animation
export const AIThinkingIndicator = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.thinkingContainer}>
      <Animated.View style={[styles.thinkingIcon, { opacity }]}>
        <Ionicons name="sparkles" size={24} color="#007AFF" />
      </Animated.View>
      <Text style={styles.thinkingText}>AI is thinking...</Text>
    </View>
  );
};

// Skeleton loader for content cards
export const SkeletonCard = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonCircle} />
        <View style={styles.skeletonHeaderText}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>
      </View>
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '80%' }]} />
        <View style={[styles.skeletonLine, { width: '90%' }]} />
      </View>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
};

// Skeleton list (multiple cards)
export const SkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
};

// Skeleton for conversation messages
export const SkeletonMessage = ({ isUser = false }: { isUser?: boolean }) => {
  return (
    <View style={[styles.skeletonMessage, isUser && styles.skeletonMessageUser]}>
      {!isUser && <View style={styles.skeletonAvatar} />}
      <View style={styles.skeletonBubble}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '70%' }]} />
      </View>
    </View>
  );
};

// Skeleton for conversation list
export const SkeletonConversation = () => {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonConversationItem}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonConversationText}>
            <View style={styles.skeletonTitle} />
            <View style={[styles.skeletonSubtitle, { width: '60%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Streaming indicator (shows content is being streamed)
export const StreamingIndicator = () => {
  const dotAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      )
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [dotAnims]);

  return (
    <View style={styles.streamingContainer}>
      {dotAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.streamingDot,
            {
              opacity: anim,
            },
          ]}
        />
      ))}
    </View>
  );
};

// Empty state component
export const EmptyState = ({
  icon,
  title,
  message,
  action,
}: {
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}) => {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon as any} size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && (
        <TouchableOpacity style={styles.emptyButton} onPress={action.onPress}>
          <Text style={styles.emptyButtonText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Spinner styles
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  spinnerMessage: {
    fontSize: 15,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },

  // AI thinking styles
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  thinkingIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thinkingText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Skeleton card styles
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    marginRight: 12,
  },
  skeletonHeaderText: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    width: '40%',
  },
  skeletonContent: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    width: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 100,
  },

  // Skeleton list
  skeletonList: {
    padding: 16,
  },

  // Skeleton message
  skeletonMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  skeletonMessageUser: {
    justifyContent: 'flex-end',
    flexDirection: 'row-reverse',
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  skeletonBubble: {
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 12,
    gap: 6,
    maxWidth: '70%',
  },

  // Skeleton conversation item
  skeletonConversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  skeletonConversationText: {
    flex: 1,
    marginLeft: 12,
  },

  // Streaming indicator
  streamingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  streamingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

// Add missing import
import { TouchableOpacity } from 'react-native';
