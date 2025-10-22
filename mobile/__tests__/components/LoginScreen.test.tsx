import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../app/(auth)/login';
import { useAuth } from '../../hooks/useAuth';

// Mock the useAuth hook
jest.mock('../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

describe('LoginScreen', () => {
  const mockAuthActions = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    initializeAuth: jest.fn(),
    clearError: jest.fn(),
  };

  const defaultAuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    isLoggedIn: false,
    currentUser: null,
    hasValidTokens: false,
    ...mockAuthActions,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthState);
  });

  it('should render login form correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to your account')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText("Don't have an account?")).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('should handle email input', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');

    fireEvent.changeText(emailInput, 'test@example.com');

    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('should handle password input', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(passwordInput, 'password123');

    expect(passwordInput.props.value).toBe('password123');
  });

  it('should validate email format', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');
    const signInButton = getByText('Sign In');

    // Enter invalid email
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });

    expect(mockAuthActions.login).not.toHaveBeenCalled();
  });

  it('should validate password length', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    // Enter valid email but short password
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, '123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });

    expect(mockAuthActions.login).not.toHaveBeenCalled();
  });

  it('should call login with valid credentials', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockAuthActions.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should show loading state', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      isLoading: true,
    });

    const { getByText } = render(<LoginScreen />);

    expect(getByText('Sign In')).toBeTruthy(); // Button should still show "Sign In" but be disabled
  });

  it('should show error alert when auth error occurs', async () => {
    const errorMessage = 'Invalid credentials';
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      error: errorMessage,
    });

    render(<LoginScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', errorMessage);
    });

    expect(mockAuthActions.clearError).toHaveBeenCalled();
  });

  it('should clear email error when user starts typing', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');
    const signInButton = getByText('Sign In');

    // First trigger email error
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });

    // Then start typing valid email
    fireEvent.changeText(emailInput, 'test@example.com');

    await waitFor(() => {
      expect(() => getByText('Please enter a valid email address')).toThrow();
    });
  });

  it('should clear password error when user starts typing', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const signInButton = getByText('Sign In');

    // First trigger password error
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, '123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });

    // Then start typing valid password
    fireEvent.changeText(passwordInput, 'password123');

    await waitFor(() => {
      expect(() => getByText('Password must be at least 6 characters')).toThrow();
    });
  });

  it('should validate email on blur', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const emailInput = getByPlaceholderText('Email');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent(emailInput, 'blur');

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('should validate password on blur', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    const passwordInput = getByPlaceholderText('Password');

    fireEvent.changeText(passwordInput, '123');
    fireEvent(passwordInput, 'blur');

    await waitFor(() => {
      expect(getByText('Password must be at least 6 characters')).toBeTruthy();
    });
  });
});
