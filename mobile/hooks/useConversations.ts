import { useValues, useActions } from 'kea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsLogic } from '../store/conversations';
import { conversationsAPI } from '../lib/api';
import { 
  Conversation, 
  ConversationWithLastMessage, 
  CreateDirectConversationData, 
  CreateGroupConversationData 
} from '../types';

// React Query keys
export const CONVERSATIONS_QUERY_KEY = 'conversations';
export const CONVERSATION_QUERY_KEY = 'conversation';

// Conversations hook interface
interface UseConversationsReturn {
  // State from Kea store
  conversations: ConversationWithLastMessage[];
  selectedConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Computed selectors
  sortedConversations: ConversationWithLastMessage[];
  directConversations: ConversationWithLastMessage[];
  groupConversations: ConversationWithLastMessage[];
  conversationsWithUnread: ConversationWithLastMessage[];
  totalUnreadCount: number;
  hasConversations: boolean;
  isConversationSelected: boolean;
  
  // Actions
  loadConversations: () => void;
  loadConversation: (conversationId: string) => void;
  refreshConversations: () => void;
  selectConversation: (conversation: Conversation | null) => void;
  createDirectConversation: (data: CreateDirectConversationData) => void;
  createGroupConversation: (data: CreateGroupConversationData) => void;
  updateConversation: (conversation: ConversationWithLastMessage) => void;
  addConversation: (conversation: ConversationWithLastMessage) => void;
  removeConversation: (conversationId: string) => void;
  clearConversations: () => void;
  clearError: () => void;
  
  // React Query data
  conversationsQuery: any;
  conversationQuery: any;
  createDirectConversationMutation: any;
  createGroupConversationMutation: any;
}

/**
 * Custom hook for conversations operations
 * Combines Kea state management with React Query caching
 */
export const useConversations = (): UseConversationsReturn => {
  const queryClient = useQueryClient();
  
  // Get values from Kea store
  const {
    conversations,
    selectedConversation,
    isLoading,
    error,
    lastUpdated,
    sortedConversations,
    directConversations,
    groupConversations,
    conversationsWithUnread,
    totalUnreadCount,
    hasConversations,
    isConversationSelected,
  } = useValues(conversationsLogic);
  
  // Get actions from Kea store
  const {
    loadConversations: loadConversationsAction,
    loadConversation: loadConversationAction,
    refreshConversations: refreshConversationsAction,
    selectConversation: selectConversationAction,
    createDirectConversation: createDirectConversationAction,
    createGroupConversation: createGroupConversationAction,
    updateConversation: updateConversationAction,
    addConversation: addConversationAction,
    removeConversation: removeConversationAction,
    clearConversations: clearConversationsAction,
    setError,
  } = useActions(conversationsLogic);
  
  // React Query for conversations list
  const conversationsQuery = useQuery({
    queryKey: [CONVERSATIONS_QUERY_KEY],
    queryFn: async () => {
      const data = await conversationsAPI.getConversations();
      // Update Kea store with the data
      loadConversationsAction();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
  
  // React Query for single conversation
  const conversationQuery = useQuery({
    queryKey: [CONVERSATION_QUERY_KEY, selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation?.id) return null;
      const data = await conversationsAPI.getConversation(selectedConversation.id);
      return data;
    },
    enabled: !!selectedConversation?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Mutation for creating direct conversation
  const createDirectConversationMutation = useMutation({
    mutationFn: async (data: CreateDirectConversationData) => {
      return await conversationsAPI.createDirectConversation(data);
    },
    onSuccess: (newConversation) => {
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
      
      // Convert to ConversationWithLastMessage format and add to store
      const conversationWithLastMessage: ConversationWithLastMessage = {
        ...newConversation,
        lastMessage: undefined,
        unreadCount: 0,
      };
      addConversationAction(conversationWithLastMessage);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Failed to create conversation');
    },
  });
  
  // Mutation for creating group conversation
  const createGroupConversationMutation = useMutation({
    mutationFn: async (data: CreateGroupConversationData) => {
      return await conversationsAPI.createGroupConversation(data);
    },
    onSuccess: (newConversation) => {
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
      
      // Convert to ConversationWithLastMessage format and add to store
      const conversationWithLastMessage: ConversationWithLastMessage = {
        ...newConversation,
        lastMessage: undefined,
        unreadCount: 0,
      };
      addConversationAction(conversationWithLastMessage);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Failed to create conversation');
    },
  });
  
  // Wrapper functions with additional functionality
  const loadConversations = () => {
    setError(null);
    loadConversationsAction();
    // Also trigger React Query refetch
    conversationsQuery.refetch();
  };
  
  const loadConversation = (conversationId: string) => {
    setError(null);
    loadConversationAction(conversationId);
  };
  
  const refreshConversations = () => {
    setError(null);
    refreshConversationsAction();
    // Also trigger React Query refetch
    conversationsQuery.refetch();
  };
  
  const selectConversation = (conversation: Conversation | null) => {
    selectConversationAction(conversation);
  };
  
  const createDirectConversation = (data: CreateDirectConversationData) => {
    setError(null);
    createDirectConversationMutation.mutate(data);
  };
  
  const createGroupConversation = (data: CreateGroupConversationData) => {
    setError(null);
    createGroupConversationMutation.mutate(data);
  };
  
  const updateConversation = (conversation: ConversationWithLastMessage) => {
    updateConversationAction(conversation);
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
  };
  
  const addConversation = (conversation: ConversationWithLastMessage) => {
    addConversationAction(conversation);
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
  };
  
  const removeConversation = (conversationId: string) => {
    removeConversationAction(conversationId);
    // Invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
  };
  
  const clearConversations = () => {
    clearConversationsAction();
    // Clear React Query cache
    queryClient.removeQueries({ queryKey: [CONVERSATIONS_QUERY_KEY] });
  };
  
  const clearError = () => {
    setError(null);
  };
  
  return {
    // State
    conversations,
    selectedConversation,
    isLoading,
    error,
    lastUpdated,
    
    // Computed selectors
    sortedConversations,
    directConversations,
    groupConversations,
    conversationsWithUnread,
    totalUnreadCount,
    hasConversations,
    isConversationSelected,
    
    // Actions
    loadConversations,
    loadConversation,
    refreshConversations,
    selectConversation,
    createDirectConversation,
    createGroupConversation,
    updateConversation,
    addConversation,
    removeConversation,
    clearConversations,
    clearError,
    
    // React Query data
    conversationsQuery,
    conversationQuery,
    createDirectConversationMutation,
    createGroupConversationMutation,
  };
};

// Export default for convenience
export default useConversations;
