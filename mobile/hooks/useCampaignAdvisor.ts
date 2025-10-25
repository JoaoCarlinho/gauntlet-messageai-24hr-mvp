/**
 * Campaign Advisor AI Agent Hook
 *
 * Custom hook for Campaign Advisor conversational AI agent
 * Provides access to campaign planning state and actions through Kea logic
 */

import { useValues, useActions } from 'kea';
import { campaignAdvisorLogic } from '../store/aiAgents/campaignAdvisor';
import {
  AgentConversation,
  AgentMessage,
  CampaignAdvisorSummary,
} from '../types/aiAgents';

// Campaign Advisor hook interface
interface UseCampaignAdvisorReturn {
  // State
  conversations: Record<string, AgentConversation>;
  messages: Record<string, AgentMessage[]>;
  currentConversationId: string | null;
  currentConversation: AgentConversation | null;
  currentMessages: AgentMessage[];
  isStreaming: boolean;
  streamingMessage: string;
  isLoading: boolean;
  error: string | null;
  summary: CampaignAdvisorSummary | null;
  productId: string | null;
  icpId: string | null;
  hasSavedCampaign: boolean;

  // Actions
  startConversation: (productId: string, icpId: string) => void;
  sendMessage: (conversationId: string, message: string) => void;
  completeConversation: (conversationId: string) => void;
  resetConversation: () => void;
  setContext: (productId: string, icpId: string) => void;
  clearError: () => void;
  clearStreamingMessage: () => void;
}

/**
 * Custom hook for Campaign Advisor AI agent operations
 * Provides access to conversation state, message streaming, and campaign planning
 */
export const useCampaignAdvisor = (): UseCampaignAdvisorReturn => {
  // Get values from Kea store
  const {
    conversations,
    messages,
    currentConversationId,
    isStreaming,
    streamingMessage,
    isLoading,
    error,
    summary,
    productId,
    icpId,
  } = useValues(campaignAdvisorLogic);

  // Get selectors
  const {
    getCurrentConversation,
    getCurrentMessages,
    hasSavedCampaign,
  } = useValues(campaignAdvisorLogic);

  // Get actions from Kea store
  const {
    startConversation: startConversationAction,
    sendMessage: sendMessageAction,
    completeConversation: completeConversationAction,
    resetConversation: resetConversationAction,
    setContext: setContextAction,
    setError,
    clearStreamingMessage: clearStreamingMessageAction,
  } = useActions(campaignAdvisorLogic);

  // Wrapper functions with additional functionality
  const startConversation = (productId: string, icpId: string) => {
    // Validate inputs
    if (!productId || !icpId) {
      setError('Product ID and ICP ID are required to start campaign advisor');
      return;
    }

    // Clear any existing errors before starting
    setError(null);
    startConversationAction(productId, icpId);
  };

  const sendMessage = (conversationId: string, message: string) => {
    // Validate inputs
    if (!conversationId || !message.trim()) {
      setError('Invalid conversation ID or empty message');
      return;
    }

    // Clear any existing errors
    setError(null);
    sendMessageAction(conversationId, message);
  };

  const completeConversation = (conversationId: string) => {
    // Validate input
    if (!conversationId) {
      setError('Invalid conversation ID');
      return;
    }

    // Clear any existing errors
    setError(null);
    completeConversationAction(conversationId);
  };

  const resetConversation = () => {
    // Clear errors before reset
    setError(null);
    resetConversationAction();
  };

  const setContext = (productId: string, icpId: string) => {
    // Validate inputs
    if (!productId || !icpId) {
      setError('Product ID and ICP ID are required');
      return;
    }

    setContextAction(productId, icpId);
  };

  const clearError = () => {
    setError(null);
  };

  const clearStreamingMessage = () => {
    clearStreamingMessageAction();
  };

  return {
    // State
    conversations,
    messages,
    currentConversationId,
    currentConversation: getCurrentConversation,
    currentMessages: getCurrentMessages,
    isStreaming,
    streamingMessage,
    isLoading,
    error,
    summary,
    productId,
    icpId,
    hasSavedCampaign,

    // Actions
    startConversation,
    sendMessage,
    completeConversation,
    resetConversation,
    setContext,
    clearError,
    clearStreamingMessage,
  };
};

// Export default for convenience
export default useCampaignAdvisor;
