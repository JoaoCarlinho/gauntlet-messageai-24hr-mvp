/**
 * Product Definer AI Agent Store (Kea)
 *
 * State management for Product Definer conversational agent
 * Handles conversation state, SSE streaming, and product/ICP creation
 */

import { kea } from 'kea';
import { productDefinerAPI, aiAgentsAPI } from '../../lib/aiAgentsAPI';
import api from '../../lib/api';
import {
  AgentConversation,
  AgentMessage,
  ProductDefinerSummary,
  StartConversationResponse,
  CompleteConversationResponse,
} from '../../types/aiAgents';

// Product type (imported from useProducts hook structure)
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

// Conversation mode type
type ConversationMode = 'new_product' | 'new_icp' | null;

// Initial prompts for pre-flight selection experience
const INITIAL_PROMPTS = {
  welcome: "Hello! I'm your Product & ICP Definer assistant. I can help you with two things:\n\n" +
           "1. **Define a New Product** - Walk through creating a complete product profile\n" +
           "2. **Define an ICP for Existing Product** - Create a new Ideal Customer Profile for a product you've already defined\n\n" +
           "What would you like to do today?",

  newProductStart: "Great! Let's define your new product. What's the name of the product or service you're offering?",

  newICPStart: "Perfect! I'll help you define a new ICP. First, which product is this ICP for?",

  newICPAfterSelection: (productName: string) =>
    `Excellent! Now let's define the Ideal Customer Profile for **${productName}**. Who specifically is this for? Let's start with job titles - what roles do your ideal clients hold?`,
};

// State interface
interface ProductDefinerState {
  conversations: Record<string, AgentConversation>;
  messages: Record<string, AgentMessage[]>;
  currentConversationId: string | null;
  isStreaming: boolean;
  streamingMessage: string;
  isLoading: boolean;
  error: string | null;
  summary: ProductDefinerSummary | null;

  // New state for mode selection
  initialPromptShown: boolean;
  selectedMode: ConversationMode;
  existingProducts: Product[];
  selectedProductId: string | null;
  isLoadingProducts: boolean;
  productsError: string | null;

  // Past conversations (conversation history)
  pastConversations: any[];
  isLoadingHistory: boolean;
  historyError: string | null;
}

// Actions interface
interface ProductDefinerActions {
  // Conversation management
  startConversation: () => void;
  setConversation: (conversation: AgentConversation) => void;
  setCurrentConversationId: (conversationId: string | null) => void;

  // Message management
  sendMessage: (conversationId: string, message: string) => void;
  addMessage: (conversationId: string, message: AgentMessage) => void;

  // Streaming management
  appendStreamChunk: (chunk: string) => void;
  completeStream: (conversationId: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  clearStreamingMessage: () => void;

  // Conversation completion
  completeConversation: (conversationId: string) => void;
  setSummary: (summary: ProductDefinerSummary) => void;

  // Status checking
  loadConversationStatus: (conversationId: string) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetConversation: () => void;

  // New actions for mode selection
  showInitialPrompt: () => void;
  selectMode: (mode: ConversationMode) => void;
  fetchExistingProducts: () => void;
  setExistingProducts: (products: Product[]) => void;
  setProductsError: (error: string | null) => void;
  setLoadingProducts: (loading: boolean) => void;
  selectProduct: (productId: string) => void;
  proceedWithSelection: () => void;
  resetToInitialPrompt: () => void;
}

// Product Definer logic
export const productDefinerLogic = kea<any>({
  path: ['aiAgents', 'productDefiner'],

  defaults: {
    conversations: {},
    messages: {},
    currentConversationId: null,
    isStreaming: false,
    streamingMessage: '',
    isLoading: false,
    error: null,
    summary: null,

    // New defaults for mode selection
    initialPromptShown: false,
    selectedMode: null,
    existingProducts: [],
    selectedProductId: null,
    isLoadingProducts: false,
    productsError: null,

    // Past conversations (conversation history)
    pastConversations: [],
    isLoadingHistory: false,
    historyError: null,
  },

  actions: {
    // Conversation management
    startConversation: true,
    setConversation: (conversation: AgentConversation) => ({ conversation }),
    setCurrentConversationId: (conversationId: string | null) => ({ conversationId }),

    // Message management
    sendMessage: (conversationId: string, message: string) => ({ conversationId, message }),
    sendMessageWithAutoStart: (message: string) => ({ message }), // New action for auto-starting backend
    addMessage: (conversationId: string, message: AgentMessage) => ({ conversationId, message }),

    // Streaming management
    appendStreamChunk: (chunk: string) => ({ chunk }),
    completeStream: (payload: { conversationId: string; fullText: string }) => payload,
    setStreaming: (isStreaming: boolean) => ({ isStreaming }),
    clearStreamingMessage: true,

    // Conversation completion
    completeConversation: (conversationId: string) => ({ conversationId }),
    setSummary: (summary: ProductDefinerSummary) => ({ summary }),

    // Status checking
    loadConversationStatus: (conversationId: string) => ({ conversationId }),

    // State management
    setLoading: (loading: boolean) => ({ loading }),
    setError: (error: string | null) => ({ error }),
    clearError: true,
    resetConversation: true,

    // New actions for mode selection
    showInitialPrompt: true,
    selectMode: (mode: ConversationMode) => ({ mode }),
    fetchExistingProducts: true,
    setExistingProducts: (products: Product[]) => ({ products }),
    setProductsError: (error: string | null) => ({ error }),
    setLoadingProducts: (loading: boolean) => ({ loading }),
    selectProduct: (productId: string) => ({ productId }),
    proceedWithSelection: true,
    resetToInitialPrompt: true,

    // Conversation history actions
    loadPastConversations: true,
    setPastConversations: (conversations: any[]) => ({ conversations }),
    setHistoryError: (error: string | null) => ({ error }),
  },

  reducers: {
    conversations: {
      setConversation: (state, { conversation }) => ({
        ...state,
        [conversation.id]: conversation,
      }),
      resetConversation: () => ({}),
    },

    messages: {
      addMessage: (state, { conversationId, message }) => ({
        ...state,
        [conversationId]: [
          ...(state[conversationId] || []),
          message,
        ],
      }),
      completeStream: (state, { conversationId }) => {
        // This will be handled by the listener
        return state;
      },
      resetConversation: () => ({}),
    },

    currentConversationId: {
      setCurrentConversationId: (_, { conversationId }) => conversationId,
      resetConversation: () => null,
    },

    isStreaming: {
      setStreaming: (_, { isStreaming }) => isStreaming,
      sendMessage: () => true,
      completeStream: () => false,
      setError: () => false,
    },

    streamingMessage: {
      appendStreamChunk: (state, { chunk }) => state + chunk,
      completeStream: () => '',
      clearStreamingMessage: () => '',
      sendMessage: () => '',
    },

    isLoading: {
      setLoading: (_, { loading }) => loading,
      startConversation: () => true,
      completeConversation: () => true,
      loadConversationStatus: () => true,
    },

    error: {
      setError: (_, { error }) => error,
      clearError: () => null,
      startConversation: () => null,
      sendMessage: () => null,
      completeConversation: () => null,
      resetConversation: () => null,
    },

    summary: {
      setSummary: (_, { summary }) => summary,
      resetConversation: () => null,
    },

    // New reducers for mode selection
    initialPromptShown: {
      showInitialPrompt: () => true,
      resetConversation: () => false,
      resetToInitialPrompt: () => false,
    },

    selectedMode: {
      selectMode: (_, { mode }) => mode,
      resetConversation: () => null,
      resetToInitialPrompt: () => null,
    },

    existingProducts: {
      setExistingProducts: (_, { products }) => products,
      resetConversation: () => [],
      resetToInitialPrompt: () => [],
    },

    selectedProductId: {
      selectProduct: (_, { productId }) => productId,
      resetConversation: () => null,
      resetToInitialPrompt: () => null,
      selectMode: () => null, // Reset when changing modes
    },

    isLoadingProducts: {
      setLoadingProducts: (_, { loading }) => loading,
      fetchExistingProducts: () => true,
    },

    productsError: {
      setProductsError: (_, { error }) => error,
      fetchExistingProducts: () => null,
      resetConversation: () => null,
      resetToInitialPrompt: () => null,
    },

    // Past conversations reducers
    pastConversations: {
      setPastConversations: (_, { conversations }) => conversations,
      resetConversation: () => [],
    },

    isLoadingHistory: {
      loadPastConversations: () => true,
      setPastConversations: () => false,
      setHistoryError: () => false,
    },

    historyError: {
      setHistoryError: (_, { error }) => error,
      loadPastConversations: () => null,
      setPastConversations: () => null,
    },
  },

  listeners: ({ actions, values }: any) => ({
    // Start conversation listener - now shows initial prompt instead of API call
    startConversation: () => {
      actions.showInitialPrompt();
    },

    // Show initial prompt listener
    showInitialPrompt: () => {
      // Create a fake conversation ID for the initial prompt state
      const tempConversationId = `temp-${Date.now()}`;

      // Set this as the current conversation ID so messages appear
      actions.setCurrentConversationId(tempConversationId);

      // Add welcome message as an AI message
      const welcomeMessage: AgentMessage = {
        id: `msg-welcome-${Date.now()}`,
        conversationId: tempConversationId,
        role: 'assistant',
        content: INITIAL_PROMPTS.welcome,
        createdAt: new Date(),
      };

      actions.addMessage(tempConversationId, welcomeMessage);
      actions.setLoading(false);
    },

    // Select mode listener
    selectMode: async ({ mode }: any) => {
      const currentConvId = values.currentConversationId;

      if (mode === 'new_icp') {
        // Automatically fetch existing products for ICP mode
        actions.fetchExistingProducts();
      } else if (mode === 'new_product') {
        // For new product, add the starting prompt and allow typing immediately
        // Use existing temp conversation ID
        const convId = currentConvId || `temp-${Date.now()}`;

        const startMessage: AgentMessage = {
          id: `msg-start-${Date.now()}`,
          conversationId: convId,
          role: 'assistant',
          content: INITIAL_PROMPTS.newProductStart,
          createdAt: new Date(),
        };

        actions.addMessage(convId, startMessage);
      }
    },

    // Fetch existing products listener
    fetchExistingProducts: async () => {
      try {
        actions.setLoadingProducts(true);
        actions.setProductsError(null);

        const products = await api.products.getProducts();

        actions.setExistingProducts(products);
        actions.setLoadingProducts(false);

        // If no products exist, show error/message
        if (products.length === 0) {
          actions.setProductsError('No products found. Please create a product first.');
        } else {
          // Add the ICP start message using existing conversation ID
          const currentConvId = values.currentConversationId;
          const convId = currentConvId || `temp-${Date.now()}`;

          const icpStartMessage: AgentMessage = {
            id: `msg-icp-start-${Date.now()}`,
            conversationId: convId,
            role: 'assistant',
            content: INITIAL_PROMPTS.newICPStart,
            createdAt: new Date(),
          };

          actions.addMessage(convId, icpStartMessage);
        }
      } catch (error: any) {
        console.error('Error fetching products:', error);
        actions.setProductsError(error.message || 'Failed to fetch products');
        actions.setLoadingProducts(false);
      }
    },

    // Proceed with selection listener - starts actual backend conversation
    proceedWithSelection: async () => {
      try {
        const { selectedMode, selectedProductId, existingProducts } = values;

        // Validation
        if (!selectedMode) {
          actions.setError('Please select a mode');
          return null; // Return null to indicate failure
        }

        if (selectedMode === 'new_icp' && !selectedProductId) {
          actions.setError('Please select a product');
          return null; // Return null to indicate failure
        }

        actions.setLoading(true);
        actions.clearError();

        // Prepare API call parameters
        const apiParams: any = {
          mode: selectedMode,
        };

        if (selectedMode === 'new_icp' && selectedProductId) {
          apiParams.productId = selectedProductId;
        }

        console.log('📞 Calling backend API to start conversation...', apiParams);

        // Call backend to start conversation with mode/productId
        const response: StartConversationResponse = await productDefinerAPI.startConversation(apiParams);

        console.log('✅ Backend conversation created:', response.conversationId);

        // Create conversation object
        const conversation: AgentConversation = {
          id: response.conversationId,
          userId: '', // Will be populated by backend
          teamId: '', // Will be populated by backend
          agentType: 'product_definer',
          status: 'active',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        actions.setConversation(conversation);
        actions.setCurrentConversationId(response.conversationId);

        // Add appropriate starting message based on mode
        if (selectedMode === 'new_icp' && selectedProductId) {
          // Find selected product
          const selectedProduct = existingProducts.find((p: Product) => p.id === selectedProductId);
          const productName = selectedProduct?.name || 'your product';

          const icpAfterSelectionMessage: AgentMessage = {
            id: `msg-icp-after-${Date.now()}`,
            conversationId: response.conversationId,
            role: 'assistant',
            content: INITIAL_PROMPTS.newICPAfterSelection(productName),
            createdAt: new Date(),
          };

          actions.addMessage(response.conversationId, icpAfterSelectionMessage);
        }

        actions.setLoading(false);

        // Return the conversation ID for chaining
        return response.conversationId;
      } catch (error: any) {
        console.error('❌ Error proceeding with selection:', error);
        actions.setError(error.message || 'Failed to start conversation');
        actions.setLoading(false);
        return null; // Return null to indicate failure
      }
    },

    // Reset to initial prompt listener
    resetToInitialPrompt: () => {
      // Clear all selection state
      actions.resetConversation();
      // Show initial prompt again
      actions.showInitialPrompt();
    },

    // Send message with auto-start backend conversation if needed
    sendMessageWithAutoStart: async ({ message }: any) => {
      const { selectedMode, conversations, currentConversationId } = values;

      console.log('🚀 sendMessageWithAutoStart called:', {
        message: message.substring(0, 50),
        selectedMode,
        currentConversationId,
        hasConversations: Object.keys(conversations).length,
      });

      // Check if we have a real backend conversation
      const hasRealConversation = Object.keys(conversations).some(
        id => !id.startsWith('temp-')
      );

      console.log('🔍 Conversation check:', {
        hasRealConversation,
        conversationIds: Object.keys(conversations),
      });

      // If we already have a real conversation, just send the message
      if (hasRealConversation && currentConversationId && !currentConversationId.startsWith('temp-')) {
        console.log('✅ Using existing real conversation:', currentConversationId);
        actions.sendMessage(currentConversationId, message);
        return;
      }

      // If we have a mode selected but no backend conversation, start it first
      if (selectedMode && !hasRealConversation) {
        console.log('🔄 Starting backend conversation first...');
        try {
          // Directly call the API instead of going through action wrapper
          // This way we get the return value properly
          const { selectedMode: mode, selectedProductId, existingProducts } = values;

          // Validation
          if (!mode) {
            actions.setError('Please select a mode');
            return;
          }

          if (mode === 'new_icp' && !selectedProductId) {
            actions.setError('Please select a product');
            return;
          }

          actions.setLoading(true);
          actions.clearError();

          // Prepare API call parameters
          const apiParams: any = { mode };
          if (mode === 'new_icp' && selectedProductId) {
            apiParams.productId = selectedProductId;
          }

          console.log('📞 Calling backend API to start conversation...', apiParams);

          // Call backend to start conversation
          const response = await productDefinerAPI.startConversation(apiParams);
          const newConversationId = response.conversationId;

          console.log('✅ Backend conversation created:', newConversationId);

          // Create conversation object and update state
          const conversation: AgentConversation = {
            id: newConversationId,
            userId: '',
            teamId: '',
            agentType: 'product_definer',
            status: 'active',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          actions.setConversation(conversation);
          actions.setCurrentConversationId(newConversationId);

          // Add starting message if needed
          if (mode === 'new_icp' && selectedProductId) {
            const selectedProduct = existingProducts.find((p: Product) => p.id === selectedProductId);
            const productName = selectedProduct?.name || 'your product';

            const icpAfterSelectionMessage: AgentMessage = {
              id: `msg-icp-after-${Date.now()}`,
              conversationId: newConversationId,
              role: 'assistant',
              content: INITIAL_PROMPTS.newICPAfterSelection(productName),
              createdAt: new Date(),
            };

            actions.addMessage(newConversationId, icpAfterSelectionMessage);
          }

          actions.setLoading(false);

          // Now send the message with the new conversation ID
          console.log('📝 Sending message to conversation:', newConversationId);
          actions.sendMessage(newConversationId, message);

        } catch (error: any) {
          console.error('❌ Error starting conversation:', error);
          actions.setError(error.message || 'Failed to start conversation');
          actions.setLoading(false);
        }
      } else {
        console.warn('⚠️ No mode selected or already has real conversation but conditions not met');
      }
    },

    // Send message listener with SSE streaming using fetch
    sendMessage: async ({ conversationId, message }: any) => {
      try {
        // Add user message to state
        const userMessage: AgentMessage = {
          id: `temp-${Date.now()}`,
          conversationId,
          role: 'user',
          content: message,
          createdAt: new Date(),
        };
        actions.addMessage(conversationId, userMessage);

        actions.setStreaming(true);
        actions.clearStreamingMessage();

        // Create SSE stream using XMLHttpRequest-based approach
        const { abort } = await productDefinerAPI.sendMessage(
          conversationId,
          message,
          // onDelta callback
          (delta: string) => {
            actions.appendStreamChunk(delta);
          },
          // onComplete callback - now receives full accumulated text
          (fullText: string) => {
            console.log('💾 onComplete called with fullText length:', fullText.length);
            actions.completeStream({ conversationId, fullText });
          },
          // onError callback
          (error: string) => {
            console.error('SSE stream error:', error);
            actions.setError(error || 'Streaming error');
            actions.setStreaming(false);
          }
        );

        // Store abort function for cleanup if needed
        // (Could add to state if we need to support canceling streams)
      } catch (error: any) {
        console.error('Error sending message:', error);
        actions.setError(error.message || 'Failed to send message');
        actions.setStreaming(false);
      }
    },

    // Complete stream listener
    completeStream: ({ conversationId, fullText }: any) => {
      console.log('🔄 completeStream called:', {
        conversationId,
        fullTextLength: fullText?.length,
        currentMessagesCount: values.messages[conversationId]?.length || 0,
      });

      if (fullText && fullText.trim()) {
        // Add assistant message with the full accumulated text
        const assistantMessage: AgentMessage = {
          id: `msg-${Date.now()}`,
          conversationId,
          role: 'assistant',
          content: fullText,
          createdAt: new Date(),
        };

        console.log('✅ Adding assistant message to state:', {
          messageId: assistantMessage.id,
          contentLength: assistantMessage.content.length,
          conversationId,
        });

        actions.addMessage(conversationId, assistantMessage);

        // Verify message was added
        setTimeout(() => {
          const messagesAfter = values.messages[conversationId] || [];
          console.log('📊 Messages after addMessage:', {
            conversationId,
            messagesCount: messagesAfter.length,
            lastMessage: messagesAfter[messagesAfter.length - 1],
          });
        }, 100);
      } else {
        console.warn('⚠️ No fullText to save!', { fullText });
      }

      console.log('🧹 Clearing streaming message and setting streaming to false');
      actions.clearStreamingMessage();
      actions.setStreaming(false);
    },

    // Append stream chunk listener (for logging)
    appendStreamChunk: ({ chunk }: any) => {
      console.log('📝 appendStreamChunk called with chunk length:', chunk?.length, 'Current streamingMessage length:', values.streamingMessage.length);
    },

    // Complete conversation listener
    completeConversation: async ({ conversationId }: any) => {
      try {
        console.log('🎯 Completing conversation:', conversationId);
        const response: CompleteConversationResponse = await productDefinerAPI.completeConversation(conversationId);

        console.log('✅ Complete response:', {
          status: response.status,
          productSaved: response.productSaved,
          icpSaved: response.icpSaved,
          productId: response.productId,
          icpId: response.icpId,
        });

        // Create summary
        const summary: ProductDefinerSummary = {
          conversationId: response.conversationId,
          status: response.status,
          productSaved: response.productSaved || false,
          icpSaved: response.icpSaved || false,
          productId: response.productId,
          icpId: response.icpId,
        };

        actions.setSummary(summary);
        actions.setLoading(false);
        actions.clearError();

        console.log('💾 Summary set, hasSavedProduct should now be:', summary.productSaved || summary.icpSaved);
      } catch (error: any) {
        console.error('❌ Error completing conversation:', error);
        actions.setError(error.message || 'Failed to complete conversation');
        actions.setLoading(false);
      }
    },

    // Load conversation status listener
    loadConversationStatus: async ({ conversationId }: any) => {
      try {
        const summary: ProductDefinerSummary = await productDefinerAPI.getStatus(conversationId);

        actions.setSummary(summary);
        actions.setLoading(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error loading conversation status:', error);
        actions.setError(error.message || 'Failed to load conversation status');
        actions.setLoading(false);
      }
    },

    // Load past conversations from backend
    loadPastConversations: async () => {
      try {
        console.log('📚 Loading past conversations...');

        const response = await aiAgentsAPI.conversations.listConversations({
          agentType: 'product_definer',
          status: 'completed',
          limit: 20,
        });

        console.log('✅ Loaded conversations:', response.conversations.length);

        actions.setPastConversations(response.conversations);
      } catch (error: any) {
        console.error('❌ Error loading past conversations:', error);
        actions.setHistoryError(error.message || 'Failed to load conversation history');
      }
    },
  }),

  selectors: {
    // Get current conversation
    getCurrentConversation: [
      (s) => [s.conversations, s.currentConversationId],
      (conversations, currentConversationId) => {
        return currentConversationId ? conversations[currentConversationId] : null;
      },
    ],

    // Get messages for conversation
    getMessagesForConversation: [
      (s) => [s.messages],
      (messages) => (conversationId: string) => {
        return messages[conversationId] || [];
      },
    ],

    // Get current messages
    getCurrentMessages: [
      (s) => [s.messages, s.currentConversationId],
      (messages, currentConversationId) => {
        return currentConversationId ? messages[currentConversationId] || [] : [];
      },
    ],

    // Check if conversation is complete
    isConversationComplete: [
      (s) => [s.summary],
      (summary) => {
        return summary ? summary.status === 'completed' : false;
      },
    ],

    // Check if product or ICP was saved
    hasSavedProduct: [
      (s) => [s.summary],
      (summary) => {
        // Return true if either product or ICP was saved
        return summary ? (summary.productSaved || summary.icpSaved) : false;
      },
    ],

    // Check if ICP was saved
    hasSavedICP: [
      (s) => [s.summary],
      (summary) => {
        return summary ? summary.icpSaved : false;
      },
    ],

    // New selectors for mode selection

    // Get welcome message
    getWelcomeMessage: [
      () => [],
      () => INITIAL_PROMPTS.welcome,
    ],

    // Get selected product
    getSelectedProduct: [
      (s) => [s.existingProducts, s.selectedProductId],
      (existingProducts, selectedProductId) => {
        if (!selectedProductId) return null;
        return existingProducts.find((p: Product) => p.id === selectedProductId) || null;
      },
    ],

    // Check if has existing products
    hasExistingProducts: [
      (s) => [s.existingProducts],
      (existingProducts) => existingProducts.length > 0,
    ],

    // Check if mode selection is complete
    isModeSelectionComplete: [
      (s) => [s.selectedMode, s.selectedProductId],
      (selectedMode, selectedProductId) => {
        if (!selectedMode) return false;
        if (selectedMode === 'new_product') return true;
        if (selectedMode === 'new_icp' && selectedProductId) return true;
        return false;
      },
    ],

    // Check if should show mode selection buttons
    shouldShowModeSelection: [
      (s) => [s.initialPromptShown, s.selectedMode, s.conversations],
      (initialPromptShown, selectedMode, conversations) => {
        // Show if initial prompt shown, no mode selected, and no real conversation
        // Real conversations have IDs that don't start with "temp-"
        const hasRealConversation = Object.keys(conversations).some(
          id => !id.startsWith('temp-')
        );
        return initialPromptShown && !selectedMode && !hasRealConversation;
      },
    ],

    // Check if should show product selection
    shouldShowProductSelection: [
      (s) => [s.selectedMode, s.conversations, s.isLoadingProducts],
      (selectedMode, conversations, isLoadingProducts) => {
        // Show product selection if:
        // 1. User selected new_icp mode
        // 2. No real backend conversation exists yet
        // 3. Not currently loading products
        const hasRealConversation = Object.keys(conversations).some(
          id => !id.startsWith('temp-')
        );
        return selectedMode === 'new_icp' && !hasRealConversation && !isLoadingProducts;
      },
    ],

    // Check if text input should be enabled
    isInputEnabled: [
      (s) => [s.selectedMode, s.conversations],
      (selectedMode, conversations) => {
        // Enable input if:
        // 1. User selected new_product mode (can type immediately)
        // 2. OR a real backend conversation has started
        const hasRealConversation = Object.keys(conversations).some(
          id => !id.startsWith('temp-')
        );
        return selectedMode === 'new_product' || hasRealConversation;
      },
    ],
  },
});

// Export initial prompts for use in components if needed
export { INITIAL_PROMPTS };

export default productDefinerLogic;
