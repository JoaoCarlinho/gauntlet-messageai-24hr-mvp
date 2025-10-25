/**
 * Campaign Advisor AI Agent Store (Kea)
 *
 * State management for Campaign Advisor conversational agent
 * Handles campaign planning conversations, SSE streaming, and campaign creation
 */

import { kea } from 'kea';
import { campaignAdvisorAPI } from '../../lib/aiAgentsAPI';
import {
  AgentConversation,
  AgentMessage,
  CampaignAdvisorSummary,
  StartConversationResponse,
  CompleteConversationResponse,
} from '../../types/aiAgents';

// State interface
interface CampaignAdvisorState {
  conversations: Record<string, AgentConversation>;
  messages: Record<string, AgentMessage[]>;
  currentConversationId: string | null;
  productId: string | null;
  icpId: string | null;
  isStreaming: boolean;
  streamingMessage: string;
  isLoading: boolean;
  error: string | null;
  summary: CampaignAdvisorSummary | null;
}

// Actions interface
interface CampaignAdvisorActions {
  // Conversation management
  startConversation: (productId: string, icpId: string) => void;
  setConversation: (conversation: AgentConversation) => void;
  setCurrentConversationId: (conversationId: string | null) => void;
  setContext: (productId: string, icpId: string) => void;

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
  setSummary: (summary: CampaignAdvisorSummary) => void;

  // Status checking
  loadConversationStatus: (conversationId: string) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetConversation: () => void;
}

// Campaign Advisor logic
export const campaignAdvisorLogic = kea<any>({
  path: ['aiAgents', 'campaignAdvisor'],

  defaults: {
    conversations: {},
    messages: {},
    currentConversationId: null,
    productId: null,
    icpId: null,
    isStreaming: false,
    streamingMessage: '',
    isLoading: false,
    error: null,
    summary: null,
  },

  actions: {
    // Conversation management
    startConversation: (productId: string, icpId: string) => ({ productId, icpId }),
    setConversation: (conversation: AgentConversation) => ({ conversation }),
    setCurrentConversationId: (conversationId: string | null) => ({ conversationId }),
    setContext: (productId: string, icpId: string) => ({ productId, icpId }),

    // Message management
    sendMessage: (conversationId: string, message: string) => ({ conversationId, message }),
    addMessage: (conversationId: string, message: AgentMessage) => ({ conversationId, message }),

    // Streaming management
    appendStreamChunk: (chunk: string) => ({ chunk }),
    completeStream: (conversationId: string) => ({ conversationId }),
    setStreaming: (isStreaming: boolean) => ({ isStreaming }),
    clearStreamingMessage: true,

    // Conversation completion
    completeConversation: (conversationId: string) => ({ conversationId }),
    setSummary: (summary: CampaignAdvisorSummary) => ({ summary }),

    // Status checking
    loadConversationStatus: (conversationId: string) => ({ conversationId }),

    // State management
    setLoading: (loading: boolean) => ({ loading }),
    setError: (error: string | null) => ({ error }),
    clearError: true,
    resetConversation: true,
  },

  reducers: {
    conversations: {
      setConversation: (state, { conversation }) => ({
        ...state,
        [conversation.id]: conversation,
      }),
    },

    messages: {
      addMessage: (state, { conversationId, message }) => ({
        ...state,
        [conversationId]: [
          ...(state[conversationId] || []),
          message,
        ],
      }),
    },

    currentConversationId: {
      setCurrentConversationId: (_, { conversationId }) => conversationId,
      resetConversation: () => null,
    },

    productId: {
      setContext: (_, { productId }) => productId,
      resetConversation: () => null,
    },

    icpId: {
      setContext: (_, { icpId }) => icpId,
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
  },

  listeners: ({ actions, values }: any) => ({
    // Start conversation listener
    startConversation: async ({ productId, icpId }: any) => {
      try {
        actions.setContext(productId, icpId);

        const response: StartConversationResponse = await campaignAdvisorAPI.startConversation(
          productId,
          icpId
        );

        // Create conversation object
        const conversation: AgentConversation = {
          id: response.conversationId,
          userId: '',
          teamId: '',
          agentType: 'campaign_advisor',
          contextId: productId,
          status: 'active',
          messages: [],
          metadata: { productId, icpId },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        actions.setConversation(conversation);
        actions.setCurrentConversationId(response.conversationId);
        actions.setLoading(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error starting campaign advisor conversation:', error);
        actions.setError(error.message || 'Failed to start conversation');
        actions.setLoading(false);
      }
    },

    // Send message listener with SSE streaming
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

        // Create SSE stream
        const eventSource = campaignAdvisorAPI.createMessageStream(conversationId, message);

        actions.setStreaming(true);
        actions.clearStreamingMessage();

        // Handle SSE events
        eventSource.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'text' && data.content) {
              actions.appendStreamChunk(data.content);
            } else if (data.type === 'complete') {
              actions.completeStream(conversationId);
              eventSource.close();
            } else if (data.type === 'error') {
              actions.setError(data.error || 'Streaming error');
              actions.setStreaming(false);
              eventSource.close();
            }
          } catch (parseError) {
            console.error('Error parsing SSE message:', parseError);
          }
        };

        eventSource.onerror = (error: any) => {
          console.error('SSE connection error:', error);
          actions.setError('Connection error. Please try again.');
          actions.setStreaming(false);
          eventSource.close();
        };
      } catch (error: any) {
        console.error('Error sending message:', error);
        actions.setError(error.message || 'Failed to send message');
        actions.setStreaming(false);
      }
    },

    // Complete stream listener
    completeStream: ({ conversationId }: any) => {
      const streamedText = values.streamingMessage;

      if (streamedText) {
        const assistantMessage: AgentMessage = {
          id: `msg-${Date.now()}`,
          conversationId,
          role: 'assistant',
          content: streamedText,
          createdAt: new Date(),
        };

        actions.addMessage(conversationId, assistantMessage);
      }

      actions.clearStreamingMessage();
      actions.setStreaming(false);
    },

    // Complete conversation listener
    completeConversation: async ({ conversationId }: any) => {
      try {
        const response: CompleteConversationResponse = await campaignAdvisorAPI.completeConversation(
          conversationId
        );

        // Create summary
        const summary: CampaignAdvisorSummary = {
          conversationId: response.conversationId,
          status: response.status,
          campaignSaved: response.campaignSaved || false,
          campaignId: response.campaignId,
        };

        actions.setSummary(summary);
        actions.setLoading(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error completing conversation:', error);
        actions.setError(error.message || 'Failed to complete conversation');
        actions.setLoading(false);
      }
    },

    // Load conversation status listener
    loadConversationStatus: async ({ conversationId }: any) => {
      try {
        const summary: CampaignAdvisorSummary = await campaignAdvisorAPI.getStatus(conversationId);

        actions.setSummary(summary);
        actions.setLoading(false);
        actions.clearError();
      } catch (error: any) {
        console.error('Error loading conversation status:', error);
        actions.setError(error.message || 'Failed to load conversation status');
        actions.setLoading(false);
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

    // Get campaign ID
    getCampaignId: [
      (s) => [s.summary],
      (summary) => {
        return summary?.campaignId || null;
      },
    ],

    // Check if campaign was created
    hasCreatedCampaign: [
      (s) => [s.summary],
      (summary) => {
        return summary ? summary.campaignSaved : false;
      },
    ],
  },
});

export default campaignAdvisorLogic;
