/**
 * StreamingMessage Component
 *
 * Displays AI-generated text with animated streaming effect
 * Shows blinking cursor while streaming is active
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface StreamingMessageProps {
  text: string;
  isStreaming: boolean;
  onComplete?: () => void;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  text,
  isStreaming,
  onComplete,
}) => {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  // Blinking cursor animation
  useEffect(() => {
    if (isStreaming) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      return () => animation.stop();
    } else {
      cursorOpacity.setValue(0);
      if (onComplete) {
        onComplete();
      }
    }
  }, [isStreaming, cursorOpacity, onComplete]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {text}
        {isStreaming && (
          <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>
            ▋
          </Animated.Text>
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000',
  },
  cursor: {
    color: '#007AFF',
    fontWeight: '700',
  },
});

export default StreamingMessage;
