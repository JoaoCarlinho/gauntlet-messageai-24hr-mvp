/**
 * Campaign Advisor Screen
 *
 * Conversational AI agent for planning marketing campaigns
 * Requires productId and icpId context
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCampaignAdvisor } from '../../hooks/useCampaignAdvisor';
import { AgentMessage } from '../../types/aiAgents';

export default function CampaignAdvisorScreen() {
  // Get route params (productId and icpId)
  const params = useLocalSearchParams<{ productId?: string; icpId?: string }>();

  const {
    currentConversation,
    currentMessages,
    isStreaming,
    streamingMessage,
    isLoading,
    error,
    summary,
    productId,
    icpId,
    hasSavedCampaign,
    startConversation,
    sendMessage,
    completeConversation,
    resetConversation,
    setContext,
    clearError,
  } = useCampaignAdvisor();

  // Local state
  const [inputText, setInputText] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Initialize context from route params
  useEffect(() => {
    if (params.productId && params.icpId) {
      setContext(params.productId, params.icpId);
    }
  }, [params.productId, params.icpId, setContext]);

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (currentMessages.length > 0 || streamingMessage) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length, streamingMessage]);

  // Show success modal when campaign is saved
  useEffect(() => {
    if (hasSavedCampaign && summary) {
      setShowSuccessModal(true);
    }
  }, [hasSavedCampaign, summary]);

  // Show error alert
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => clearError() },
      ]);
    }
  }, [error, clearError]);

  // Handle back navigation
  const handleBackPress = useCallback(() => {
    router.push('/(tabs)/ai-agents');
  }, []);

  // Handle start conversation
  const handleStartConversation = useCallback(() => {
    // Use productId and icpId from either state or params
    const pId = productId || params.productId;
    const iId = icpId || params.icpId;

    if (!pId || !iId) {
      Alert.alert(
        'Missing Context',
        'Product ID and ICP ID are required. Please complete Product Definer first.',
        [
          { text: 'Go to Product Definer', onPress: () => router.push('/ai-agents/product-definer') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    startConversation(pId, iId);
  }, [productId, icpId, params.productId, params.icpId, startConversation]);

  // Handle send message
  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || !currentConversation) return;

    sendMessage(currentConversation.id, inputText.trim());
    setInputText('');
  }, [inputText, currentConversation, sendMessage]);

  // Handle complete conversation
  const handleCompleteConversation = useCallback(() => {
    if (!currentConversation) return;

    Alert.alert(
      'Complete Conversation',
      'Are you ready to save this campaign? The AI will create a campaign based on our conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete & Save',
          onPress: () => completeConversation(currentConversation.id),
        },
      ]
    );
  }, [currentConversation, completeConversation]);

  // Handle start new conversation
  const handleStartNewConversation = useCallback(() => {
    Alert.alert(
      'Start New Conversation',
      'This will reset the current conversation. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start New',
          style: 'destructive',
          onPress: () => {
            resetConversation();
            handleStartConversation();
          },
        },
      ]
    );
  }, [resetConversation, handleStartConversation]);

  // Handle success modal close
  const handleSuccessModalClose = useCallback(() => {
    setShowSuccessModal(false);
    // Optionally navigate to campaigns screen
  }, []);

  // Render message bubble
  const renderMessage = useCallback(({ item }: { item: AgentMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  }, []);

  // Render streaming message
  const renderStreamingMessage = useCallback(() => {
    if (!streamingMessage) return null;

    return (
      <View style={[styles.messageBubble, styles.assistantBubble]}>
        <Text style={[styles.messageText, styles.assistantText]}>
          {streamingMessage}
          <Text style={styles.cursor}>▋</Text>
        </Text>
      </View>
    );
  }, [streamingMessage]);

  // Render typing indicator
  const renderTypingIndicator = useCallback(() => {
    if (!isStreaming || streamingMessage) return null;

    return (
      <View style={[styles.messageBubble, styles.assistantBubble]}>
        <View style={styles.typingIndicator}>
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
          <View style={styles.typingDot} />
        </View>
      </View>
    );
  }, [isStreaming, streamingMessage]);

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading || currentConversation) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="megaphone-outline" size={80} color="#007AFF" />
        <Text style={styles.emptyTitle}>Plan Your Campaign</Text>
        <Text style={styles.emptyDescription}>
          I'll help you design an effective marketing campaign strategy based on your product and target audience.
        </Text>
        <TouchableOpacity style={styles.startButton} onPress={handleStartConversation}>
          <Text style={styles.startButtonText}>Start Campaign Planning</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Show loading state
  if (isLoading && !currentConversation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Starting campaign advisor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Back Button Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>AI Agents</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        {currentConversation ? (
          <>
            <FlatList
              ref={flatListRef}
              data={currentMessages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              ListFooterComponent={
                <>
                  {renderTypingIndicator()}
                  {renderStreamingMessage()}
                </>
              }
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleStartNewConversation}
                disabled={isStreaming}
              >
                <Ionicons name="refresh-outline" size={20} color="#007AFF" />
                <Text style={styles.secondaryButtonText}>New</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  (isStreaming || currentMessages.length < 2) && styles.disabledButton,
                ]}
                onPress={handleCompleteConversation}
                disabled={isStreaming || currentMessages.length < 2}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.completeButtonText}>Complete & Save Campaign</Text>
              </TouchableOpacity>
            </View>

            {/* Input Toolbar */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
                editable={!isStreaming}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!inputText.trim() || isStreaming) && styles.disabledSendButton]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || isStreaming}
              >
                <Ionicons
                  name="send"
                  size={24}
                  color={inputText.trim() && !isStreaming ? '#fff' : '#999'}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          renderEmptyState()
        )}

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={handleSuccessModalClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalIcon}>
                <Ionicons name="checkmark-circle" size={60} color="#34C759" />
              </View>
              <Text style={styles.modalTitle}>Campaign Created!</Text>
              <Text style={styles.modalDescription}>
                Your marketing campaign has been saved successfully.
              </Text>
              {summary && summary.campaignSaved && (
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryItem}>
                    <Ionicons name="megaphone-outline" size={20} color="#007AFF" />
                    <Text style={styles.summaryText}>Campaign Saved</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleSuccessModalClose}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reuse styles from product-definer.tsx
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
  keyboardContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  cursor: {
    color: '#007AFF',
    fontWeight: '700',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginHorizontal: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#34C759',
    gap: 6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    fontSize: 16,
    color: '#000',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledSendButton: {
    backgroundColor: '#F2F2F7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryContainer: {
    width: '100%',
    marginBottom: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
