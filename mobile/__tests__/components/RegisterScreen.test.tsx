import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RegisterScreen from '../../app/(auth)/register';
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

describe('RegisterScreen', () => {
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

  it('should render registration form correctly', () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Join MessageAI today')).toBeTruthy();
    expect(getByPlaceholderText('Display Name')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByText('Already have an account?')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should handle all form inputs', () => {
    const { getByPlaceholderText } = render(<RegisterScreen />);
    
    const displayNameInput = getByPlaceholderText('Display Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');

    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'Password123');
    fireEvent.changeText(confirmPasswordInput, 'Password123');

    expect(displayNameInput.props.value).toBe('John Doe');
    expect(emailInput.props.value).toBe('john@example.com');
    expect(passwordInput.props.value).toBe('Password123');
    expect(confirmPasswordInput.props.value).toBe('Password123');
  });

  it('should validate display name length', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const displayNameInput = getByPlaceholderText('Display Name');
    const createButton = getByText('Create Account');

    // Enter short display name
    fireEvent.changeText(displayNameInput, 'J');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Display name must be at least 2 characters')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should validate display name maximum length', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const displayNameInput = getByPlaceholderText('Display Name');
    const createButton = getByText('Create Account');

    // Enter long display name
    const longName = 'A'.repeat(51);
    fireEvent.changeText(displayNameInput, longName);
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Display name must be less than 50 characters')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const emailInput = getByPlaceholderText('Email');
    const createButton = getByText('Create Account');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should validate password strength', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const passwordInput = getByPlaceholderText('Password');
    const createButton = getByText('Create Account');

    // Test weak password (no uppercase)
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Password must contain at least one uppercase letter')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should validate password has lowercase letter', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const passwordInput = getByPlaceholderText('Password');
    const createButton = getByText('Create Account');

    // Test password without lowercase
    fireEvent.changeText(passwordInput, 'PASSWORD123');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Password must contain at least one lowercase letter')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should validate password has number', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const passwordInput = getByPlaceholderText('Password');
    const createButton = getByText('Create Account');

    // Test password without number
    fireEvent.changeText(passwordInput, 'Password');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Password must contain at least one number')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should validate password minimum length', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const passwordInput = getByPlaceholderText('Password');
    const createButton = getByText('Create Account');

    // Test short password
    fireEvent.changeText(passwordInput, 'Pass1');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should validate password confirmation', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');
    const createButton = getByText('Create Account');

    fireEvent.changeText(passwordInput, 'Password123');
    fireEvent.changeText(confirmPasswordInput, 'DifferentPassword123');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });

    expect(mockAuthActions.register).not.toHaveBeenCalled();
  });

  it('should call register with valid data', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    
    const displayNameInput = getByPlaceholderText('Display Name');
    const emailInput = getByPlaceholderText('Email');
    const passwordInput = getByPlaceholderText('Password');
    const confirmPasswordInput = getByPlaceholderText('Confirm Password');
    const createButton = getByText('Create Account');

    fireEvent.changeText(displayNameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'Password123');
    fireEvent.changeText(confirmPasswordInput, 'Password123');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(mockAuthActions.register).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'Password123',
        displayName: 'John Doe',
      });
    });
  });

  it('should show loading state', () => {
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      isLoading: true,
    });

    const { getByText } = render(<RegisterScreen />);

    expect(getByText('Create Account')).toBeTruthy(); // Button should still show "Create Account" but be disabled
  });

  it('should show error alert when registration error occurs', async () => {
    const errorMessage = 'Email already exists';
    mockUseAuth.mockReturnValue({
      ...defaultAuthState,
      error: errorMessage,
    });

    render(<RegisterScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Registration Failed', errorMessage);
    });

    expect(mockAuthActions.clearError).toHaveBeenCalled();
  });

  it('should clear errors when user starts typing', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const displayNameInput = getByPlaceholderText('Display Name');
    const createButton = getByText('Create Account');

    // First trigger error
    fireEvent.changeText(displayNameInput, 'J');
    fireEvent.press(createButton);

    await waitFor(() => {
      expect(getByText('Display name must be at least 2 characters')).toBeTruthy();
    });

    // Then start typing valid name
    fireEvent.changeText(displayNameInput, 'John');

    await waitFor(() => {
      expect(() => getByText('Display name must be at least 2 characters')).toThrow();
    });
  });

  it('should validate fields on blur', async () => {
    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    const displayNameInput = getByPlaceholderText('Display Name');

    fireEvent.changeText(displayNameInput, 'J');
    fireEvent(displayNameInput, 'blur');

    await waitFor(() => {
      expect(getByText('Display name must be at least 2 characters')).toBeTruthy();
    });
  });
});
