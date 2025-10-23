import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NewGroupScreen from '../../app/group/new';

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

// Mock the hooks
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

jest.mock('../../hooks/useConversations', () => ({
  useConversations: () => ({
    createGroupConversation: jest.fn(),
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

describe('NewGroupScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    expect(getByText('New Group')).toBeTruthy();
    expect(getByPlaceholderText('Enter group name')).toBeTruthy();
    expect(getByPlaceholderText('Search users by name or email')).toBeTruthy();
  });

  it('disables create button when group name is empty', () => {
    const { getByText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    const createButton = getByText('Create Group');
    expect(createButton.parent?.props.accessibilityState?.disabled).toBe(true);
  });

  it('disables create button when no members are selected', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    const groupNameInput = getByPlaceholderText('Enter group name');
    fireEvent.changeText(groupNameInput, 'Test Group');

    const createButton = getByText('Create Group');
    expect(createButton.parent?.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables create button when group name is entered and members are selected', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    // Enter group name
    const groupNameInput = getByPlaceholderText('Enter group name');
    fireEvent.changeText(groupNameInput, 'Test Group');

    // Search for users
    const searchInput = getByPlaceholderText('Search users by name or email');
    fireEvent.changeText(searchInput, 'john');

    // Wait for search results
    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    // Select a user
    const userItem = getByText('John Doe');
    fireEvent.press(userItem);

    // Check if create button is enabled
    await waitFor(() => {
      const createButton = getByText('Create Group');
      expect(createButton.parent?.props.accessibilityState?.disabled).toBe(false);
    });
  });

  it('shows correct member count in section title', async () => {
    const { getByText, getByPlaceholderText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    // Initially shows 0 members
    expect(getByText('Add Members (0)')).toBeTruthy();

    // Search and select a user
    const groupNameInput = getByPlaceholderText('Enter group name');
    fireEvent.changeText(groupNameInput, 'Test Group');

    const searchInput = getByPlaceholderText('Search users by name or email');
    fireEvent.changeText(searchInput, 'john');

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
    });

    const userItem = getByText('John Doe');
    fireEvent.press(userItem);

    // Should now show 1 member
    await waitFor(() => {
      expect(getByText('Add Members (1)')).toBeTruthy();
    });
  });

  it('has proper accessibility labels', () => {
    const { getByLabelText } = render(
      <TestWrapper>
        <NewGroupScreen />
      </TestWrapper>
    );

    expect(getByLabelText('Go back')).toBeTruthy();
    expect(getByLabelText('Group name input')).toBeTruthy();
    expect(getByLabelText('Search users')).toBeTruthy();
  });
});
