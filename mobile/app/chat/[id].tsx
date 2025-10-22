import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useValues } from 'kea';
import { authLogic } from '../../store/auth';
import { useMessages } from '../../hooks/useMessages';
import { useSocket } from '../../hooks/useSocket';
import { MessageBubble, InputToolbar, TypingIndicator } from '../../components/chat';
import { Message } from '../../types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  
  // Get current user from auth store
  const { currentUser } = useValues(authLogic);
  
  // Use messages hook for message operations
  const {
    messages,
    isLoading,
    error,
    hasMessages,
    lastMessage,
    typingUsers,
    sendMessage,
    loadMessages,
    markMessageAsRead,
    joinConversation,
    leaveConversation,
    refreshMessages,
  } = useMessages({
    conversationId,
    autoLoad: true,
    loadLimit: 50,
  });
  
  // Use socket hook for real-time features
  const {
    isConnected,
    startTyping,
    stopTyping,
  } = useSocket({
    onMessage: handleNewMessage,
    onTyping: handleTypingUpdate,
  });
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  });
  
  // State
  const [isTyping, setIsTyping] = useState(false);
  const [conversationName, setConversationName] = useState('Chat');
  
  // Handle new message from socket
  function handleNewMessage(message: Message) {
    // Messages are automatically handled by the useMessages hook
    // Scroll to bottom when new message arrives
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }
  
  // Handle typing updates from socket
  function handleTypingUpdate(event: any) {
    // Typing indicators are handled by the useMessages hook
  }
  
  // Handle sending message
  const handleSendMessage = useCallback((content: string) => {
    if (!content.trim() || !currentUser) return;
    
    sendMessage(content, 'text');
    
    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [sendMessage, currentUser]);
  
  // Handle typing start/stop
  const handleTypingStart = useCallback(() => {
    if (!isTyping && isConnected) {
      setIsTyping(true);
      startTyping(conversationId);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStop();
      }, 3000);
    }
  }, [isTyping, isConnected, conversationId, startTyping]);
  
  const handleTypingStop = useCallback(() => {
    if (isTyping && isConnected) {
      setIsTyping(false);
      stopTyping(conversationId);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [isTyping, isConnected, conversationId, stopTyping]);
  
  
  // Handle message press (for read receipts)
  const handleMessagePress = useCallback((message: Message) => {
    if (message.senderId !== currentUser?.id && message.status !== 'read') {
      markMessageAsRead(message.id);
    }
  }, [currentUser, markMessageAsRead]);
  
  // Handle when messages become visible (for read receipts)
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (!currentUser) return;
    
    // Mark messages as read when they become visible
    viewableItems.forEach((item: any) => {
      const message = item.item as Message;
      if (message.senderId !== currentUser.id && message.status !== 'read') {
        markMessageAsRead(message.id);
      }
    });
  }, [currentUser, markMessageAsRead]);
  
  // Render message item
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwn = item.senderId === currentUser?.id;
    
    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        showAvatar={!isOwn}
        showTimestamp={true}
        onPress={() => handleMessagePress(item)}
        onLongPress={() => {
          // TODO: Show message options (copy, delete, etc.)
        }}
      />
    );
  }, [currentUser, handleMessagePress]);
  
  // Render typing indicator
  const renderTypingIndicator = useCallback(() => {
    if (typingUsers.length === 0) return null;
    
    return (
      <TypingIndicator
        typingUsers={typingUsers}
        conversationId={conversationId}
      />
    );
  }, [typingUsers, conversationId]);
  
  // Initialize conversation
  useEffect(() => {
    if (conversationId) {
      // Join conversation room
      joinConversation();
      
      // Load messages
      loadMessages();
      
      // TODO: Load conversation details (name, participants, etc.)
      setConversationName(`Chat ${conversationId.slice(-4)}`);
    }
    
    // Cleanup on unmount
    return () => {
      leaveConversation();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, joinConversation, leaveConversation, loadMessages]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (hasMessages) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [hasMessages, messages.length]);
  

  // Show loading state
  if (isLoading && !hasMessages) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load messages</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshMessages}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{conversationName}</Text>
          <Text style={styles.headerSubtitle}>
            {isConnected ? 'Online' : 'Connecting...'}
          </Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="call-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        ListFooterComponent={renderTypingIndicator}
        inverted={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onContentSizeChange={() => {
          // Auto-scroll to bottom when content size changes
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Toolbar */}
      <InputToolbar
        onSendMessage={handleSendMessage}
        onSendImage={() => {
          // TODO: Implement image sending
          Alert.alert('Coming Soon', 'Image sending will be available soon!');
        }}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        placeholder="Type a message..."
        disabled={!isConnected}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
});
