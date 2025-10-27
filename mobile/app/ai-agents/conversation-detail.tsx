/**
 * Conversation Detail Screen
 *
 * Displays a past AI agent conversation with full message history
 * Read-only view for completed or archived conversations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { aiAgentsAPI } from '../../lib/aiAgentsAPI';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface Conversation {
  id: string;
  agentType: string;
  status: string;
  contextId: string | null;
  metadata: Record<string, any>;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load conversation on mount
  useEffect(() => {
    loadConversation();
  }, [id]);

  const loadConversation = async () => {
    if (!id) {
      setError('No conversation ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('📖 Loading conversation:', id);

      const data = await aiAgentsAPI.conversations.getConversation(id);
      console.log('✅ Conversation loaded:', {
        id: data.id,
        agentType: data.agentType,
        messageCount: data.messages.length,
      });

      setConversation(data as Conversation);
    } catch (err: any) {
      console.error('❌ Error loading conversation:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await aiAgentsAPI.conversations.deleteConversation(id!);
              console.log('✅ Conversation deleted');
              router.back();
            } catch (err: any) {
              console.error('❌ Error deleting conversation:', err);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAgentTypeLabel = (agentType: string) => {
    switch (agentType) {
      case 'product_definer':
        return 'Product Definer';
      case 'campaign_advisor':
        return 'Campaign Advisor';
      case 'content_generator':
        return 'Content Generator';
      case 'performance_analyzer':
        return 'Performance Analyzer';
      default:
        return agentType;
    }
  };

  const renderMessage = (message: Message) => {
    // Skip system messages
    if (message.role === 'system') {
      return null;
    }

    const isUser = message.role === 'user';

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversation</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{error || 'Conversation not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadConversation}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Conversation Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>Agent Type</Text>
          </View>
          <Text style={styles.infoValue}>{getAgentTypeLabel(conversation.agentType)}</Text>

          <View style={[styles.infoRow, { marginTop: 12 }]}>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>Date</Text>
          </View>
          <Text style={styles.infoValue}>{formatDate(conversation.updatedAt)}</Text>

          <View style={[styles.infoRow, { marginTop: 12 }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>Status</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              conversation.status === 'completed'
                ? styles.statusCompleted
                : styles.statusActive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                conversation.status === 'completed'
                  ? styles.statusCompletedText
                  : styles.statusActiveText,
              ]}
            >
              {conversation.status === 'completed' ? 'Completed' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Product/ICP Summary (if available) */}
        {conversation.metadata?.productName && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Product Information</Text>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Name:</Text>
              <Text style={styles.summaryValue}>{conversation.metadata.productName}</Text>
            </View>
            {conversation.metadata.productDescription && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Description:</Text>
                <Text style={styles.summaryValue}>
                  {conversation.metadata.productDescription}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Messages */}
        <View style={styles.messagesSection}>
          <Text style={styles.sectionTitle}>Conversation History</Text>
          <View style={styles.messagesContainer}>
            {conversation.messages.map(renderMessage)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  statusCompleted: {
    backgroundColor: '#E8F7ED',
  },
  statusActive: {
    backgroundColor: '#FFF4E6',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusCompletedText: {
    color: '#34C759',
  },
  statusActiveText: {
    color: '#FF9500',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryItem: {
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 15,
    color: '#000',
  },
  messagesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  messagesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#E9E9EB',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#000',
  },
});
