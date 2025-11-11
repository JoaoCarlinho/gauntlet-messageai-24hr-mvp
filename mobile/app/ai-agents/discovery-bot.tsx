/**
 * Discovery Bot Info Screen
 *
 * Information screen showing Discovery Bot details
 * This is a public-facing bot (not user-initiated), so this screen provides info only
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DiscoveryBotScreen() {
  // State for manual lead capture
  const [profileUrl, setProfileUrl] = useState('');
  const [isScrapingProfile, setIsScrapingProfile] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  // Advanced options state
  const [useLinkedInAuth, setUseLinkedInAuth] = useState(false);
  const [linkedInEmail, setLinkedInEmail] = useState('');
  const [linkedInPassword, setLinkedInPassword] = useState('');
  const [useFacebookGraphAPI, setUseFacebookGraphAPI] = useState(false);
  const [facebookAccessToken, setFacebookAccessToken] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    router.push('/(tabs)/ai-agents');
  }, []);

  // Validate URL (LinkedIn or Facebook)
  const validateProfileUrl = (url: string): { isValid: boolean; platform: 'linkedin' | 'facebook' | null } => {
    const trimmedUrl = url.trim();

    // LinkedIn patterns
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/(in|pub)\/[\w-]+/i;
    if (linkedinRegex.test(trimmedUrl)) {
      return { isValid: true, platform: 'linkedin' };
    }

    // Facebook patterns
    const facebookRegex = /^https?:\/\/(www\.)?(facebook|fb)\.com\/[\w.-]+/i;
    if (facebookRegex.test(trimmedUrl)) {
      return { isValid: true, platform: 'facebook' };
    }

    return { isValid: false, platform: null };
  };

  // Handle profile scraping and lead creation
  const handleCaptureProfile = useCallback(async () => {
    setScrapingError(null);

    // Validate URL
    const { isValid, platform } = validateProfileUrl(profileUrl);

    if (!isValid) {
      Alert.alert(
        'Invalid URL',
        'Please enter a valid LinkedIn or Facebook profile URL.\n\nExamples:\n• linkedin.com/in/username\n• facebook.com/username',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate LinkedIn auth requirements
    if (useLinkedInAuth && platform === 'linkedin' && (!linkedInEmail || !linkedInPassword)) {
      Alert.alert(
        'LinkedIn Authentication Required',
        'Please enter your LinkedIn email and password to use authenticated scraping.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Validate Facebook Graph API requirements
    if (useFacebookGraphAPI && platform === 'facebook' && !facebookAccessToken) {
      Alert.alert(
        'Facebook Access Token Required',
        'Please enter your Facebook access token to use the Graph API.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsScrapingProfile(true);

    try {
      // Build request body with advanced options
      const requestBody: any = {
        profileUrl: profileUrl.trim(),
        platform,
      };

      // Add LinkedIn auth if enabled
      if (useLinkedInAuth && platform === 'linkedin') {
        requestBody.useLinkedInAuth = true;
        requestBody.linkedInEmail = linkedInEmail;
        requestBody.linkedInPassword = linkedInPassword;
      }

      // Add Facebook Graph API if enabled
      if (useFacebookGraphAPI && platform === 'facebook') {
        requestBody.useFacebookGraphAPI = true;
        requestBody.facebookAccessToken = facebookAccessToken;
      }

      // Call backend API to scrape profile and create lead
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/discovery-bot/capture-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to capture profile');
      }

      const result = await response.json();

      // Success - show confirmation and clear input
      Alert.alert(
        'Profile Captured!',
        `Successfully captured ${result.lead.name || 'profile'} from ${platform}.\n\nThe lead has been added to your leads page.`,
        [
          {
            text: 'View Leads',
            onPress: () => router.push('/(tabs)/leads'),
          },
          {
            text: 'Capture Another',
            onPress: () => setProfileUrl(''),
          },
        ]
      );

      setProfileUrl('');
    } catch (error) {
      console.error('Profile capture error:', error);
      setScrapingError(error instanceof Error ? error.message : 'Failed to capture profile');

      Alert.alert(
        'Capture Failed',
        error instanceof Error ? error.message : 'Failed to capture profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsScrapingProfile(false);
    }
  }, [profileUrl, useLinkedInAuth, linkedInEmail, linkedInPassword, useFacebookGraphAPI, facebookAccessToken]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Back Button Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>AI Agents</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Icon Header */}
        <View style={styles.iconHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="compass-outline" size={64} color="#AF52DE" />
          </View>
          <Text style={styles.title}>Discovery Bot</Text>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>PUBLIC-FACING</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Discovery Bot?</Text>
          <Text style={styles.description}>
            Discovery Bot is a public-facing conversational AI that qualifies leads automatically through
            natural discovery conversations. Unlike other agents, it's not user-initiated - prospects
            interact with it directly on your website or landing pages.
          </Text>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Prospect Visits Your Site</Text>
                <Text style={styles.stepDescription}>
                  Discovery Bot appears as a chat widget on your website or landing page
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Natural Conversation</Text>
                <Text style={styles.stepDescription}>
                  Bot asks qualifying questions in a conversational, non-salesy way
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>ICP Matching</Text>
                <Text style={styles.stepDescription}>
                  Responses are scored against your ICPs using AI semantic matching
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Lead Created</Text>
                <Text style={styles.stepDescription}>
                  Qualified prospects (score ≥75%) automatically become leads in your pipeline
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Key Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featureList}>
            <View style={styles.feature}>
              <Ionicons name="chatbubbles-outline" size={24} color="#AF52DE" />
              <Text style={styles.featureText}>Natural conversational flow</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="analytics-outline" size={24} color="#AF52DE" />
              <Text style={styles.featureText}>Real-time ICP scoring</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="filter-outline" size={24} color="#AF52DE" />
              <Text style={styles.featureText}>Automatic lead qualification</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="time-outline" size={24} color="#AF52DE" />
              <Text style={styles.featureText}>24/7 availability</Text>
            </View>
            <View style={styles.feature}>
              <Ionicons name="people-outline" size={24} color="#AF52DE" />
              <Text style={styles.featureText}>Multi-ICP support</Text>
            </View>
          </View>
        </View>

        {/* Setup Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup & Configuration</Text>
          <Text style={styles.description}>
            Discovery Bot configuration is managed by your team administrators. To enable Discovery Bot
            on your website, contact your admin or see the integration guide in settings.
          </Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.statusTitle}>Integration Status</Text>
          </View>
          <Text style={styles.statusDescription}>
            Discovery Bot is available but requires website integration. This is not a user-initiated
            agent - it runs automatically on your public-facing properties.
          </Text>
        </View>

        {/* Manual Lead Capture Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manual Lead Capture</Text>
          <Text style={styles.description}>
            Quickly add a lead by pasting their LinkedIn or Facebook profile URL. We'll automatically
            scrape their information and add them to your leads page.
          </Text>

          <View style={styles.captureContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="link-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.urlInput}
                value={profileUrl}
                onChangeText={setProfileUrl}
                placeholder="Paste LinkedIn or Facebook URL..."
                placeholderTextColor="#C7C7CC"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isScrapingProfile}
              />
              {profileUrl.length > 0 && !isScrapingProfile && (
                <TouchableOpacity
                  onPress={() => setProfileUrl('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.captureButton,
                (!profileUrl.trim() || isScrapingProfile) && styles.captureButtonDisabled,
              ]}
              onPress={handleCaptureProfile}
              disabled={!profileUrl.trim() || isScrapingProfile}
            >
              {isScrapingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.captureButtonText}>Capture Lead</Text>
                </>
              )}
            </TouchableOpacity>

            {scrapingError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF3B30" />
                <Text style={styles.errorText}>{scrapingError}</Text>
              </View>
            )}

            {/* Advanced Options Toggle */}
            <TouchableOpacity
              style={styles.advancedOptionsToggle}
              onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              <Text style={styles.advancedOptionsText}>Advanced Options</Text>
              <Ionicons
                name={showAdvancedOptions ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#007AFF"
              />
            </TouchableOpacity>

            {/* Advanced Options Panel */}
            {showAdvancedOptions && (
              <View style={styles.advancedOptionsPanel}>
                {/* LinkedIn Authentication */}
                <View style={styles.optionSection}>
                  <View style={styles.optionHeader}>
                    <Ionicons name="logo-linkedin" size={20} color="#0077B5" />
                    <Text style={styles.optionTitle}>LinkedIn Authentication</Text>
                  </View>
                  <Text style={styles.optionDescription}>
                    Login with your LinkedIn account to access private profiles and get more complete information.
                  </Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Use LinkedIn Login</Text>
                    <Switch
                      value={useLinkedInAuth}
                      onValueChange={setUseLinkedInAuth}
                      trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                      thumbColor="#fff"
                    />
                  </View>
                  {useLinkedInAuth && (
                    <View style={styles.authInputs}>
                      <TextInput
                        style={styles.authInput}
                        value={linkedInEmail}
                        onChangeText={setLinkedInEmail}
                        placeholder="LinkedIn email"
                        placeholderTextColor="#C7C7CC"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!isScrapingProfile}
                      />
                      <TextInput
                        style={styles.authInput}
                        value={linkedInPassword}
                        onChangeText={setLinkedInPassword}
                        placeholder="LinkedIn password"
                        placeholderTextColor="#C7C7CC"
                        secureTextEntry
                        editable={!isScrapingProfile}
                      />
                    </View>
                  )}
                </View>

                {/* Facebook Graph API */}
                <View style={styles.optionSection}>
                  <View style={styles.optionHeader}>
                    <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                    <Text style={styles.optionTitle}>Facebook Graph API</Text>
                  </View>
                  <Text style={styles.optionDescription}>
                    Use Facebook's official Graph API for more reliable data retrieval (requires access token).
                  </Text>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Use Graph API</Text>
                    <Switch
                      value={useFacebookGraphAPI}
                      onValueChange={setUseFacebookGraphAPI}
                      trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                      thumbColor="#fff"
                    />
                  </View>
                  {useFacebookGraphAPI && (
                    <View style={styles.authInputs}>
                      <TextInput
                        style={styles.authInput}
                        value={facebookAccessToken}
                        onChangeText={setFacebookAccessToken}
                        placeholder="Facebook access token"
                        placeholderTextColor="#C7C7CC"
                        autoCapitalize="none"
                        editable={!isScrapingProfile}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Supported Platforms */}
          <View style={styles.platformsContainer}>
            <Text style={styles.platformsLabel}>Supported platforms:</Text>
            <View style={styles.platformsList}>
              <View style={styles.platformBadge}>
                <Ionicons name="logo-linkedin" size={16} color="#0077B5" />
                <Text style={styles.platformText}>LinkedIn</Text>
              </View>
              <View style={styles.platformBadge}>
                <Ionicons name="logo-facebook" size={16} color="#1877F2" />
                <Text style={styles.platformText}>Facebook</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="bulb-outline" size={20} color="#FF9500" />
          <Text style={styles.infoBoxText}>
            <Text style={styles.infoBoxBold}>Pro Tip:</Text> Use Product Definer to create ICPs,
            then Discovery Bot will automatically use them to qualify incoming prospects.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  iconHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#AF52DE20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  infoBadge: {
    backgroundColor: '#AF52DE20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#AF52DE',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  stepContainer: {
    gap: 20,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#AF52DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  featureList: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#000',
  },
  statusCard: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  infoBox: {
    marginHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  infoBoxBold: {
    fontWeight: '600',
    color: '#000',
  },
  // Manual Lead Capture Styles
  captureContainer: {
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  urlInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#AF52DE',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    lineHeight: 20,
  },
  platformsContainer: {
    marginTop: 20,
  },
  platformsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  platformsList: {
    flexDirection: 'row',
    gap: 12,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  platformText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  // Advanced Options Styles
  advancedOptionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 16,
  },
  advancedOptionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  advancedOptionsPanel: {
    marginTop: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    gap: 20,
  },
  optionSection: {
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
    color: '#000',
  },
  authInputs: {
    gap: 12,
    marginTop: 8,
  },
  authInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
  },
});
