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

// Product type (should match the one in productDefiner.ts)
interface Product {
  id: string;
  name: string;
  description: string;
  pricing?: {
    model: string;
    amount: number;
    currency: string;
  };
  usps: string[];
  targetAudience?: string;
  features?: string[];
  createdBy?: 'ai' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

// Product Definer hook interface
interface UseProductDefinerReturn {
  // Existing state
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

  // New state for mode selection
  initialPromptShown: boolean;
  selectedMode: 'new_product' | 'new_icp' | null;
  existingProducts: Product[];
  selectedProductId: string | null;
  isLoadingProducts: boolean;
  productsError: string | null;

  // Existing actions
  startConversation: () => void;
  sendMessage: (conversationId: string, message: string) => void;
  completeConversation: (conversationId: string) => void;
  resetConversation: () => void;
  clearError: () => void;
  clearStreamingMessage: () => void;

  // New actions for mode selection
  selectMode: (mode: 'new_product' | 'new_icp') => void;
  selectProduct: (productId: string) => void;
  proceedWithSelection: () => void;
  resetToInitialPrompt: () => void;

  // New selectors
  selectedProduct: Product | null;
  hasExistingProducts: boolean;
  isModeSelectionComplete: boolean;
  shouldShowModeSelection: boolean;
  shouldShowProductSelection: boolean;
  isInputEnabled: boolean;
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
    // New state values
    initialPromptShown,
    selectedMode,
    existingProducts,
    selectedProductId,
    isLoadingProducts,
    productsError,
  } = useValues(productDefinerLogic);

  // Get selectors
  const {
    getCurrentConversation,
    getCurrentMessages,
    hasSavedProduct,
    // New selectors
    getSelectedProduct,
    hasExistingProducts,
    isModeSelectionComplete,
    shouldShowModeSelection,
    shouldShowProductSelection,
    isInputEnabled,
  } = useValues(productDefinerLogic);

  // Get actions from Kea store
  const {
    startConversation: startConversationAction,
    sendMessage: sendMessageAction,
    sendMessageWithAutoStart: sendMessageWithAutoStartAction,
    completeConversation: completeConversationAction,
    resetConversation: resetConversationAction,
    setError,
    clearStreamingMessage: clearStreamingMessageAction,
    // New actions
    selectMode: selectModeAction,
    selectProduct: selectProductAction,
    proceedWithSelection: proceedWithSelectionAction,
    resetToInitialPrompt: resetToInitialPromptAction,
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

  // New wrapper functions for mode selection
  const selectMode = (mode: 'new_product' | 'new_icp') => {
    // Clear any existing errors
    setError(null);
    selectModeAction(mode);
  };

  const selectProduct = (productId: string) => {
    // Clear any existing errors
    setError(null);
    selectProductAction(productId);
  };

  const proceedWithSelection = () => {
    // Validation happens in the listener
    proceedWithSelectionAction();
  };

  const resetToInitialPrompt = () => {
    // Clear errors before reset
    setError(null);
    resetToInitialPromptAction();
  };

  return {
    // Existing state
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

    // New state for mode selection
    initialPromptShown,
    selectedMode,
    existingProducts,
    selectedProductId,
    isLoadingProducts,
    productsError,

    // Existing actions
    startConversation,
    sendMessage,
    sendMessageWithAutoStart: sendMessageWithAutoStartAction,
    completeConversation,
    resetConversation,
    clearError,
    clearStreamingMessage,

    // New actions for mode selection
    selectMode,
    selectProduct,
    proceedWithSelection,
    resetToInitialPrompt,

    // New selectors
    selectedProduct: getSelectedProduct,
    hasExistingProducts,
    isModeSelectionComplete,
    shouldShowModeSelection,
    shouldShowProductSelection,
    isInputEnabled,
  };
};

// Export default for convenience
export default useProductDefiner;
