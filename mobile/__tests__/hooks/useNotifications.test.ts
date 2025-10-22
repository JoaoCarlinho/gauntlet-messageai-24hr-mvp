import { renderHook, act } from '@testing-library/react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationManager } from '../../lib/notifications';

// Mock the notification manager
jest.mock('../../lib/notifications', () => ({
  notificationManager: {
    initialize: jest.fn(),
    requestPermissions: jest.fn(),
    getPushToken: jest.fn(),
    sendTokenToBackend: jest.fn(),
    scheduleLocalNotification: jest.fn(),
    cancelNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
    clearAllNotifications: jest.fn(),
    setBadgeCount: jest.fn(),
    getBadgeCount: jest.fn(),
    areNotificationsEnabled: jest.fn(),
    getNotificationSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
  },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
}));

const mockNotificationManager = notificationManager as jest.Mocked<typeof notificationManager>;

describe('useNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockNotificationManager.initialize.mockResolvedValue();
    mockNotificationManager.requestPermissions.mockResolvedValue(true);
    mockNotificationManager.getPushToken.mockResolvedValue('test-push-token');
    mockNotificationManager.sendTokenToBackend.mockResolvedValue(true);
    mockNotificationManager.scheduleLocalNotification.mockResolvedValue('test-notification-id');
    mockNotificationManager.cancelNotification.mockResolvedValue();
    mockNotificationManager.cancelAllNotifications.mockResolvedValue();
    mockNotificationManager.clearAllNotifications.mockResolvedValue();
    mockNotificationManager.setBadgeCount.mockResolvedValue();
    mockNotificationManager.getBadgeCount.mockResolvedValue(0);
    mockNotificationManager.areNotificationsEnabled.mockResolvedValue(true);
    mockNotificationManager.getNotificationSettings.mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
      expires: 'never',
    });
    mockNotificationManager.updateNotificationSettings.mockResolvedValue({
      status: 'granted',
      canAskAgain: true,
      expires: 'never',
    });
  });

  it('should initialize notifications on mount', async () => {
    renderHook(() => useNotifications());

    expect(mockNotificationManager.initialize).toHaveBeenCalled();
  });

  it('should request notification permissions', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const granted = await result.current.requestPermissions();
      expect(granted).toBe(true);
    });

    expect(mockNotificationManager.requestPermissions).toHaveBeenCalled();
  });

  it('should get push token', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const token = await result.current.getPushToken();
      expect(token).toBe('test-push-token');
    });

    expect(mockNotificationManager.getPushToken).toHaveBeenCalled();
  });

  it('should send token to backend', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const success = await result.current.sendTokenToBackend('test-token');
      expect(success).toBe(true);
    });

    expect(mockNotificationManager.sendTokenToBackend).toHaveBeenCalledWith('test-token');
  });

  it('should schedule local notification', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const notificationId = await result.current.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        { conversationId: 'test-conv' },
        5
      );
      expect(notificationId).toBe('test-notification-id');
    });

    expect(mockNotificationManager.scheduleLocalNotification).toHaveBeenCalledWith(
      'Test Title',
      'Test Body',
      { conversationId: 'test-conv' },
      5
    );
  });

  it('should cancel notification', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.cancelNotification('test-notification-id');
    });

    expect(mockNotificationManager.cancelNotification).toHaveBeenCalledWith('test-notification-id');
  });

  it('should cancel all notifications', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.cancelAllNotifications();
    });

    expect(mockNotificationManager.cancelAllNotifications).toHaveBeenCalled();
  });

  it('should clear all notifications', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.clearAllNotifications();
    });

    expect(mockNotificationManager.clearAllNotifications).toHaveBeenCalled();
  });

  it('should set badge count', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.setBadgeCount(5);
    });

    expect(mockNotificationManager.setBadgeCount).toHaveBeenCalledWith(5);
  });

  it('should get badge count', async () => {
    mockNotificationManager.getBadgeCount.mockResolvedValue(3);
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const count = await result.current.getBadgeCount();
      expect(count).toBe(3);
    });

    expect(mockNotificationManager.getBadgeCount).toHaveBeenCalled();
  });

  it('should get notification settings', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const settings = await result.current.getNotificationSettings();
      expect(settings.status).toBe('granted');
    });

    expect(mockNotificationManager.getNotificationSettings).toHaveBeenCalled();
  });

  it('should update notification settings', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const settings = await result.current.updateNotificationSettings({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      expect(settings.status).toBe('granted');
    });

    expect(mockNotificationManager.updateNotificationSettings).toHaveBeenCalledWith({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  });

  it('should handle initialization errors gracefully', async () => {
    mockNotificationManager.initialize.mockRejectedValue(new Error('Initialization failed'));

    const { result } = renderHook(() => useNotifications());

    // Should not throw error, just log it
    expect(result.current.isInitialized).toBe(false);
  });

  it('should handle permission request errors', async () => {
    mockNotificationManager.requestPermissions.mockRejectedValue(new Error('Permission denied'));

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const granted = await result.current.requestPermissions();
      expect(granted).toBe(false);
    });
  });

  it('should handle push token errors', async () => {
    mockNotificationManager.getPushToken.mockRejectedValue(new Error('Token failed'));

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      const token = await result.current.getPushToken();
      expect(token).toBe(null);
    });
  });
});
