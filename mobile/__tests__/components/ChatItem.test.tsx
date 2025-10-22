import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChatItem from '../../components/chat/ChatItem';
import { ConversationWithLastMessage } from '../../types';

// Mock the usePresence hook
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
  }),
}));

// Mock the Avatar component
jest.mock('../../components/ui/Avatar', () => {
  return function MockAvatar({ user, size, showStatus }: any) {
    return (
      <div data-testid="avatar" data-user-id={user?.id} data-size={size} data-show-status={showStatus}>
        {user?.displayName}
      </div>
    );
  };
});

// Mock the StatusIndicator component
jest.mock('../../components/ui/StatusIndicator', () => {
  return function MockStatusIndicator({ isOnline, lastSeen, size }: any) {
    return (
      <div 
        data-testid="status-indicator" 
        data-online={isOnline} 
        data-size={size}
        data-last-seen={lastSeen?.toISOString()}
      >
        {isOnline ? 'Online' : 'Offline'}
      </div>
    );
  };
});

describe('ChatItem Component', () => {
  const mockOnPress = jest.fn();
  const mockOnLongPress = jest.fn();

  const mockDirectConversation: ConversationWithLastMessage = {
    id: 'conv1',
    type: 'direct',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    members: [
      {
        id: 'member1',
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
    lastMessage: {
      id: 'msg1',
      conversationId: 'conv1',
      senderId: 'user1',
      content: 'Hello there!',
      type: 'text',
      status: 'sent',
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      sender: {
        id: 'user1',
        displayName: 'User 1',
        avatarUrl: null,
        lastSeen: new Date('2024-01-01T12:00:00Z'),
        isOnline: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      },
    },
    unreadCount: 2,
  };

  const mockGroupConversation: ConversationWithLastMessage = {
    id: 'conv2',
    type: 'group',
    name: 'Test Group',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z'),
    members: [
      {
        id: 'member1',
        conversationId: 'conv2',
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
        id: 'member2',
        conversationId: 'conv2',
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
    lastMessage: {
      id: 'msg2',
      conversationId: 'conv2',
      senderId: 'user1',
      content: 'Group message',
      type: 'text',
      status: 'sent',
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      sender: {
        id: 'user1',
        displayName: 'User 1',
        avatarUrl: null,
        lastSeen: new Date('2024-01-01T12:00:00Z'),
        isOnline: true,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      },
    },
    unreadCount: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render direct conversation with online status', () => {
    const { getByText, getByTestId } = render(
      <ChatItem
        conversation={mockDirectConversation}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText('User 1')).toBeTruthy();
    expect(getByText('Hello there!')).toBeTruthy();
    expect(getByTestId('status-indicator')).toBeTruthy();
    expect(getByTestId('status-indicator')).toHaveProp('data-online', true);
  });

  it('should render group conversation with member count', () => {
    const { getByText, getByTestId } = render(
      <ChatItem
        conversation={mockGroupConversation}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText('Test Group')).toBeTruthy();
    expect(getByText('User 1: Group message')).toBeTruthy();
    expect(getByText('2')).toBeTruthy(); // Member count indicator
  });

  it('should show unread count badge', () => {
    const { getByText } = render(
      <ChatItem
        conversation={mockDirectConversation}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText('2')).toBeTruthy(); // Unread count
  });

  it('should call onPress when pressed', () => {
    const { getByText } = render(
      <ChatItem
        conversation={mockDirectConversation}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    fireEvent.press(getByText('User 1'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should call onLongPress when long pressed', () => {
    const { getByText } = render(
      <ChatItem
        conversation={mockDirectConversation}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    fireEvent(getByText('User 1'), 'longPress');
    expect(mockOnLongPress).toHaveBeenCalledTimes(1);
  });

  it('should show last seen text for offline users', () => {
    // Create a conversation with an offline user
    const offlineConversation = {
      ...mockDirectConversation,
      members: [
        {
          ...mockDirectConversation.members[0],
          user: {
            ...mockDirectConversation.members[0].user!,
            id: 'user2',
            isOnline: false,
            lastSeen: new Date('2024-01-01T10:00:00Z'),
          },
        },
      ],
    };

    const { getByText } = render(
      <ChatItem
        conversation={offlineConversation}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    // Should show last seen text (mocked to show "2 hours ago")
    expect(getByText('2 hours ago')).toBeTruthy();
  });

  it('should handle conversations without last message', () => {
    const conversationWithoutMessage = {
      ...mockDirectConversation,
      lastMessage: undefined,
    };

    const { getByText } = render(
      <ChatItem
        conversation={conversationWithoutMessage}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText('No messages yet')).toBeTruthy();
  });
});
