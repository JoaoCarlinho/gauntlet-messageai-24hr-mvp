/**
 * ICPs (Ideal Customer Profiles) List Screen
 *
 * Display and manage ICPs
 * Links to products and AI Campaign Advisor
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useICPs, ICP } from '../../hooks/useICPs';
import { useProducts } from '../../hooks/useProducts';

export default function ICPsScreen() {
  const router = useRouter();
  const { icps, isLoading, error, refetch, deleteICP } = useICPs();
  const { products } = useProducts();
  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Get product name by ID
  const getProductName = (productId: string): string => {
    const product = products.find((p) => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  // Navigate to Campaign Advisor with ICP context
  const handleCreateCampaign = (icp: ICP) => {
    router.push({
      pathname: '/ai-agents/campaign-advisor',
      params: {
        productId: icp.productId,
        icpId: icp.id,
      },
    });
  };

  // Handle delete ICP
  const handleDeleteICP = (icp: ICP) => {
    Alert.alert(
      'Delete ICP',
      `Are you sure you want to delete "${icp.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteICP(icp.id);
              Alert.alert('Success', 'ICP deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete ICP');
            }
          },
        },
      ]
    );
  };

  // Render ICP card
  const renderICPCard = ({ item }: { item: ICP }) => {
    return (
      <TouchableOpacity
        style={styles.icpCard}
        activeOpacity={0.7}
        onLongPress={() => handleDeleteICP(item)}
      >
        {/* Header */}
        <View style={styles.icpHeader}>
          <View style={styles.icpInfo}>
            <Text style={styles.icpName}>{item.name}</Text>
            {item.createdBy === 'ai' && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color="#007AFF" />
                <Text style={styles.aiBadgeText}>AI Created</Text>
              </View>
            )}
          </View>
        </View>

        {/* Linked Product */}
        <View style={styles.productLink}>
          <Ionicons name="cube-outline" size={14} color="#666" />
          <Text style={styles.productLinkText}>{getProductName(item.productId)}</Text>
        </View>

        {/* Demographics */}
        {Object.keys(item.demographics).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demographics</Text>
            <View style={styles.demographicsGrid}>
              {item.demographics.ageRange && (
                <View style={styles.demographicItem}>
                  <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                  <Text style={styles.demographicText}>{item.demographics.ageRange}</Text>
                </View>
              )}
              {item.demographics.gender && (
                <View style={styles.demographicItem}>
                  <Ionicons name="male-female-outline" size={14} color="#8E8E93" />
                  <Text style={styles.demographicText}>{item.demographics.gender}</Text>
                </View>
              )}
              {item.demographics.location && (
                <View style={styles.demographicItem}>
                  <Ionicons name="location-outline" size={14} color="#8E8E93" />
                  <Text style={styles.demographicText}>{item.demographics.location}</Text>
                </View>
              )}
              {item.demographics.income && (
                <View style={styles.demographicItem}>
                  <Ionicons name="cash-outline" size={14} color="#8E8E93" />
                  <Text style={styles.demographicText}>{item.demographics.income}</Text>
                </View>
              )}
              {item.demographics.education && (
                <View style={styles.demographicItem}>
                  <Ionicons name="school-outline" size={14} color="#8E8E93" />
                  <Text style={styles.demographicText}>{item.demographics.education}</Text>
                </View>
              )}
              {item.demographics.occupation && (
                <View style={styles.demographicItem}>
                  <Ionicons name="briefcase-outline" size={14} color="#8E8E93" />
                  <Text style={styles.demographicText}>{item.demographics.occupation}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Pain Points */}
        {item.painPoints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pain Points</Text>
            {item.painPoints.slice(0, 3).map((point, index) => (
              <View key={index} style={styles.painPointItem}>
                <Ionicons name="alert-circle-outline" size={14} color="#FF3B30" />
                <Text style={styles.painPointText} numberOfLines={1}>
                  {point}
                </Text>
              </View>
            ))}
            {item.painPoints.length > 3 && (
              <Text style={styles.moreText}>+{item.painPoints.length - 3} more</Text>
            )}
          </View>
        )}

        {/* Preferred Channels */}
        {item.preferredChannels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Channels</Text>
            <View style={styles.channelsContainer}>
              {item.preferredChannels.slice(0, 4).map((channel, index) => (
                <View key={index} style={styles.channelChip}>
                  <Text style={styles.channelText}>{channel}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Psychographics */}
        {item.psychographics && (
          <View style={styles.section}>
            {item.psychographics.interests && item.psychographics.interests.length > 0 && (
              <View style={styles.psychographicSection}>
                <Text style={styles.psychographicLabel}>Interests:</Text>
                <Text style={styles.psychographicValue} numberOfLines={1}>
                  {item.psychographics.interests.join(', ')}
                </Text>
              </View>
            )}
            {item.psychographics.lifestyle && (
              <View style={styles.psychographicSection}>
                <Text style={styles.psychographicLabel}>Lifestyle:</Text>
                <Text style={styles.psychographicValue} numberOfLines={1}>
                  {item.psychographics.lifestyle}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={styles.campaignButton}
          onPress={() => handleCreateCampaign(item)}
        >
          <Ionicons name="megaphone-outline" size={16} color="#007AFF" />
          <Text style={styles.campaignButtonText}>Create Campaign with AI</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-circle-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>No ICPs Yet</Text>
        <Text style={styles.emptySubtext}>
          Create products first, then define your ideal customer profiles using AI
        </Text>
        <TouchableOpacity
          style={styles.createProductButton}
          onPress={() => router.push('/ai-agents/product-definer')}
        >
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={styles.createProductButtonText}>Create Product</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render header
  const renderHeader = () => {
    if (icps.length === 0) return null;

    return (
      <View style={styles.headerSection}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Ideal Customer Profiles</Text>
          <Text style={styles.headerSubtitle}>{icps.length} ICPs</Text>
        </View>
      </View>
    );
  };

  // Show error state
  if (error && !icps.length) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load ICPs</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={icps}
        renderItem={renderICPCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={icps.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
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
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  headerSection: {
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  icpCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  icpHeader: {
    marginBottom: 12,
  },
  icpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  icpName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  productLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  productLinkText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  demographicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demographicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: '47%',
  },
  demographicText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  painPointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  painPointText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 4,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  channelChip: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  channelText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  psychographicSection: {
    marginBottom: 8,
  },
  psychographicLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  psychographicValue: {
    fontSize: 13,
    color: '#333',
  },
  campaignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E8F4FF',
    marginTop: 4,
  },
  campaignButtonText: {
    fontSize: 15,
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
  createProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  createProductButtonText: {
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
