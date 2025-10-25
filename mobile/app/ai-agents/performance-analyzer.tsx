/**
 * Performance Analyzer Screen
 *
 * AI-powered campaign analytics and optimization recommendations
 * 4 sections: Campaign Analysis, Recommendations, Comparison, Executive Summary
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePerformanceAnalyzer } from '../../hooks/usePerformanceAnalyzer';
import { PerformanceMetric } from '../../types/aiAgents';

type SectionType = 'analysis' | 'recommendations' | 'comparison' | 'summary';

export default function PerformanceAnalyzerScreen() {
  const {
    analysis,
    recommendations,
    comparison,
    executiveSummary,
    isAnalyzing,
    error,
    prioritizedRecommendations,
    bestPerformers,
    worstPerformers,
    analyzeCampaign,
    getRecommendations,
    compareCampaigns,
    getExecutiveSummary,
    setSelectedMetric,
  } = usePerformanceAnalyzer();

  // Local state
  const [activeSection, setActiveSection] = useState<SectionType>('analysis');
  const [campaignId, setCampaignId] = useState('');
  const [campaignIds, setCampaignIds] = useState('');
  const [teamId, setTeamId] = useState('');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  // Handle analyze campaign
  const handleAnalyzeCampaign = () => {
    const days = parseInt(dateRange);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    analyzeCampaign(campaignId, { start, end });
  };

  // Handle get recommendations
  const handleGetRecommendations = () => {
    getRecommendations(campaignId);
  };

  // Handle compare campaigns
  const handleCompareCampaigns = () => {
    const ids = campaignIds.split(',').map(id => id.trim()).filter(Boolean);
    compareCampaigns(ids, 'ctr' as PerformanceMetric);
  };

  // Handle get executive summary
  const handleGetExecutiveSummary = () => {
    const days = parseInt(dateRange);
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    getExecutiveSummary(teamId, { start, end });
  };

  // Render section content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'analysis':
        return (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Campaign ID</Text>
              <TextInput
                style={styles.input}
                value={campaignId}
                onChangeText={setCampaignId}
                placeholder="Enter campaign ID..."
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Time Range</Text>
              <View style={styles.dateRangeButtons}>
                {['7', '30', '90'].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.dateRangeButton,
                      dateRange === days && styles.dateRangeButtonActive,
                    ]}
                    onPress={() => setDateRange(days as '7' | '30' | '90')}
                  >
                    <Text
                      style={[
                        styles.dateRangeButtonText,
                        dateRange === days && styles.dateRangeButtonTextActive,
                      ]}
                    >
                      {days} days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isAnalyzing && styles.disabledButton]}
              onPress={handleAnalyzeCampaign}
              disabled={isAnalyzing || !campaignId}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="analytics-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Analyze Campaign</Text>
                </>
              )}
            </TouchableOpacity>

            {analysis && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Campaign Performance</Text>
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>CTR</Text>
                    <Text style={styles.kpiValue}>{analysis.kpis.ctr.toFixed(2)}%</Text>
                  </View>
                  <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>CPC</Text>
                    <Text style={styles.kpiValue}>${analysis.kpis.cpc.toFixed(2)}</Text>
                  </View>
                  <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>ROAS</Text>
                    <Text style={styles.kpiValue}>{analysis.kpis.roas.toFixed(2)}x</Text>
                  </View>
                  <View style={styles.kpiItem}>
                    <Text style={styles.kpiLabel}>Conversions</Text>
                    <Text style={styles.kpiValue}>{analysis.kpis.conversions}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );

      case 'recommendations':
        return (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Campaign ID</Text>
              <TextInput
                style={styles.input}
                value={campaignId}
                onChangeText={setCampaignId}
                placeholder="Enter campaign ID..."
              />
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isAnalyzing && styles.disabledButton]}
              onPress={handleGetRecommendations}
              disabled={isAnalyzing || !campaignId}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="bulb-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Get Recommendations</Text>
                </>
              )}
            </TouchableOpacity>

            {prioritizedRecommendations.length > 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Optimization Recommendations</Text>
                {prioritizedRecommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <View style={styles.recommendationHeader}>
                      <Text style={styles.recommendationTitle}>{rec.action}</Text>
                      <View
                        style={[
                          styles.priorityBadge,
                          rec.priority === 'high' && styles.priorityHigh,
                          rec.priority === 'medium' && styles.priorityMedium,
                        ]}
                      >
                        <Text style={styles.priorityText}>{rec.priority}</Text>
                      </View>
                    </View>
                    <Text style={styles.recommendationDesc}>{rec.impact}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'comparison':
        return (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Campaign IDs (comma-separated)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={campaignIds}
                onChangeText={setCampaignIds}
                placeholder="campaign1, campaign2, campaign3..."
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isAnalyzing && styles.disabledButton]}
              onPress={handleCompareCampaigns}
              disabled={isAnalyzing || !campaignIds}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="git-compare-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Compare Campaigns</Text>
                </>
              )}
            </TouchableOpacity>

            {bestPerformers.length > 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Top Performers</Text>
                {bestPerformers.map((campaign, index) => (
                  <Text key={index} style={styles.listItem}>
                    #{campaign.rank}: Campaign {campaign.campaignId}
                  </Text>
                ))}
              </View>
            )}
          </View>
        );

      case 'summary':
        return (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Team ID</Text>
              <TextInput
                style={styles.input}
                value={teamId}
                onChangeText={setTeamId}
                placeholder="Enter team ID..."
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Time Range</Text>
              <View style={styles.dateRangeButtons}>
                {['7', '30', '90'].map((days) => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      styles.dateRangeButton,
                      dateRange === days && styles.dateRangeButtonActive,
                    ]}
                    onPress={() => setDateRange(days as '7' | '30' | '90')}
                  >
                    <Text
                      style={[
                        styles.dateRangeButtonText,
                        dateRange === days && styles.dateRangeButtonTextActive,
                      ]}
                    >
                      {days} days
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isAnalyzing && styles.disabledButton]}
              onPress={handleGetExecutiveSummary}
              disabled={isAnalyzing || !teamId}
            >
              {isAnalyzing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Generate Summary</Text>
                </>
              )}
            </TouchableOpacity>

            {executiveSummary && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Executive Summary</Text>
                <Text style={styles.resultText}>{JSON.stringify(executiveSummary, null, 2)}</Text>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Section Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeSection === 'analysis' && styles.tabActive]}
            onPress={() => setActiveSection('analysis')}
          >
            <Ionicons
              name="analytics-outline"
              size={20}
              color={activeSection === 'analysis' ? '#007AFF' : '#666'}
            />
            <Text style={[styles.tabText, activeSection === 'analysis' && styles.tabTextActive]}>
              Analysis
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'recommendations' && styles.tabActive]}
            onPress={() => setActiveSection('recommendations')}
          >
            <Ionicons
              name="bulb-outline"
              size={20}
              color={activeSection === 'recommendations' ? '#007AFF' : '#666'}
            />
            <Text
              style={[styles.tabText, activeSection === 'recommendations' && styles.tabTextActive]}
            >
              Recommendations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'comparison' && styles.tabActive]}
            onPress={() => setActiveSection('comparison')}
          >
            <Ionicons
              name="git-compare-outline"
              size={20}
              color={activeSection === 'comparison' ? '#007AFF' : '#666'}
            />
            <Text style={[styles.tabText, activeSection === 'comparison' && styles.tabTextActive]}>
              Compare
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === 'summary' && styles.tabActive]}
            onPress={() => setActiveSection('summary')}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={activeSection === 'summary' ? '#007AFF' : '#666'}
            />
            <Text style={[styles.tabText, activeSection === 'summary' && styles.tabTextActive]}>
              Summary
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderSectionContent()}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  dateRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  dateRangeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dateRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dateRangeButtonTextActive: {
    color: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  recommendationItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  recommendationDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  priorityHigh: {
    backgroundColor: '#FFEBEE',
  },
  priorityMedium: {
    backgroundColor: '#FFF3E0',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  listItem: {
    fontSize: 14,
    color: '#000',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
  },
});
