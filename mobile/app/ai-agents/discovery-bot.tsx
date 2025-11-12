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
import { tokenManager } from '../../lib/api';

interface RateLimitData {
  allowed: boolean;
  reason?: string;
  waitTimeMs?: number;
  usage: {
    lastHour: number;
    maxPerHour: number;
    today: number;
    maxPerDay: number;
  };
  nextAvailable?: string | null;
}

interface AccountHealthData {
  hasCredentials: boolean;
  isActive?: boolean;
  accountStatus?: string;
  metrics?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    consecutiveFailures: number;
    successRate: number;
  };
  cooldown?: {
    active: boolean;
    until?: Date | null;
    reason?: string;
  };
  lastActivity?: {
    lastRequestAt?: Date | null;
    lastSuccessAt?: Date | null;
    lastFailureAt?: Date | null;
  };
  message?: string;
}

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

  // Rate limit and health state
  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(null);
  const [accountHealthData, setAccountHealthData] = useState<AccountHealthData | null>(null);
  const [showHealthSection, setShowHealthSection] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    router.push('/(tabs)/ai-agents');
  }, []);

  // Fetch rate limit stats
  const fetchRateLimitStats = useCallback(async () => {
    try {
      const token = await tokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/discovery-bot/linkedin/rate-limits`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.rateLimits) {
          setRateLimitData(data.rateLimits);
        }
      }
    } catch (error) {
      console.error('Failed to fetch rate limit stats:', error);
    }
  }, []);

  // Fetch account health
  const fetchAccountHealth = useCallback(async () => {
    try {
      const token = await tokenManager.getAccessToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/discovery-bot/linkedin/account-health`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.health) {
          setAccountHealthData(data.health);
        }
      }
    } catch (error) {
      console.error('Failed to fetch account health:', error);
    }
  }, []);

  // Load stats when LinkedIn auth is enabled
  const loadLinkedInStats = useCallback(async () => {
    setIsLoadingStats(true);
    await Promise.all([fetchRateLimitStats(), fetchAccountHealth()]);
    setIsLoadingStats(false);
  }, [fetchRateLimitStats, fetchAccountHealth]);

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

      // Get authentication token
      const token = await tokenManager.getAccessToken();
      if (!token) {
        Alert.alert(
          'Authentication Required',
          'Please log in to capture profiles.',
          [{ text: 'OK' }]
        );
        setIsScrapingProfile(false);
        return;
      }

      // Call backend API to scrape profile and create lead
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/discovery-bot/capture-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        // Handle LinkedIn-specific errors with structured responses
        if (responseData.error && typeof responseData.error === 'object') {
          const { code, message, userAction, retryAfterMs } = responseData.error;

          // Format user-friendly error message
          let errorTitle = 'Capture Failed';
          let errorMessage = message;

          switch (code) {
            case 'RATE_LIMIT_EXCEEDED':
              errorTitle = 'Rate Limit Exceeded';
              const waitMinutes = Math.ceil((retryAfterMs || 0) / 60000);
              errorMessage = `${message}\n\n${userAction || `Please wait ${waitMinutes} minutes.`}`;
              break;
            case 'CHECKPOINT_REQUIRED':
              errorTitle = 'LinkedIn Verification Required';
              errorMessage = `${message}\n\n${userAction || 'Please log in to LinkedIn on your desktop browser to complete verification.'}`;
              break;
            case 'LOGIN_FAILED':
              errorTitle = 'LinkedIn Login Failed';
              errorMessage = `${message}\n\n${userAction || 'Please check your LinkedIn credentials and try again.'}`;
              break;
            case 'ACCOUNT_ON_COOLDOWN':
              errorTitle = 'Account on Cooldown';
              errorMessage = `${message}\n\n${userAction || 'Your account is temporarily paused due to previous errors.'}`;
              break;
            case 'SESSION_EXPIRED':
              errorTitle = 'Session Expired';
              errorMessage = `${message}\n\n${userAction || 'Your LinkedIn session expired. Try again to re-authenticate.'}`;
              break;
            default:
              errorMessage = userAction ? `${message}\n\n${userAction}` : message;
          }

          setScrapingError(errorMessage);
          Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
          setIsScrapingProfile(false);
          return;
        }

        // Handle generic errors
        throw new Error(responseData.error || 'Failed to capture profile');
      }

      const result = responseData;

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
      setScrapingError(null);
    } catch (error) {
      console.error('Profile capture error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to capture profile';
      setScrapingError(errorMessage);

      Alert.alert(
        'Capture Failed',
        `${errorMessage}\n\nPlease try again.`,
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

            {/* Rate Limit Display - Show when LinkedIn auth is enabled */}
            {useLinkedInAuth && rateLimitData && (
              <View style={styles.rateLimitCard}>
                <View style={styles.rateLimitHeader}>
                  <Ionicons name="speedometer-outline" size={20} color="#007AFF" />
                  <Text style={styles.rateLimitTitle}>LinkedIn Rate Limits</Text>
                  <TouchableOpacity onPress={loadLinkedInStats} disabled={isLoadingStats}>
                    <Ionicons
                      name="refresh-outline"
                      size={18}
                      color={isLoadingStats ? '#C7C7CC' : '#007AFF'}
                    />
                  </TouchableOpacity>
                </View>

                {rateLimitData.allowed ? (
                  <View style={styles.rateLimitAllowed}>
                    <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    <Text style={styles.rateLimitAllowedText}>Ready to capture</Text>
                  </View>
                ) : (
                  <View style={styles.rateLimitBlocked}>
                    <Ionicons name="warning" size={16} color="#FF9500" />
                    <Text style={styles.rateLimitBlockedText}>
                      {rateLimitData.reason || 'Rate limit exceeded'}
                    </Text>
                  </View>
                )}

                <View style={styles.rateLimitStats}>
                  <View style={styles.rateLimitStat}>
                    <Text style={styles.rateLimitStatLabel}>Last Hour</Text>
                    <Text style={styles.rateLimitStatValue}>
                      {rateLimitData.usage.lastHour} / {rateLimitData.usage.maxPerHour}
                    </Text>
                    <View style={styles.rateLimitBar}>
                      <View
                        style={[
                          styles.rateLimitBarFill,
                          {
                            width: `${Math.min((rateLimitData.usage.lastHour / rateLimitData.usage.maxPerHour) * 100, 100)}%`,
                            backgroundColor: rateLimitData.usage.lastHour >= rateLimitData.usage.maxPerHour ? '#FF3B30' : '#007AFF'
                          }
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.rateLimitStat}>
                    <Text style={styles.rateLimitStatLabel}>Today</Text>
                    <Text style={styles.rateLimitStatValue}>
                      {rateLimitData.usage.today} / {rateLimitData.usage.maxPerDay}
                    </Text>
                    <View style={styles.rateLimitBar}>
                      <View
                        style={[
                          styles.rateLimitBarFill,
                          {
                            width: `${Math.min((rateLimitData.usage.today / rateLimitData.usage.maxPerDay) * 100, 100)}%`,
                            backgroundColor: rateLimitData.usage.today >= rateLimitData.usage.maxPerDay ? '#FF3B30' : '#007AFF'
                          }
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {rateLimitData.nextAvailable && (
                  <Text style={styles.rateLimitNextAvailable}>
                    Next available: {new Date(rateLimitData.nextAvailable).toLocaleTimeString()}
                  </Text>
                )}
              </View>
            )}

            {/* Account Health Display - Collapsible section */}
            {useLinkedInAuth && accountHealthData && accountHealthData.hasCredentials && (
              <View style={styles.healthSection}>
                <TouchableOpacity
                  style={styles.healthToggle}
                  onPress={() => setShowHealthSection(!showHealthSection)}
                >
                  <View style={styles.healthToggleLeft}>
                    <Ionicons name="fitness-outline" size={20} color="#34C759" />
                    <Text style={styles.healthToggleText}>Account Health</Text>
                  </View>
                  <Ionicons
                    name={showHealthSection ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#8E8E93"
                  />
                </TouchableOpacity>

                {showHealthSection && (
                  <View style={styles.healthPanel}>
                    {accountHealthData.cooldown?.active && (
                      <View style={styles.healthWarning}>
                        <Ionicons name="warning" size={18} color="#FF9500" />
                        <Text style={styles.healthWarningText}>
                          {accountHealthData.cooldown.reason}
                        </Text>
                      </View>
                    )}

                    {accountHealthData.metrics && (
                      <View style={styles.healthMetrics}>
                        <View style={styles.healthMetric}>
                          <Text style={styles.healthMetricLabel}>Success Rate</Text>
                          <Text style={[
                            styles.healthMetricValue,
                            { color: accountHealthData.metrics.successRate >= 80 ? '#34C759' : accountHealthData.metrics.successRate >= 50 ? '#FF9500' : '#FF3B30' }
                          ]}>
                            {accountHealthData.metrics.successRate}%
                          </Text>
                        </View>

                        <View style={styles.healthMetric}>
                          <Text style={styles.healthMetricLabel}>Total Requests</Text>
                          <Text style={styles.healthMetricValue}>
                            {accountHealthData.metrics.totalRequests}
                          </Text>
                        </View>

                        <View style={styles.healthMetric}>
                          <Text style={styles.healthMetricLabel}>Consecutive Failures</Text>
                          <Text style={[
                            styles.healthMetricValue,
                            { color: accountHealthData.metrics.consecutiveFailures >= 3 ? '#FF3B30' : '#8E8E93' }
                          ]}>
                            {accountHealthData.metrics.consecutiveFailures}
                          </Text>
                        </View>
                      </View>
                    )}

                    {accountHealthData.lastActivity?.lastSuccessAt && (
                      <Text style={styles.healthLastActivity}>
                        Last successful: {new Date(accountHealthData.lastActivity.lastSuccessAt).toLocaleString()}
                      </Text>
                    )}
                  </View>
                )}
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
                      onValueChange={(value) => {
                        setUseLinkedInAuth(value);
                        if (value && linkedInEmail && linkedInPassword) {
                          loadLinkedInStats();
                        }
                      }}
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
  // Rate Limit Card Styles
  rateLimitCard: {
    marginTop: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rateLimitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rateLimitTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  rateLimitAllowed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  rateLimitAllowedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  rateLimitBlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  rateLimitBlockedText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  rateLimitStats: {
    gap: 16,
  },
  rateLimitStat: {
    gap: 6,
  },
  rateLimitStatLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  rateLimitStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  rateLimitBar: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  rateLimitBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  rateLimitNextAvailable: {
    marginTop: 12,
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  // Account Health Styles
  healthSection: {
    marginTop: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  healthToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  healthToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  healthPanel: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  healthWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
  },
  healthWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  healthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  healthMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  healthMetricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  healthMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  healthLastActivity: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});
