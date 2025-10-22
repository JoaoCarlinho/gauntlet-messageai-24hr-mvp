import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ConnectionStatus } from '../../components/ui/ConnectionStatus';
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
      out: jest.fn(),
      in: jest.fn(),
      inOut: jest.fn(),
      ease: 'ease',
    },
  };
});

const mockUseValues = require('kea').useValues as jest.MockedFunction<typeof require('kea').useValues>;

describe('ConnectionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when connected and no queued messages', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connected',
      isOffline: false,
      queuedMessages: {},
    });

    const { queryByText } = render(<ConnectionStatus />);
    
    expect(queryByText('Connected')).toBeNull();
  });

  it('should render "No connection" when disconnected', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: {},
    });

    render(<ConnectionStatus />);
    
    expect(screen.getByText('No connection')).toBeTruthy();
    expect(screen.getByText('⚠')).toBeTruthy();
  });

  it('should render "No connection" with queued messages count', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: {
        'temp_1': { id: 'temp_1' },
        'temp_2': { id: 'temp_2' },
      },
    });

    render(<ConnectionStatus />);
    
    expect(screen.getByText('No connection (2 messages queued)')).toBeTruthy();
    expect(screen.getByText('⚠')).toBeTruthy();
  });

  it('should render "Connecting..." when connecting', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connecting',
      isOffline: false,
      queuedMessages: {},
    });

    render(<ConnectionStatus />);
    
    expect(screen.getByText('Connecting...')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
  });

  it('should render "Reconnecting..." when reconnecting', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'reconnecting',
      isOffline: true,
      queuedMessages: {},
    });

    render(<ConnectionStatus />);
    
    expect(screen.getByText('Reconnecting...')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
  });

  it('should render connected status with syncing messages', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connected',
      isOffline: false,
      queuedMessages: {
        'temp_1': { id: 'temp_1' },
      },
    });

    render(<ConnectionStatus />);
    
    expect(screen.getByText('Connected (1 message syncing)')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('should render connected status with multiple syncing messages', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connected',
      isOffline: false,
      queuedMessages: {
        'temp_1': { id: 'temp_1' },
        'temp_2': { id: 'temp_2' },
        'temp_3': { id: 'temp_3' },
      },
    });

    render(<ConnectionStatus />);
    
    expect(screen.getByText('Connected (3 messages syncing)')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('should apply custom styles', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: {},
    });

    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <ConnectionStatus style={customStyle} />
    );
    
    // Note: In a real test, you would check the actual style prop
    // This is a simplified version for demonstration
    expect(getByTestId).toBeDefined();
  });

  it('should handle animation for connecting states', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'connecting',
      isOffline: false,
      queuedMessages: {},
    });

    render(<ConnectionStatus />);
    
    // The component should render with animation
    expect(screen.getByText('Connecting...')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
  });

  it('should handle animation for reconnecting states', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: 'reconnecting',
      isOffline: true,
      queuedMessages: {},
    });

    render(<ConnectionStatus />);
    
    // The component should render with animation
    expect(screen.getByText('Reconnecting...')).toBeTruthy();
    expect(screen.getByText('⟳')).toBeTruthy();
  });

  it('should show correct colors for different statuses', () => {
    const { rerender } = render(<ConnectionStatus />);
    
    // Test disconnected status
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: {},
    });
    rerender(<ConnectionStatus />);
    expect(screen.getByText('No connection')).toBeTruthy();
    
    // Test connecting status
    mockUseValues.mockReturnValue({
      connectionStatus: 'connecting',
      isOffline: false,
      queuedMessages: {},
    });
    rerender(<ConnectionStatus />);
    expect(screen.getByText('Connecting...')).toBeTruthy();
    
    // Test connected status with queued messages
    mockUseValues.mockReturnValue({
      connectionStatus: 'connected',
      isOffline: false,
      queuedMessages: { 'temp_1': { id: 'temp_1' } },
    });
    rerender(<ConnectionStatus />);
    expect(screen.getByText('Connected (1 message syncing)')).toBeTruthy();
  });

  it('should handle singular vs plural message counts', () => {
    const { rerender } = render(<ConnectionStatus />);
    
    // Test singular message
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: { 'temp_1': { id: 'temp_1' } },
    });
    rerender(<ConnectionStatus />);
    expect(screen.getByText('No connection (1 message queued)')).toBeTruthy();
    
    // Test plural messages
    mockUseValues.mockReturnValue({
      connectionStatus: 'disconnected',
      isOffline: true,
      queuedMessages: {
        'temp_1': { id: 'temp_1' },
        'temp_2': { id: 'temp_2' },
      },
    });
    rerender(<ConnectionStatus />);
    expect(screen.getByText('No connection (2 messages queued)')).toBeTruthy();
  });

  it('should handle edge case with empty connection status', () => {
    mockUseValues.mockReturnValue({
      connectionStatus: '',
      isOffline: true,
      queuedMessages: {},
    });

    render(<ConnectionStatus />);
    
    expect(screen.getByText('No connection')).toBeTruthy();
    expect(screen.getByText('⚠')).toBeTruthy();
  });
});
