import { kea } from 'kea';
import { conversationsAPI } from '../lib/api';
import { Conversation, ConversationWithLastMessage, CreateDirectConversationData, CreateGroupConversationData } from '../types';

// Conversations state interface
interface ConversationsState {
  conversations: ConversationWithLastMessage[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Conversations actions
interface ConversationsActions {
  // Conversation loading actions
  loadConversations: () => void;
  loadConversation: (conversationId: string) => void;
  refreshConversations: () => void;
  
  // Conversation selection actions
  selectConversation: (conversation: Conversation | null) => void;
  
  // Conversation creation actions
  createDirectConversation: (data: CreateDirectConversationData) => void;
  createGroupConversation: (data: CreateGroupConversationData) => void;
  
  // State management actions
  setConversations: (conversations: ConversationWithLastMessage[]) => void;
  setSelectedConversation: (conversation: Conversation | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateConversation: (conversation: ConversationWithLastMessage) => void;
  addConversation: (conversation: ConversationWithLastMessage) => void;
  removeConversation: (conversationId: string) => void;
  clearConversations: () => void;
}

// Conversations logic
export const conversationsLogic = kea({
  path: ['conversations'],
  
  defaults: {
    conversations: [],
    selectedConversation: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  },
  
  actions: {
    // Conversation loading actions
    loadConversations: true,
    loadConversation: (conversationId: string) => ({ conversationId }),
    refreshConversations: true,
    
    // Conversation selection actions
    selectConversation: (conversation: Conversation | null) => ({ conversation }),
    
    // Conversation creation actions
    createDirectConversation: (data: CreateDirectConversationData) => ({ data }),
    createGroupConversation: (data: CreateGroupConversationData) => ({ data }),
    
    // State management actions
    setConversations: (conversations: ConversationWithLastMessage[]) => ({ conversations }),
    setSelectedConversation: (conversation: Conversation | null) => ({ conversation }),
    setLoading: (loading: boolean) => ({ loading }),
    setError: (error: string | null) => ({ error }),
    updateConversation: (conversation: ConversationWithLastMessage) => ({ conversation }),
    addConversation: (conversation: ConversationWithLastMessage) => ({ conversation }),
    removeConversation: (conversationId: string) => ({ conversationId }),
    clearConversations: true,
  },
  
  reducers: {
    conversations: {
      setConversations: (_, { conversations }) => conversations,
      updateConversation: (state, { conversation }) => {
        const index = state.findIndex(c => c.id === conversation.id);
        if (index >= 0) {
          const newConversations = [...state];
          newConversations[index] = conversation;
          return newConversations;
        }
        return state;
      },
      addConversation: (state, { conversation }) => {
        // Check if conversation already exists
        const exists = state.some(c => c.id === conversation.id);
        if (exists) {
          return state;
        }
        return [conversation, ...state];
      },
      removeConversation: (state, { conversationId }) => {
        return state.filter(c => c.id !== conversationId);
      },
      clearConversations: () => [],
    },
    selectedConversation: {
      setSelectedConversation: (_, { conversation }) => conversation,
      selectConversation: (_, { conversation }) => conversation,
      clearConversations: () => null,
    },
    isLoading: {
      setLoading: (_, { loading }) => loading,
      loadConversations: () => true,
      loadConversation: () => true,
      refreshConversations: () => true,
      createDirectConversation: () => true,
      createGroupConversation: () => true,
    },
    error: {
      setError: (_, { error }) => error,
      loadConversations: () => null,
      loadConversation: () => null,
      refreshConversations: () => null,
      createDirectConversation: () => null,
      createGroupConversation: () => null,
      clearConversations: () => null,
    },
    lastUpdated: {
      setConversations: () => new Date(),
      updateConversation: () => new Date(),
      addConversation: () => new Date(),
      removeConversation: () => new Date(),
      clearConversations: () => null,
    },
  },
  
  listeners: ({ actions, values }: any) => ({
    // Load conversations listener
    loadConversations: async () => {
      try {
        actions.setLoading(true);
        actions.setError(null);
        
        const conversations = await conversationsAPI.getConversations();
        
        // Handle empty conversations list gracefully
        if (!conversations || conversations.length === 0) {
          console.log('No conversations found - user has no conversations yet');
          actions.setConversations([]);
          actions.setLoading(false);
          actions.setError(null);
          return;
        }
        
        // Sort conversations by last message timestamp (most recent first)
        const sortedConversations = conversations.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
          const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
          return bTime - aTime;
        });
        
        actions.setConversations(sortedConversations);
        actions.setLoading(false);
        actions.setError(null);
      } catch (error: any) {
        console.error('Error loading conversations:', error);
        
        // Handle authentication errors gracefully
        if (error?.response?.status === 401 || error?.message?.includes('Token expired')) {
          console.log('Authentication required - user needs to log in');
          actions.setConversations([]);
          actions.setError(null); // Don't show error for auth issues
        } else {
          actions.setError(error instanceof Error ? error.message : 'Failed to load conversations');
        }
        
        actions.setLoading(false);
      }
    },
    
    // Load single conversation listener
    loadConversation: async ({ conversationId }) => {
      try {
        const conversation = await conversationsAPI.getConversation(conversationId);
        actions.setSelectedConversation(conversation);
        actions.setLoading(false);
        actions.setError(null);
      } catch (error) {
        console.error('Error loading conversation:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to load conversation');
        actions.setLoading(false);
      }
    },
    
    // Refresh conversations listener
    refreshConversations: async () => {
      try {
        const conversations = await conversationsAPI.getConversations();
        
        // Sort conversations by last message timestamp (most recent first)
        const sortedConversations = conversations.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
          const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
          return bTime - aTime;
        });
        
        actions.setConversations(sortedConversations);
        actions.setError(null);
      } catch (error) {
        console.error('Error refreshing conversations:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to refresh conversations');
      }
    },
    
    // Create direct conversation listener
    createDirectConversation: async ({ data }) => {
      try {
        const conversation = await conversationsAPI.createDirectConversation(data);
        
        // Convert to ConversationWithLastMessage format
        const conversationWithLastMessage = {
          ...conversation,
          lastMessage: undefined,
          unreadCount: 0,
        } as ConversationWithLastMessage;
        
        actions.addConversation(conversationWithLastMessage);
        actions.setLoading(false);
        actions.setError(null);
      } catch (error) {
        console.error('Error creating direct conversation:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to create conversation');
        actions.setLoading(false);
      }
    },
    
    // Create group conversation listener
    createGroupConversation: async ({ data }) => {
      try {
        const conversation = await conversationsAPI.createGroupConversation(data);
        
        // Convert to ConversationWithLastMessage format
        const conversationWithLastMessage = {
          ...conversation,
          lastMessage: undefined,
          unreadCount: 0,
        } as ConversationWithLastMessage;
        
        actions.addConversation(conversationWithLastMessage);
        actions.setLoading(false);
        actions.setError(null);
      } catch (error) {
        console.error('Error creating group conversation:', error);
        actions.setError(error instanceof Error ? error.message : 'Failed to create conversation');
        actions.setLoading(false);
      }
    },
  }),
  
  // Selectors
  selectors: {
    sortedConversations: [(selectors: any) => [selectors.conversations], (conversations: any) => {
      // Additional sorting logic if needed
      return conversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.updatedAt).getTime();
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.updatedAt).getTime();
        return bTime - aTime;
      });
    }],
    
    directConversations: [(selectors: any) => [selectors.conversations], (conversations: any) => {
      return conversations.filter((c: any) => c.type === 'direct');
    }],
    
    groupConversations: [(selectors: any) => [selectors.conversations], (conversations: any) => {
      return conversations.filter((c: any) => c.type === 'group');
    }],
    
    conversationsWithUnread: [(selectors: any) => [selectors.conversations], (conversations: any) => {
      return conversations.filter((c: any) => (c.unreadCount || 0) > 0);
    }],
    
    totalUnreadCount: [(selectors: any) => [selectors.conversations], (conversations: any) => {
      return conversations.reduce((total: any, c: any) => total + (c.unreadCount || 0), 0);
    }],
    
    hasConversations: [(selectors: any) => [selectors.conversations], (conversations: any) => {
      return conversations.length > 0;
    }],
    
    isConversationSelected: [(selectors: any) => [selectors.selectedConversation], (selectedConversation: any) => {
      return selectedConversation !== null;
    }],
  },
});

// Export the logic for use in components
export default conversationsLogic;
