/**
 * PlatformSelector Component
 *
 * Platform selection component for content generation
 * Displays platform chips for Facebook, Instagram, LinkedIn, TikTok, X, Google
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from '../../types/aiAgents';

interface PlatformSelectorProps {
  selectedPlatform: Platform | null;
  onSelect: (platform: Platform) => void;
  platforms?: Platform[];
  label?: string;
}

const PLATFORM_CONFIG: Record<Platform, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  facebook: { label: 'Facebook', icon: 'logo-facebook' },
  instagram: { label: 'Instagram', icon: 'logo-instagram' },
  linkedin: { label: 'LinkedIn', icon: 'logo-linkedin' },
  tiktok: { label: 'TikTok', icon: 'logo-tiktok' },
  x: { label: 'X (Twitter)', icon: 'logo-twitter' },
  google: { label: 'Google', icon: 'logo-google' },
};

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onSelect,
  platforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'google'],
  label = 'Platform',
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {platforms.map((platform) => {
          const config = PLATFORM_CONFIG[platform];
          const isSelected = selectedPlatform === platform;

          return (
            <TouchableOpacity
              key={platform}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelect(platform)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={config.icon}
                size={18}
                color={isSelected ? '#fff' : '#666'}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  scrollContent: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
});

export default PlatformSelector;
