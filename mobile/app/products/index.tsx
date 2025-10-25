/**
 * Products List Screen
 *
 * Display and manage products
 * Includes AI-powered product creation
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProducts, Product } from '../../hooks/useProducts';

export default function ProductsScreen() {
  const router = useRouter();
  const { products, isLoading, error, refetch, deleteProduct } = useProducts();
  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Navigate to Product Definer AI
  const handleCreateWithAI = () => {
    router.push('/ai-agents/product-definer');
  };

  // Handle delete product
  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Alert.alert('Success', 'Product deleted successfully');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  // Format price
  const formatPrice = (pricing?: Product['pricing']): string => {
    if (!pricing) return 'No pricing';
    const { amount, currency } = pricing;
    return `${currency} ${amount.toFixed(2)}`;
  };

  // Render product card
  const renderProductCard = ({ item }: { item: Product }) => {
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.7}
        onLongPress={() => handleDeleteProduct(item)}
      >
        {/* Header */}
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.createdBy === 'ai' && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color="#007AFF" />
                <Text style={styles.aiBadgeText}>AI Created</Text>
              </View>
            )}
          </View>
          {item.pricing && (
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>{formatPrice(item.pricing)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Target Audience */}
        {item.targetAudience && (
          <View style={styles.audienceSection}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.audienceText} numberOfLines={1}>
              {item.targetAudience}
            </Text>
          </View>
        )}

        {/* USPs */}
        {item.usps.length > 0 && (
          <View style={styles.uspsSection}>
            <Text style={styles.uspsSectionTitle}>Key Selling Points:</Text>
            {item.usps.slice(0, 3).map((usp, index) => (
              <View key={index} style={styles.uspItem}>
                <Ionicons name="checkmark-circle" size={14} color="#34C759" />
                <Text style={styles.uspText} numberOfLines={1}>
                  {usp}
                </Text>
              </View>
            ))}
            {item.usps.length > 3 && (
              <Text style={styles.moreText}>+{item.usps.length - 3} more</Text>
            )}
          </View>
        )}

        {/* Features */}
        {item.features && item.features.length > 0 && (
          <View style={styles.featuresSection}>
            <Text style={styles.featuresSectionTitle}>Features:</Text>
            <View style={styles.featuresList}>
              {item.features.slice(0, 3).map((feature, index) => (
                <View key={index} style={styles.featureChip}>
                  <Text style={styles.featureText} numberOfLines={1}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.productFooter}>
          <Text style={styles.timestampText}>
            Created {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>No Products Yet</Text>
        <Text style={styles.emptySubtext}>
          Create your first product using our AI-powered Product Definer
        </Text>
        <TouchableOpacity style={styles.aiCTAButton} onPress={handleCreateWithAI}>
          <Ionicons name="sparkles" size={20} color="#fff" />
          <Text style={styles.aiCTAButtonText}>Create with AI</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render header
  const renderHeader = () => {
    if (products.length === 0) return null;

    return (
      <View style={styles.headerSection}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>My Products</Text>
          <Text style={styles.headerSubtitle}>{products.length} products</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateWithAI}>
          <Ionicons name="sparkles" size={18} color="#007AFF" />
          <Text style={styles.createButtonText}>Create with AI</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show error state
  if (error && !products.length) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load products</Text>
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
        data={products}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={products.length === 0 ? styles.emptyList : styles.list}
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  priceTag: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  audienceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
  },
  audienceText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  uspsSection: {
    marginBottom: 12,
  },
  uspsSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  uspItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  uspText: {
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
  featuresSection: {
    marginBottom: 12,
  },
  featuresSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureChip: {
    backgroundColor: '#E8F4FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: '48%',
  },
  featureText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  productFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    marginTop: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#8E8E93',
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
  aiCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  aiCTAButtonText: {
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
