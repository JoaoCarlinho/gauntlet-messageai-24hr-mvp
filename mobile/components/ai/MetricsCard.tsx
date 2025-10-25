/**
 * MetricsCard Component
 *
 * Display KPI metric card with trend indicators
 * Color-coded based on performance vs benchmark
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MetricsCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    period?: string;
  };
  benchmark?: {
    value: number;
    comparison: 'above' | 'below' | 'equal';
  };
  format?: 'number' | 'currency' | 'percentage';
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  label,
  value,
  unit,
  trend,
  benchmark,
  format = 'number',
}) => {
  // Format the value based on type
  const formatValue = (): string => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  };

  // Determine card color based on benchmark
  const getCardColor = (): string => {
    if (!benchmark) return '#F2F2F7';

    switch (benchmark.comparison) {
      case 'above':
        return '#E8F5E9'; // Green
      case 'below':
        return '#FFEBEE'; // Red
      default:
        return '#FFF3E0'; // Yellow
    }
  };

  // Get trend icon and color
  const getTrendIcon = () => {
    if (!trend) return null;

    const iconColor =
      trend.direction === 'up' ? '#34C759' : trend.direction === 'down' ? '#FF3B30' : '#666';
    const iconName =
      trend.direction === 'up'
        ? 'trending-up'
        : trend.direction === 'down'
        ? 'trending-down'
        : 'remove';

    return (
      <View style={styles.trendContainer}>
        <Ionicons name={iconName} size={16} color={iconColor} />
        <Text style={[styles.trendText, { color: iconColor }]}>
          {trend.value > 0 ? '+' : ''}
          {trend.value}%
        </Text>
        {trend.period && <Text style={styles.trendPeriod}>{trend.period}</Text>}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: getCardColor() }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>
          {formatValue()}
          {unit && <Text style={styles.unit}> {unit}</Text>}
        </Text>
      </View>
      {getTrendIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    minWidth: 150,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  unit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendPeriod: {
    fontSize: 11,
    color: '#999',
  },
});

export default MetricsCard;
