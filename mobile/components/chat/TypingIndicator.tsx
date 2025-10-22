import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { TypingIndicatorProps } from '../../types';

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
  conversationId,
}) => {
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length > 0) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Start dot animation
      startDotAnimation();
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [typingUsers.length]);

  const startDotAnimation = () => {
    const createDotAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start all dot animations
    createDotAnimation(dot1Anim, 0).start();
    createDotAnimation(dot2Anim, 200).start();
    createDotAnimation(dot3Anim, 400).start();
  };

  const formatTypingText = (users: string[]): string => {
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    if (users.length === 3) return `${users[0]}, ${users[1]}, and ${users[2]} are typing...`;
    return `${users[0]} and ${users.length - 1} others are typing...`;
  };

  if (typingUsers.length === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.bubble}>
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot1Anim,
                transform: [
                  {
                    scale: dot1Anim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot2Anim,
                transform: [
                  {
                    scale: dot2Anim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dot3Anim,
                transform: [
                  {
                    scale: dot3Anim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
        
        <Text style={styles.typingText}>
          {formatTypingText(typingUsers)}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    marginHorizontal: 16,
    alignItems: 'flex-start',
  },
  
  bubble: {
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
    marginHorizontal: 2,
  },
  
  typingText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    flex: 1,
  },
});

export default TypingIndicator;
