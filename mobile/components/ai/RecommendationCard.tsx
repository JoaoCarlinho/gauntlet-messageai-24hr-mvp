/**
 * RecommendationCard Component
 *
 * Display optimization recommendation with priority, impact, and effort indicators
 * Expandable details section
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RecommendationCardProps {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
  effort?: 'low' | 'medium' | 'high';
  details?: string;
  onPress?: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  title,
  description,
  priority,
  impact,
  effort,
  details,
  onPress,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get priority badge color
  const getPriorityColor = (): string => {
    switch (priority) {
      case 'high':
        return '#FF3B30';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#34C759';
      default:
        return '#666';
    }
  };

  // Get priority badge background color
  const getPriorityBgColor = (): string => {
    switch (priority) {
      case 'high':
        return '#FFEBEE';
      case 'medium':
        return '#FFF3E0';
      case 'low':
        return '#E8F5E9';
      default:
        return '#F2F2F7';
    }
  };

  // Get effort indicator
  const renderEffortIndicator = () => {
    if (!effort) return null;

    const effortLevels = {
      low: { label: 'Low Effort', color: '#34C759', dots: 1 },
      medium: { label: 'Medium Effort', color: '#FF9500', dots: 2 },
      high: { label: 'High Effort', color: '#FF3B30', dots: 3 },
    };

    const config = effortLevels[effort];

    return (
      <View style={styles.effortContainer}>
        <Text style={styles.effortLabel}>{config.label}</Text>
        <View style={styles.dotsContainer}>
          {[1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index <= config.dots ? config.color : '#E5E5EA' },
              ]}
            />
          ))}
        </View>
      </View>
    );
  };

  const handlePress = () => {
    if (details) {
      setIsExpanded(!isExpanded);
    }
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!details && !onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityBgColor() },
            ]}
          >
            <Text style={[styles.priorityText, { color: getPriorityColor() }]}>
              {priority.toUpperCase()}
            </Text>
          </View>
        </View>
        {details && (
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        )}
      </View>

      {/* Description */}
      <Text style={styles.description}>{description}</Text>

      {/* Impact & Effort */}
      <View style={styles.metaContainer}>
        <View style={styles.impactContainer}>
          <Ionicons name="flash" size={16} color="#007AFF" />
          <Text style={styles.impactText}>{impact}</Text>
        </View>
        {renderEffortIndicator()}
      </View>

      {/* Expandable Details */}
      {isExpanded && details && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>{details}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  impactText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
  effortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  effortLabel: {
    fontSize: 12,
    color: '#666',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  detailsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});

export default RecommendationCard;
