/**
 * Content Library Screen
 *
 * View and manage AI-generated content
 * Supports filtering by type, platform, product, campaign
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
  Modal,
  ScrollView,
  Share,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useContentLibrary, {
  ContentItem,
  ContentType,
  Platform,
  ContentFilters,
} from '../../hooks/useContentLibrary';
import { useProducts } from '../../hooks/useProducts';
import { useCampaigns } from '../../hooks/useCampaigns';

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: string; color: string }> = {
  ad_copy: { label: 'Ad Copy', icon: 'megaphone', color: '#FF9500' },
  social_post: { label: 'Social Post', icon: 'chatbubbles', color: '#34C759' },
  landing_page: { label: 'Landing Page', icon: 'document-text', color: '#007AFF' },
  image_prompt: { label: 'Image Prompt', icon: 'image', color: '#AF52DE' },
};

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string }> = {
  facebook: { label: 'Facebook', color: '#1877F2' },
  instagram: { label: 'Instagram', color: '#E4405F' },
  linkedin: { label: 'LinkedIn', color: '#0A66C2' },
  tiktok: { label: 'TikTok', color: '#000000' },
  x: { label: 'X', color: '#000000' },
  google: { label: 'Google', color: '#4285F4' },
};

export default function ContentLibraryScreen() {
  const router = useRouter();
  const {
    content,
    isLoading,
    error,
    filters,
    applyFilters,
    clearFilters,
    deleteContent,
    refetch,
  } = useContentLibrary();
  const { products } = useProducts();
  const { campaigns } = useCampaigns();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Get product name
  const getProductName = (productId?: string): string => {
    if (!productId) return '';
    const product = products.find((p) => p.id === productId);
    return product?.name || '';
  };

  // Get campaign name
  const getCampaignName = (campaignId?: string): string => {
    if (!campaignId) return '';
    const campaign = campaigns.find((c) => c.id === campaignId);
    return campaign?.name || '';
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', 'Content copied to clipboard');
  };

  // Handle share
  const handleShare = async (item: ContentItem) => {
    try {
      await Share.share({
        message: item.content,
      });
    } catch (err: any) {
      console.error('Failed to share:', err);
    }
  };

  // Handle delete
  const handleDelete = async (item: ContentItem) => {
    Alert.alert('Delete Content', 'Are you sure you want to delete this content?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteContent(item.id);
            setSelectedContent(null);
            Alert.alert('Success', 'Content deleted successfully');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete content');
          }
        },
      },
    ]);
  };

  // Handle regenerate
  const handleRegenerate = (item: ContentItem) => {
    setSelectedContent(null);
    router.push({
      pathname: '/ai-agents/content-generator',
      params: {
        campaignId: item.campaignId,
        regenerateType: item.type,
      },
    });
  };

  // Render content card
  const renderContentCard = ({ item }: { item: ContentItem }) => {
    const typeConfig = CONTENT_TYPE_CONFIG[item.type];
    const platformConfig = item.platform ? PLATFORM_CONFIG[item.platform] : null;

    return (
      <TouchableOpacity
        style={styles.contentCard}
        activeOpacity={0.7}
        onPress={() => setSelectedContent(item)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.color + '20' }]}>
            <Ionicons name={typeConfig.icon as any} size={20} color={typeConfig.color} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.typeLabel}>{typeConfig.label}</Text>
            {platformConfig && (
              <View style={styles.platformBadge}>
                <Text style={styles.platformText}>{platformConfig.label}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Content Preview */}
        <Text style={styles.contentPreview} numberOfLines={3}>
          {item.content}
        </Text>

        {/* Metadata */}
        <View style={styles.cardFooter}>
          {item.productId && (
            <View style={styles.metadataItem}>
              <Ionicons name="cube-outline" size={12} color="#8E8E93" />
              <Text style={styles.metadataText}>{getProductName(item.productId)}</Text>
            </View>
          )}
          {item.campaignId && (
            <View style={styles.metadataItem}>
              <Ionicons name="megaphone-outline" size={12} color="#8E8E93" />
              <Text style={styles.metadataText}>{getCampaignName(item.campaignId)}</Text>
            </View>
          )}
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render filter button
  const renderFilterButton = (
    label: string,
    value: string,
    isActive: boolean,
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={onPress}
      >
        <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render filters modal
  const renderFiltersModal = () => {
    return (
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity
              onPress={() => {
                clearFilters();
                setShowFilters(false);
              }}
            >
              <Text style={styles.modalClear}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContent}>
            {/* Content Type */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Content Type</Text>
              <View style={styles.filterButtons}>
                {(Object.keys(CONTENT_TYPE_CONFIG) as ContentType[]).map((type) => (
                  <View key={type}>
                    {renderFilterButton(
                      CONTENT_TYPE_CONFIG[type].label,
                      type,
                      filters.type === type,
                      () => {
                        applyFilters({
                          ...filters,
                          type: filters.type === type ? undefined : type,
                        });
                      }
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Platform */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Platform</Text>
              <View style={styles.filterButtons}>
                {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((platform) => (
                  <View key={platform}>
                    {renderFilterButton(
                      PLATFORM_CONFIG[platform].label,
                      platform,
                      filters.platform === platform,
                      () => {
                        applyFilters({
                          ...filters,
                          platform: filters.platform === platform ? undefined : platform,
                        });
                      }
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Product */}
            {products.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Product</Text>
                <View style={styles.filterButtons}>
                  {products.map((product) => (
                    <View key={product.id}>
                      {renderFilterButton(
                        product.name,
                        product.id,
                        filters.productId === product.id,
                        () => {
                          applyFilters({
                            ...filters,
                            productId: filters.productId === product.id ? undefined : product.id,
                          });
                        }
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Campaign */}
            {campaigns.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Campaign</Text>
                <View style={styles.filterButtons}>
                  {campaigns.map((campaign) => (
                    <View key={campaign.id}>
                      {renderFilterButton(
                        campaign.name,
                        campaign.id,
                        filters.campaignId === campaign.id,
                        () => {
                          applyFilters({
                            ...filters,
                            campaignId:
                              filters.campaignId === campaign.id ? undefined : campaign.id,
                          });
                        }
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedContent) return null;

    const typeConfig = CONTENT_TYPE_CONFIG[selectedContent.type];

    return (
      <Modal
        visible={!!selectedContent}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedContent(null)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedContent(null)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{typeConfig.label}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.detailContent}>
            {/* Platform */}
            {selectedContent.platform && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Platform</Text>
                <View style={styles.platformChip}>
                  <Text style={styles.platformChipText}>
                    {PLATFORM_CONFIG[selectedContent.platform].label}
                  </Text>
                </View>
              </View>
            )}

            {/* Product */}
            {selectedContent.productId && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Product</Text>
                <Text style={styles.detailValue}>
                  {getProductName(selectedContent.productId)}
                </Text>
              </View>
            )}

            {/* Campaign */}
            {selectedContent.campaignId && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Campaign</Text>
                <Text style={styles.detailValue}>
                  {getCampaignName(selectedContent.campaignId)}
                </Text>
              </View>
            )}

            {/* Full Content */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Content</Text>
              <View style={styles.contentBox}>
                <Text style={styles.contentText}>{selectedContent.content}</Text>
              </View>
            </View>

            {/* Metadata */}
            {selectedContent.metadata && Object.keys(selectedContent.metadata).length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Details</Text>
                {Object.entries(selectedContent.metadata).map(([key, value]) => (
                  <View key={key} style={styles.metadataRow}>
                    <Text style={styles.metadataKey}>{key}:</Text>
                    <Text style={styles.metadataValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.detailActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCopyToClipboard(selectedContent.content)}
            >
              <Ionicons name="copy-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleShare(selectedContent)}
            >
              <Ionicons name="share-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRegenerate(selectedContent)}
            >
              <Ionicons name="refresh-outline" size={20} color="#007AFF" />
              <Text style={styles.actionButtonText}>Regenerate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(selectedContent)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    const hasFilters = Object.keys(filters).length > 0;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>
          {hasFilters ? 'No Content Found' : 'No Content Yet'}
        </Text>
        <Text style={styles.emptySubtext}>
          {hasFilters
            ? 'Try adjusting your filters'
            : 'Generate content using the Content Generator AI'}
        </Text>
        {hasFilters ? (
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => router.push('/ai-agents/content-generator')}
          >
            <Ionicons name="sparkles" size={20} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Content</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render header
  const renderHeader = () => {
    if (content.length === 0) return null;

    const activeFiltersCount = Object.values(filters).filter((v) => v !== undefined).length;

    return (
      <View style={styles.headerSection}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Content Library</Text>
          <Text style={styles.headerSubtitle}>{content.length} items</Text>
        </View>
        <TouchableOpacity style={styles.filterIconButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="filter" size={20} color="#007AFF" />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Show error state
  if (error && !content.length) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load content</Text>
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
        data={content}
        renderItem={renderContentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={content.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />
      {renderFiltersModal()}
      {renderDetailModal()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  filterIconButton: {
    position: 'relative',
    padding: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  platformBadge: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  platformText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  contentPreview: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
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
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 'auto',
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
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  clearFiltersButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  modalClear: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  filtersContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  modalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
  },
  platformChip: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  platformChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  contentBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  contentText: {
    fontSize: 15,
    color: '#000',
    lineHeight: 22,
  },
  metadataRow: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  metadataKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  metadataValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  detailActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  deleteButton: {},
  deleteButtonText: {
    color: '#FF3B30',
  },
});
