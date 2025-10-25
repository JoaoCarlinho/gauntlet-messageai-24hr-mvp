/**
 * TimeRangePicker Component
 *
 * Date range selector for analytics and reporting
 * Supports preset ranges (7/30/90 days) and custom range
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TimeRangePreset = '7' | '30' | '90' | 'custom';

export interface TimeRange {
  start: Date;
  end: Date;
}

interface TimeRangePickerProps {
  selectedRange: TimeRangePreset;
  onRangeSelect: (range: TimeRangePreset, dates: TimeRange) => void;
  label?: string;
  showCustom?: boolean;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  selectedRange,
  onRangeSelect,
  label = 'Time Range',
  showCustom = false,
}) => {
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const presets: { value: TimeRangePreset; label: string; days?: number }[] = [
    { value: '7', label: 'Last 7 days', days: 7 },
    { value: '30', label: 'Last 30 days', days: 30 },
    { value: '90', label: 'Last 90 days', days: 90 },
  ];

  if (showCustom) {
    presets.push({ value: 'custom', label: 'Custom' });
  }

  const handlePresetSelect = (preset: TimeRangePreset, days?: number) => {
    if (preset === 'custom') {
      // For now, just use last 30 days as default for custom
      // In production, this would open a date picker modal
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      onRangeSelect(preset, { start, end });
    } else if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      onRangeSelect(preset, { start, end });
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.buttonContainer}>
        {presets.map((preset) => {
          const isSelected = selectedRange === preset.value;

          return (
            <TouchableOpacity
              key={preset.value}
              style={[styles.button, isSelected && styles.buttonSelected]}
              onPress={() => handlePresetSelect(preset.value, preset.days)}
              activeOpacity={0.7}
            >
              {preset.value === 'custom' && (
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={isSelected ? '#fff' : '#666'}
                  style={styles.icon}
                />
              )}
              <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 4,
  },
  buttonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  icon: {
    marginRight: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  buttonTextSelected: {
    color: '#fff',
  },
});

export default TimeRangePicker;
