/**
 * MessageBubble Component
 *
 * Display message bubble for AI agent conversations
 * Supports both user and assistant messages with different styling
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AgentMessage } from '../../types/aiAgents';

interface MessageBubbleProps {
  message: AgentMessage;
  role: 'user' | 'assistant';
  showTimestamp?: boolean;
  metadata?: Record<string, any>;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  role,
  showTimestamp = true,
  metadata,
  onPress,
  onLongPress,
}) => {
  const [isTimestampVisible, setIsTimestampVisible] = useState(false);
  const isUser = role === 'user';

  const handlePress = () => {
    if (showTimestamp) {
      setIsTimestampVisible(!isTimestampVisible);
    }
    if (onPress) {
      onPress();
    }
  };

  // Render tool call indicator if present
  const renderToolCall = () => {
    if (!metadata?.toolCall) return null;

    return (
      <View style={styles.toolCallContainer}>
        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
        <Text style={styles.toolCallText}>{metadata.toolCall}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
        {renderToolCall()}
        {isTimestampVisible && (
          <Text style={styles.timestamp}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  toolCallContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 6,
  },
  toolCallText: {
    fontSize: 13,
    color: '#34C759',
    fontWeight: '500',
  },
});

export default MessageBubble;
