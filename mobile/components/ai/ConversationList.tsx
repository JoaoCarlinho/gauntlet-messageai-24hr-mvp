/**
 * ConversationList Component
 *
 * Displays list of AI agent conversations with status and metadata
 * Supports navigation to conversation details
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AgentConversation, AgentType } from '../../types/aiAgents';

interface ConversationListProps {
  conversations: AgentConversation[];
  onConversationPress: (conversation: AgentConversation) => void;
  emptyMessage?: string;
  showAgentType?: boolean;
}

const AGENT_CONFIG: Record<
  AgentType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  product_definer: { label: 'Product Definer', icon: 'bulb-outline', color: '#007AFF' },
  campaign_advisor: { label: 'Campaign Advisor', icon: 'megaphone-outline', color: '#FF9500' },
  content_generator: { label: 'Content Generator', icon: 'create-outline', color: '#34C759' },
  discovery_bot: { label: 'Discovery Bot', icon: 'compass-outline', color: '#AF52DE' },
  performance_analyzer: { label: 'Performance Analyzer', icon: 'analytics-outline', color: '#FF3B30' },
};

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onConversationPress,
  emptyMessage = 'No conversations yet',
  showAgentType = true,
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return '#34C759';
      case 'completed':
        return '#007AFF';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const renderConversationItem = ({ item }: { item: AgentConversation }) => {
    const agentConfig = AGENT_CONFIG[item.agentType];
    const statusColor = getStatusColor(item.status);
    const messageCount = item.messages?.length || 0;
    const lastMessage = item.messages?.[messageCount - 1];

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => onConversationPress(item)}
        activeOpacity={0.7}
      >
        {/* Agent Icon */}
        {showAgentType && (
          <View style={[styles.agentIcon, { backgroundColor: agentConfig.color + '20' }]}>
            <Ionicons name={agentConfig.icon} size={24} color={agentConfig.color} />
          </View>
        )}

        {/* Conversation Details */}
        <View style={styles.conversationDetails}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationTitle} numberOfLines={1}>
              {showAgentType ? agentConfig.label : `Conversation ${item.id.slice(-8)}`}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          {/* Last Message Preview */}
          {lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={2}>
              {lastMessage.content}
            </Text>
          )}

          {/* Metadata */}
          <View style={styles.metadata}>
            <View style={styles.metadataItem}>
              <Ionicons name="chatbubbles-outline" size={14} color="#8E8E93" />
              <Text style={styles.metadataText}>{messageCount} messages</Text>
            </View>
            <View style={styles.metadataItem}>
              <Ionicons name="time-outline" size={14} color="#8E8E93" />
              <Text style={styles.metadataText}>
                {new Date(item.updatedAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  return (
    <FlatList
      data={conversations}
      renderItem={renderConversationItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
      ListEmptyComponent={renderEmptyState}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  agentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  conversationDetails: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  conversationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 18,
    color: '#666',
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ConversationList;
