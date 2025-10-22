import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '../../app/chat/[id]';

// Mock dependencies
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  router: {
    back: jest.fn(),
  },
}));

jest.mock('../../hooks/usePresence', () => ({
  usePresence: () => ({
    isUserOnline: jest.fn((userId: string) => {
      // Mock: user1 is online, user2 is offline
      return userId === 'user1';
    }),
    getUserStatus: jest.fn((userId: string) => {
      if (userId === 'user1') {
        return {
          userId: 'user1',
          isOnline: true,
          lastSeen: new Date('2024-01-01T12:00:00Z'),
          displayName: 'User 1',
          avatarUrl: undefined,
        };
      }
      if (userId === 'user2') {
        return {
          userId: 'user2',
          isOnline: false,
          lastSeen: new Date('2024-01-01T10:00:00Z'),
          displayName: 'User 2',
          avatarUrl: undefined,
        };
      }
      return null;
    }),
    formatLastSeen: jest.fn((date: Date) => {
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hours ago`;
      } else {
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} days ago`;
      }
    }),
    getConversationPresence: jest.fn(),
  }),
}));

jest.mock('../../hooks/useMessages', () => ({
  useMessages: () => ({
    messages: [],
    isLoading: false,
    error: null,
    hasMessages: false,
    lastMessage: null,
    typingUsers: [],
    sendMessage: jest.fn(),
    loadMessages: jest.fn(),
    markMessageAsRead: jest.fn(),
    joinConversation: jest.fn(),
    leaveConversation: jest.fn(),
    refreshMessages: jest.fn(),
  }),
}));

jest.mock('../../hooks/useConversations', () => ({
  useConversations: () => ({
    loadConversation: jest.fn(),
    selectedConversation: null,
  }),
}));

jest.mock('../../hooks/useSocket', () => ({
  useSocket: () => ({
    isConnected: true,
    startTyping: jest.fn(),
    stopTyping: jest.fn(),
  }),
}));

jest.mock('kea', () => ({
  useValues: jest.fn(),
}));

jest.mock('../../store/auth', () => ({
  authLogic: {},
}));

// Mock components
jest.mock('../../components/chat', () => ({
  MessageBubble: ({ message }: any) => <div data-testid="message-bubble">{message.content}</div>,
  InputToolbar: ({ onSendMessage }: any) => (
    <div data-testid="input-toolbar">
      <button onClick={() => onSendMessage('Test message')}>Send</button>
    </div>
  ),
  TypingIndicator: ({ typingUsers }: any) => (
    <div data-testid="typing-indicator">{typingUsers.length} typing</div>
  ),
}));

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseValues = require('kea').useValues as jest.MockedFunction<any>;

describe('ChatScreen', () => {
  const mockCurrentUser = {
    id: 'current-user',
    email: 'current@example.com',
    displayName: 'Current User',
    avatarUrl: null,
    lastSeen: new Date('2024-01-01T12:00:00Z'),
    isOnline: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseLocalSearchParams.mockReturnValue({ id: 'conv1' });
    mockUseValues.mockReturnValue({
      currentUser: mockCurrentUser,
    });
  });

  it('should render chat screen with conversation ID', () => {
    render(<ChatScreen />);
    
    expect(screen.getByText('Chat')).toBeTruthy();
  });

  it('should show "Online" for connected state', () => {
    render(<ChatScreen />);
    
    expect(screen.getByText('Online')).toBeTruthy();
  });

  it('should show presence info for direct conversation with online user', () => {
    const mockSelectedConversation = {
      id: 'conv1',
      type: 'direct',
      name: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      members: [
        {
          id: 'member1',
          conversationId: 'conv1',
          userId: 'current-user',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: mockCurrentUser,
        },
        {
          id: 'member2',
          conversationId: 'conv1',
          userId: 'user1',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: {
            id: 'user1',
            email: 'user1@example.com',
            displayName: 'User 1',
            avatarUrl: null,
            lastSeen: new Date('2024-01-01T12:00:00Z'),
            isOnline: true,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T12:00:00Z'),
          },
        },
      ],
    };

    const mockUseConversations = require('../../hooks/useConversations').useConversations;
    mockUseConversations.mockReturnValue({
      loadConversation: jest.fn(),
      selectedConversation: mockSelectedConversation,
    });

    render(<ChatScreen />);
    
    expect(screen.getByText('Online')).toBeTruthy();
  });

  it('should show "Last seen" for offline user in direct conversation', () => {
    const mockSelectedConversation = {
      id: 'conv1',
      type: 'direct',
      name: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      members: [
        {
          id: 'member1',
          conversationId: 'conv1',
          userId: 'current-user',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: mockCurrentUser,
        },
        {
          id: 'member2',
          conversationId: 'conv1',
          userId: 'user2',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: {
            id: 'user2',
            email: 'user2@example.com',
            displayName: 'User 2',
            avatarUrl: null,
            lastSeen: new Date('2024-01-01T10:00:00Z'),
            isOnline: false,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T10:00:00Z'),
          },
        },
      ],
    };

    const mockUseConversations = require('../../hooks/useConversations').useConversations;
    mockUseConversations.mockReturnValue({
      loadConversation: jest.fn(),
      selectedConversation: mockSelectedConversation,
    });

    render(<ChatScreen />);
    
    expect(screen.getByText(/Last seen/)).toBeTruthy();
  });

  it('should show member count for group conversation', () => {
    const mockSelectedConversation = {
      id: 'conv1',
      type: 'group',
      name: 'Test Group',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      members: [
        {
          id: 'member1',
          conversationId: 'conv1',
          userId: 'current-user',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: mockCurrentUser,
        },
        {
          id: 'member2',
          conversationId: 'conv1',
          userId: 'user1',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: {
            id: 'user1',
            email: 'user1@example.com',
            displayName: 'User 1',
            avatarUrl: null,
            lastSeen: new Date('2024-01-01T12:00:00Z'),
            isOnline: true,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T12:00:00Z'),
          },
        },
        {
          id: 'member3',
          conversationId: 'conv1',
          userId: 'user2',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: {
            id: 'user2',
            email: 'user2@example.com',
            displayName: 'User 2',
            avatarUrl: null,
            lastSeen: new Date('2024-01-01T10:00:00Z'),
            isOnline: false,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T10:00:00Z'),
          },
        },
      ],
    };

    const mockUseConversations = require('../../hooks/useConversations').useConversations;
    mockUseConversations.mockReturnValue({
      loadConversation: jest.fn(),
      selectedConversation: mockSelectedConversation,
    });

    render(<ChatScreen />);
    
    expect(screen.getByText('1 member online')).toBeTruthy();
  });

  it('should show total member count when no one is online in group', () => {
    const mockSelectedConversation = {
      id: 'conv1',
      type: 'group',
      name: 'Test Group',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      members: [
        {
          id: 'member1',
          conversationId: 'conv1',
          userId: 'current-user',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: mockCurrentUser,
        },
        {
          id: 'member2',
          conversationId: 'conv1',
          userId: 'user2',
          joinedAt: new Date('2024-01-01T00:00:00Z'),
          user: {
            id: 'user2',
            email: 'user2@example.com',
            displayName: 'User 2',
            avatarUrl: null,
            lastSeen: new Date('2024-01-01T10:00:00Z'),
            isOnline: false,
            createdAt: new Date('2024-01-01T00:00:00Z'),
            updatedAt: new Date('2024-01-01T10:00:00Z'),
          },
        },
      ],
    };

    const mockUseConversations = require('../../hooks/useConversations').useConversations;
    mockUseConversations.mockReturnValue({
      loadConversation: jest.fn(),
      selectedConversation: mockSelectedConversation,
    });

    render(<ChatScreen />);
    
    expect(screen.getByText('2 members')).toBeTruthy();
  });
});
