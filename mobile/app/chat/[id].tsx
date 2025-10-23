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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useValues } from 'kea';
import { authLogic } from '../../store/auth';
import { useMessages } from '../../hooks/useMessages';
import { useConversations } from '../../hooks/useConversations';
import { useSocket } from '../../hooks/useSocket';
import { usePresence } from '../../hooks/usePresence';
import { MessageBubble, InputToolbar, TypingIndicator } from '../../components/chat';
import { Message } from '../../types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  
  // Get current user from auth store
  const { currentUser } = useValues(authLogic);
  
  // Use conversations hook to get conversation details
  const { loadConversation, selectedConversation } = useConversations();
  
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
  
  // Fallback: If no messages but conversation has lastMessage, create a temporary message
  const displayMessages = React.useMemo(() => {
    if (messages.length === 0 && selectedConversation?.lastMessage?.sender) {
      console.log('ChatScreen: Using lastMessage as fallback for display');
      // Convert conversation lastMessage to Message format
      const fallbackMessage = {
        id: selectedConversation.lastMessage.id,
        conversationId: conversationId,
        senderId: selectedConversation.lastMessage.sender.id,
        content: selectedConversation.lastMessage.content,
        type: selectedConversation.lastMessage.type,
        mediaUrl: undefined,
        status: 'sent' as const,
        createdAt: selectedConversation.lastMessage.createdAt,
        updatedAt: selectedConversation.lastMessage.createdAt,
        sender: {
          id: selectedConversation.lastMessage.sender.id,
          email: 'user@example.com',
          phoneNumber: undefined,
          displayName: selectedConversation.lastMessage.sender.displayName,
          avatarUrl: undefined,
          lastSeen: new Date(),
          isOnline: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      };
      return [fallbackMessage];
    }
    return messages;
  }, [messages, selectedConversation?.lastMessage, conversationId]);
  
  // Use socket hook for real-time features
  const {
    isConnected,
    startTyping,
    stopTyping,
  } = useSocket({
    onMessage: (messageEvent) => {
      // Convert MessageEvent to Message format
      const message: Message = {
        id: messageEvent.id,
        conversationId: messageEvent.conversationId,
        senderId: messageEvent.senderId,
        content: messageEvent.content,
        type: messageEvent.type,
        mediaUrl: messageEvent.mediaUrl,
        status: messageEvent.status,
        createdAt: new Date(messageEvent.createdAt),
        updatedAt: new Date(messageEvent.updatedAt),
        sender: messageEvent.sender
      };
      handleNewMessage(message);
    },
    onTyping: handleTypingUpdate,
  });
  
  // Use presence hook for real-time presence updates
  const { isUserOnline, getUserStatus, formatLastSeen, getConversationPresence } = usePresence();
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 1000,
  });
  
  // State
  const [isTyping, setIsTyping] = useState(false);
  const [conversationName, setConversationName] = useState('Chat');
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  
  // Get presence information for header
  const getPresenceInfo = useCallback(() => {
    if (!selectedConversation || !currentUser) {
      return isConnected ? 'Online' : 'Connecting...';
    }
    
    if (conversationType === 'direct') {
      // For direct conversations, show the other user's status
      const otherMember = selectedConversation.members?.find(
        member => member.userId !== currentUser.id
      );
      
      if (otherMember?.user?.id) {
        const isOnline = isUserOnline(otherMember.user.id) || otherMember.user.isOnline;
        
        if (isOnline) {
          return 'Online';
        } else {
          // Get last seen information
          const presenceStatus = getUserStatus(otherMember.user.id);
          const lastSeen = presenceStatus?.lastSeen || otherMember.user.lastSeen;
          
          if (lastSeen) {
            return `Last seen ${formatLastSeen(lastSeen)}`;
          } else {
            return 'Offline';
          }
        }
      }
    } else {
      // For group conversations, show member count
      const memberIds = selectedConversation.members?.map(member => member.userId) || [];
      const onlineCount = memberIds.filter(userId => 
        userId !== currentUser.id && isUserOnline(userId)
      ).length;
      
      const totalMembers = selectedConversation.members?.length || 0;
      
      if (onlineCount > 0) {
        return `${onlineCount} member${onlineCount > 1 ? 's' : ''} online`;
      } else {
        return `${totalMembers} member${totalMembers > 1 ? 's' : ''}`;
      }
    }
    
    return isConnected ? 'Online' : 'Connecting...';
  }, [selectedConversation, currentUser, conversationType, isUserOnline, getUserStatus, formatLastSeen, isConnected]);
  
  // Get presence status color for header subtitle
  const getPresenceColor = useCallback(() => {
    if (!selectedConversation || !currentUser) {
      return isConnected ? '#34C759' : '#FF9500';
    }
    
    if (conversationType === 'direct') {
      const otherMember = selectedConversation.members?.find(
        member => member.userId !== currentUser.id
      );
      
      if (otherMember?.user?.id) {
        const isOnline = isUserOnline(otherMember.user.id) || otherMember.user.isOnline;
        return isOnline ? '#34C759' : '#8E8E93';
      }
    } else {
      const memberIds = selectedConversation.members?.map(member => member.userId) || [];
      const onlineCount = memberIds.filter(userId => 
        userId !== currentUser.id && isUserOnline(userId)
      ).length;
      return onlineCount > 0 ? '#34C759' : '#8E8E93';
    }
    
    return isConnected ? '#34C759' : '#FF9500';
  }, [selectedConversation, currentUser, conversationType, isUserOnline, isConnected]);
  
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
        conversationType={conversationType}
        onPress={() => handleMessagePress(item)}
        onLongPress={() => {
          // TODO: Show message options (copy, delete, etc.)
        }}
      />
    );
  }, [currentUser, handleMessagePress, conversationType]);
  
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
      
      // Load conversation details (name, participants, etc.)
      loadConversation(conversationId);
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

  // Update conversation type and name when selected conversation changes
  useEffect(() => {
    if (selectedConversation && selectedConversation.id === conversationId) {
      setConversationType(selectedConversation.type as 'direct' | 'group');
      if (selectedConversation.name) {
        setConversationName(selectedConversation.name);
      } else if (selectedConversation.type === 'direct') {
        // For direct conversations, show the other participant's name
        const otherMember = selectedConversation.members?.find(
          member => member.userId !== currentUser?.id
        );
        if (otherMember?.user?.displayName) {
          setConversationName(otherMember.user.displayName);
        }
      }
    }
  }, [selectedConversation, conversationId, currentUser]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    console.log(`ChatScreen: messages.length=${messages.length}, displayMessages.length=${displayMessages.length}, hasMessages=${hasMessages}`);
    if (displayMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages.length, hasMessages]);

  // Fallback: If no messages but conversation has lastMessage, show it
  useEffect(() => {
    if (!hasMessages && selectedConversation?.lastMessage && messages.length === 0) {
      console.log('ChatScreen: No messages in store, but conversation has lastMessage - this might be a sync issue');
      console.log('ChatScreen: Last message from conversation:', selectedConversation.lastMessage);
      
      // Try to refresh messages first
      refreshMessages();
      
      // If refresh doesn't work, we could potentially add the lastMessage to the store
      // as a fallback, but for now let's just log it for debugging
    }
  }, [hasMessages, selectedConversation?.lastMessage, messages.length, refreshMessages]);
  

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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{conversationName}</Text>
            <Text style={[styles.headerSubtitle, { color: getPresenceColor() }]}>
              {getPresenceInfo()}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.callButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="call-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
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
        placeholder={isConnected ? "Type a message..." : "Connecting..."}
        disabled={false}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardContainer: {
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
    minHeight: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 4,
  },
  callButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
});
