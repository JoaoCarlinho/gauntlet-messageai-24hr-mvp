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
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLeads, Lead, LeadStatus, LeadScore } from '../../hooks/useLeads';

export default function LeadsScreen() {
  const { leads, isLoading, error, refetch, updateLeadStatus, claimLead } = useLeads();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      setSelectedLead(lead);
      setShowDetailModal(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to claim lead');
    }
  };

  // Handle contact actions
  const handleCallLead = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmailLead = (email?: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedLead(null);
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
        onPress={() => {
          setSelectedLead(item);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.leadHeader}>
          <View style={styles.leadInfo}>
            <Text style={styles.leadName}>{item.name}</Text>
            <View style={styles.badges}>
              {item.score && (
                <View
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
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
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
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={14} color="#666" />
              <Text style={styles.contactText}>{item.email}</Text>
            </View>
          )}
          {item.company && (
            <View style={styles.contactItem}>
              <Ionicons name="business-outline" size={14} color="#666" />
              <Text style={styles.contactText}>{item.company}</Text>
            </View>
          )}
        </View>

        {/* Source & Discovery Session */}
        <View style={styles.metadata}>
          <View style={styles.metadataItem}>
            <Ionicons name="compass-outline" size={14} color="#8E8E93" />
            <Text style={styles.metadataText}>Source: {item.source}</Text>
          </View>
          {item.discoverySessionId && (
            <View style={styles.metadataItem}>
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
        keyExtractor={(item, index) => item?.id || `lead-${index}`}
        contentContainerStyle={leads.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Lead Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Lead Claimed!</Text>
              <Text style={styles.modalSubtitle}>Here are the details</Text>
            </View>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          {selectedLead && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Lead Name & Score */}
              <View style={styles.detailSection}>
                <Text style={styles.detailName}>{selectedLead.name}</Text>
                {selectedLead.score && (
                  <View
                    style={[
                      styles.detailScoreBadge,
                      { backgroundColor: getScoreBgColor(selectedLead.score) },
                    ]}
                  >
                    <Ionicons
                      name="flame"
                      size={16}
                      color={getScoreColor(selectedLead.score)}
                    />
                    <Text
                      style={[
                        styles.detailScoreText,
                        { color: getScoreColor(selectedLead.score) },
                      ]}
                    >
                      {selectedLead.score.toUpperCase()} LEAD
                    </Text>
                  </View>
                )}
              </View>

              {/* Contact Actions */}
              <View style={styles.actionSection}>
                {selectedLead.phone && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCallLead(selectedLead.phone)}
                  >
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                )}
                {selectedLead.email && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEmailLead(selectedLead.email)}
                  >
                    <Ionicons name="mail" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Email</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Contact Information */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Contact Information</Text>
                {selectedLead.email && (
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>{selectedLead.email}</Text>
                  </View>
                )}
                {selectedLead.phone && (
                  <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>{selectedLead.phone}</Text>
                  </View>
                )}
                {selectedLead.company && (
                  <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>{selectedLead.company}</Text>
                  </View>
                )}
                {selectedLead.jobTitle && (
                  <View style={styles.detailRow}>
                    <Ionicons name="briefcase-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>{selectedLead.jobTitle}</Text>
                  </View>
                )}
              </View>

              {/* Lead Details */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Lead Details</Text>
                <View style={styles.detailRow}>
                  <Ionicons name="flag-outline" size={20} color="#666" />
                  <Text style={styles.detailText}>
                    Status: {getStatusLabel(selectedLead.status)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="compass-outline" size={20} color="#666" />
                  <Text style={styles.detailText}>Source: {selectedLead.source}</Text>
                </View>
                {selectedLead.qualificationScore !== undefined && (
                  <View style={styles.detailRow}>
                    <Ionicons name="analytics-outline" size={20} color="#666" />
                    <Text style={styles.detailText}>
                      Qualification Score: {selectedLead.qualificationScore}/100
                    </Text>
                  </View>
                )}
              </View>

              {/* Discovery Session Summary */}
              {selectedLead.discoverySessionSummary && (
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Discovery Session Notes</Text>
                  <Text style={styles.summaryText}>
                    {selectedLead.discoverySessionSummary}
                  </Text>
                </View>
              )}

              {/* Update Status */}
              <TouchableOpacity
                style={styles.updateStatusButton}
                onPress={() => {
                  handleCloseModal();
                  setTimeout(() => handleUpdateStatus(selectedLead), 300);
                }}
              >
                <Text style={styles.updateStatusButtonText}>Update Status</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  detailScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  detailScoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  summaryText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  updateStatusButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  updateStatusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
