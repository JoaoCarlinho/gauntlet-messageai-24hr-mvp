/**
 * AI Agents Home Screen
 *
 * Hub for all AI agents with navigation to individual agent screens
 * Shows agent cards and recent conversations
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProductDefiner } from '../../hooks/useProductDefiner';

interface AgentCard {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  enabled: boolean;
}

const AGENT_CARDS: AgentCard[] = [
  {
    id: 'product-definer',
    name: 'Product Definer',
    description: 'Define your product and ideal customer profile through guided conversation',
    icon: 'bulb-outline',
    color: '#007AFF',
    route: '/ai-agents/product-definer',
    enabled: true,
  },
  {
    id: 'campaign-advisor',
    name: 'Campaign Advisor',
    description: 'Plan effective marketing campaigns based on your product and audience',
    icon: 'megaphone-outline',
    color: '#FF9500',
    route: '/ai-agents/campaign-advisor',
    enabled: true,
  },
  {
    id: 'content-generator',
    name: 'Content Generator',
    description: 'Generate ad copy, social posts, landing pages, and image prompts',
    icon: 'create-outline',
    color: '#34C759',
    route: '/ai-agents/content-generator',
    enabled: true,
  },
  {
    id: 'performance-analyzer',
    name: 'Performance Analyzer',
    description: 'Analyze campaign performance and get AI-powered optimization recommendations',
    icon: 'analytics-outline',
    color: '#FF3B30',
    route: '/ai-agents/performance-analyzer',
    enabled: true,
  },
  {
    id: 'discovery-bot',
    name: 'Discovery Bot',
    description: 'Public-facing bot that qualifies leads through conversational discovery (view only)',
    icon: 'compass-outline',
    color: '#AF52DE',
    route: '',
    enabled: false, // Info only - not user-initiated
  },
];

export default function AIAgentsScreen() {
  // Get conversation history from Product Definer hook
  const {
    pastConversations,
    isLoadingHistory,
    historyError,
    loadPastConversations,
  } = useProductDefiner();

  // Load past conversations on mount
  useEffect(() => {
    loadPastConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = run only once on mount

  const handleAgentPress = (agent: AgentCard) => {
    if (!agent.enabled) {
      return; // Discovery Bot is not user-initiated
    }
    router.push(agent.route as any);
  };

  const renderAgentCard = (agent: AgentCard) => {
    return (
      <TouchableOpacity
        key={agent.id}
        style={styles.card}
        onPress={() => handleAgentPress(agent)}
        activeOpacity={0.7}
        disabled={!agent.enabled}
      >
        <View style={[styles.iconContainer, { backgroundColor: agent.color + '20' }]}>
          <Ionicons name={agent.icon} size={32} color={agent.color} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{agent.name}</Text>
            {!agent.enabled && (
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>INFO</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDescription}>{agent.description}</Text>
          {agent.enabled && (
            <View style={styles.cardFooter}>
              <Text style={[styles.startButton, { color: agent.color }]}>Start</Text>
              <Ionicons name="arrow-forward" size={16} color={agent.color} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversationCard = (conversation: any) => {
    const formattedDate = new Date(conversation.updatedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const agentTypeLabel = conversation.agentType === 'product_definer'
      ? 'Product Definer'
      : conversation.agentType;

    return (
      <TouchableOpacity
        key={conversation.id}
        style={styles.conversationCard}
        onPress={() => {
          console.log('📖 Opening conversation:', conversation.id);
          router.push(`/ai-agents/conversation-detail?id=${conversation.id}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.conversationHeader}>
          <View style={styles.conversationIconContainer}>
            <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
          </View>
          <View style={styles.conversationInfo}>
            <Text style={styles.conversationAgent}>{agentTypeLabel}</Text>
            <Text style={styles.conversationDate}>{formattedDate}</Text>
          </View>
          <View style={styles.conversationStatus}>
            <View style={[
              styles.statusBadge,
              conversation.status === 'completed' ? styles.statusCompleted : styles.statusActive
            ]}>
              <Text style={styles.statusText}>
                {conversation.status === 'completed' ? 'Completed' : 'Active'}
              </Text>
            </View>
          </View>
        </View>
        {conversation.metadata?.productName && (
          <Text style={styles.conversationProduct}>
            Product: {conversation.metadata.productName}
          </Text>
        )}
        <View style={styles.conversationFooter}>
          <Ionicons name="arrow-forward" size={16} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Agents</Text>
          <Text style={styles.headerSubtitle}>
            Powerful AI assistants to help you succeed with your marketing campaigns
          </Text>
        </View>

        {/* Agent Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Agents</Text>
          {AGENT_CARDS.map(renderAgentCard)}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How AI Agents Work</Text>
              <Text style={styles.infoText}>
                Each AI agent is specialized for a specific task in your marketing workflow. Start with
                Product Definer to establish your foundation, then use Campaign Advisor to plan strategies,
                Content Generator to create assets, and Performance Analyzer to optimize results.
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Conversations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Conversations</Text>

          {/* Loading State */}
          {isLoadingHistory && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading conversations...</Text>
            </View>
          )}

          {/* Error State */}
          {historyError && !isLoadingHistory && (
            <View style={styles.errorState}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
              <Text style={styles.errorText}>{historyError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadPastConversations}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Conversations List */}
          {!isLoadingHistory && !historyError && pastConversations.length > 0 && (
            <View>
              {pastConversations.map(renderConversationCard)}
            </View>
          )}

          {/* Empty State */}
          {!isLoadingHistory && !historyError && pastConversations.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>No recent conversations</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation with an AI agent to see it here
              </Text>
            </View>
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  infoBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  startButton: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
    textAlign: 'center',
  },
  // Loading state styles
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
  },
  // Error state styles
  errorState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Conversation card styles
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationAgent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  conversationDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  conversationStatus: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: '#E8F7ED',
  },
  statusActive: {
    backgroundColor: '#FFF4E6',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34C759',
  },
  conversationProduct: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
