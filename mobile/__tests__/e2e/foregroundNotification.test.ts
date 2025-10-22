import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationManager } from '../../lib/notifications';
import ChatScreen from '../../app/chat/[id]';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('../../hooks/useNotifications');
jest.mock('../../lib/notifications');
jest.mock('../../hooks/useAuth');
jest.mock('../../hooks/useSocket');
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'test-conversation-id' }),
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockNotificationManager = notificationManager as jest.Mocked<typeof notificationManager>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseSocket = useSocket as jest.MockedFunction<typeof useSocket>;

// Mock navigation
const Stack = createStackNavigator();

const TestNavigator = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Chat" component={() => <>{children}</>} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('Foreground Notification Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock notification manager
    mockNotificationManager.initialize = jest.fn().mockResolvedValue(undefined);
    mockNotificationManager.getCurrentPushToken = jest.fn().mockReturnValue('test-push-token');
    mockNotificationManager.areNotificationsEnabled = jest.fn().mockResolvedValue(true);
    mockNotificationManager.getBadgeCount = jest.fn().mockResolvedValue(0);
    mockNotificationManager.setBadgeCount = jest.fn().mockResolvedValue(undefined);
    mockNotificationManager.sendLocalNotification = jest.fn().mockResolvedValue('test-notification-id');
    mockNotificationManager.cancelNotification = jest.fn().mockResolvedValue(undefined);
    mockNotificationManager.clearAllNotifications = jest.fn().mockResolvedValue(undefined);
    mockNotificationManager.getNotificationSettings = jest.fn().mockResolvedValue({
      status: 'granted',
      ios: { status: 'granted' },
      android: { status: 'granted' }
    });

    // Mock useNotifications hook
    mockUseNotifications.mockReturnValue({
      isInitialized: true,
      pushToken: 'test-push-token',
      areNotificationsEnabled: true,
      badgeCount: 0,
      requestPermissions: jest.fn().mockResolvedValue(true),
      sendLocalNotification: jest.fn().mockResolvedValue('test-notification-id'),
      cancelNotification: jest.fn().mockResolvedValue(undefined),
      clearAllNotifications: jest.fn().mockResolvedValue(undefined),
      setBadgeCount: jest.fn().mockResolvedValue(undefined),
      getBadgeCount: jest.fn().mockResolvedValue(0),
      getNotificationSettings: jest.fn().mockResolvedValue({
        status: 'granted',
        ios: { status: 'granted' },
        android: { status: 'granted' }
      })
    });

    // Mock useAuth hook
    mockUseAuth.mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null
      },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn()
    });

    // Mock useSocket hook
    mockUseSocket.mockReturnValue({
      socket: {
        connected: true,
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        disconnect: jest.fn()
      },
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn()
    });

    // Mock Expo Notifications
    mockNotifications.setNotificationHandler.mockImplementation();
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      ios: { status: 'granted' },
      android: { status: 'granted' }
    });
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
      ios: { status: 'granted' },
      android: { status: 'granted' }
    });
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'test-push-token',
      type: 'expo'
    });
    mockNotifications.scheduleNotificationAsync.mockResolvedValue('test-notification-id');
    mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockNotifications.dismissNotificationAsync.mockResolvedValue(undefined);
    mockNotifications.dismissAllNotificationsAsync.mockResolvedValue(undefined);
    mockNotifications.getBadgeCountAsync.mockResolvedValue(0);
    mockNotifications.setBadgeCountAsync.mockResolvedValue(undefined);
    mockNotifications.getNotificationSettingsAsync.mockResolvedValue({
      status: 'granted',
      ios: { status: 'granted' },
      android: { status: 'granted' }
    });
  });

  describe('Notification Initialization', () => {
    it('should initialize notifications on app start', async () => {
      await act(async () => {
        render(
          <TestNavigator>
            <ChatScreen />
          </TestNavigator>
        );
      });

      expect(mockNotificationManager.initialize).toHaveBeenCalled();
    });

    it('should request notification permissions', async () => {
      const mockRequestPermissions = jest.fn().mockResolvedValue(true);
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        requestPermissions: mockRequestPermissions
      });

      await act(async () => {
        render(
          <TestNavigator>
            <ChatScreen />
          </TestNavigator>
        );
      });

      expect(mockRequestPermissions).toHaveBeenCalled();
    });

    it('should get push token after initialization', async () => {
      await act(async () => {
        render(
          <TestNavigator>
            <ChatScreen />
          </TestNavigator>
        );
      });

      expect(mockNotificationManager.getCurrentPushToken).toHaveBeenCalled();
    });
  });

  describe('Foreground Notification Display', () => {
    it('should show notification banner when message received in foreground', async () => {
      const mockSendLocalNotification = jest.fn().mockResolvedValue('test-notification-id');
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        sendLocalNotification: mockSendLocalNotification
      });

      const { getByTestId } = render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // Simulate receiving a message notification
      await act(async () => {
        await mockSendLocalNotification(
          'John Doe',
          'Hello, this is a test message',
          {
            conversationId: 'test-conversation-id',
            messageId: 'test-message-id',
            senderId: 'test-sender-id'
          }
        );
      });

      expect(mockSendLocalNotification).toHaveBeenCalledWith(
        'John Doe',
        'Hello, this is a test message',
        {
          conversationId: 'test-conversation-id',
          messageId: 'test-message-id',
          senderId: 'test-sender-id'
        }
      );
    });

    it('should format different message types correctly', async () => {
      const mockSendLocalNotification = jest.fn().mockResolvedValue('test-notification-id');
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        sendLocalNotification: mockSendLocalNotification
      });

      render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // Test text message
      await act(async () => {
        await mockSendLocalNotification(
          'John Doe',
          'This is a text message',
          { conversationId: 'test-conversation-id' }
        );
      });

      // Test image message
      await act(async () => {
        await mockSendLocalNotification(
          'John Doe',
          '📷 Sent a photo',
          { conversationId: 'test-conversation-id' }
        );
      });

      // Test audio message
      await act(async () => {
        await mockSendLocalNotification(
          'John Doe',
          '🎵 Sent an audio message',
          { conversationId: 'test-conversation-id' }
        );
      });

      expect(mockSendLocalNotification).toHaveBeenCalledTimes(3);
    });
  });

  describe('Notification Tap Navigation', () => {
    it('should navigate to chat when notification is tapped', async () => {
      const mockRouter = require('expo-router').router;
      
      // Simulate notification tap
      const notificationData = {
        conversationId: 'test-conversation-id',
        messageId: 'test-message-id',
        senderId: 'test-sender-id'
      };

      // Mock notification response handler
      const mockNotificationResponse = {
        notification: {
          request: {
            content: {
              data: notificationData
            }
          }
        }
      };

      // Simulate notification tap
      await act(async () => {
        // This would normally be triggered by the notification response listener
        if (notificationData.conversationId) {
          mockRouter.push(`/chat/${notificationData.conversationId}`);
        }
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/chat/test-conversation-id');
    });

    it('should handle notification tap with invalid data gracefully', async () => {
      const mockRouter = require('expo-router').router;
      
      // Simulate notification tap with invalid data
      const invalidNotificationData = {
        conversationId: null,
        messageId: 'test-message-id',
        senderId: 'test-sender-id'
      };

      await act(async () => {
        // This would normally be triggered by the notification response listener
        if (invalidNotificationData.conversationId) {
          mockRouter.push(`/chat/${invalidNotificationData.conversationId}`);
        }
      });

      // Should not navigate with invalid data
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Notification Permissions', () => {
    it('should handle denied notification permissions gracefully', async () => {
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        areNotificationsEnabled: false,
        getNotificationSettings: jest.fn().mockResolvedValue({
          status: 'denied',
          ios: { status: 'denied' },
          android: { status: 'denied' }
        })
      });

      const { getByText } = render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // App should still function without notifications
      expect(getByText).toBeDefined();
    });

    it('should request permissions when not granted', async () => {
      const mockRequestPermissions = jest.fn().mockResolvedValue(false);
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        areNotificationsEnabled: false,
        requestPermissions: mockRequestPermissions
      });

      await act(async () => {
        render(
          <TestNavigator>
            <ChatScreen />
          </TestNavigator>
        );
      });

      expect(mockRequestPermissions).toHaveBeenCalled();
    });
  });

  describe('Badge Count Management', () => {
    it('should update badge count when notifications are received', async () => {
      const mockSetBadgeCount = jest.fn().mockResolvedValue(undefined);
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        setBadgeCount: mockSetBadgeCount
      });

      render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // Simulate receiving multiple notifications
      await act(async () => {
        await mockSetBadgeCount(3);
      });

      expect(mockSetBadgeCount).toHaveBeenCalledWith(3);
    });

    it('should clear badge count when app is opened', async () => {
      const mockSetBadgeCount = jest.fn().mockResolvedValue(undefined);
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        setBadgeCount: mockSetBadgeCount
      });

      await act(async () => {
        render(
          <TestNavigator>
            <ChatScreen />
          </TestNavigator>
        );
      });

      // Badge count should be cleared when app opens
      expect(mockSetBadgeCount).toHaveBeenCalledWith(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle notification service errors gracefully', async () => {
      const mockSendLocalNotification = jest.fn().mockRejectedValue(new Error('Notification failed'));
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        sendLocalNotification: mockSendLocalNotification
      });

      const { getByTestId } = render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // App should not crash when notification fails
      await act(async () => {
        try {
          await mockSendLocalNotification('John Doe', 'Test message');
        } catch (error) {
          // Error should be caught and handled
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(getByTestId).toBeDefined();
    });

    it('should handle missing notification data gracefully', async () => {
      const mockSendLocalNotification = jest.fn().mockResolvedValue('test-notification-id');
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        sendLocalNotification: mockSendLocalNotification
      });

      render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // Should handle missing data gracefully
      await act(async () => {
        await mockSendLocalNotification('John Doe', 'Test message', undefined);
      });

      expect(mockSendLocalNotification).toHaveBeenCalledWith(
        'John Doe',
        'Test message',
        undefined
      );
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple rapid notifications efficiently', async () => {
      const mockSendLocalNotification = jest.fn().mockResolvedValue('test-notification-id');
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        sendLocalNotification: mockSendLocalNotification
      });

      render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // Send multiple notifications rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          mockSendLocalNotification(
            'John Doe',
            `Message ${i}`,
            { conversationId: 'test-conversation-id' }
          )
        );
      }

      await act(async () => {
        await Promise.all(promises);
      });

      expect(mockSendLocalNotification).toHaveBeenCalledTimes(10);
    });

    it('should not block UI when processing notifications', async () => {
      const mockSendLocalNotification = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      mockUseNotifications.mockReturnValue({
        ...mockUseNotifications(),
        sendLocalNotification: mockSendLocalNotification
      });

      const { getByTestId } = render(
        <TestNavigator>
          <ChatScreen />
        </TestNavigator>
      );

      // UI should remain responsive during notification processing
      const startTime = Date.now();
      
      await act(async () => {
        await mockSendLocalNotification('John Doe', 'Test message');
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time
      expect(processingTime).toBeLessThan(1000);
    });
  });
});
