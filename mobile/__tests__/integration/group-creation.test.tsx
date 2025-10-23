import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import NewGroupScreen from '../../app/group/new';

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock the router
const mockRouter = {
  back: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
}));

// Mock the hooks
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

const mockCreateGroupConversation = jest.fn();

jest.mock('../../hooks/useConversations', () => ({
  useConversations: () => ({
    createGroupConversation: mockCreateGroupConversation,
    isLoading: false,
    error: null,
  }),
}));

// Mock the API
jest.mock('../../lib/api', () => ({
  usersAPI: {
    searchUsers: jest.fn().mockResolvedValue([
      {
        id: '1',
        displayName: 'John Doe',
        email: 'john@example.com',
      },
      {
        id: '2',
        displayName: 'Jane Smith',
        email: 'jane@example.com',
      },
    ]),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

describe('Group Creation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('completes full group creation flow', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    // Step 1: Enter group name
    const groupNameInput = getByPlaceholderText('Enter group name');
    fireEvent.changeText(groupNameInput, 'My Test Group');

    // Step 2: Search for users
    const searchInput = getByPlaceholderText('Search users by name or email');
    fireEvent.changeText(searchInput, 'john');

    // Step 3: Wait for search results and select user
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    const userItem = getByText('John Doe');
    fireEvent.press(userItem);

    // Step 4: Verify button is enabled and create group
    await waitFor(() => {
      const createButton = getByText('Create Group');
      expect(createButton.parent?.props.accessibilityState?.disabled).toBe(false);
    });

    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    // Step 5: Verify group creation was called
    await waitFor(() => {
      expect(mockCreateGroupConversation).toHaveBeenCalledWith({
        name: 'My Test Group',
        participantIds: ['1'],
      });
    });
  });

  it('shows error when trying to create group without name', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    // Select a user first
    const searchInput = getByPlaceholderText('Search users by name or email');
    fireEvent.changeText(searchInput, 'john');

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    const userItem = getByText('John Doe');
    fireEvent.press(userItem);

    // Try to create group without name
    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    // Should show error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a group name');
    });
  });

  it('shows error when trying to create group without members', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    // Enter group name
    const groupNameInput = getByPlaceholderText('Enter group name');
    fireEvent.changeText(groupNameInput, 'My Test Group');

    // Try to create group without selecting members
    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    // Should show error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please select at least 1 member');
    });
  });

  it('handles multiple member selection correctly', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    // Enter group name
    const groupNameInput = getByPlaceholderText('Enter group name');
    fireEvent.changeText(groupNameInput, 'My Test Group');

    // Search for users
    const searchInput = getByPlaceholderText('Search users by name or email');
    fireEvent.changeText(searchInput, 'j');

    // Wait for search results
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('Jane Smith')).toBeTruthy();
    });

    // Select both users
    const johnItem = getByText('John Doe');
    const janeItem = getByText('Jane Smith');
    
    fireEvent.press(johnItem);
    fireEvent.press(janeItem);

    // Verify member count
    await waitFor(() => {
      expect(getByText('Add Members (2)')).toBeTruthy();
    });

    // Create group
    const createButton = getByText('Create Group');
    fireEvent.press(createButton);

    // Verify group creation with both members
    await waitFor(() => {
      expect(mockCreateGroupConversation).toHaveBeenCalledWith({
        name: 'My Test Group',
        participantIds: ['1', '2'],
      });
    });
  });
});
