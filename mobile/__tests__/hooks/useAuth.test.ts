import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../../hooks/useAuth';
import { authLogic } from '../../store/auth';

// Mock the auth store
jest.mock('../../store/auth', () => ({
  authLogic: {
    getState: jest.fn(),
    actions: {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      initializeAuth: jest.fn(),
      setError: jest.fn(),
    },
  },
}));

// Mock kea hooks
jest.mock('kea', () => ({
  useValues: jest.fn(),
  useActions: jest.fn(),
}));

import { useValues, useActions } from 'kea';

describe('useAuth Hook', () => {
  const mockActions = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    initializeAuth: jest.fn(),
    setError: jest.fn(),
  };

  const mockValues = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isLoggedIn: false,
    currentUser: null,
    hasValidTokens: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useValues as jest.Mock).mockReturnValue(mockValues);
    (useActions as jest.Mock).mockReturnValue(mockActions);
  });

  it('should return auth state and actions', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isLoggedIn: false,
      currentUser: null,
      hasValidTokens: false,
      // Actions
      login: expect.any(Function),
      register: expect.any(Function),
      logout: expect.any(Function),
      refreshToken: expect.any(Function),
      initializeAuth: expect.any(Function),
      clearError: expect.any(Function),
    });
  });

  it('should call login action with credentials', () => {
    const { result } = renderHook(() => useAuth());

    const credentials = { email: 'test@example.com', password: 'password123' };

    act(() => {
      result.current.login(credentials);
    });

    expect(mockActions.setError).toHaveBeenCalledWith(null);
    expect(mockActions.login).toHaveBeenCalledWith(credentials);
  });

  it('should call register action with user data', () => {
    const { result } = renderHook(() => useAuth());

    const userData = {
      email: 'newuser@example.com',
      password: 'password123',
      displayName: 'New User',
    };

    act(() => {
      result.current.register(userData);
    });

    expect(mockActions.setError).toHaveBeenCalledWith(null);
    expect(mockActions.register).toHaveBeenCalledWith(userData);
  });

  it('should call logout action', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(mockActions.setError).toHaveBeenCalledWith(null);
    expect(mockActions.logout).toHaveBeenCalled();
  });

  it('should call refreshToken action', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.refreshToken();
    });

    expect(mockActions.refreshToken).toHaveBeenCalled();
  });

  it('should call initializeAuth action', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.initializeAuth();
    });

    expect(mockActions.initializeAuth).toHaveBeenCalled();
  });

  it('should call clearError action', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.clearError();
    });

    expect(mockActions.setError).toHaveBeenCalledWith(null);
  });

  it('should return authenticated state when user is logged in', () => {
    const authenticatedValues = {
      ...mockValues,
      user: {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      isAuthenticated: true,
      isLoggedIn: true,
      currentUser: {
        id: '1',
        email: 'test@example.com',
        displayName: 'Test User',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      hasValidTokens: true,
    };

    (useValues as jest.Mock).mockReturnValue(authenticatedValues);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.currentUser).toEqual(authenticatedValues.currentUser);
    expect(result.current.hasValidTokens).toBe(true);
  });

  it('should return loading state', () => {
    const loadingValues = {
      ...mockValues,
      isLoading: true,
    };

    (useValues as jest.Mock).mockReturnValue(loadingValues);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
  });

  it('should return error state', () => {
    const errorValues = {
      ...mockValues,
      error: 'Authentication failed',
    };

    (useValues as jest.Mock).mockReturnValue(errorValues);

    const { result } = renderHook(() => useAuth());

    expect(result.current.error).toBe('Authentication failed');
  });
});
