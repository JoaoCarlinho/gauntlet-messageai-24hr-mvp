/**
 * Leads Screen
 *
 * Display and manage leads from Discovery Bot sessions
 * Includes real-time updates and lead management actions
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
import { useLeads, Lead, LeadStatus, LeadScore } from '../../hooks/useLeads';

export default function LeadsScreen() {
  const { leads, isLoading, error, refetch, updateLeadStatus, claimLead } = useLeads();
  const [refreshing, setRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Get score badge color
  const getScoreColor = (score: LeadScore): string => {
    switch (score) {
      case 'hot':
        return '#FF3B30';
      case 'warm':
        return '#FF9500';
      case 'cold':
        return '#007AFF';
      default:
        return '#8E8E93';
    }
  };

  // Get score badge background
  const getScoreBgColor = (score: LeadScore): string => {
    switch (score) {
      case 'hot':
        return '#FFEBEE';
      case 'warm':
        return '#FFF3E0';
      case 'cold':
        return '#E8F4FF';
      default:
        return '#F2F2F7';
    }
  };

  // Get status label
  const getStatusLabel = (status: LeadStatus): string => {
    switch (status) {
      case 'new':
        return 'New';
      case 'contacted':
        return 'Contacted';
      case 'qualified':
        return 'Qualified';
      case 'unqualified':
        return 'Unqualified';
      case 'converted':
        return 'Converted';
      default:
        return status;
    }
  };

  // Get status color
  const getStatusColor = (status: LeadStatus): string => {
    switch (status) {
      case 'new':
        return '#007AFF';
      case 'contacted':
        return '#FF9500';
      case 'qualified':
        return '#34C759';
      case 'unqualified':
        return '#8E8E93';
      case 'converted':
        return '#AF52DE';
      default:
        return '#8E8E93';
    }
  };

  // Handle claim lead
  const handleClaimLead = async (lead: Lead) => {
    try {
      await claimLead(lead.id);
      Alert.alert('Success', `Lead "${lead.name}" has been claimed`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to claim lead');
    }
  };

  // Handle update status
  const handleUpdateStatus = (lead: Lead) => {
    const statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];

    const statusButtons = statuses.map((status) => ({
      text: getStatusLabel(status),
      onPress: async () => {
        try {
          await updateLeadStatus(lead.id, status);
        } catch (err: any) {
          Alert.alert('Error', err.message || 'Failed to update status');
        }
      },
    }));

    Alert.alert(
      'Update Lead Status',
      `Select new status for ${lead.name}`,
      [...statusButtons, { text: 'Cancel', style: 'cancel' as const }]
    );
  };

  // Render lead item
  const renderLeadItem = ({ item }: { item: Lead }) => {
    return (
      <TouchableOpacity
        style={styles.leadCard}
        onPress={() => handleUpdateStatus(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.name}</Text>
            <View style={styles.badges}>
              {item.score && (
                <View
                  key={`${item.id}-score-badge`}
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreBgColor(item.score) },
                  ]}
                >
                  <Ionicons
                    name="flame"
                    size={12}
                    color={getScoreColor(item.score)}
                  />
                  <Text style={[styles.scoreText, { color: getScoreColor(item.score) }]}>
                    {item.score.toUpperCase()}
                  </Text>
                </View>
              )}
              <View key={`${item.id}-status-badge`} style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactInfo}>
          {item.email && (
            <View key={`${item.id}-email-contact`} style={styles.contactItem}>
              <Ionicons name="mail-outline" size={14} color="#666" />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
          )}
          {item.company && (
            <View key={`${item.id}-company-contact`} style={styles.contactItem}>
              <Ionicons name="business-outline" size={14} color="#666" />
              <Text style={styles.contactText}>{item.company}</Text>
            </View>
          )}
        </View>

        {/* Source & Discovery Session */}
        <View style={styles.metadata}>
          <View key={`${item.id}-source-metadata`} style={styles.metadataItem}>
            <Ionicons name="compass-outline" size={14} color="#8E8E93" />
            <Text style={styles.metadataText}>Source: {item.source}</Text>
          </View>
          {item.discoverySessionId && (
            <View key={`${item.id}-discovery-metadata`} style={styles.metadataItem}>
              <Ionicons name="chatbubbles-outline" size={14} color="#8E8E93" />
              <Text style={styles.metadataText}>Discovery Session</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {!item.claimedBy && (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={() => handleClaimLead(item)}
          >
            <Ionicons name="hand-left-outline" size={16} color="#007AFF" />
            <Text style={styles.claimButtonText}>Claim Lead</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyText}>No Leads Yet</Text>
        <Text style={styles.emptySubtext}>
          Leads from Discovery Bot sessions will appear here
        </Text>
      </View>
    );
  };

  // Show error state
  if (error && !leads.length) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to load leads</Text>
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
        data={leads}
        renderItem={renderLeadItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={leads.length === 0 ? styles.emptyList : styles.list}
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
  leadCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
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
  contactInfo: {
    marginBottom: 12,
    gap: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
  },
  metadata: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginTop: 4,
  },
  claimButtonText: {
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
    textAlign: 'center',
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
