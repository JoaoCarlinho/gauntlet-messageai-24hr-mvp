import { renderHook, act } from '@testing-library/react-native';
import { usePresence } from '../../hooks/usePresence';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { socketManager } from '../../lib/socket';

// Mock dependencies
jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/useSocket');
jest.mock('../../lib/socket');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;
const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;

describe('usePresence Hook', () => {
  const mockCurrentUser = {
    id: 'user1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: null,
    lastSeen: new Date('2024-01-01T00:00:00Z'),
    isOnline: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockSocketUpdatePresence = jest.fn();
  const mockEmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useAuth
    mockUseAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      user: mockCurrentUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      isLoggedIn: true,
      hasValidTokens: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      initializeAuth: jest.fn(),
      clearError: jest.fn(),
    });

    // Mock useSocket
    mockUseSocket.mockReturnValue({
      socketState: {
        connected: true,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
      },
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      joinRoom: jest.fn(),
      leaveRoom: jest.fn(),
      sendMessage: jest.fn(),
      markMessageAsRead: jest.fn(),
      startTyping: jest.fn(),
      stopTyping: jest.fn(),
      updatePresence: mockSocketUpdatePresence,
      emit: mockEmit,
    });

    // Mock socket manager
    mockSocketManager.on = jest.fn();
    mockSocketManager.off = jest.fn();
    mockSocketManager.emit = jest.fn();
  });

  it('should initialize with current user online status', () => {
    const { result } = renderHook(() => usePresence());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.onlineUsers).toEqual({
      user1: true,
    });
    expect(result.current.lastSeen).toEqual({
      user1: mockCurrentUser.lastSeen,
    });
  });

  it('should provide getUserStatus function', () => {
    const { result } = renderHook(() => usePresence());

    const userStatus = result.current.getUserStatus('user1');
    expect(userStatus).toEqual({
      userId: 'user1',
      isOnline: true,
      lastSeen: mockCurrentUser.lastSeen,
      displayName: '',
      avatarUrl: undefined,
    });
  });

  it('should provide isUserOnline function', () => {
    const { result } = renderHook(() => usePresence());

    expect(result.current.isUserOnline('user1')).toBe(true);
    expect(result.current.isUserOnline('user2')).toBe(false);
  });

  it('should provide formatLastSeen function', () => {
    const { result } = renderHook(() => usePresence());

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    expect(result.current.formatLastSeen(oneMinuteAgo)).toBe('1 minute ago');
    expect(result.current.formatLastSeen(oneHourAgo)).toBe('1 hour ago');
    expect(result.current.formatLastSeen(oneDayAgo)).toBe('1 day ago');
  });

  it('should update presence when updatePresence is called', () => {
    const { result } = renderHook(() => usePresence());

    act(() => {
      result.current.updatePresence(false);
    });

    expect(mockSocketUpdatePresence).toHaveBeenCalledWith(false);
    expect(result.current.isOnline).toBe(false);
  });

  it('should set up event listeners for user_online and user_offline', () => {
    renderHook(() => usePresence());

    expect(mockSocketManager.on).toHaveBeenCalledWith('user_online', expect.any(Function));
    expect(mockSocketManager.on).toHaveBeenCalledWith('user_offline', expect.any(Function));
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => usePresence());

    unmount();

    expect(mockSocketManager.off).toHaveBeenCalledWith('user_online', expect.any(Function));
    expect(mockSocketManager.off).toHaveBeenCalledWith('user_offline', expect.any(Function));
  });

  it('should handle user going online', () => {
    const { result } = renderHook(() => usePresence());

    // Get the event handler that was registered
    const onlineHandler = (mockSocketManager.on as jest.Mock).mock.calls
      .find(call => call[0] === 'user_online')?.[1];

    expect(onlineHandler).toBeDefined();

    // Simulate user going online
    act(() => {
      onlineHandler({ userId: 'user2', lastSeen: new Date() });
    });

    expect(result.current.onlineUsers.user2).toBe(true);
    expect(result.current.isUserOnline('user2')).toBe(true);
  });

  it('should handle user going offline', () => {
    const { result } = renderHook(() => usePresence());

    // First set user as online
    act(() => {
      const onlineHandler = (mockSocketManager.on as jest.Mock).mock.calls
        .find(call => call[0] === 'user_online')?.[1];
      onlineHandler({ userId: 'user2', lastSeen: new Date() });
    });

    expect(result.current.isUserOnline('user2')).toBe(true);

    // Then simulate user going offline
    act(() => {
      const offlineHandler = (mockSocketManager.on as jest.Mock).mock.calls
        .find(call => call[0] === 'user_offline')?.[1];
      offlineHandler({ userId: 'user2', lastSeen: new Date() });
    });

    expect(result.current.onlineUsers.user2).toBe(false);
    expect(result.current.isUserOnline('user2')).toBe(false);
  });

  it('should provide getConversationPresence function', () => {
    const { result } = renderHook(() => usePresence());

    // Add another user to the presence state
    act(() => {
      const onlineHandler = (mockSocketManager.on as jest.Mock).mock.calls
        .find(call => call[0] === 'user_online')?.[1];
      onlineHandler({ userId: 'user2', lastSeen: new Date() });
    });

    const conversationPresence = result.current.getConversationPresence('conv1', ['user1', 'user2']);

    expect(conversationPresence).toHaveLength(2);
    expect(conversationPresence[0].userId).toBe('user1');
    expect(conversationPresence[1].userId).toBe('user2');
  });
});
