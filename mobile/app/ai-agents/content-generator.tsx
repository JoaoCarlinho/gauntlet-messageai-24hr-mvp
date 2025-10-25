/**
 * Content Generator Screen
 *
 * AI-powered content generation for ad copy, social posts, landing pages, and image prompts
 * Tab-based UI for different content types
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useContentGenerator } from '../../hooks/useContentGenerator';
import { Platform, ContentType } from '../../types/aiAgents';

type TabType = 'ad_copy' | 'social_post' | 'landing_page' | 'image_prompt';

export default function ContentGeneratorScreen() {
  const {
    isGenerating,
    error,
    selectedPlatform,
    adCopy,
    socialPost,
    landingPage,
    imagePrompt,
    generateAdCopy,
    generateSocialPost,
    generateLandingPage,
    generateImagePrompt,
    setSelectedPlatform,
    clearError,
  } = useContentGenerator();

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('ad_copy');
  const [campaignId, setCampaignId] = useState('');
  const [variations, setVariations] = useState('3');
  const [concept, setConcept] = useState('');

  // Handle platform selection
  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform);
  };

  // Handle generate content
  const handleGenerate = () => {
    if (!campaignId.trim()) {
      Alert.alert('Error', 'Please enter a campaign ID');
      return;
    }

    if (!selectedPlatform) {
      Alert.alert('Error', 'Please select a platform');
      return;
    }

    switch (activeTab) {
      case 'ad_copy':
        generateAdCopy({
          campaignId,
          platform: selectedPlatform,
          variations: parseInt(variations) || 3,
          saveToLibrary: true,
        });
        break;
      case 'social_post':
        generateSocialPost({
          campaignId,
          platform: selectedPlatform,
          variations: parseInt(variations) || 3,
          saveToLibrary: true,
        });
        break;
      case 'landing_page':
        generateLandingPage({
          campaignId,
          saveToLibrary: true,
        });
        break;
      case 'image_prompt':
        if (!concept.trim()) {
          Alert.alert('Error', 'Please enter a concept for the image');
          return;
        }
        generateImagePrompt({
          campaignId,
          platform: selectedPlatform,
          concept,
          variations: parseInt(variations) || 3,
          saveToLibrary: true,
        });
        break;
    }
  };

  // Render platform selector
  const renderPlatformSelector = () => {
    const platforms: Platform[] = ['facebook', 'instagram', 'linkedin', 'tiktok', 'x', 'google'];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Platform</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.platformScroll}>
          {platforms.map((platform) => (
            <TouchableOpacity
              key={platform}
              style={[
                styles.platformChip,
                selectedPlatform === platform && styles.platformChipSelected,
              ]}
              onPress={() => handlePlatformSelect(platform)}
            >
              <Text
                style={[
                  styles.platformChipText,
                  selectedPlatform === platform && styles.platformChipTextSelected,
                ]}
              >
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'ad_copy':
        return (
          <View>
            {renderPlatformSelector()}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Number of Variations</Text>
              <TextInput
                style={styles.input}
                value={variations}
                onChangeText={setVariations}
                placeholder="3"
                keyboardType="number-pad"
                maxLength={1}
              />
            </View>
            {adCopy && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Generated Ad Copy:</Text>
                <Text style={styles.resultText}>{JSON.stringify(adCopy, null, 2)}</Text>
              </View>
            )}
          </View>
        );

      case 'social_post':
        return (
          <View>
            {renderPlatformSelector()}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Number of Variations</Text>
              <TextInput
                style={styles.input}
                value={variations}
                onChangeText={setVariations}
                placeholder="3"
                keyboardType="number-pad"
                maxLength={1}
              />
            </View>
            {socialPost && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Generated Social Post:</Text>
                <Text style={styles.resultText}>{JSON.stringify(socialPost, null, 2)}</Text>
              </View>
            )}
          </View>
        );

      case 'landing_page':
        return (
          <View>
            {landingPage && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Generated Landing Page:</Text>
                <Text style={styles.resultText}>{JSON.stringify(landingPage, null, 2)}</Text>
              </View>
            )}
          </View>
        );

      case 'image_prompt':
        return (
          <View>
            {renderPlatformSelector()}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Concept</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={concept}
                onChangeText={setConcept}
                placeholder="Describe the image concept..."
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Number of Variations</Text>
              <TextInput
                style={styles.input}
                value={variations}
                onChangeText={setVariations}
                placeholder="3"
                keyboardType="number-pad"
                maxLength={1}
              />
            </View>
            {imagePrompt && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Generated Image Prompts:</Text>
                <Text style={styles.resultText}>{JSON.stringify(imagePrompt, null, 2)}</Text>
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
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ad_copy' && styles.tabActive]}
            onPress={() => setActiveTab('ad_copy')}
          >
            <Text style={[styles.tabText, activeTab === 'ad_copy' && styles.tabTextActive]}>
              Ad Copy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'social_post' && styles.tabActive]}
            onPress={() => setActiveTab('social_post')}
          >
            <Text style={[styles.tabText, activeTab === 'social_post' && styles.tabTextActive]}>
              Social Post
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'landing_page' && styles.tabActive]}
            onPress={() => setActiveTab('landing_page')}
          >
            <Text style={[styles.tabText, activeTab === 'landing_page' && styles.tabTextActive]}>
              Landing Page
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'image_prompt' && styles.tabActive]}
            onPress={() => setActiveTab('image_prompt')}
          >
            <Text style={[styles.tabText, activeTab === 'image_prompt' && styles.tabTextActive]}>
              Image Prompt
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Campaign ID</Text>
          <TextInput
            style={styles.input}
            value={campaignId}
            onChangeText={setCampaignId}
            placeholder="Enter campaign ID..."
          />
        </View>

        {renderTabContent()}

        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.disabledButton]}
          onPress={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Content</Text>
            </>
          )}
        </TouchableOpacity>

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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  platformScroll: {
    flexDirection: 'row',
  },
  platformChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
  },
  platformChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  platformChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  platformChipTextSelected: {
    color: '#fff',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
