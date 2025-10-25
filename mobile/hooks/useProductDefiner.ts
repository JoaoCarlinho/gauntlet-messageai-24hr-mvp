/**
 * Product Definer AI Agent Hook
 *
 * Custom hook for Product Definer conversational AI agent
 * Provides access to product definition state and actions through Kea logic
 */

import { useValues, useActions } from 'kea';
import { productDefinerLogic } from '../store/aiAgents/productDefiner';
import {
  AgentConversation,
  AgentMessage,
  ProductDefinerSummary,
} from '../types/aiAgents';

// Product Definer hook interface
interface UseProductDefinerReturn {
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
  summary: ProductDefinerSummary | null;
  hasSavedProduct: boolean;

  // Actions
  startConversation: () => void;
  sendMessage: (conversationId: string, message: string) => void;
  completeConversation: (conversationId: string) => void;
  resetConversation: () => void;
  clearError: () => void;
  clearStreamingMessage: () => void;
}

/**
 * Custom hook for Product Definer AI agent operations
 * Provides access to conversation state, message streaming, and product definition
 */
export const useProductDefiner = (): UseProductDefinerReturn => {
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
  } = useValues(productDefinerLogic);

  // Get selectors
  const {
    getCurrentConversation,
    getCurrentMessages,
    hasSavedProduct,
  } = useValues(productDefinerLogic);

  // Get actions from Kea store
  const {
    startConversation: startConversationAction,
    sendMessage: sendMessageAction,
    completeConversation: completeConversationAction,
    resetConversation: resetConversationAction,
    setError,
    clearStreamingMessage: clearStreamingMessageAction,
  } = useActions(productDefinerLogic);

  // Wrapper functions with additional functionality
  const startConversation = () => {
    // Clear any existing errors before starting
    setError(null);
    startConversationAction();
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
    hasSavedProduct,

    // Actions
    startConversation,
    sendMessage,
    completeConversation,
    resetConversation,
    clearError,
    clearStreamingMessage,
  };
};

// Export default for convenience
export default useProductDefiner;
