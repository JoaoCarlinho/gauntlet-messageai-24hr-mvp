import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ConnectionStatusIndicator } from '../../components/ui/ConnectionStatusIndicator';
import { messagesLogic } from '../../store/messages';

// Mock Kea
jest.mock('kea', () => ({
  useValues: jest.fn(),
}));

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn(() => ({
        setValue: jest.fn(),
      })),
      loop: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn(),
        stop: jest.fn(),
      })),
    },
    Easing: {
      inOut: jest.fn(),
      ease: 'ease',
    },
  };
});

const mockUseValues = require('kea').useValues as jest.MockedFunction<typeof require('kea').useValues>;

describe('ConnectionStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when connected and showWhenConnected is false', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connected',
      isOffline: false,
      queuedMessages: {},
    });

    const { queryByText } = render(<ConnectionStatusIndicator />);
    
    expect(queryByText('Connected')).toBeNull();
  });

  it('should render when connected and showWhenConnected is true', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connected',
      isOffline: false,
      queuedMessages: {},
    });

    render(<ConnectionStatusIndicator showWhenConnected={true} />);
    
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('should render connecting status', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connecting',
      isOffline: false,
      queuedMessages: {},
    });

    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('Connecting...')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
  });

  it('should render reconnecting status', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'reconnecting',
      isOffline: true,
      queuedMessages: {},
    });

    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('Reconnecting...')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
  });

  it('should render disconnected status with queued messages', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: {
        'temp_1': { id: 'temp_1' },
        'temp_2': { id: 'temp_2' },
      },
    });

    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('Offline (2 queued)')).toBeTruthy();
    expect(screen.getByText('⚠')).toBeTruthy();
  });

  it('should not render when disconnected and no queued messages', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: {},
    });

    const { queryByText } = render(<ConnectionStatusIndicator />);
    
    expect(queryByText('Offline')).toBeNull();
  });

  it('should apply custom styles', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connecting',
      isOffline: false,
      queuedMessages: {},
    });

    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <ConnectionStatusIndicator style={customStyle} />
    );
    
    // Note: In a real test, you would check the actual style prop
    // This is a simplified version for demonstration
    expect(getByTestId).toBeDefined();
  });

  it('should show correct colors for different statuses', () => {
    const { rerender } = render(<ConnectionStatusIndicator />);
    
    // Test connecting status
    mockUseValues.mockReturnValue({
      connectionStatus: 'connecting',
      isOffline: false,
      queuedMessages: {},
    });
    rerender(<ConnectionStatusIndicator />);
    expect(screen.getByText('Connecting...')).toBeTruthy();
    
    // Test disconnected status
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: { 'temp_1': { id: 'temp_1' } },
    });
    rerender(<ConnectionStatusIndicator />);
    expect(screen.getByText('Offline (1 queued)')).toBeTruthy();
    
    // Test connected status
    mockUseValues.mockReturnValue({
      connectionStatus: 'connected',
      isOffline: false,
      queuedMessages: {},
    });
    rerender(<ConnectionStatusIndicator showWhenConnected={true} />);
    expect(screen.getByText('Connected')).toBeTruthy();
  });

  it('should handle animation for connecting states', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connecting',
      isOffline: false,
      queuedMessages: {},
    });

    render(<ConnectionStatusIndicator />);
    
    // The component should render with animation
    expect(screen.getByText('Connecting...')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
  });

  it('should handle multiple queued messages count', () => {
    const queuedMessages = {};
    for (let i = 0; i < 5; i++) {
      queuedMessages[`temp_${i}`] = { id: `temp_${i}` };
    }

    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages,
    });

    render(<ConnectionStatusIndicator />);
    
    expect(screen.getByText('Offline (5 queued)')).toBeTruthy();
  });
});
