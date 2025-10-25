/**
 * Campaigns Screen
 *
 * Display and manage marketing campaigns
 * Integrates with Campaign Advisor and Performance Analyzer
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCampaigns, Campaign, CampaignStatus } from '../../hooks/useCampaigns';

export default function CampaignsScreen() {
  const { campaigns, isLoading, error, refetch, updateCampaignStatus } = useCampaigns();
  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Get status color
  const getStatusColor = (status: CampaignStatus): string => {
    switch (status) {
      case 'active':
        return '#34C759';
      case 'draft':
        return '#8E8E93';
      case 'paused':
        return '#FF9500';
      case 'completed':
        return '#007AFF';
      case 'archived':
        return '#C7C7CC';
      default:
        return '#8E8E93';
    }
  };

  // Get status label
  const getStatusLabel = (status: CampaignStatus): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Handle create campaign
  const handleCreateCampaign = () => {
    router.push('/ai-agents/campaign-advisor' as any);
  };

  // Handle analyze performance
  const handleAnalyzePerformance = (campaign: Campaign) => {
    // Navigate to Performance Analyzer with campaign context
    router.push({
      pathname: '/ai-agents/performance-analyzer' as any,
      params: { campaignId: campaign.id },
    });
  };

  // Handle update status
  const handleUpdateStatus = (campaign: Campaign) => {
    const statuses: CampaignStatus[] = ['draft', 'active', 'paused', 'completed', 'archived'];

    Alert.alert(
      'Update Campaign Status',
      `Select new status for ${campaign.name}`,
      statuses
        .map((status) => ({
          text: getStatusLabel(status),
          onPress: async () => {
            try {
              await updateCampaignStatus(campaign.id, status);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update status');
            }
          },
        }))
        .concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Render campaign card
  const renderCampaignCard = ({ item }: { item: Campaign }) => {
    const budgetUsedPercent = (item.spent / item.budget) * 100;

    return (
      <View style={styles.campaignCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.campaignName}>{item.name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Platforms */}
        {item.platforms.length > 0 && (
          <View style={styles.platforms}>
            {item.platforms.map((platform) => (
              <View key={platform} style={styles.platformChip}>
                <Text style={styles.platformText}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Impressions</Text>
            <Text style={styles.metricValue}>{formatNumber(item.metrics.impressions)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Clicks</Text>
            <Text style={styles.metricValue}>{formatNumber(item.metrics.clicks)}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>CTR</Text>
            <Text style={styles.metricValue}>{item.metrics.ctr.toFixed(2)}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>ROAS</Text>
            <Text style={styles.metricValue}>{item.metrics.roas.toFixed(2)}x</Text>
          </View>
        </View>

        {/* Budget */}
        <View style={styles.budgetSection}>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Budget</Text>
            <Text style={styles.budgetValue}>
              {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
            </Text>
          </View>
          <View style={styles.budgetBar}>
            <View
              style={[
                styles.budgetProgress,
                {
                  width: `${Math.min(budgetUsedPercent, 100)}%`,
                  backgroundColor: budgetUsedPercent > 90 ? '#FF3B30' : '#34C759',
                },
              ]}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleAnalyzePerformance(item)}
          >
            <Ionicons name="analytics-outline" size={16} color="#007AFF" />
            <Text style={styles.actionButtonText}>Analyze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUpdateStatus(item)}
          >
            <Ionicons name="create-outline" size={16} color="#007AFF" />
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="megaphone-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>No Campaigns Yet</Text>
        <Text style={styles.emptySubtext}>
          Create your first campaign with AI-powered Campaign Advisor
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateCampaign}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Campaign</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show error state
  if (error && !campaigns.length) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load campaigns</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with Create Button */}
      {campaigns.length > 0 && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCreateCampaign}>
            <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.headerButtonText}>Create Campaign</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={campaigns}
        renderItem={renderCampaignCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={campaigns.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  headerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  platforms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  platformChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  platformText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: '22%',
  },
  metricLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  budgetSection: {
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 13,
    color: '#666',
  },
  budgetValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  budgetBar: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetProgress: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
